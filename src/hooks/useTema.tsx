import React, { useState, useEffect, createContext, useContext } from 'react';

export type Tema = 'claro' | 'escuro';

interface TemaContexto {
  tema: Tema;
  toggleTema: () => void;
  setTema: (tema: Tema) => void;
}

const TemaContext = createContext<TemaContexto | undefined>(undefined);

export const useTema = () => {
  const context = useContext(TemaContext);
  if (!context) {
    throw new Error('useTema deve ser usado dentro de um TemaProvider');
  }
  return context;
};

export const TemaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tema, setTemaState] = useState<Tema>('claro');

  useEffect(() => {
    // Carregar tema salvo do localStorage
    const temaSalvo = localStorage.getItem('biblia-tema') as Tema;
    if (temaSalvo && (temaSalvo === 'claro' || temaSalvo === 'escuro')) {
      setTemaState(temaSalvo);
    } else {
      // Detectar preferência do sistema
      const preferenciaSistema = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTemaState(preferenciaSistema ? 'escuro' : 'claro');
    }
  }, []);

  useEffect(() => {
    // Aplicar tema ao DOM
    const root = document.documentElement;
    root.classList.remove('claro', 'escuro');
    root.classList.add(tema);
    
    // Atualizar atributo data-theme
    root.setAttribute('data-theme', tema);
    
    // Salvar no localStorage
    localStorage.setItem('biblia-tema', tema);
  }, [tema]);

  const toggleTema = () => {
    setTemaState(prev => prev === 'claro' ? 'escuro' : 'claro');
  };

  const setTema = (novoTema: Tema) => {
    setTemaState(novoTema);
  };

  const value = {
    tema,
    toggleTema,
    setTema
  };

  return (
    <TemaContext.Provider value={value}>
      {children}
    </TemaContext.Provider>
  );
};

export default TemaProvider;