import type { 
  Livro, 
  Versiculo, 
  Favorito, 
  Anotacao, 
  HistoricoLeitura, 
  VersiculoDia, 
  DatabaseResponse, 
  BuscaParametros,
  EstatisticasLeitura,
  ResultadoBusca
} from './index';

declare global {
  interface Window {
    electronAPI: {
      // Livros
      getLivros: () => Promise<DatabaseResponse<Livro[]>>;
      getLivro: (id: number) => Promise<DatabaseResponse<Livro>>;
      
      // Versículos
      getVersiculosCapitulo: (livroId: number, capitulo: number) => Promise<DatabaseResponse<Versiculo[]>>;
      getVersiculo: (id: number) => Promise<DatabaseResponse<Versiculo>>;
      
      // Busca
      buscarVersiculos: (parametros: BuscaParametros) => Promise<DatabaseResponse<ResultadoBusca[]>>;
      
      // Favoritos
      getFavoritos: () => Promise<DatabaseResponse<Favorito[]>>;
      adicionarFavorito: (versiculoId: number) => Promise<DatabaseResponse<void>>;
      removerFavorito: (versiculoId: number) => Promise<DatabaseResponse<void>>;
      verificarFavorito: (versiculoId: number) => Promise<DatabaseResponse<boolean>>;
      
      // Anotações
      getAnotacoes: () => Promise<DatabaseResponse<Anotacao[]>>;
      getAnotacoesVersiculo: (versiculoId: number) => Promise<DatabaseResponse<Anotacao[]>>;
      adicionarAnotacao: (versiculoId: number, titulo: string, conteudo: string) => Promise<DatabaseResponse<Anotacao>>;
      atualizarAnotacao: (id: number, titulo: string, conteudo: string) => Promise<DatabaseResponse<void>>;
      removerAnotacao: (id: number) => Promise<DatabaseResponse<void>>;
      
      // Histórico
      adicionarHistorico: (livroId: number, capitulo: number) => Promise<DatabaseResponse<void>>;
      getHistorico: () => Promise<DatabaseResponse<HistoricoLeitura[]>>;
      
      // Versículo do dia
      getVersiculoDia: () => Promise<DatabaseResponse<VersiculoDia>>;
      
      // Configurações
      getConfiguracao: (chave: string) => Promise<DatabaseResponse<string>>;
      setConfiguracao: (chave: string, valor: string) => Promise<DatabaseResponse<void>>;
      
      // Estatísticas
      getEstatisticas: () => Promise<DatabaseResponse<EstatisticasLeitura>>;
      
      // Janela
      minimizeWindow: () => Promise<void>;
      maximizeWindow: () => Promise<void>;
      closeWindow: () => Promise<void>;
      getWindowState: () => Promise<{isMaximized: boolean}>;
      
      // Eventos
      onMenuAction: (callback: (action: string) => void) => void;
      removeMenuActionListener: (callback: (action: string) => void) => void;
    };
    
    versions: {
      node: () => string;
      chrome: () => string;
      electron: () => string;
      app: () => string;
    };
  }
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.ico' {
  const content: string;
  export default content;
}

export {};