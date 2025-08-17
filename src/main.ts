import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { initBibliaService } from './database/biblia-service';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..');

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = app.isPackaged 
  ? path.join(process.resourcesPath, 'app.asar/dist')
  : path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    icon: path.join(process.env.VITE_PUBLIC || '', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,

      webSecurity: true,
    },
    titleBarStyle: 'default',
    frame: true,
  });

  // Configurar menu da aplicação
  createApplicationMenu();

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.postMessage('main-process-message', new Date().toLocaleString());
  });

  console.log('VITE_DEV_SERVER_URL:', VITE_DEV_SERVER_URL);
  console.log('RENDERER_DIST:', RENDERER_DIST);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('app.isPackaged:', app.isPackaged);

  // Force dev server URL in development
  const isDev = !app.isPackaged;
  let devServerUrl = VITE_DEV_SERVER_URL;

  // If VITE_DEV_SERVER_URL is not set but we're in dev mode, use the configured port
  if (!devServerUrl && isDev) {
    devServerUrl = 'http://localhost:5180';
    console.log('VITE_DEV_SERVER_URL not set, using configured port:', devServerUrl);
  }

  if (devServerUrl) {
    console.log('Loading dev server URL:', devServerUrl);
    win.loadURL(devServerUrl).catch(error => {
      console.error('Failed to load dev server URL:', error);
      // Fallback to file
      const indexPath = path.join(RENDERER_DIST, 'index.html');
      console.log('Falling back to file:', indexPath);
      win?.loadFile(indexPath);
    });
  } else {
    // Em produção, usar o caminho correto
    const indexPath = path.join(RENDERER_DIST, 'index.html');

    console.log('Loading file:', indexPath);
    win.loadFile(indexPath).catch(error => {
      console.error('Falha ao carregar:', error);
      // Como último recurso, carregar uma página de erro simples
      win.loadURL('data:text/html;charset=utf-8,<h1>Erro ao carregar aplicação</h1><p>Contate o suporte técnico.</p>');
    });
  }

  // Timeout para mostrar janela mesmo se não carregar completamente
  const showTimeout = setTimeout(() => {
    if (win && !win.isVisible()) {
      console.log('Forçando exibição da janela após timeout');
      win.show();
    }
  }, 10000); // 10 segundos

  // Mostrar janela quando estiver pronta
  win.once('ready-to-show', () => {
    clearTimeout(showTimeout);
    console.log('Janela pronta para exibição');
    win?.show();

    if (process.env.NODE_ENV === 'development') {
      win?.webContents.openDevTools();
    }
  });

  // Log adicional para debug
  win.webContents.once('did-finish-load', () => {
    console.log('Conteúdo da janela carregado com sucesso');
  });

  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Falha ao carregar:', { errorCode, errorDescription, validatedURL });
  });

  // Gerenciar fechamento da janela
  win.on('closed', () => {
    win = null;
  });

  // Prevenir navegação externa
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      import('electron').then(({ shell }) => shell.openExternal(url));
    }
    return { action: 'deny' };
  });
}

function createApplicationMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Arquivo',
      submenu: [
        {
          label: 'Nova Anotação',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            win?.webContents.send('menu-action', 'nova-anotacao');
          }
        },
        { type: 'separator' },
        {
          label: 'Exportar Favoritos',
          click: () => {
            win?.webContents.send('menu-action', 'exportar-favoritos');
          }
        },
        {
          label: 'Importar Favoritos',
          click: () => {
            win?.webContents.send('menu-action', 'importar-favoritos');
          }
        },
        { type: 'separator' },
        {
          label: 'Sair',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { label: 'Desfazer', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Refazer', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Recortar', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Copiar', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Colar', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Selecionar Tudo', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: 'Navegação',
      submenu: [
        {
          label: 'Início',
          accelerator: 'CmdOrCtrl+Home',
          click: () => {
            win?.webContents.send('menu-action', 'ir-inicio');
          }
        },
        {
          label: 'Bíblia',
          accelerator: 'CmdOrCtrl+B',
          click: () => {
            win?.webContents.send('menu-action', 'ir-biblia');
          }
        },
        {
          label: 'Buscar',
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            win?.webContents.send('menu-action', 'ir-busca');
          }
        },
        {
          label: 'Favoritos',
          accelerator: 'CmdOrCtrl+D',
          click: () => {
            win?.webContents.send('menu-action', 'ir-favoritos');
          }
        },
        {
          label: 'Anotações',
          accelerator: 'CmdOrCtrl+Shift+A',
          click: () => {
            win?.webContents.send('menu-action', 'ir-anotacoes');
          }
        }
      ]
    },
    {
      label: 'Visualizar',
      submenu: [
        {
          label: 'Alternar Tema',
          accelerator: 'CmdOrCtrl+Shift+T',
          click: () => {
            win?.webContents.send('menu-action', 'alternar-tema');
          }
        },
        { type: 'separator' },
        {
          label: 'Aumentar Fonte',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            win?.webContents.send('menu-action', 'aumentar-fonte');
          }
        },
        {
          label: 'Diminuir Fonte',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            win?.webContents.send('menu-action', 'diminuir-fonte');
          }
        },
        {
          label: 'Fonte Padrão',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            win?.webContents.send('menu-action', 'fonte-padrao');
          }
        },
        { type: 'separator' },
        { label: 'Recarregar', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Forçar Recarregar', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { label: 'Ferramentas do Desenvolvedor', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Tela Cheia', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Janela',
      submenu: [
        { label: 'Minimizar', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { label: 'Fechar', accelerator: 'CmdOrCtrl+W', role: 'close' }
      ]
    },
    {
      label: 'Ajuda',
      submenu: [
        {
          label: 'Sobre a Bíblia Sagrada',
          click: () => {
            win?.webContents.send('menu-action', 'sobre');
          }
        },
        {
          label: 'Atalhos do Teclado',
          click: () => {
            win?.webContents.send('menu-action', 'atalhos');
          }
        },
        { type: 'separator' },
        {
          label: 'Versículo do Dia',
          click: () => {
            win?.webContents.send('menu-action', 'versiculo-dia');
          }
        }
      ]
    }
  ];

  // Ajustar menu para macOS
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { label: 'Sobre ' + app.getName(), role: 'about' },
        { type: 'separator' },
        { label: 'Serviços', role: 'services', submenu: [] },
        { type: 'separator' },
        { label: 'Ocultar ' + app.getName(), accelerator: 'Command+H', role: 'hide' },
        { label: 'Ocultar Outros', accelerator: 'Command+Shift+H', role: 'hideOthers' },
        { label: 'Mostrar Tudo', role: 'unhide' },
        { type: 'separator' },
        { label: 'Sair', accelerator: 'Command+Q', click: () => app.quit() }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event listeners
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(async () => {
  try {
    console.log('Inicializando aplicação...');

    // Criar janela principal
    createWindow();

    console.log('Aplicação inicializada com sucesso!');

    // Registrar handlers IPC com timeout para não bloquear indefinidamente
    Promise.race([
      registerIpcHandlers(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout na inicialização dos serviços')), 30000)
      )
    ]).catch(error => {
      console.error('Erro ao inicializar serviços:', error);
      console.log('Aplicação continuará funcionando com funcionalidade limitada');
    });

  } catch (error) {
    console.error('Erro ao inicializar aplicação:', error);
    app.quit();
  }
});

