import { contextBridge, ipcRenderer } from 'electron';
import type { 
  Livro, 
  Versiculo, 
  Favorito, 
  Anotacao, 
  HistoricoLeitura, 
  VersiculoDia, 
  ResultadoBusca, 
  DatabaseResponse, 
  BuscaParametros 
} from './types';

console.log('🔧 Preload script carregado');

// Definir tipos para o contexto da API
export interface ElectronAPI {
  // Livros
  getLivros: () => Promise<DatabaseResponse<Livro[]>>;
  getLivro: (id: number) => Promise<DatabaseResponse<Livro>>;
  
  // Versículos
  getVersiculosCapitulo: (livroId: number, capitulo: number) => Promise<DatabaseResponse<Versiculo[]>>;
  getVersiculo: (id: number) => Promise<DatabaseResponse<Versiculo & { livro_nome: string }>>;
  
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
  getEstatisticas: () => Promise<DatabaseResponse<Record<string, unknown>>>;
  
  // Janela
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  getWindowState: () => Promise<{isMaximized: boolean}>;
  
  // Eventos
  onMenuAction: (callback: (action: string) => void) => void;
  removeMenuActionListener: (callback: (action: string) => void) => void;

  // Teste
  test: () => Promise<{success: boolean, message: string}>;
}

// API segura exposta ao contexto da janela
const electronAPI: ElectronAPI = {
  // Livros
  getLivros: () => {
    console.log('📚 getLivros chamado do preload');
    return ipcRenderer.invoke('get-livros');
  },
  getLivro: (id: number) => ipcRenderer.invoke('get-livro', id),
  
  // Versículos
  getVersiculosCapitulo: (livroId: number, capitulo: number) => {
    console.log('📖 getVersiculosCapitulo chamado do preload');
    return ipcRenderer.invoke('get-versiculos-capitulo', livroId, capitulo);
  },
  getVersiculo: (id: number) => ipcRenderer.invoke('get-versiculo', id),
  
  // Busca
  buscarVersiculos: (parametros: BuscaParametros) => ipcRenderer.invoke('buscar-versiculos', parametros),
  
  // Favoritos
  getFavoritos: () => ipcRenderer.invoke('get-favoritos'),
  adicionarFavorito: (versiculoId: number) => ipcRenderer.invoke('adicionar-favorito', versiculoId),
  removerFavorito: (versiculoId: number) => ipcRenderer.invoke('remover-favorito', versiculoId),
  verificarFavorito: (versiculoId: number) => ipcRenderer.invoke('verificar-favorito', versiculoId),
  
  // Anotações
  getAnotacoes: () => ipcRenderer.invoke('get-anotacoes'),
  getAnotacoesVersiculo: (versiculoId: number) => 
    ipcRenderer.invoke('get-anotacoes-versiculo', versiculoId),
  adicionarAnotacao: (versiculoId: number, titulo: string, conteudo: string) => 
    ipcRenderer.invoke('adicionar-anotacao', versiculoId, titulo, conteudo),
  atualizarAnotacao: (id: number, titulo: string, conteudo: string) => 
    ipcRenderer.invoke('atualizar-anotacao', id, titulo, conteudo),
  removerAnotacao: (id: number) => ipcRenderer.invoke('remover-anotacao', id),
  
  // Histórico
  adicionarHistorico: (livroId: number, capitulo: number) => 
    ipcRenderer.invoke('adicionar-historico', livroId, capitulo),
  getHistorico: () => ipcRenderer.invoke('get-historico'),
  
  // Versículo do dia
  getVersiculoDia: () => ipcRenderer.invoke('get-versiculo-dia'),
  
  // Configurações
  getConfiguracao: (chave: string) => ipcRenderer.invoke('get-configuracao', chave),
  setConfiguracao: (chave: string, valor: string) => 
    ipcRenderer.invoke('set-configuracao', chave, valor),
  
  // Estatísticas
  getEstatisticas: () => ipcRenderer.invoke('get-estatisticas'),
  
  // Janela
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  getWindowState: () => ipcRenderer.invoke('get-window-state'),
  
  // Eventos
  onMenuAction: (callback: (action: string) => void) => {
    const handler = (_: unknown, action: string) => callback(action);
    ipcRenderer.on('menu-action', handler);
  },
  removeMenuActionListener: (callback: (action: string) => void) => {
    const handler = (_: unknown, action: string) => callback(action);
    ipcRenderer.removeListener('menu-action', handler);
  },

  // Teste
  test: () => {
    console.log('🧪 Função de teste chamada');
    return Promise.resolve({ success: true, message: 'API funcionando!' });
  }
};

// Expor API no contexto global de forma segura
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI);
    console.log('✅ API Electron exposta com sucesso via contextBridge');
  } catch (error) {
    console.error('❌ Erro ao expor API Electron:', error);
  }
} else {
  // Fallback para quando contextIsolation está desabilitado
  console.log('⚠️ ContextIsolation desabilitado, usando fallback');
  (window as unknown as { electronAPI: ElectronAPI }).electronAPI = electronAPI;
}

// Expor versão do processo para debugging
try {
  contextBridge.exposeInMainWorld('debugInfo', {
    versions: process.versions,
    contextIsolated: process.contextIsolated,
    nodeEnv: process.env.NODE_ENV
  });
  console.log('✅ Debug info exposta');
} catch (error) {
  console.error('❌ Erro ao expor debug info:', error);
}

// Declarar tipos globais para TypeScript
declare global {
  interface Window {
    electronAPI: ElectronAPI;
    debugInfo: any;
  }
}

// Expor versão do processo para debugging
contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  // Versão do aplicativo
  app: async () => {
    try {
      const { app } = await import('electron');
      return app?.getVersion?.() || 'unknown';
    } catch {
      return 'unknown';
    }
  }
});

// Logs de desenvolvimento
console.log('📋 Informações do ambiente:', {
  contextIsolated: process.contextIsolated,
  nodeEnv: process.env.NODE_ENV,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});

// Testar se a API foi exposta corretamente
setTimeout(() => {
  console.log('🔍 Verificando se API foi exposta...');
  // @ts-ignore
  if (typeof window !== 'undefined' && window.electronAPI) {
    console.log('✅ electronAPI disponível no window');
    // @ts-ignore
    console.log('📋 Funções disponíveis:', Object.keys(window.electronAPI));
  } else {
    console.error('❌ electronAPI NÃO disponível no window');
  }
}, 500);

// Teste adicional após DOM carregar
const domContentLoaded = () => {
  console.log('🔍 DOM carregado, verificando API novamente...');
  // @ts-ignore
  if (typeof window !== 'undefined' && window.electronAPI) {
    console.log('✅ electronAPI disponível após DOM carregar');
    // @ts-ignore
    console.log('📋 Funções disponíveis:', Object.keys(window.electronAPI));
  } else {
    console.error('❌ electronAPI NÃO disponível após DOM carregar');
  }
};

// Aguardar DOM carregar
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', domContentLoaded);
  } else {
    domContentLoaded();
  }
}