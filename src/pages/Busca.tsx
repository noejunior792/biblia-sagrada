import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  BookOpen, 
  Heart, 
  StickyNote,
  X,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';

import { Livro, ResultadoBusca, BuscaParametros } from '../types';
import { formatarReferencia, debounce, destacarTexto } from '../utils/cn';
import { useNavegacao } from '../hooks/useNavegacao';

export const Busca: React.FC = () => {
  const [termoBusca, setTermoBusca] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusca[]>([]);
  const [livros, setLivros] = useState<Livro[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [buscaRealizada, setBuscaRealizada] = useState(false);
  
  // Filtros
  const [livroSelecionado, setLivroSelecionado] = useState<number | undefined>(undefined);
  const [testamentoSelecionado, setTestamentoSelecionado] = useState<'Antigo' | 'Novo' | undefined>(undefined);
  const [buscaExata, setBuscaExata] = useState(false);
  
  const { navegarPara } = useNavegacao();

  useEffect(() => {
    carregarLivros();
  }, []);

  // Debounce da busca para evitar muitas consultas
  const debouncedBusca = debounce((termo: any) => {
    if (termo.trim().length >= 3) {
      realizarBusca(termo);
    } else {
      setResultados([]);
      setBuscaRealizada(false);
    }
  }, 500);

  useEffect(() => {
    debouncedBusca(termoBusca);
  }, [termoBusca, livroSelecionado, testamentoSelecionado, buscaExata]);

  const carregarLivros = async () => {
    try {
      const result = await window.electronAPI.getLivros();
      if (result.success && result.data) {
        setLivros(result.data);
      }
    } catch (error) {
      console.error('Erro ao carregar livros:', error);
    }
  };

  const realizarBusca = async (termo: string) => {
    if (!termo.trim()) return;
    
    setCarregando(true);
    setBuscaRealizada(true);
    
    try {
      const parametros: BuscaParametros = {
        termo: termo.trim(),
        livro_id: livroSelecionado,
        testamento: testamentoSelecionado,
        busca_exata: buscaExata
      };
      
      const result = await window.electronAPI.buscarVersiculos(parametros);
      if (result.success && result.data) {
        setResultados(result.data);
      } else {
        setResultados([]);
      }
    } catch (error) {
      console.error('Erro ao buscar versículos:', error);
      setResultados([]);
    } finally {
      setCarregando(false);
    }
  };

  const limparFiltros = () => {
    setLivroSelecionado(undefined);
    setTestamentoSelecionado(undefined);
    setBuscaExata(false);
  };

  const navegarParaVersiculo = async (resultado: ResultadoBusca) => {
    try {
      // Encontrar o livro pelos dados do resultado
      const livro = livros.find(l => l.nome === resultado.livro_nome);
      if (livro) {
        navegarPara(livro, resultado.capitulo, resultado.versiculo_numero);
      }
    } catch (error) {
      console.error('Erro ao navegar para versículo:', error);
    }
  };

  const adicionarFavorito = async (versiculoId: number) => {
    try {
      await window.electronAPI.adicionarFavorito(versiculoId);
      // Aqui você poderia mostrar uma notificação de sucesso
    } catch (error) {
      console.error('Erro ao adicionar favorito:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Buscar na Bíblia</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Encontre versículos por palavras, frases ou temas
        </p>
      </div>

      {/* Barra de Busca */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Campo de busca principal */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-600 dark:text-gray-400" />
              <Input
                placeholder="Digite palavras ou frases para buscar..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="pl-10 text-base h-12"
              />
              {carregando && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-gray-600 dark:text-gray-400" />
              )}
            </div>

            {/* Controles de filtro */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className="flex items-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>Filtros</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${mostrarFiltros ? 'rotate-180' : ''}`} />
              </Button>

              {(livroSelecionado || testamentoSelecionado || buscaExata) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={limparFiltros}
                  className="flex items-center space-x-2"
                >
                  <X className="h-4 w-4" />
                  <span>Limpar Filtros</span>
                </Button>
              )}
            </div>

            {/* Painel de Filtros */}
            {mostrarFiltros && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Filtro por Livro */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Livro</label>
                    <select
                      value={livroSelecionado || ''}
                      onChange={(e) => setLivroSelecionado(e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm"
                    >
                      <option value="">Todos os livros</option>
                      <optgroup label="Antigo Testamento">
                        {livros.filter(l => l.testamento === 'Antigo').map(livro => (
                          <option key={livro.id} value={livro.id}>{livro.nome}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Novo Testamento">
                        {livros.filter(l => l.testamento === 'Novo').map(livro => (
                          <option key={livro.id} value={livro.id}>{livro.nome}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Filtro por Testamento */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Testamento</label>
                    <select
                      value={testamentoSelecionado || ''}
                      onChange={(e) => setTestamentoSelecionado(e.target.value as 'Antigo' | 'Novo' | undefined || undefined)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm"
                    >
                      <option value="">Ambos</option>
                      <option value="Antigo">Antigo Testamento</option>
                      <option value="Novo">Novo Testamento</option>
                    </select>
                  </div>

                  {/* Opções de Busca */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Opções</label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={buscaExata}
                        onCheckedChange={setBuscaExata}
                      />
                      <span className="text-sm">Busca exata</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      <div className="space-y-4">
        {buscaRealizada && (
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Resultados da Busca
              {resultados.length > 0 && (
                <span className="text-gray-600 dark:text-gray-400 ml-2">
                  ({resultados.length} {resultados.length === 1 ? 'versículo encontrado' : 'versículos encontrados'})
                </span>
              )}
            </h2>
          </div>
        )}

        {carregando && (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-600 dark:text-gray-400" />
            <p className="text-gray-600 dark:text-gray-400">Buscando versículos...</p>
          </div>
        )}

        {!carregando && buscaRealizada && resultados.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Tente buscar com palavras diferentes ou ajuste os filtros.
              </p>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>• Use pelo menos 3 caracteres</p>
                <p>• Tente palavras mais específicas</p>
                <p>• Verifique a ortografia</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!carregando && resultados.length > 0 && (
          <div className="space-y-3">
            {resultados.map((resultado, index) => (
              <Card key={`${resultado.versiculo_id}-${index}`} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between space-x-4">
                    <div className="flex-1 min-w-0">
                      {/* Referência */}
                      <div className="flex items-center space-x-2 mb-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <h4 className="font-semibold text-primary">
                          {formatarReferencia(resultado.livro_nome, resultado.capitulo, resultado.versiculo_numero)}
                        </h4>
                      </div>

                      {/* Texto do Versículo */}
                      <p 
                        className="text-base leading-relaxed"
                        dangerouslySetInnerHTML={{ 
                          __html: destacarTexto(resultado.texto, termoBusca) 
                        }}
                      />
                    </div>

                    {/* Ações */}
                    <div className="flex flex-col space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navegarParaVersiculo(resultado)}
                        className="flex items-center space-x-1"
                      >
                        <BookOpen className="h-3 w-3" />
                        <span>Ler</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => adicionarFavorito(resultado.versiculo_id)}
                        className="flex items-center space-x-1"
                      >
                        <Heart className="h-3 w-3" />
                        <span>Favoritar</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center space-x-1"
                      >
                        <StickyNote className="h-3 w-3" />
                        <span>Anotar</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!buscaRealizada && !carregando && (
          <Card>
            <CardContent className="text-center py-12">
              <Search className="h-12 w-12 mx-auto mb-4 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">Comece a buscar</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Digite palavras ou frases no campo acima para encontrar versículos.
              </p>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>• Use pelo menos 3 caracteres</p>
                <p>• Busque por palavras-chave ou frases</p>
                <p>• Use filtros para resultados mais precisos</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Busca;