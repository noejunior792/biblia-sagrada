import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Layout from './components/Layout';
import Inicio from './pages/Inicio';
import Biblia from './pages/Biblia';
import Busca from './pages/Busca';
import { TemaProvider } from './hooks/useTema';
import { NavegacaoProvider } from './hooks/useNavegacao';
import './index.css';

// Lazy loading das páginas para melhor performance
const Favoritos = React.lazy(() => import('./pages/Favoritos'));
const Anotacoes = React.lazy(() => import('./pages/Anotacoes'));
const Configuracoes = React.lazy(() => import('./pages/Configuracoes'));

const App: React.FC = () => {
  const [paginaAtual, setPaginaAtual] = useState<string>('inicio');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // Verificar se a API do Electron está disponível
    if (typeof window !== 'undefined' && window.electronAPI) {
      console.log('API Electron disponível');
      setCarregando(false);
    } else {
      console.error('API Electron não está disponível');
      setCarregando(false);
    }

    // Escutar ações do menu
    const handleMenuAction = (action: string) => {
      switch (action) {
        case 'ir-inicio':
          setPaginaAtual('inicio');
          break;
        case 'ir-biblia':
          setPaginaAtual('biblia');
          break;
        case 'ir-busca':
          setPaginaAtual('busca');
          break;
        case 'ir-favoritos':
          setPaginaAtual('favoritos');
          break;
        case 'ir-anotacoes':
          setPaginaAtual('anotacoes');
          break;
        case 'nova-anotacao':
          setPaginaAtual('anotacoes');
          // TODO: Abrir modal de nova anotação
          break;
        case 'alternar-tema':
          // TODO: Implementar toggle de tema via menu
          break;
        default:
          console.log('Ação de menu não reconhecida:', action);
      }
    };

    // Registrar listener de ações do menu
    if (window.electronAPI) {
      window.electronAPI.onMenuAction(handleMenuAction);
    }

    // Cleanup
    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeMenuActionListener(handleMenuAction);
      }
    };
  }, []);

  const handleMudarPagina = (novaPagina: string) => {
    setPaginaAtual(novaPagina);
  };

  const renderizarPagina = () => {
    switch (paginaAtual) {
      case 'inicio':
        return <Inicio />;
      case 'biblia':
        return <Biblia />;
      case 'busca':
        return <Busca />;
      case 'favoritos':
        return (
          <React.Suspense fallback={<div className="p-6">Carregando favoritos...</div>}>
            <Favoritos />
          </React.Suspense>
        );
      case 'anotacoes':
        return (
          <React.Suspense fallback={<div className="p-6">Carregando anotações...</div>}>
            <Anotacoes />
          </React.Suspense>
        );
      case 'configuracoes':
        return (
          <React.Suspense fallback={<div className="p-6">Carregando configurações...</div>}>
            <Configuracoes />
          </React.Suspense>
        );
      default:
        return <Inicio />;
    }
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando Bíblia Sagrada...</p>
        </div>
      </div>
    );
  }

  return (
    <TemaProvider>
      <NavegacaoProvider>
        <div className="min-h-screen bg-background text-foreground">
          <Layout 
            paginaAtual={paginaAtual} 
            onMudarPagina={handleMudarPagina}
          >
            {renderizarPagina()}
          </Layout>
        </div>
      </NavegacaoProvider>
    </TemaProvider>
  );
};

// Error Boundary para capturar erros de renderização
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Erro capturado pelo ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-6xl">😔</div>
            <h1 className="text-2xl font-bold text-foreground">
              Ops! Algo deu errado
            </h1>
            <p className="text-muted-foreground">
              Ocorreu um erro inesperado. Por favor, reinicie o aplicativo.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Recarregar Aplicativo
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground">
                  Detalhes do erro (desenvolvimento)
                </summary>
                <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-40">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Renderizar aplicativo
const container = document.getElementById('root');
if (!container) {
  throw new Error('Elemento root não encontrado');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Hot Module Replacement para desenvolvimento
if (process.env.NODE_ENV === 'development' && (module as unknown as { hot?: { accept: () => void } }).hot) {
  (module as unknown as { hot: { accept: () => void } }).hot.accept();
}

// Logs de inicialização
console.log('Bíblia Sagrada iniciada');
console.log('Modo:', process.env.NODE_ENV);

if (window.electronAPI) {
  // Verificar versões
  if (window.versions) {
    Promise.resolve(window.versions.app()).then((appVersion: string) => {
      console.log('Versões do sistema:', {
        node: window.versions.node(),
        chrome: window.versions.chrome(),
        electron: window.versions.electron(),
        app: appVersion
      });
    });
  }
}