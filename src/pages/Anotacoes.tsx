import React, { useState, useEffect } from 'react';
import { 
  StickyNote, 
  BookOpen, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Save,
  X,
  Calendar,
  Filter,
  ChevronDown,

} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Anotacao } from '../types';
import { formatarReferencia, formatarDataRelativa, truncarTexto } from '../utils/cn';
import { useNavegacao } from '../hooks/useNavegacao';

interface NovaAnotacao {
  versiculoId: number;
  titulo: string;
  conteudo: string;
  livroNome: string;
  capitulo: number;
  versiculoNumero: number;
}

type OrdenacaoTipo = 'data_desc' | 'data_asc' | 'titulo' | 'livro' | 'atualizada';

export const Anotacoes: React.FC = () => {
  const [anotacoes, setAnotacoes] = useState<Anotacao[]>([]);
  const [anotacoesFiltradas, setAnotacoesFiltradas] = useState<Anotacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [ordenacao, setOrdenacao] = useState<OrdenacaoTipo>('data_desc');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  // Estados do editor
  const [modoEdicao, setModoEdicao] = useState<'criar' | 'editar' | null>(null);
  const [anotacaoEditando, setAnotacaoEditando] = useState<Anotacao | null>(null);
  const [tituloEditor, setTituloEditor] = useState('');
  const [conteudoEditor, setConteudoEditor] = useState('');
  const [salvando, setSalvando] = useState(false);
  
  const { navegarPara } = useNavegacao();

  useEffect(() => {
    carregarAnotacoes();
  }, []);

  useEffect(() => {
    filtrarEOrdenarAnotacoes();
  }, [anotacoes, termoBusca, ordenacao]);

  const carregarAnotacoes = async () => {
    setCarregando(true);
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.getAnotacoes();
        if (result.success && result.data) {
          setAnotacoes(result.data);
        } else {
          console.error('Erro ao carregar anotações:', result.error);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar anotações:', error);
    } finally {
      setCarregando(false);
    }
  };

  const filtrarEOrdenarAnotacoes = () => {
    let resultado = [...anotacoes];

    // Aplicar filtro de busca
    if (termoBusca.trim()) {
      const termo = termoBusca.toLowerCase();
      resultado = resultado.filter(anotacao => 
        anotacao.titulo.toLowerCase().includes(termo) ||
        anotacao.conteudo.toLowerCase().includes(termo) ||
        anotacao.livro_nome?.toLowerCase().includes(termo) ||
        anotacao.texto?.toLowerCase().includes(termo)
      );
    }

    // Aplicar ordenação
    resultado.sort((a, b) => {
      switch (ordenacao) {
        case 'data_asc':
          return new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime();
        case 'data_desc':
          return new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime();
        case 'atualizada':
          return new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime();
        case 'titulo':
          return a.titulo.localeCompare(b.titulo);
        case 'livro': {
          const livroA = a.livro_nome || '';
          const livroB = b.livro_nome || '';
          if (livroA === livroB) {
            return (a.capitulo || 0) - (b.capitulo || 0);
          }
          return livroA.localeCompare(livroB);
        }
        default:
          return 0;
      }
    });

    setAnotacoesFiltradas(resultado);
  };

  const abrirEditor = (modo: 'criar' | 'editar', anotacao?: Anotacao) => {
    setModoEdicao(modo);
    if (modo === 'editar' && anotacao) {
      setAnotacaoEditando(anotacao);
      setTituloEditor(anotacao.titulo);
      setConteudoEditor(anotacao.conteudo);
    } else {
      setAnotacaoEditando(null);
      setTituloEditor('');
      setConteudoEditor('');
    }
  };

  const fecharEditor = () => {
    setModoEdicao(null);
    setAnotacaoEditando(null);
    setTituloEditor('');
    setConteudoEditor('');
  };

  const salvarAnotacao = async () => {
    if (!tituloEditor.trim() || !conteudoEditor.trim()) {
      alert('Por favor, preencha o título e conteúdo da anotação.');
      return;
    }

    setSalvando(true);
    try {
      if (window.electronAPI) {
        let result;
        
        if (modoEdicao === 'editar' && anotacaoEditando) {
          result = await window.electronAPI.atualizarAnotacao(
            anotacaoEditando.id, 
            tituloEditor.trim(), 
            conteudoEditor.trim()
          );
        } else {
          // Para criar nova anotação, precisaríamos do versículo selecionado
          // Por agora, vamos mostrar uma mensagem
          alert('Para criar uma nova anotação, vá para um versículo e use o botão de anotar.');
          setSalvando(false);
          return;
        }

        if (result.success) {
          await carregarAnotacoes();
          fecharEditor();
        } else {
          console.error('Erro ao salvar anotação:', result.error);
          alert('Erro ao salvar anotação. Tente novamente.');
        }
      }
    } catch (error) {
      console.error('Erro ao salvar anotação:', error);
      alert('Erro ao salvar anotação. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const removerAnotacao = async (anotacaoId: number) => {
    if (!confirm('Tem certeza que deseja remover esta anotação?')) {
      return;
    }

    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.removerAnotacao(anotacaoId);
        if (result.success) {
          setAnotacoes(prev => prev.filter(a => a.id !== anotacaoId));
        } else {
          console.error('Erro ao remover anotação:', result.error);
          alert('Erro ao remover anotação. Tente novamente.');
        }
      }
    } catch (error) {
      console.error('Erro ao remover anotação:', error);
      alert('Erro ao remover anotação. Tente novamente.');
    }
  };

  const navegarParaVersiculo = async (anotacao: Anotacao) => {
    try {
      if (window.electronAPI && anotacao.versiculo_id) {
        const versiculoResult = await window.electronAPI.getVersiculo(anotacao.versiculo_id);
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

  if (carregando) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <StickyNote className="h-8 w-8 text-amber-500" />
            <h1 className="text-3xl font-bold tracking-tight">Minhas Anotações</h1>
          </div>
          <Button
            onClick={() => abrirEditor('criar')}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Anotação</span>
          </Button>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          {anotacoes.length} anotação{anotacoes.length !== 1 ? 'ões' : ''} criada{anotacoes.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Editor de Anotação - Modal */}
      {modoEdicao && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>
                {modoEdicao === 'criar' ? 'Nova Anotação' : 'Editar Anotação'}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={fecharEditor}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Título */}
              <div>
                <label className="text-sm font-medium mb-2 block">Título</label>
                <Input
                  value={tituloEditor}
                  onChange={(e) => setTituloEditor(e.target.value)}
                  placeholder="Digite o título da anotação..."
                  maxLength={100}
                />
              </div>

              {/* Conteúdo */}
              <div>
                <label className="text-sm font-medium mb-2 block">Conteúdo</label>
                <textarea
                  value={conteudoEditor}
                  onChange={(e) => setConteudoEditor(e.target.value)}
                  placeholder="Digite o conteúdo da anotação..."
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                />
              </div>

              {/* Referência do versículo (se editando) */}
              {anotacaoEditando && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Versículo:</p>
                  <p className="text-sm">
                    {formatarReferencia(
                      anotacaoEditando.livro_nome || '',
                      anotacaoEditando.capitulo || 0,
                      anotacaoEditando.versiculo_numero
                    )}
                  </p>
                  {anotacaoEditando.texto && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                      "{truncarTexto(anotacaoEditando.texto, 150)}"
                    </p>
                  )}
                </div>
              )}

              {/* Botões */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={fecharEditor}>
                  Cancelar
                </Button>
                <Button onClick={salvarAnotacao} disabled={salvando}>
                  {salvando ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Barra de Busca e Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-600 dark:text-gray-400" />
              <Input
                placeholder="Buscar anotações..."
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
                  <span>Ordenação</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${mostrarFiltros ? 'rotate-180' : ''}`} />
                </Button>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400">
                {anotacoesFiltradas.length} de {anotacoes.length} anotações
              </div>
            </div>

            {/* Painel de Ordenação */}
            {mostrarFiltros && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Ordenar por</label>
                    <select
                      value={ordenacao}
                      onChange={(e) => setOrdenacao(e.target.value as OrdenacaoTipo)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm"
                    >
                      <option value="data_desc">Mais recentes</option>
                      <option value="atualizada">Recém atualizadas</option>
                      <option value="data_asc">Mais antigas</option>
                      <option value="titulo">Por título</option>
                      <option value="livro">Por livro</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Anotações */}
      <div className="grid gap-4 md:grid-cols-2">
        {anotacoesFiltradas.length === 0 ? (
          <div className="md:col-span-2">
            <Card>
              <CardContent className="text-center py-12">
                <StickyNote className="h-12 w-12 mx-auto mb-4 text-gray-600 dark:text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">
                  {anotacoes.length === 0 ? 'Nenhuma anotação ainda' : 'Nenhum resultado encontrado'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {anotacoes.length === 0 
                    ? 'Comece criando anotações durante a leitura dos versículos.'
                    : 'Tente ajustar o termo de busca.'
                  }
                </p>
                {anotacoes.length === 0 && (
                  <div className="space-x-2">
                    <Button 
                      onClick={() => abrirEditor('criar')}
                      className="flex items-center space-x-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Criar Primeira Anotação</span>
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {/* Navegar para Bíblia */}}
                      className="flex items-center space-x-2"
                    >
                      <BookOpen className="h-4 w-4" />
                      <span>Ir para a Bíblia</span>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          anotacoesFiltradas.map((anotacao) => (
            <Card key={anotacao.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg line-clamp-2">{anotacao.titulo}</CardTitle>
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <BookOpen className="h-3 w-3" />
                      <span>
                        {formatarReferencia(
                          anotacao.livro_nome || '',
                          anotacao.capitulo || 0,
                          anotacao.versiculo_numero
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => abrirEditor('editar', anotacao)}
                      className="h-8 w-8"
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removerAnotacao(anotacao.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Versículo */}
                {anotacao.texto && (
                  <blockquote className="text-sm italic border-l-2 border-primary/30 pl-3 text-gray-600 dark:text-gray-400">
                    "{truncarTexto(anotacao.texto, 120)}"
                  </blockquote>
                )}

                {/* Conteúdo da Anotação */}
                <div className="prose prose-sm max-w-none">
                  <p className="text-sm leading-relaxed line-clamp-3">
                    {anotacao.conteudo}
                  </p>
                </div>

                {/* Metadados */}
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 border-t pt-3">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatarDataRelativa(anotacao.criado_em)}</span>
                    </div>
                    {anotacao.atualizado_em !== anotacao.criado_em && (
                      <span>• Editada {formatarDataRelativa(anotacao.atualizado_em)}</span>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navegarParaVersiculo(anotacao)}
                    className="text-xs h-6 px-2"
                  >
                    Ver versículo
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Estatísticas das Anotações */}
      {anotacoes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estatísticas das Anotações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{anotacoes.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total de Anotações</div>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {new Set(anotacoes.map(a => a.livro_nome)).size}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Livros Anotados</div>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {anotacoes.length > 0 ? Math.round(anotacoes.reduce((acc, a) => acc + a.conteudo.length, 0) / anotacoes.length) : 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Caracteres Médios</div>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {anotacoes.filter(a => a.atualizado_em !== a.criado_em).length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Anotações Editadas</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Anotacoes;