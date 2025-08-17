import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  BookOpen, 
  Heart, 
  StickyNote,
  Share,
  Copy,
  ChevronDown,
  Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

import { Livro, Versiculo } from '../types';
import { formatarReferencia, copiarParaClipboard } from '../utils/cn';
import { useNavegacao } from '../hooks/useNavegacao';

export const Biblia: React.FC = () => {
  const [livros, setLivros] = useState<Livro[]>([]);
  const [versiculos, setVersiculos] = useState<Versiculo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarSeletorLivro, setMostrarSeletorLivro] = useState(false);
  const [buscarLivro, setBuscarLivro] = useState('');
  const [versiculosFavoritos, setVersiculosFavoritos] = useState<Set<number>>(new Set());
  
  const {
    livroAtual,
    capituloAtual,
    setLivroAtual,
    setCapituloAtual,
    proximoCapitulo,
    capituloAnterior,
    podeAvancarCapitulo,
    podeVoltarCapitulo
  } = useNavegacao();
  
  useEffect(() => {
    console.log('📚 Frontend: useEffect - iniciando carregamento de livros');
    console.log('📚 Frontend: window.electronAPI disponível?', !!window.electronAPI);
    console.log('📚 Frontend: Todas as funções da API:', Object.keys(window.electronAPI || {}));
    carregarLivros();
  }, []);

  useEffect(() => {
    if (livroAtual) {
      console.log('📖 Frontend: Livro/capítulo mudou:', livroAtual.nome, capituloAtual);
      carregarVersiculos();
      adicionarAoHistorico();
    }
  }, [livroAtual, capituloAtual]);

  const carregarLivros = async () => {
    try {
      console.log('📚 Frontend: Chamando window.electronAPI.getLivros()...');
      console.log('📚 Frontend: window.electronAPI.getLivros é função?', typeof window.electronAPI?.getLivros);
      
      if (!window.electronAPI) {
        console.error('📚 Frontend: window.electronAPI não está disponível!');
        return;
      }
      
      if (!window.electronAPI.getLivros) {
        console.error('📚 Frontend: window.electronAPI.getLivros não está disponível!');
        return;
      }
      
      console.log('📚 Frontend: Fazendo chamada IPC...');
      const result = await window.electronAPI.getLivros();
      console.log('📚 Frontend: Resultado getLivros:', result);
      
      if (result && result.success && result.data) {
        console.log('📚 Frontend: Livros carregados:', result.data.length);
        setLivros(result.data);
        
        // Se não há livro atual, selecionar o primeiro (Gênesis)
        if (!livroAtual && result.data.length > 0) {
          console.log('📚 Frontend: Definindo livro inicial:', result.data[0].nome);
          setLivroAtual(result.data[0]);
        }
      } else {
        console.error('📚 Frontend: Erro no resultado getLivros:', result);
        console.error('📚 Frontend: result.success:', result?.success);
        console.error('📚 Frontend: result.data:', result?.data);
        console.error('📚 Frontend: result.error:', result?.error);
      }
    } catch (error) {
      console.error('📚 Frontend: Erro ao carregar livros:', error);
      console.error('📚 Frontend: Stack trace:', error instanceof Error ? error.stack : 'N/A');
    } finally {
      setCarregando(false);
    }
  };

  const carregarVersiculos = async () => {
    if (!livroAtual) {
      console.log('📖 Frontend: Não há livro atual, pulando carregamento de versículos');
      return;
    }
    
    console.log('📖 Frontend: Carregando versículos para:', livroAtual.nome, 'cap.', capituloAtual);
    console.log('📖 Frontend: Parâmetros da chamada:', { livroId: livroAtual.id, capitulo: capituloAtual });
    setCarregando(true);
    try {
      if (!window.electronAPI?.getVersiculosCapitulo) {
        console.error('📖 Frontend: getVersiculosCapitulo não disponível');
        setCarregando(false);
        return;
      }
      
      console.log('📖 Frontend: Fazendo chamada IPC getVersiculosCapitulo...');
      const result = await window.electronAPI.getVersiculosCapitulo(livroAtual.id, capituloAtual);
      console.log('📖 Frontend: Resultado versículos completo:', JSON.stringify(result, null, 2));
      console.log('📖 Frontend: result.success:', result?.success);
      console.log('📖 Frontend: result.data length:', result?.data?.length);
      console.log('📖 Frontend: result.error:', result?.error);
      
      if (result && result.success && result.data) {
        console.log('📖 Frontend: Versículos carregados com sucesso:', result.data.length);
        console.log('📖 Frontend: Primeiro versículo:', result.data[0]?.texto?.substring(0, 50) + '...');
        setVersiculos(result.data);
        await carregarFavoritos();
      } else {
        console.error('📖 Frontend: Erro no resultado versículos:', result);
        console.error('📖 Frontend: Definindo array vazio para versículos');
        setVersiculos([]);
      }
    } catch (error) {
      console.error('📖 Frontend: Erro crítico ao carregar versículos:', error);
      console.error('📖 Frontend: Stack trace:', error instanceof Error ? error.stack : 'N/A');
      setVersiculos([]);
    } finally {
      setCarregando(false);
    }
  };

  const carregarFavoritos = async () => {
    try {
      const favoritosResult = await window.electronAPI.getFavoritos();
      if (favoritosResult.success && favoritosResult.data) {
        const favoritosIds = new Set(favoritosResult.data.map(f => f.versiculo_id));
        setVersiculosFavoritos(favoritosIds);
      }
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
    }
  };

  const adicionarAoHistorico = async () => {
    if (!livroAtual) return;
    
    try {
      await window.electronAPI.adicionarHistorico(livroAtual.id, capituloAtual);
    } catch (error) {
      console.error('Erro ao adicionar ao histórico:', error);
    }
  };

  const toggleFavorito = async (versiculoId: number) => {
    try {
      const isFavorito = versiculosFavoritos.has(versiculoId);
      
      if (isFavorito) {
        await window.electronAPI.removerFavorito(versiculoId);
        setVersiculosFavoritos(prev => {
          const nova = new Set(prev);
          nova.delete(versiculoId);
          return nova;
        });
      } else {
        await window.electronAPI.adicionarFavorito(versiculoId);
        setVersiculosFavoritos(prev => new Set(prev).add(versiculoId));
      }
    } catch (error) {
      console.error('Erro ao toggle favorito:', error);
    }
  };

  const copiarVersiculo = async (versiculo: Versiculo) => {
    const texto = `${versiculo.texto}\n\n${formatarReferencia(livroAtual?.nome || '', capituloAtual, versiculo.numero)}`;
    const sucesso = await copiarParaClipboard(texto);
    
    if (sucesso) {
      // Aqui você poderia mostrar uma notificação de sucesso
      console.log('Versículo copiado!');
    }
  };

  const livrosFiltrados = livros.filter(livro =>
    livro.nome.toLowerCase().includes(buscarLivro.toLowerCase()) ||
    livro.abreviacao.toLowerCase().includes(buscarLivro.toLowerCase())
  );

  const selecionarLivro = (livro: Livro) => {
    setLivroAtual(livro);
    setMostrarSeletorLivro(false);
    setBuscarLivro('');
  };

  const irParaCapitulo = (numeroCapitulo: number) => {
    if (livroAtual && numeroCapitulo >= 1 && numeroCapitulo <= livroAtual.capitulos_total) {
      setCapituloAtual(numeroCapitulo);
    }
  };

  if (!livroAtual) {
    return (
      <div className="p-6">
        <div className="text-center">
          <BookOpen className="h-12 w-12 mx-auto text-gray-600 dark:text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Carregando Bíblia...</h2>
          <p className="text-gray-600 dark:text-gray-400">Por favor, aguarde.</p>
          <div className="mt-4 text-sm text-gray-500 space-y-2">
            <p><strong>Estado atual:</strong></p>
            <p>- Livros carregados: {livros.length}</p>
            <p>- Carregando: {carregando ? 'Sim' : 'Não'}</p>
            <p>- electronAPI: {window.electronAPI ? 'Disponível' : 'Indisponível'}</p>
            <p>- debugInfo: {(window as any).debugInfo ? 'Disponível' : 'Indisponível'}</p>
            {window.electronAPI && (
              <p>- Funções API: {Object.keys(window.electronAPI).join(', ')}</p>
            )}
            {(window as any).debugInfo && (
              <div className="text-xs">
                <p>- Node: {(window as any).debugInfo.versions.node}</p>
                <p>- Electron: {(window as any).debugInfo.versions.electron}</p>
                <p>- Context Isolated: {(window as any).debugInfo.contextIsolated ? 'Sim' : 'Não'}</p>
              </div>
            )}
          </div>
          <div className="mt-4 space-x-2">
            <button 
              onClick={() => {
                console.log('🔄 Frontend: Tentativa manual de carregar livros');
                carregarLivros();
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Tentar Novamente
            </button>
            <button 
              onClick={async () => {
                console.log('🧪 Frontend: Testando API básica');
                if (window.electronAPI?.test) {
                  try {
                    const result = await window.electronAPI.test();
                    console.log('🧪 Frontend: Resultado do teste:', result);
                    alert(`Teste OK: ${JSON.stringify(result)}`);
                  } catch (error) {
                    console.error('🧪 Frontend: Erro no teste:', error);
                    alert(`Erro no teste: ${error}`);
                  }
                } else {
                  alert('Função test não disponível!');
                }
              }}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Testar API
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho de Navegação */}
      <div className="bg-card border-b border-gray-200 dark:border-gray-700 p-4 space-y-4">
        {/* Seletor de Livro */}
        <div className="relative">
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => setMostrarSeletorLivro(!mostrarSeletorLivro)}
          >
            <span className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4" />
              <span>{livroAtual.nome}</span>
            </span>
            <ChevronDown className="h-4 w-4" />
          </Button>

          {mostrarSeletorLivro && (
            <Card className="absolute top-full left-0 right-0 z-10 mt-1 max-h-80 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-600 dark:text-gray-400" />
                  <Input
                    placeholder="Buscar livro..."
                    value={buscarLivro}
                    onChange={(e) => setBuscarLivro(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0 max-h-60 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2">
                  {/* Antigo Testamento */}
                  <div className="p-3 border-r border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Antigo Testamento
                    </h4>
                    <div className="space-y-1">
                      {livrosFiltrados
                        .filter(livro => livro.testamento === 'Antigo')
                        .map(livro => (
                          <Button
                            key={livro.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 text-left"
                            onClick={() => selecionarLivro(livro)}
                          >
                            {livro.nome}
                          </Button>
                        ))
                      }
                    </div>
                  </div>

                  {/* Novo Testamento */}
                  <div className="p-3">
                    <h4 className="font-semibold text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Novo Testamento
                    </h4>
                    <div className="space-y-1">
                      {livrosFiltrados
                        .filter(livro => livro.testamento === 'Novo')
                        .map(livro => (
                          <Button
                            key={livro.id}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start h-8 text-left"
                            onClick={() => selecionarLivro(livro)}
                          >
                            {livro.nome}
                          </Button>
                        ))
                      }
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Navegação de Capítulos */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={capituloAnterior}
            disabled={!podeVoltarCapitulo}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Capítulo</span>
            <select
              value={capituloAtual}
              onChange={(e) => irParaCapitulo(Number(e.target.value))}
              className="px-2 py-1 border border-gray-200 dark:border-gray-700 rounded text-sm bg-white dark:bg-gray-900"
            >
              {Array.from({ length: livroAtual.capitulos_total }, (_, i) => i + 1).map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              de {livroAtual.capitulos_total}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={proximoCapitulo}
            disabled={!podeAvancarCapitulo}
          >
            Próximo
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Conteúdo dos Versículos */}
      <div className="flex-1 overflow-auto p-6">
        {carregando ? (
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-full mb-2"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Título do Capítulo */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">
                {formatarReferencia(livroAtual.nome, capituloAtual)}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {versiculos.length} versículo{versiculos.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Versículos */}
            <div className="space-y-4">
              {versiculos.map((versiculo) => {
                const isFavorito = versiculosFavoritos.has(versiculo.id);
                
                return (
                  <div
                    key={versiculo.id}
                    className="group flex items-start space-x-4 p-4 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Número do Versículo */}
                    <div className="flex-shrink-0 w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-semibold">
                      {versiculo.numero}
                    </div>

                    {/* Texto do Versículo */}
                    <div className="flex-1 min-w-0">
                      <p className="text-base leading-relaxed">
                        {versiculo.texto}
                      </p>
                    </div>

                    {/* Ações do Versículo */}
                    <div className="flex-shrink-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleFavorito(versiculo.id)}
                      >
                        <Heart 
                          className={`h-4 w-4 ${isFavorito ? 'fill-red-500 text-red-500' : ''}`} 
                        />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copiarVersiculo(versiculo)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                      >
                        <StickyNote className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                      >
                        <Share className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Navegação Inferior */}
            <div className="flex justify-between items-center mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                onClick={capituloAnterior}
                disabled={!podeVoltarCapitulo}
                className="flex items-center space-x-2"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Capítulo Anterior</span>
              </Button>

              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {formatarReferencia(livroAtual.nome, capituloAtual)}
                </p>
              </div>

              <Button
                variant="outline"
                onClick={proximoCapitulo}
                disabled={!podeAvancarCapitulo}
                className="flex items-center space-x-2"
              >
                <span>Próximo Capítulo</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Biblia;