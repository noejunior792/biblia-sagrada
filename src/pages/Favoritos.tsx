import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  BookOpen, 
  Search, 
  Trash2, 
  Copy, 
  Share,
  Filter,
  ChevronDown,
  Calendar,

} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Favorito } from '../types';
import { formatarReferencia, formatarDataRelativa, copiarParaClipboard } from '../utils/cn';
import { useNavegacao } from '../hooks/useNavegacao';

type OrdenacaoTipo = 'data_asc' | 'data_desc' | 'livro' | 'relevancia';
type FiltroTestamento = 'todos' | 'antigo' | 'novo';

export const Favoritos: React.FC = () => {
  const [favoritos, setFavoritos] = useState<Favorito[]>([]);
  const [favoritosFiltrados, setFavoritosFiltrados] = useState<Favorito[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState<OrdenacaoTipo>('data_desc');
  const [filtroTestamento, setFiltroTestamento] = useState<FiltroTestamento>('todos');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [favoritoSelecionado, setFavoritoSelecionado] = useState<number | null>(null);
  
  const { navegarPara } = useNavegacao();

  useEffect(() => {
    carregarFavoritos();
  }, []);

  useEffect(() => {
    filtrarEOrdenarFavoritos();
  }, [favoritos, termoBusca, ordenacao, filtroTestamento]);

  const carregarFavoritos = async () => {
    setCarregando(true);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.getFavoritos();
        if (result.success && result.data) {
          setFavoritos(result.data);
        } else {
          console.error('Erro ao carregar favoritos:', result.error);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
    } finally {
      setCarregando(false);
    }
  };

  const filtrarEOrdenarFavoritos = () => {
    let resultado = [...favoritos];

    // Aplicar filtro de busca
    if (termoBusca.trim()) {
      const termo = termoBusca.toLowerCase();
      resultado = resultado.filter(favorito => 
        favorito.texto?.toLowerCase().includes(termo) ||
        favorito.livro_nome?.toLowerCase().includes(termo)
      );
    }

    // Aplicar filtro de testamento
    if (filtroTestamento !== 'todos') {
      resultado = resultado.filter(favorito => {
        if (!favorito.livro_nome) return true;
        
        // Lista simplificada de livros do Novo Testamento
        const livrosNovoTestamento = [
          'Mateus', 'Marcos', 'Lucas', 'João', 'Atos', 'Romanos',
          '1 Coríntios', '2 Coríntios', 'Gálatas', 'Efésios', 'Filipenses',
          'Colossenses', '1 Tessalonicenses', '2 Tessalonicenses', '1 Timóteo',
          '2 Timóteo', 'Tito', 'Filemom', 'Hebreus', 'Tiago', '1 Pedro',
          '2 Pedro', '1 João', '2 João', '3 João', 'Judas', 'Apocalipse'
        ];
        
        const isNovoTestamento = livrosNovoTestamento.includes(favorito.livro_nome);
        
        if (filtroTestamento === 'novo') {
          return isNovoTestamento;
        } else {
          return !isNovoTestamento;
        }
      });
    }

    // Aplicar ordenação
    resultado.sort((a, b) => {
      switch (ordenacao) {
        case 'data_asc':
          return new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime();
        case 'data_desc':
          return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
        case 'livro': {
          const livroA = a.livro_nome || '';
          const livroB = b.livro_nome || '';
          if (livroA === livroB) {
            return (a.capitulo || 0) - (b.capitulo || 0);
          }
          return livroA.localeCompare(livroB);
        }
        case 'relevancia': {
          // Ordenar por relevância do termo de busca
          if (!termoBusca.trim()) return 0;
          const scoreA = calcularScoreRelevancia(a, termoBusca);
          const scoreB = calcularScoreRelevancia(b, termoBusca);
          return scoreB - scoreA;
        }
        default:
          return 0;
      }
    });

    setFavoritosFiltrados(resultado);
  };

  const calcularScoreRelevancia = (favorito: Favorito, termo: string): number => {
    let score = 0;
    const termoLower = termo.toLowerCase();
    
    if (favorito.livro_nome?.toLowerCase().includes(termoLower)) score += 10;
    if (favorito.texto?.toLowerCase().includes(termoLower)) score += 5;
    
    return score;
  };

  const removerFavorito = async (favoritoId: number, versiculoId: number) => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.removerFavorito(versiculoId);
        if (result.success) {
          setFavoritos(prev => prev.filter(f => f.id !== favoritoId));
        } else {
          console.error('Erro ao remover favorito:', result.error);
        }
      }
    } catch (error) {
      console.error('Erro ao remover favorito:', error);
    }
  };

  const navegarParaVersiculo = async (favorito: Favorito) => {
    try {
      if (window.electronAPI && favorito.versiculo_id) {
        const versiculoResult = await window.electronAPI.getVersiculo(favorito.versiculo_id);
        if (versiculoResult.success && versiculoResult.data) {
          const livroResult = await window.electronAPI.getLivro(versiculoResult.data.livro_id);
          if (livroResult.success && livroResult.data) {
            navegarPara(livroResult.data, versiculoResult.data.capitulo, versiculoResult.data.numero);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao navegar para versículo:', error);
    }
  };

  const copiarVersiculo = async (favorito: Favorito) => {
    if (!favorito.texto || !favorito.livro_nome) return;
    
    const referencia = formatarReferencia(favorito.livro_nome, favorito.capitulo || 0, favorito.versiculo_numero);
    const texto = `${favorito.texto}\n\n${referencia}`;
    
    const sucesso = await copiarParaClipboard(texto);
    if (sucesso) {
      // Aqui você poderia mostrar uma notificação de sucesso
      console.log('Versículo copiado!');
    }
  };

  const limparFiltros = () => {
    setTermoBusca('');
    setFiltroTestamento('todos');
    setOrdenacao('data_desc');
  };

  if (carregando) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Heart className="h-8 w-8 text-red-500" />
          <h1 className="text-3xl font-bold tracking-tight">Meus Favoritos</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {favoritos.length} versículo{favoritos.length !== 1 ? 's' : ''} marcado{favoritos.length !== 1 ? 's' : ''} como favorito
        </p>
      </div>

      {/* Barra de Busca e Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-600 dark:text-gray-400" />
              <Input
                placeholder="Buscar nos favoritos..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Controles */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2">
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

                {(termoBusca || filtroTestamento !== 'todos' || ordenacao !== 'data_desc') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={limparFiltros}
                    className="text-gray-600 dark:text-gray-400"
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400">
                {favoritosFiltrados.length} de {favoritos.length} favoritos
              </div>
            </div>

            {/* Painel de Filtros */}
            {mostrarFiltros && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Ordenação */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Ordenar por</label>
                    <select
                      value={ordenacao}
                      onChange={(e) => setOrdenacao(e.target.value as OrdenacaoTipo)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm"
                    >
                      <option value="data_desc">Mais recentes</option>
                      <option value="data_asc">Mais antigos</option>
                      <option value="livro">Por livro</option>
                      {termoBusca && <option value="relevancia">Relevância</option>}
                    </select>
                  </div>

                  {/* Filtro por Testamento */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Testamento</label>
                    <select
                      value={filtroTestamento}
                      onChange={(e) => setFiltroTestamento(e.target.value as FiltroTestamento)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm"
                    >
                      <option value="todos">Todos</option>
                      <option value="antigo">Antigo Testamento</option>
                      <option value="novo">Novo Testamento</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Favoritos */}
      <div className="space-y-4">
        {favoritosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Heart className="h-12 w-12 mx-auto mb-4 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">
                {favoritos.length === 0 ? 'Nenhum favorito ainda' : 'Nenhum resultado encontrado'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {favoritos.length === 0 
                  ? 'Comece marcando versículos como favoritos durante a leitura.'
                  : 'Tente ajustar os filtros ou termo de busca.'
                }
              </p>
              {favoritos.length === 0 && (
                <Button 
                  onClick={() => {/* Navegar para Bíblia */}}
                  className="flex items-center space-x-2"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>Ir para a Bíblia</span>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          favoritosFiltrados.map((favorito) => (
            <Card 
              key={favorito.id} 
              className={`hover:shadow-md transition-all duration-200 cursor-pointer ${
                favoritoSelecionado === favorito.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setFavoritoSelecionado(
                favoritoSelecionado === favorito.id ? null : favorito.id
              )}
            >
              <CardContent className="p-4">
                <div className="space-y-3">
                  {/* Cabeçalho do Favorito */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <Heart className="h-4 w-4 text-red-500 fill-current" />
                      <h4 className="font-semibold text-primary">
                        {formatarReferencia(
                          favorito.livro_nome || '',
                          favorito.capitulo || 0,
                          favorito.versiculo_numero
                        )}
                      </h4>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-gray-600 dark:text-gray-400">
                      <Calendar className="h-3 w-3" />
                      <span>{formatarDataRelativa(favorito.criado_em)}</span>
                    </div>
                  </div>

                  {/* Texto do Versículo */}
                  <blockquote className="text-base leading-relaxed border-l-4 border-primary/30 pl-4 italic">
                    {favorito.texto}
                  </blockquote>

                  {/* Ações */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navegarParaVersiculo(favorito);
                        }}
                        className="flex items-center space-x-1"
                      >
                        <BookOpen className="h-3 w-3" />
                        <span>Ler</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          copiarVersiculo(favorito);
                        }}
                        className="flex items-center space-x-1"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Copiar</span>
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center space-x-1"
                      >
                        <Share className="h-3 w-3" />
                        <span>Compartilhar</span>
                      </Button>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removerFavorito(favorito.id, favorito.versiculo_id);
                      }}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Estatísticas dos Favoritos */}
      {favoritos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estatísticas dos Favoritos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{favoritos.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total de Favoritos</div>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {new Set(favoritos.map(f => f.livro_nome)).size}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Livros Diferentes</div>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {favoritos.length > 0 ? Math.round(favoritos.reduce((acc, f) => acc + (f.texto?.length || 0), 0) / favoritos.length) : 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Caracteres Médios</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Favoritos;