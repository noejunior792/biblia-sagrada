import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Palette, 
  Type, 
  Moon, 
  Sun, 
  Monitor,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Info,
  Save,
  Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { useTema } from '../hooks/useTema';

interface ConfiguracoesState {
  tema: 'claro' | 'escuro' | 'sistema';
  tamanhoFonte: 'pequena' | 'media' | 'grande' | 'extra-grande';
  familiaFonte: string;
  mostrarNumerosVersiculos: boolean;
  versaoBiblia: string;
  autoBackup: boolean;
  notificacaoVersiculoDia: boolean;
  formatoExportacao: 'json' | 'txt' | 'pdf';
}

export const Configuracoes: React.FC = () => {
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesState>({
    tema: 'sistema',
    tamanhoFonte: 'media',
    familiaFonte: 'system-ui',
    mostrarNumerosVersiculos: true,
    versaoBiblia: 'King James em Português',
    autoBackup: true,
    notificacaoVersiculoDia: true,
    formatoExportacao: 'json'
  });
  
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [alteracoesPendentes, setAlteracoesPendentes] = useState(false);
  const [estatisticas, setEstatisticas] = useState<any>(null);
  
  const { tema, setTema } = useTema();

  useEffect(() => {
    carregarConfiguracoes();
    carregarEstatisticas();
  }, []);

  const carregarConfiguracoes = async () => {
    setCarregando(true);
    try {
      if (window.electronAPI) {
        // Carregar cada configuração
        const temaResult = await window.electronAPI.getConfiguracao('tema');
        const tamanhoFonteResult = await window.electronAPI.getConfiguracao('tamanho_fonte');
        const familiaFonteResult = await window.electronAPI.getConfiguracao('familia_fonte');
        const mostrarNumerosResult = await window.electronAPI.getConfiguracao('mostrar_numeros_versiculos');
        const versaoBibliaResult = await window.electronAPI.getConfiguracao('versao_biblia');

        setConfiguracoes(prev => ({
          ...prev,
          tema: (temaResult.data as any) || 'sistema',
          tamanhoFonte: (tamanhoFonteResult.data as any) || 'media',
          familiaFonte: familiaFonteResult.data || 'system-ui',
          mostrarNumerosVersiculos: mostrarNumerosResult.data === 'true',
          versaoBiblia: versaoBibliaResult.data || 'King James em Português'
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setCarregando(false);
    }
  };

  const carregarEstatisticas = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.getEstatisticas();
        if (result.success && result.data) {
          setEstatisticas(result.data);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const atualizarConfiguracao = <K extends keyof ConfiguracoesState>(
    chave: K, 
    valor: ConfiguracoesState[K]
  ) => {
    setConfiguracoes(prev => ({ ...prev, [chave]: valor }));
    setAlteracoesPendentes(true);
  };

  const salvarConfiguracoes = async () => {
    setSalvando(true);
    try {
      if (window.electronAPI) {
        await Promise.all([
          window.electronAPI.setConfiguracao('tema', configuracoes.tema),
          window.electronAPI.setConfiguracao('tamanho_fonte', configuracoes.tamanhoFonte),
          window.electronAPI.setConfiguracao('familia_fonte', configuracoes.familiaFonte),
          window.electronAPI.setConfiguracao('mostrar_numeros_versiculos', configuracoes.mostrarNumerosVersiculos.toString()),
          window.electronAPI.setConfiguracao('versao_biblia', configuracoes.versaoBiblia)
        ]);

        // Aplicar tema imediatamente
        if (configuracoes.tema !== 'sistema') {
          setTema(configuracoes.tema);
        }

        setAlteracoesPendentes(false);
        console.log('Configurações salvas com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const exportarDados = async () => {
    try {
      if (window.electronAPI) {
        // Implementar exportação de dados
        console.log('Exportando dados...');
        alert('Funcionalidade de exportação será implementada em breve.');
      }
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
    }
  };

  const importarDados = async () => {
    try {
      if (window.electronAPI) {
        // Implementar importação de dados
        console.log('Importando dados...');
        alert('Funcionalidade de importação será implementada em breve.');
      }
    } catch (error) {
      console.error('Erro ao importar dados:', error);
    }
  };

  const resetarConfiguracoes = async () => {
    if (!confirm('Tem certeza que deseja restaurar as configurações padrão? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      if (window.electronAPI) {
        const configsPadrao: ConfiguracoesState = {
          tema: 'sistema',
          tamanhoFonte: 'media',
          familiaFonte: 'system-ui',
          mostrarNumerosVersiculos: true,
          versaoBiblia: 'King James em Português',
          autoBackup: true,
          notificacaoVersiculoDia: true,
          formatoExportacao: 'json'
        };

        setConfiguracoes(configsPadrao);
        setAlteracoesPendentes(true);
        await salvarConfiguracoes();
      }
    } catch (error) {
      console.error('Erro ao resetar configurações:', error);
    }
  };

  if (carregando) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings className="h-8 w-8 text-blue-500" />
            <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          </div>
          {alteracoesPendentes && (
            <Button
              onClick={salvarConfiguracoes}
              disabled={salvando}
              className="flex items-center space-x-2"
            >
              {salvando ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </Button>
          )}
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Personalize sua experiência de leitura da Bíblia
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Aparência */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Palette className="h-5 w-5" />
              <CardTitle>Aparência</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tema */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Tema</label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={configuracoes.tema === 'claro' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => atualizarConfiguracao('tema', 'claro')}
                  className="flex items-center space-x-2"
                >
                  <Sun className="h-4 w-4" />
                  <span>Claro</span>
                </Button>
                <Button
                  variant={configuracoes.tema === 'escuro' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => atualizarConfiguracao('tema', 'escuro')}
                  className="flex items-center space-x-2"
                >
                  <Moon className="h-4 w-4" />
                  <span>Escuro</span>
                </Button>
                <Button
                  variant={configuracoes.tema === 'sistema' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => atualizarConfiguracao('tema', 'sistema')}
                  className="flex items-center space-x-2"
                >
                  <Monitor className="h-4 w-4" />
                  <span>Sistema</span>
                </Button>
              </div>
            </div>

            {/* Tamanho da Fonte */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Tamanho da Fonte</label>
              <select
                value={configuracoes.tamanhoFonte}
                onChange={(e) => atualizarConfiguracao('tamanhoFonte', e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm"
              >
                <option value="pequena">Pequena</option>
                <option value="media">Média</option>
                <option value="grande">Grande</option>
                <option value="extra-grande">Extra Grande</option>
              </select>
            </div>

            {/* Família da Fonte */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Família da Fonte</label>
              <select
                value={configuracoes.familiaFonte}
                onChange={(e) => atualizarConfiguracao('familiaFonte', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm"
              >
                <option value="system-ui">Sistema</option>
                <option value="serif">Serif</option>
                <option value="sans-serif">Sans Serif</option>
                <option value="monospace">Monoespaçada</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Leitura */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Type className="h-5 w-5" />
              <CardTitle>Leitura</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Mostrar Números dos Versículos */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Mostrar números dos versículos</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Exibir numeração ao lado de cada versículo
                </p>
              </div>
              <Switch
                checked={configuracoes.mostrarNumerosVersiculos}
                onCheckedChange={(checked) => atualizarConfiguracao('mostrarNumerosVersiculos', checked)}
              />
            </div>

            {/* Auto Backup */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Backup automático</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Fazer backup dos dados automaticamente
                </p>
              </div>
              <Switch
                checked={configuracoes.autoBackup}
                onCheckedChange={(checked) => atualizarConfiguracao('autoBackup', checked)}
              />
            </div>

            {/* Notificação Versículo do Dia */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Versículo do dia</label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Receber notificação diária com versículo
                </p>
              </div>
              <Switch
                checked={configuracoes.notificacaoVersiculoDia}
                onCheckedChange={(checked) => atualizarConfiguracao('notificacaoVersiculoDia', checked)}
              />
            </div>

            {/* Versão da Bíblia */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Versão da Bíblia</label>
              <select
                value={configuracoes.versaoBiblia}
                onChange={(e) => atualizarConfiguracao('versaoBiblia', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm"
              >
                <option value="King James em Português">King James em Português</option>
                <option value="Almeida Revista e Corrigida">Almeida Revista e Corrigida</option>
                <option value="Nova Versão Internacional">Nova Versão Internacional</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Dados e Backup */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Download className="h-5 w-5" />
              <CardTitle>Dados e Backup</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button
                onClick={exportarDados}
                variant="outline"
                className="w-full flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Exportar Dados</span>
              </Button>

              <Button
                onClick={importarDados}
                variant="outline"
                className="w-full flex items-center space-x-2"
              >
                <Upload className="h-4 w-4" />
                <span>Importar Dados</span>
              </Button>

              <Button
                onClick={resetarConfiguracoes}
                variant="outline"
                className="w-full flex items-center space-x-2 text-destructive hover:text-destructive"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Restaurar Padrões</span>
              </Button>
            </div>

            {/* Formato de Exportação */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Formato de exportação</label>
              <select
                value={configuracoes.formatoExportacao}
                onChange={(e) => atualizarConfiguracao('formatoExportacao', e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-sm"
              >
                <option value="json">JSON</option>
                <option value="txt">Texto</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        {estatisticas && (
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Info className="h-5 w-5" />
                <CardTitle>Estatísticas de Uso</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{estatisticas.total_favoritos}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Favoritos</div>
                </div>
                
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{estatisticas.total_anotacoes}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Anotações</div>
                </div>
                
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{estatisticas.livros_visitados}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Livros Visitados</div>
                </div>
                
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {(estatisticas.total_versiculos || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Versículos Totais</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Informações da Aplicação */}
      <Card>
        <CardHeader>
          <CardTitle>Sobre a Aplicação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Nome:</span>
              <span>Bíblia Sagrada</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Versão:</span>
              <span>1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Desenvolvido com:</span>
              <span>Electron + React + TypeScript</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Banco de dados:</span>
              <span>SQLite3</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Última atualização:</span>
              <span>{new Date().toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aviso de alterações pendentes */}
      {alteracoesPendentes && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 dark:bg-yellow-900 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4 shadow-lg">
          <div className="flex items-center space-x-2">
            <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm text-yellow-800 dark:text-yellow-200">
              Você tem alterações não salvas
            </span>
            <Button
              size="sm"
              onClick={salvarConfiguracoes}
              disabled={salvando}
              className="ml-2"
            >
              {salvando ? (
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
              ) : (
                <Check className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Configuracoes;