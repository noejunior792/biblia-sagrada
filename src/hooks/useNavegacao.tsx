import React, { useState, useEffect, createContext, useContext } from 'react';
import { Livro } from '../types';

interface NavegacaoContexto {
  livroAtual: Livro | null;
  capituloAtual: number;
  versiculoAtual?: number;
  setLivroAtual: (livro: Livro) => void;
  setCapituloAtual: (capitulo: number) => void;
  setVersiculoAtual: (versiculo?: number) => void;
  navegarPara: (livro: Livro, capitulo: number, versiculo?: number) => void;
  proximoCapitulo: () => void;
  capituloAnterior: () => void;
  proximoVersiculo: () => void;
  versiculoAnterior: () => void;
  podeAvancarCapitulo: boolean;
  podeVoltarCapitulo: boolean;
  podeAvancarVersiculo: boolean;
  podeVoltarVersiculo: boolean;
}

const NavegacaoContext = createContext<NavegacaoContexto | undefined>(undefined);

export const useNavegacao = () => {
  const context = useContext(NavegacaoContext);
  if (!context) {
    throw new Error('useNavegacao deve ser usado dentro de um NavegacaoProvider');
  }
  return context;
};

export const NavegacaoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [livroAtual, setLivroAtualState] = useState<Livro | null>(null);
  const [capituloAtual, setCapituloAtualState] = useState<number>(1);
  const [versiculoAtual, setVersiculoAtualState] = useState<number | undefined>(undefined);
  const [podeAvancarCapitulo, setPodeAvancarCapitulo] = useState<boolean>(false);
  const [podeVoltarCapitulo, setPodeVoltarCapitulo] = useState<boolean>(false);
  const [podeAvancarVersiculo, setPodeAvancarVersiculo] = useState<boolean>(false);
  const [podeVoltarVersiculo, setPodeVoltarVersiculo] = useState<boolean>(false);

  // Carregar navegação salva do localStorage
  useEffect(() => {
    const navegacaoSalva = localStorage.getItem('biblia-navegacao');
    if (navegacaoSalva) {
      try {
        const { livro, capitulo, versiculo } = JSON.parse(navegacaoSalva);
        if (livro) {
          setLivroAtualState(livro);
          setCapituloAtualState(capitulo || 1);
          setVersiculoAtualState(versiculo);
        }
      } catch (error) {
        console.error('Erro ao carregar navegação salva:', error);
      }
    }
  }, []);

  // Salvar navegação no localStorage
  useEffect(() => {
    if (livroAtual) {
      const navegacao = {
        livro: livroAtual,
        capitulo: capituloAtual,
        versiculo: versiculoAtual
      };
      localStorage.setItem('biblia-navegacao', JSON.stringify(navegacao));
    }
  }, [livroAtual, capituloAtual, versiculoAtual]);

  // Atualizar flags de navegação
  useEffect(() => {
    if (livroAtual) {
      setPodeVoltarCapitulo(capituloAtual > 1);
      setPodeAvancarCapitulo(capituloAtual < livroAtual.capitulos_total);
      
      if (versiculoAtual) {
        setPodeVoltarVersiculo(versiculoAtual > 1);
        // Note: Para determinar se pode avançar versículo, precisaríamos saber o total de versículos do capítulo
        // Por enquanto, vamos assumir que sempre pode tentar avançar
        setPodeAvancarVersiculo(true);
      } else {
        setPodeVoltarVersiculo(false);
        setPodeAvancarVersiculo(false);
      }
    } else {
      setPodeAvancarCapitulo(false);
      setPodeVoltarCapitulo(false);
      setPodeAvancarVersiculo(false);
      setPodeVoltarVersiculo(false);
    }
  }, [livroAtual, capituloAtual, versiculoAtual]);

  const setLivroAtual = (livro: Livro) => {
    setLivroAtualState(livro);
    setCapituloAtualState(1);
    setVersiculoAtualState(undefined);
  };

  const setCapituloAtual = (capitulo: number) => {
    if (livroAtual && capitulo >= 1 && capitulo <= livroAtual.capitulos_total) {
      setCapituloAtualState(capitulo);
      setVersiculoAtualState(undefined);
    }
  };

  const setVersiculoAtual = (versiculo?: number) => {
    setVersiculoAtualState(versiculo);
  };

  const navegarPara = (livro: Livro, capitulo: number, versiculo?: number) => {
    setLivroAtualState(livro);
    setCapituloAtualState(capitulo);
    setVersiculoAtualState(versiculo);
  };

  const proximoCapitulo = () => {
    if (livroAtual && capituloAtual < livroAtual.capitulos_total) {
      setCapituloAtualState(capituloAtual + 1);
      setVersiculoAtualState(undefined);
    }
  };

  const capituloAnterior = () => {
    if (capituloAtual > 1) {
      setCapituloAtualState(capituloAtual - 1);
      setVersiculoAtualState(undefined);
    }
  };

  const proximoVersiculo = () => {
    if (versiculoAtual) {
      setVersiculoAtualState(versiculoAtual + 1);
    }
  };

  const versiculoAnterior = () => {
    if (versiculoAtual && versiculoAtual > 1) {
      setVersiculoAtualState(versiculoAtual - 1);
    }
  };

  const value = {
    livroAtual,
    capituloAtual,
    versiculoAtual,
    setLivroAtual,
    setCapituloAtual,
    setVersiculoAtual,
    navegarPara,
    proximoCapitulo,
    capituloAnterior,
    proximoVersiculo,
    versiculoAnterior,
    podeAvancarCapitulo,
    podeVoltarCapitulo,
    podeAvancarVersiculo,
    podeVoltarVersiculo
  };

  return (
    <NavegacaoContext.Provider value={value}>
      {children}
    </NavegacaoContext.Provider>
  );
};

export default NavegacaoProvider;