// IPC Handlers para comunicação com o renderer
async function registerIpcHandlers() {
  console.log('🔧 Registrando handlers IPC...');
  console.log('Inicializando serviço híbrido da Bíblia...');
  
  let bibliaService;
  try {
    bibliaService = await initBibliaService();
    console.log('✅ Serviço da Bíblia inicializado, registrando handlers...');
  } catch (error) {
    console.error('❌ Erro crítico ao inicializar serviço da Bíblia:', error);
    console.log('🔄 Tentando recuperação do serviço...');
    
    // Tentar recuperação básica
    try {
      const { getBibliaService } = await import('./database/biblia-service');
      bibliaService = getBibliaService();
      console.log('⚠️ Usando serviço sem inicialização completa');
    } catch (recoveryError) {
      console.error('💥 Falha na recuperação do serviço:', recoveryError);
      // Don't throw error to prevent app from closing
      console.log('⚠️ Continuando sem serviço da Bíblia - app funcionará com funcionalidade limitada');
      bibliaService = null;
    }
  }

  // Livros
  ipcMain.handle('get-livros', async () => {
    try {
      console.log('📚 Handler get-livros chamado');
      
      if (!bibliaService) {
        console.error('📚 Serviço da Bíblia não disponível');
        return { success: false, error: 'Serviço não inicializado', data: null };
      }

      const result = await bibliaService.getLivros();
      console.log('📚 Result success:', result.success);
      console.log('📚 Result data length:', result.data?.length);

      // Sempre retornar estrutura completa DatabaseResponse
      if (result.success && result.data) {
        const response = { success: true, data: result.data };
        return response;
      } else {
        const response = { success: false, error: result.error || 'Erro desconhecido', data: null };
        return response;
      }
    } catch (error) {
      console.error('📚 Erro crítico ao buscar livros:', error);
      const response = { success: false, error: (error as Error).message, data: null };
      return response;
    }
  });

  ipcMain.handle('get-livro', async (_, id: number) => {
    try {
      const result = await bibliaService.getLivro(id);
      return result.success ? result.data : { success: false, error: result.error };
    } catch (error) {
      console.error('Erro ao buscar livro:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Versículos
  ipcMain.handle('get-versiculos-capitulo', async (_, livroId: number, capitulo: number) => {
    try {
      console.log('📖 Handler get-versiculos-capitulo chamado com:', { livroId, capitulo });
      
      if (!bibliaService) {
        console.error('📖 Serviço da Bíblia não disponível');
        return { success: false, error: 'Serviço não inicializado', data: null };
      }

      const result = await bibliaService.getVersiculosCapitulo(livroId, capitulo);
      console.log('📖 Result success:', result.success);
      console.log('📖 Result data length:', result.data?.length);

      // Sempre retornar estrutura completa DatabaseResponse
      if (result.success && result.data) {
        const response = { success: true, data: result.data };
        return response;
      } else {
        const response = { success: false, error: result.error || 'Erro desconhecido ao carregar versículos', data: null };
        return response;
      }
    } catch (error) {
      console.error('📖 Erro crítico ao buscar versículos:', error);
      const response = { success: false, error: (error as Error).message, data: null };
      return response;
    }
  });

  ipcMain.handle('get-versiculo', async (_, id: number) => {
    try {
      const result = await bibliaService.getVersiculo(id);
      return result.success ? result.data : { success: false, error: result.error };
    } catch (error) {
      console.error('Erro ao buscar versículo:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Busca
  ipcMain.handle('buscar-versiculos', async (_, parametros) => {
    try {
      const result = await bibliaService.buscarVersiculos(parametros);
      return result.success ? result.data : { success: false, error: result.error };
    } catch (error) {
      console.error('Erro ao buscar versículos:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Favoritos
  ipcMain.handle('get-favoritos', async () => {
    try {
      const result = await bibliaService.getFavoritos();
      return result.success ? result.data : { success: false, error: result.error };
    } catch (error) {
      console.error('Erro ao buscar favoritos:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('adicionar-favorito', async (_, versiculoId: number) => {
    try {
      const result = await bibliaService.adicionarFavorito(versiculoId);
      return result.success ? { success: true } : { success: false, error: result.error };
    } catch (error) {
      console.error('Erro ao adicionar favorito:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('remover-favorito', async (_, versiculoId: number) => {
    try {
      const result = await bibliaService.removerFavorito(versiculoId);
      return result.success ? { success: true } : { success: false, error: result.error };
    } catch (error) {
      console.error('Erro ao remover favorito:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('verificar-favorito', async (_, versiculoId: number) => {
    try {
      const result = await bibliaService.verificarFavorito(versiculoId);
      return result.success ? result.data : { success: false, error: result.error };
    } catch (error) {
      console.error('Erro ao verificar favorito:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Anotações
  ipcMain.handle('get-anotacoes', async () => {
    try {
      const result = await bibliaService.getAnotacoes();
      return result.success ? result.data : { success: false, error: result.error };
    } catch (error) {
      console.error('Erro ao buscar anotações:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('get-anotacoes-versiculo', async (_, versiculoId: number) => {
    try {
      const result = await bibliaService.getAnotacoesVersiculo(versiculoId);
      return result.success ? result.data : { success: false, error: result.error };
    } catch (error) {
      console.error('Erro ao buscar anotações do versículo:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('adicionar-anotacao', async (_, versiculoId: number, titulo: string, conteudo: string) => {
    try {
      const result = await bibliaService.adicionarAnotacao(versiculoId, titulo, conteudo);
      return result.success ? result.data : { success: false, error: result.error };
    } catch (error) {
      console.error('Erro ao adicionar anotação:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('atualizar-anotacao', async (_, id: number, titulo: string, conteudo: string) => {
    try {
      const result = await bibliaService.atualizarAnotacao(id, titulo, conteudo);
      return result.success ? { success: true } : { success: false, error: result.error };
    } catch (error) {
      console.error('Erro ao atualizar anotação:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('remover-anotacao', async (_, id: number) => {
    try {
      const result = await bibliaService.removerAnotacao(id);
      return result.success ? { success: true } : { success: false, error: result.error };
    } catch (error) {
      console.error('Erro ao remover anotação:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Histórico
  ipcMain.handle('adicionar-historico', async (_, livroId: number, capitulo: number) => {
    try {
      const result = await bibliaService.adicionarHistorico(livroId, capitulo);
      return result.success ? { success: true } : { success: false, error: result.error };
    } catch (error) {
      console.error('Erro ao adicionar ao histórico:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('get-historico', async () => {
    try {
      const result = await bibliaService.getHistorico();
      return result.success ? result.data : { success: false, error: result.error };
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Versículo do dia
  ipcMain.handle('get-versiculo-dia', async () => {
    try {
      if (!bibliaService) {
        console.error('Serviço da Bíblia não disponível para versículo do dia');
        return { success: false, error: 'Serviço não inicializado' };
      }
      
      const result = await bibliaService.getVersiculoDia();
      return result.success ? result.data : { success: false, error: result.error };
    } catch (error) {
      console.error('Erro ao buscar versículo do dia:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Configurações
  ipcMain.handle('get-configuracao', async (_, chave: string) => {
    try {
      const result = await bibliaService.getConfiguracao(chave);
      return result.success ? result.data : { success: false, error: result.error };
    } catch (error) {
      console.error('Erro ao buscar configuração:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  ipcMain.handle('set-configuracao', async (_, chave: string, valor: string) => {
    try {
      const result = await bibliaService.setConfiguracao(chave, valor);
      return result.success ? { success: true } : { success: false, error: result.error };
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Estatísticas
  ipcMain.handle('get-estatisticas', async () => {
    try {
      const result = await bibliaService.getEstatisticas();
      return result.success ? result.data : { success: false, error: result.error };
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Gerenciamento de janela
  ipcMain.handle('minimize-window', () => {
    win?.minimize();
  });

  ipcMain.handle('maximize-window', () => {
    if (win?.isMaximized()) {
      win.unmaximize();
    } else {
      win?.maximize();
    }
  });

  ipcMain.handle('close-window', () => {
    win?.close();
  });

  ipcMain.handle('get-window-state', () => {
    return {
      isMaximized: win?.isMaximized() || false,
      isFullScreen: win?.isFullScreen() || false,
      isMinimized: win?.isMinimized() || false
    };
  });

  console.log('✅ Todos os handlers IPC registrados com sucesso!');
}

// Prevent unexpected crashes
process.on('uncaughtException', (error) => {
  console.error('❌ Exceção não capturada:', error);
  console.log('⚠️ Aplicação continuará funcionando...');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rejeitada não tratada:', reason);
  console.log('⚠️ Aplicação continuará funcionando...');
});

// Cleanup on quit
app.on('before-quit', async () => {
  console.log('Aplicação sendo encerrada...');
});

// Prevenir múltiplas instâncias
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Alguém tentou executar uma segunda instância, focar nossa janela
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

// Configurações de segurança
app.on('web-contents-created', (event, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
  
  // Prevent crashes from renderer errors
  contents.on('crashed', (event, killed) => {
    console.error('❌ Renderer process crashed:', { killed });
    if (win && !win.isDestroyed()) {
      console.log('🔄 Tentando recarregar a janela...');
      win.reload();
    }
  });
  
  contents.on('unresponsive', () => {
    console.error('❌ Renderer process unresponsive');
  });
  
  contents.on('responsive', () => {
    console.log('✅ Renderer process responsive again');
  });
});
