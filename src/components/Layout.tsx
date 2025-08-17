import React, { useState } from 'react';
import { 
  BookOpen, 
  Home, 
  Heart, 
  StickyNote, 
  Settings, 
  Search,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../utils/cn';

interface LayoutProps {
  children: React.ReactNode;
  paginaAtual: string;
  onMudarPagina: (pagina: string) => void;
}

const itensMenu = [
  { id: 'inicio', nome: 'Início', icone: Home },
  { id: 'biblia', nome: 'Bíblia', icone: BookOpen },
  { id: 'busca', nome: 'Buscar', icone: Search },
  { id: 'favoritos', nome: 'Favoritos', icone: Heart },
  { id: 'anotacoes', nome: 'Anotações', icone: StickyNote },
  { id: 'configuracoes', nome: 'Configurações', icone: Settings },
];

export const Layout: React.FC<LayoutProps> = ({ children, paginaAtual, onMudarPagina }) => {
  const [sidebarAberta, setSidebarAberta] = useState(false);

  const toggleSidebar = () => {
    setSidebarAberta(!sidebarAberta);
  };

  const selecionarItem = (id: string) => {
    onMudarPagina(id);
    setSidebarAberta(false); // Fechar sidebar no mobile após seleção
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Overlay para mobile */}
      {sidebarAberta && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarAberta(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-in-out lg:translate-x-0",
        sidebarAberta ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header da Sidebar */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <h1 className="text-xl font-bold text-primary">Bíblia Sagrada</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={toggleSidebar}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Menu de Navegação */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {itensMenu.map((item) => {
                const IconeItem = item.icone;
                const ativo = paginaAtual === item.id;
                
                return (
                  <li key={item.id}>
                    <Button
                      variant={ativo ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start text-left",
                        ativo && "bg-primary text-primary-foreground"
                      )}
                      onClick={() => selecionarItem(item.id)}
                    >
                      <IconeItem className="mr-3 h-4 w-4" />
                      {item.nome}
                      {ativo && <ChevronRight className="ml-auto h-4 w-4" />}
                    </Button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer da Sidebar */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
              <p>Bíblia King James</p>
              <p>Versão em Português</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Mobile */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="font-semibold text-primary">Bíblia Sagrada</span>
          </div>
          <div className="w-10" /> {/* Espaçador para centralizar o título */}
        </header>

        {/* Área de Conteúdo */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;