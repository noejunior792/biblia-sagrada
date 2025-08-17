import { 
  Livro, 
  Versiculo, 
  Favorito, 
  Anotacao, 
  HistoricoLeitura, 
  ResultadoBusca, 
  VersiculoDia,
  BuscaParametros,
  DatabaseResponse,
  EstatisticasLeitura
} from '../types';
import { BibliaDatabase, getDatabase } from './database';
import { migrateJSONToSQLite, isMigrationNeeded } from './migrate-json-to-sqlite';
import { JSONBibliaService } from './json-service';

export class HybridBibliaService {
  private db: BibliaDatabase;
  private jsonService: JSONBibliaService | null = null;
  private useSQLite = false;
  private initialized = false;
  private initializing = false;

  constructor() {
    this.db = getDatabase();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializing) {
      // Wait for existing initialization to complete
      let waitCount = 0;
      while (this.initializing && !this.initialized && waitCount < 300) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
      }
      if (waitCount >= 300) {
        console.error('⏰ Timeout aguardando inicialização, forçando fallback para JSON');
        this.useSQLite = false;
        this.jsonService = new JSONBibliaService();
        this.initialized = true;
      }
      return;
    }

    this.initializing = true;

    try {
      console.log('🚀 Inicializando serviço híbrido da Bíblia...');
      
      // Tentar inicializar SQLite com timeout mais curto
      const initTimeout = new Promise<void>((_, reject) => 
        setTimeout(() => reject(new Error('Database initialization timeout')), 15000)
      );
      
      try {
        await Promise.race([this.db.initialize(), initTimeout]);
        console.log('✅ Banco SQLite inicializado');
      } catch (dbError) {
        console.error('❌ Falha ao inicializar SQLite:', dbError);
        throw new Error('SQLite_INIT_FAILED');
      }
      
      // Verificar se migração é necessária
      let needsMigration = false;
      try {
        needsMigration = await isMigrationNeeded(this.db);
      } catch (migrationCheckError) {
        console.error('❌ Erro ao verificar migração:', migrationCheckError);
        // Se não conseguir verificar, assumir que precisa de migração
        needsMigration = true;
      }
      
      if (needsMigration) {
        console.log('📦 Migração necessária. Executando migração do JSON para SQLite...');
        console.log('🔧 Estado antes da migração: DB inicializado, usando instância existente');
        try {
          // Pass the existing database connection to migration to prevent closing it
          console.log('⏳ Iniciando processo de migração...');
          await migrateJSONToSQLite(this.db);
          console.log('✅ Migração do JSON para SQLite concluída com sucesso');
          this.useSQLite = true;
          console.log('✅ Serviço configurado para usar SQLite');
          
          // Verify database is still functional after migration
          console.log('🔍 Verificando funcionalidade do banco após migração...');
          const testQuery = await this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM livros');
          console.log(`✅ Verificação pós-migração: ${testQuery?.count || 0} livros encontrados`);
          
        } catch (migrationError) {
          console.error('❌ Erro na migração, usando fallback JSON:', migrationError);
          console.error('📊 Stack trace da migração:', migrationError instanceof Error ? migrationError.stack : 'N/A');
          throw new Error('MIGRATION_FAILED');
        }
      } else {
        console.log('✅ Dados SQLite já disponíveis. Usando SQLite.');
        this.useSQLite = true;
      }

      this.initialized = true;
      console.log('✅ Serviço híbrido inicializado com SQLite');
      console.log('📋 Estado final: SQLite ativo, serviço pronto para uso');
      
    } catch (error) {
      console.error('❌ Erro ao inicializar serviço SQLite, usando fallback JSON:', error);
      console.error('📊 Detalhes do erro de inicialização:', error instanceof Error ? error.message : String(error));
      
      // Tentar fechar conexão SQLite em caso de erro (mas não fechar se foi passada externamente)
      try {
        // Only close if we created the connection ourselves
        console.log('🔧 Tentando limpar conexão SQLite...');
        await this.db.close();
        console.log('✅ Conexão SQLite fechada durante fallback');
      } catch (closeError) {
        console.error('⚠️ Erro ao fechar banco durante fallback:', closeError);
      }
      
      // Fallback para JSON
      console.log('🔄 Iniciando fallback para serviço JSON...');
      this.useSQLite = false;
      try {
        this.jsonService = new JSONBibliaService();
        console.log('✅ Serviço JSON inicializado como fallback');
        console.log('📋 Estado fallback: SQLite desabilitado, JSON ativo');
      } catch (jsonError) {
        console.error('❌ Erro crítico: não foi possível inicializar nem SQLite nem JSON:', jsonError);
        console.error('💥 Sistema será inicializado em estado limitado');
        // Mesmo assim, marcar como inicializado para evitar loops infinitos
      }
      this.initialized = true;
    } finally {
      this.initializing = false;
      console.log('🏁 Processo de inicialização finalizado');
    }
  }

  // MÉTODOS DE LIVROS
  async getLivros(): Promise<DatabaseResponse<Livro[]>> {
    await this.initialize();
    
    if (this.useSQLite) {
      try {
        const livros = await this.db.all<Livro>(
          'SELECT * FROM livros ORDER BY ordem'
        );
        return { success: true, data: livros };
      } catch (error) {
        console.error('Erro SQLite getLivros:', error);
        return { success: false, error: (error as Error).message };
      }
    } else {
      if (!this.jsonService) {
        return { success: false, error: 'Serviço JSON não inicializado' };
      }
      return this.jsonService.getLivros();
    }
  }

  async getLivro(id: number): Promise<DatabaseResponse<Livro | null>> {
    await this.initialize();
    
    if (this.useSQLite) {
      try {
        const livro = await this.db.get<Livro>('SELECT * FROM livros WHERE id = ?', [id]);
        return { success: true, data: livro || null };
      } catch (error) {
        console.error('Erro SQLite getLivro:', error);
        return { success: false, error: (error as Error).message };
      }
    } else {
      if (!this.jsonService) {
        return { success: false, error: 'Serviço JSON não inicializado' };
      }
      return this.jsonService.getLivro(id);
    }
  }

  // MÉTODOS DE VERSÍCULOS
  async getVersiculosCapitulo(livroId: number, capitulo: number): Promise<DatabaseResponse<Versiculo[]>> {
    console.log('📖 HybridBibliaService.getVersiculosCapitulo chamado com:', { livroId, capitulo });
    await this.initialize();
    
    console.log('📖 Usando SQLite?', this.useSQLite);
    console.log('📖 DB disponível?', !!this.db);
    console.log('📖 jsonService disponível?', !!this.jsonService);
    
    if (this.useSQLite) {
      try {
        console.log('📖 Executando query SQLite...');
        const versiculos = await this.db.all<Versiculo>(
          'SELECT * FROM versiculos WHERE livro_id = ? AND capitulo = ? ORDER BY numero',
          [livroId, capitulo]
        );
        console.log('📖 Query SQLite executada, resultado:', {
          count: versiculos.length,
          firstVerse: versiculos[0]?.texto?.substring(0, 50) + '...' || 'N/A'
        });
        return { success: true, data: versiculos };
      } catch (error) {
        console.error('📖 Erro SQLite getVersiculosCapitulo:', error);
        console.error('📖 Stack trace:', error instanceof Error ? error.stack : 'N/A');
        return { success: false, error: (error as Error).message };
      }
    } else {
      console.log('📖 Usando serviço JSON...');
      if (!this.jsonService) {
        console.error('📖 Erro: Serviço JSON não inicializado');
        return { success: false, error: 'Serviço JSON não inicializado' };
      }
      const result = await this.jsonService.getVersiculosCapitulo(livroId, capitulo);
      console.log('📖 Resultado do serviço JSON:', {
        success: result.success,
        count: result.data?.length || 0,
        error: result.error
      });
      return result;
    }
  }

  async getVersiculo(id: number): Promise<DatabaseResponse<Versiculo | null>> {
    await this.initialize();
    
    if (this.useSQLite) {
      try {
        const versiculo = await this.db.get<Versiculo>('SELECT * FROM versiculos WHERE id = ?', [id]);
        return { success: true, data: versiculo || null };
      } catch (error) {
        console.error('Erro SQLite getVersiculo:', error);
        return { success: false, error: (error as Error).message };
      }
    } else {
      if (!this.jsonService) {
        return { success: false, error: 'Serviço JSON não inicializado' };
      }
      return this.jsonService.getVersiculo(id);
    }
  }

  // MÉTODO DE BUSCA
  async buscarVersiculos(parametros: BuscaParametros): Promise<DatabaseResponse<ResultadoBusca[]>> {
    await this.initialize();
    
    if (this.useSQLite) {
      try {
        let sql = `
          SELECT 
            v.id as versiculo_id,
            l.nome as livro_nome,
            l.abreviacao as livro_abreviacao,
            v.capitulo,
            v.numero as versiculo_numero,
            v.texto
          FROM versiculos_fts fts
          JOIN versiculos v ON fts.rowid = v.id
          JOIN livros l ON v.livro_id = l.id
          WHERE versiculos_fts MATCH ?
        `;
        
        const params: unknown[] = [parametros.termo];
        
        if (parametros.livro_id) {
          sql += ' AND v.livro_id = ?';
          params.push(parametros.livro_id);
        }
        
        if (parametros.testamento) {
          sql += ' AND l.testamento = ?';
          params.push(parametros.testamento);
        }
        
        sql += ' ORDER BY l.ordem, v.capitulo, v.numero LIMIT 100';
        
        const resultados = await this.db.all<ResultadoBusca>(sql, params);
        return { success: true, data: resultados };
      } catch (error) {
        console.error('Erro SQLite buscarVersiculos:', error);
        return { success: false, error: (error as Error).message };
      }
    } else {
      if (!this.jsonService) {
        return { success: false, error: 'Serviço JSON não inicializado' };
      }
      return this.jsonService.buscarVersiculos(parametros);
    }
  }

  // MÉTODOS DE FAVORITOS
  async getFavoritos(): Promise<DatabaseResponse<Favorito[]>> {
    await this.initialize();
    
    if (this.useSQLite) {
      try {
        const favoritos = await this.db.all<Favorito>(`
          SELECT 
            f.id,
            f.versiculo_id,
            f.criado_em,
            l.nome as livro_nome,
            v.capitulo,
            v.numero as versiculo_numero,
            v.texto
          FROM favoritos f
          JOIN versiculos v ON f.versiculo_id = v.id
          JOIN livros l ON v.livro_id = l.id
          ORDER BY f.criado_em DESC
        `);
        return { success: true, data: favoritos };
      } catch (error) {
        console.error('Erro SQLite getFavoritos:', error);
        return { success: false, error: (error as Error).message };
      }
    } else {
      if (!this.jsonService) {
        return { success: false, error: 'Serviço JSON não inicializado' };
      }
      return this.jsonService.getFavoritos();
    }
  }

  async adicionarFavorito(versiculoId: number): Promise<DatabaseResponse<void>> {
    await this.initialize();
    
    if (this.useSQLite) {
      try {
        await this.db.run(
          'INSERT OR IGNORE INTO favoritos (versiculo_id) VALUES (?)',
          [versiculoId]
        );
        return { success: true };
      } catch (error) {
        console.error('Erro SQLite adicionarFavorito:', error);
        return { success: false, error: (error as Error).message };
      }
    } else {
      if (!this.jsonService) {
        return { success: false, error: 'Serviço JSON não inicializado' };
      }
      return this.jsonService.adicionarFavorito(versiculoId);
    }
  }

  async removerFavorito(versiculoId: number): Promise<DatabaseResponse<void>> {
    await this.initialize();
    
    if (this.useSQLite) {
      try {
        await this.db.run('DELETE FROM favoritos WHERE versiculo_id = ?', [versiculoId]);
        return { success: true };
      } catch (error) {
        console.error('Erro SQLite removerFavorito:', error);
        return { success: false, error: (error as Error).message };
      }
    } else {
      if (!this.jsonService) {
        return { success: false, error: 'Serviço JSON não inicializado' };
      }
      return this.jsonService.removerFavorito(versiculoId);
    }
  }

  async verificarFavorito(versiculoId: number): Promise<DatabaseResponse<boolean>> {
    await this.initialize();
    
    if (this.useSQLite) {
      try {
        const result = await this.db.get<{ count: number }>(
          'SELECT COUNT(*) as count FROM favoritos WHERE versiculo_id = ?',
          [versiculoId]
        );
        return { success: true, data: (result?.count || 0) > 0 };
      } catch (error) {
        console.error('Erro SQLite verificarFavorito:', error);
        return { success: false, error: (error as Error).message };
      }
    } else {
      if (!this.jsonService) {
        return { success: false, error: 'Serviço JSON não inicializado' };
      }
      return this.jsonService.verificarFavorito(versiculoId);
    }
  }

  // MÉTODOS DE ANOTAÇÕES
  async getAnotacoes(): Promise<DatabaseResponse<Anotacao[]>> {
    await this.initialize();
    
    if (this.useSQLite) {
      try {
        const anotacoes = await this.db.all<Anotacao>(`
          SELECT 
            a.id,
            a.versiculo_id,
            a.titulo,
            a.conteudo,
            a.criado_em,
            a.atualizado_em,
            l.nome as livro_nome,
            v.capitulo,
            v.numero as versiculo_numero,
            v.texto
          FROM anotacoes a
          JOIN versiculos v ON a.versiculo_id = v.id
          JOIN livros l ON v.livro_id = l.id
          ORDER BY a.atualizado_em DESC
        `);
        return { success: true, data: anotacoes };
      } catch (error) {
        console.error('Erro SQLite getAnotacoes:', error);
        return { success: false, error: (error as Error).message };
      }
    } else {
      if (!this.jsonService) {
        return { success: false, error: 'Serviço JSON não inicializado' };
      }
      return this.jsonService.getAnotacoes();
    }
  }

  async getAnotacoesVersiculo(versiculoId: number): Promise<DatabaseResponse<Anotacao[]>> {
    await this.initialize();
    
    if (this.useSQLite) {
      try {
        const anotacoes = await this.db.all<Anotacao>(
          'SELECT * FROM anotacoes WHERE versiculo_id = ? ORDER BY criado_em DESC',
          [versiculoId]
        );
        return { success: true, data: anotacoes };
      } catch (error) {
        console.error('Erro SQLite getAnotacoesVersiculo:', error);
        return { success: false, error: (error as Error).message };
      }
    } else {
      if (!this.jsonService) {
        return { success: false, error: 'Serviço JSON não inicializado' };
      }
      return this.jsonService.getAnotacoesVersiculo(versiculoId);
    }
  }

  async adicionarAnotacao(versiculoId: number, titulo: string, conteudo: string): Promise<DatabaseResponse<Anotacao>> {
    await this.initialize();
    
    if (this.useSQLite) {
      try {
        await this.db.run(
          'INSERT INTO anotacoes (versiculo_id, titulo, conteudo) VALUES (?, ?, ?)',
          [versiculoId, titulo, conteudo]
        );
        
        const result = await this.db.get<Anotacao>(
          'SELECT * FROM anotacoes WHERE versiculo_id = ? AND titulo = ? AND conteudo = ? ORDER BY criado_em DESC LIMIT 1',
          [versiculoId, titulo, conteudo]
        );
        
        return { success: true, data: result || {} as Anotacao };
      } catch (error) {
        console.error('Erro SQLite adicionarAnotacao:', error);
        return { success: false, error: (error as Error).message };
      }
    } else {
      if (!this.jsonService) {
        return { success: false, error: 'Serviço JSON não inicializado' };
      }
      return this.jsonService.adicionarAnotacao(versiculoId, titulo, conteudo);
    }
  }

  async atualizarAnotacao(id: number, titulo: string, conteudo: string): Promise<DatabaseResponse<void>> {
    await this.initialize();
    
    if (this.useSQLite) {
      try {
        await this.db.run(
          'UPDATE anotacoes SET titulo = ?, conteudo = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?',
          [titulo, conteudo, id]
        );
        return { success: true };
      } catch (error) {
        console.error('Erro SQLite atualizarAnotacao:', error);
        return { success: false, error: (error as Error).message };
      }
    } else {
      if (!this.jsonService) {
        return { success: false, error: 'Serviço JSON não inicializado' };
      }
      return this.jsonService.atualizarAnotacao(id, titulo, conteudo);
    }
  }

  async removerAnotacao(id: number): Promise<DatabaseResponse<void>> {
    await this.initialize();
    
    if (this.useSQLite) {
      try {
        await this.db.run('DELETE FROM anotacoes WHERE id = ?', [id]);
        return { success: true };
      } catch (error) {
        console.error('Erro SQLite removerAnotacao:', error);
        return { success: false, error: (error as Error).message };
      }
    } else {
      if (!this.jsonService) {
        return { success: false, error: 'Serviço JSON não inicializado' };
      }
      return this.jsonService.removerAnotacao(id);
    }
  }

  // MÉTODOS DE HISTÓRICO
  async adicionarHistorico(livroId: number, capitulo: number): Promise<DatabaseResponse<void>> {
    await this.initialize();
    
    if (this.useSQLite) {
      try {
        await this.db.run(
          'INSERT INTO historico_leitura (livro_id, capitulo) VALUES (?, ?)',
          [livroId, capitulo]
        );
        return { success: true };
      } catch (error) {
        console.error('Erro SQLite adicionarHistorico:', error);
        return { success: false, error: (error as Error).message };
      }
    } else {
      if (!this.jsonService) {
        return { success: false, error: 'Serviço JSON não inicializado' };
      }
      return this.jsonService.adicionarHistorico(livroId, capitulo);
    }
  }

  async getHistorico(): Promise<DatabaseResponse<HistoricoLeitura[]>> {
    await this.initialize();
    
    if (this.useSQLite) {
      try {
        const historico = await this.db.all<HistoricoLeitura>(`
          SELECT 
            h.id,
            h.livro_id,
            h.capitulo,
            h.acessado_em,
            l.nome as livro_nome
          FROM historico_leitura h
          JOIN livros l ON h.livro_id = l.id
          ORDER BY h.acessado_em DESC
          LIMIT 50
        `);
        return { success: true, data: historico };
      } catch (error) {
        console.error('Erro SQLite getHistorico:', error);
        return { success: false, error: (error as Error).message };
      }
    } else {
      if (!this.jsonService) {
        return { success: false, error: 'Serviço JSON não inicializado' };
      }
      return this.jsonService.getHistorico();
    }
  }

  // VERSÍCULO DO DIA
  async getVersiculoDia(): Promise<DatabaseResponse<VersiculoDia | null>> {
    await this.initialize();
    
    if (this.useSQLite) {
      try {
        // Gerar um número baseado na data atual para garantir consistência
        const hoje = new Date();
        const diaDoAno = Math.floor((hoje.getTime() - new Date(hoje.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
        
        const totalVersiculos = await this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM versiculos');
        if (!totalVersiculos || totalVersiculos.count === 0) {
          return { success: true, data: null };
        }
        
        const versiculoIndex = diaDoAno % totalVersiculos.count;
        
        const versiculo = await this.db.get<{
          id: number;
          livro_id: number;
          capitulo: number;
          numero: number;
          texto: string;
          livro_nome: string;
        }>(`
          SELECT 
            v.id,
            v.livro_id,
            v.capitulo,
            v.numero,
            v.texto,
            l.nome as livro_nome
          FROM versiculos v
          JOIN livros l ON v.livro_id = l.id
          ORDER BY v.id
          LIMIT 1 OFFSET ?
        `, [versiculoIndex]);
        
        if (versiculo) {
          const versiculoDia: VersiculoDia = {
            versiculo: {
              id: versiculo.id,
              livro_id: versiculo.livro_id,
              capitulo: versiculo.capitulo,
              numero: versiculo.numero,
              texto: versiculo.texto
            },
            livro_nome: versiculo.livro_nome,
            referencia: `${versiculo.livro_nome} ${versiculo.capitulo}:${versiculo.numero}`
          };
          return { success: true, data: versiculoDia };
        }
        
        return { success: true, data: null };
      } catch (error) {
        console.error('Erro SQLite getVersiculoDia:', error);
        return { success: false, error: (error as Error).message };
      }
    } else {
      if (!this.jsonService) {
        return { success: false, error: 'Serviço JSON não inicializado' };
      }
      return this.jsonService.getVersiculoDia();
    }
  }

  // CONFIGURAÇÕES
  async getConfiguracao(chave: string): Promise<DatabaseResponse<string | null>> {
    await this.initialize();
    
    if (this.useSQLite) {
      try {
        const config = await this.db.get<{ valor: string }>(
          'SELECT valor FROM configuracoes WHERE chave = ?',
          [chave]
        );
        return { success: true, data: config?.valor || null };
      } catch (error) {
        console.error('Erro SQLite getConfiguracao:', error);
        return { success: false, error: (error as Error).message };
      }
    } else {
      if (!this.jsonService) {
        return { success: false, error: 'Serviço JSON não inicializado' };
      }
      return this.jsonService.getConfiguracao(chave);
    }
  }

  async setConfiguracao(chave: string, valor: string): Promise<DatabaseResponse<void>> {
    await this.initialize();
    
    if (this.useSQLite) {
      try {
        await this.db.run(
          'INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)',
          [chave, valor]
        );
        return { success: true };
      } catch (error) {
        console.error('Erro SQLite setConfiguracao:', error);
        return { success: false, error: (error as Error).message };
      }
    } else {
      if (!this.jsonService) {
        return { success: false, error: 'Serviço JSON não inicializado' };
      }
      return this.jsonService.setConfiguracao(chave, valor);
    }
  }

  // ESTATÍSTICAS
  async getEstatisticas(): Promise<DatabaseResponse<EstatisticasLeitura>> {
    await this.initialize();
    
    if (this.useSQLite) {
      try {
        const stats = await this.db.all<{ count: number; livros_visitados: number; ultimo_acesso: string }>(`
          SELECT 
            COUNT(*) as count,
            COUNT(DISTINCT livro_id) as livros_visitados,
            MAX(acessado_em) as ultimo_acesso
          FROM historico_leitura
        `);
        
        const estatisticas: EstatisticasLeitura = {
          total_versiculos_lidos: stats[0]?.count || 0,
          livros_visitados: stats[0]?.livros_visitados || 0,
          tempo_total_leitura: 0, // Não temos esse dado no banco atual
          sequencia_dias: 0, // Implementar lógica mais complexa se necessário
          ultimo_acesso: stats[0]?.ultimo_acesso || new Date().toISOString()
        };
        
        return { success: true, data: estatisticas };
      } catch (error) {
        console.error('Erro SQLite getEstatisticas:', error);
        return { success: false, error: (error as Error).message };
      }
    } else {
      if (!this.jsonService) {
        return { success: false, error: 'Serviço JSON não inicializado' };
      }
      const result = await this.jsonService.getEstatisticas();
      if (result.success && result.data) {
        const data = result.data as {
          total_versiculos_lidos?: number;
          livros_visitados?: number;
          tempo_total_leitura?: number;
          sequencia_dias?: number;
          ultimo_acesso?: string;
        };
        const estatisticas: EstatisticasLeitura = {
          total_versiculos_lidos: data.total_versiculos_lidos || 0,
          livros_visitados: data.livros_visitados || 0,
          tempo_total_leitura: data.tempo_total_leitura || 0,
          sequencia_dias: data.sequencia_dias || 0,
          ultimo_acesso: data.ultimo_acesso || new Date().toISOString()
        };
        return { success: true, data: estatisticas };
      }
      return { success: false, error: result.error || 'Erro ao obter estatísticas' };
    }
  }
}

// Instância singleton
let serviceInstance: HybridBibliaService | null = null;
let initPromise: Promise<void> | null = null;

export const getBibliaService = (): HybridBibliaService => {
  if (!serviceInstance) {
    serviceInstance = new HybridBibliaService();
  }
  return serviceInstance;
};

export const initBibliaService = async (): Promise<HybridBibliaService> => {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        console.log('🚀 Inicializando serviço híbrido da Bíblia...');
        const service = getBibliaService();
        await service.initialize();
        console.log('✅ Serviço híbrido da Bíblia inicializado');
      } catch (error) {
        console.error('❌ Erro ao inicializar serviço da Bíblia:', error);
        // Reset promise para permitir retry
        initPromise = null;
        // Don't throw, just use service with JSON fallback
        const service = getBibliaService();
        // Force initialization of JSON service as fallback
        try {
          await service.initialize();
        } catch (fallbackError) {
          console.error('❌ Erro no fallback:', fallbackError);
        }
      }
    })();
  }
  
  await initPromise;
  return getBibliaService();
};