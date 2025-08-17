import React, { useState, useEffect } from 'react';
import { Calendar, BookOpen, Heart, StickyNote, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';

import { VersiculoDia, HistoricoLeitura, Favorito, Anotacao } from '../types';
import { formatarDataRelativa, formatarReferencia } from '../utils/cn';
import { useNavegacao } from '../hooks/useNavegacao';

export const Inicio: React.FC = () => {
  const [versiculoDia, setVersiculoDia] = useState<VersiculoDia | null>(null);
  const [historico, setHistorico] = useState<HistoricoLeitura[]>([]);
  const [favoritosRecentes, setFavoritosRecentes] = useState<Favorito[]>([]);
  const [anotacoesRecentes, setAnotacoesRecentes] = useState<Anotacao[]>([]);
  const [estatisticas, setEstatisticas] = useState<Record<string, unknown> | null>(null);
  const [carregando, setCarregando] = useState(true);
  
  const { navegarPara } = useNavegacao();

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  const carregarDadosIniciais = async () => {
    setCarregando(true);
    
    try {
      // Carregar versículo do dia
      const versiculoDiaResult = await window.electronAPI.getVersiculoDia();
      if (versiculoDiaResult.success && versiculoDiaResult.data) {
        setVersiculoDia(versiculoDiaResult.data);
      }

      // Carregar histórico recente
      const historicoResult = await window.electronAPI.getHistorico();
      if (historicoResult.success && historicoResult.data) {
        setHistorico(historicoResult.data.slice(0, 5));
      }

      // Carregar favoritos recentes
      const favoritosResult = await window.electronAPI.getFavoritos();
      if (favoritosResult.success && favoritosResult.data) {
        setFavoritosRecentes(favoritosResult.data.slice(0, 3));
      }

      // Carregar anotações recentes
      const anotacoesResult = await window.electronAPI.getAnotacoes();
      if (anotacoesResult.success && anotacoesResult.data) {
        setAnotacoesRecentes(anotacoesResult.data.slice(0, 3));
      }

      // Carregar estatísticas
      const estatisticasResult = await window.electronAPI.getEstatisticas();
      if (estatisticasResult.success && estatisticasResult.data) {
        setEstatisticas(estatisticasResult.data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    } finally {
      setCarregando(false);
    }
  };

  const navegarParaCapitulo = async (livroId: number, capitulo: number) => {
    const livroResult = await window.electronAPI.getLivro(livroId);
    if (livroResult.success && livroResult.data) {
      navegarPara(livroResult.data, capitulo);
    }
  };

  if (carregando) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded"></div>
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
        <h1 className="text-3xl font-bold tracking-tight">Bom dia!</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Que a palavra de Deus ilumine o seu dia hoje.
        </p>
      </div>

      {/* Versículo do Dia */}
      {versiculoDia && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-blue-900 dark:text-blue-100">Versículo do Dia</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <blockquote className="text-lg font-medium text-blue-800 dark:text-blue-200 mb-4 italic">
              "{versiculoDia.versiculo.texto}"
            </blockquote>
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
              {versiculoDia.referencia}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Grid de Estatísticas */}
      {estatisticas && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Versículos</CardTitle>
              <BookOpen className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(estatisticas.total_versiculos as number).toLocaleString()}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Na Bíblia Sagrada
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Favoritos</CardTitle>
              <Heart className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.total_favoritos as number}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Versículos marcados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Anotações</CardTitle>
              <StickyNote className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.total_anotacoes as number}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Notas pessoais
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Livros Visitados</CardTitle>
              <TrendingUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.livros_visitados as number}</div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                De 66 livros
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Seções de Atividade Recente */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Histórico de Leitura */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <CardTitle>Leitura Recente</CardTitle>
            </div>
            <CardDescription>
              Seus últimos capítulos visitados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {historico.length > 0 ? (
                historico.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => navegarParaCapitulo(item.livro_id, item.capitulo)}
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {formatarReferencia(item.livro_nome || '', item.capitulo)}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {formatarDataRelativa(item.acessado_em)}
                      </p>
                    </div>
                    <BookOpen className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Nenhuma leitura recente
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Favoritos Recentes */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Heart className="h-5 w-5" />
              <CardTitle>Favoritos Recentes</CardTitle>
            </div>
            <CardDescription>
              Versículos que você marcou
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {favoritosRecentes.length > 0 ? (
                favoritosRecentes.map((favorito) => (
                  <div
                    key={favorito.id}
                    className="p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  >
                    <p className="text-sm font-medium mb-1">
                      {formatarReferencia(favorito.livro_nome || '', favorito.capitulo || 0, favorito.versiculo_numero)}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {favorito.texto}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Nenhum favorito ainda
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Anotações Recentes */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <StickyNote className="h-5 w-5" />
              <CardTitle>Anotações Recentes</CardTitle>
            </div>
            <CardDescription>
              Suas reflexões pessoais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {anotacoesRecentes.length > 0 ? (
                anotacoesRecentes.map((anotacao) => (
                  <div
                    key={anotacao.id}
                    className="p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  >
                    <p className="text-sm font-medium mb-1">
                      {anotacao.titulo}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {formatarReferencia(anotacao.livro_nome || '', anotacao.capitulo || 0, anotacao.versiculo_numero)}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                      {anotacao.conteudo}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Nenhuma anotação ainda
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Continue sua jornada de estudo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4" />
              <span>Continuar Leitura</span>
            </Button>
            <Button variant="outline" className="flex items-center space-x-2">
              <Heart className="h-4 w-4" />
              <span>Ver Favoritos</span>
            </Button>
            <Button variant="outline" className="flex items-center space-x-2">
              <StickyNote className="h-4 w-4" />
              <span>Minhas Anotações</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Inicio;