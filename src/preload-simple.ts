import { contextBridge, ipcRenderer } from 'electron';

console.log('🔧 Preload script simples carregado');

// API básica para teste
const electronAPI = {
  getLivros: () => {
    console.log('📚 getLivros chamado do preload');
    return ipcRenderer.invoke('get-livros');
  },
  test: () => {
    console.log('🧪 Função de teste chamada');
    return Promise.resolve({ success: true, message: 'API funcionando!' });
  }
};

// Expor API
try {
  contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  console.log('✅ API simples exposta com sucesso');
} catch (error) {
  console.error('❌ Erro ao expor API:', error);
}

// Teste direto
setTimeout(() => {
  console.log('🔍 Verificando se API foi exposta...');
  // @ts-ignore
  if (typeof window !== 'undefined' && window.electronAPI) {
    console.log('✅ electronAPI disponível no window global');
    // @ts-ignore
    console.log('📋 Funções disponíveis:', Object.keys(window.electronAPI));
  } else {
    console.error('❌ electronAPI NÃO disponível no window global');
  }
}, 500);

// Exposição adicional para debug
contextBridge.exposeInMainWorld('debugInfo', {
  versions: process.versions,
  contextIsolated: process.contextIsolated,
  nodeEnv: process.env.NODE_ENV
});

console.log('📋 Informações do processo:', {
  contextIsolated: process.contextIsolated,
  nodeEnv: process.env.NODE_ENV,
  versions: {
    node: process.versions.node,
    electron: process.versions.electron
  }
});