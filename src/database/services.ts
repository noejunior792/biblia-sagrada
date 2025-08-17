import { getDatabase } from './database';
import { 
  Livro, 
  Versiculo, 
  Favorito, 
  Anotacao, 
  HistoricoLeitura, 
  ResultadoBusca, 
  VersiculoDia,
  BuscaParametros,
  DatabaseResponse 
} from '../types';

export class BibliaService {
  private db = getDatabase();

  // Livros
  async getLivros(): Promise<DatabaseResponse<Livro[]>> {
    try {
      const livros = await this.db.all<Livro>(`
        SELECT * FROM livros ORDER BY ordem
      `);
      return { success: true, data: livros };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getLivro(id: number): Promise<DatabaseResponse<Livro>> {
    try {
      const livro = await this.db.get<Livro>(`
        SELECT * FROM livros WHERE id = ?
      `, [id]);
      return { success: true, data: livro };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getLivrosPorTestamento(testamento: 'Antigo' | 'Novo'): Promise<DatabaseResponse<Livro[]>> {
    try {
      const livros = await this.db.all<Livro>(`
        SELECT * FROM livros WHERE testamento = ? ORDER BY ordem
      `, [testamento]);
      return { success: true, data: livros };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Versículos
  async getVersiculosCapitulo(livroId: number, capitulo: number): Promise<DatabaseResponse<Versiculo[]>> {
    try {
      const versiculos = await this.db.all<Versiculo>(`
        SELECT * FROM versiculos 
        WHERE livro_id = ? AND capitulo = ? 
        ORDER BY numero
      `, [livroId, capitulo]);
      return { success: true, data: versiculos };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getVersiculo(id: number): Promise<DatabaseResponse<Versiculo & { livro_nome: string }>> {
    try {
      const versiculo = await this.db.get<Versiculo & { livro_nome: string }>(`
        SELECT v.*, l.nome as livro_nome 
        FROM versiculos v
        JOIN livros l ON v.livro_id = l.id
        WHERE v.id = ?
      `, [id]);
      return { success: true, data: versiculo };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getVersiculoPorReferencia(livroId: number, capitulo: number, numero: number): Promise<DatabaseResponse<Versiculo>> {
    try {
      const versiculo = await this.db.get<Versiculo>(`
        SELECT * FROM versiculos 
        WHERE livro_id = ? AND capitulo = ? AND numero = ?
      `, [livroId, capitulo, numero]);
      return { success: true, data: versiculo };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Busca
  async buscarVersiculos(parametros: BuscaParametros): Promise<DatabaseResponse<ResultadoBusca[]>> {
    try {
      let sql = `
        SELECT v.id as versiculo_id, l.nome as livro_nome, l.abreviacao as livro_abreviacao,
               v.capitulo, v.numero as versiculo_numero, v.texto
        FROM versiculos v
        JOIN livros l ON v.livro_id = l.id
        WHERE 1=1
      `;
      const params: (string | number)[] = [];

      if (parametros.busca_exata) {
        sql += ` AND v.texto LIKE ?`;
        params.push(`%${parametros.termo}%`);
      } else {
        // Busca por palavras individuais
        const palavras = parametros.termo.split(' ').filter(p => p.length > 2);
        if (palavras.length > 0) {
          sql += ` AND (`;
          palavras.forEach((palavra, index) => {
            if (index > 0) sql += ` AND `;
            sql += `v.texto LIKE ?`;
            params.push(`%${palavra}%`);
          });
          sql += `)`;
        }
      }

      if (parametros.livro_id) {
        sql += ` AND v.livro_id = ?`;
        params.push(parametros.livro_id);
      }

      if (parametros.testamento) {
        sql += ` AND l.testamento = ?`;
        params.push(parametros.testamento);
      }

      sql += ` ORDER BY l.ordem, v.capitulo, v.numero LIMIT 100`;

      const resultados = await this.db.all<ResultadoBusca>(sql, params);
      return { success: true, data: resultados };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Favoritos
  async getFavoritos(): Promise<DatabaseResponse<Favorito[]>> {
    try {
      const favoritos = await this.db.all<Favorito>(`
        SELECT f.*, v.texto, v.capitulo, v.numero as versiculo_numero, l.nome as livro_nome
        FROM favoritos f
        JOIN versiculos v ON f.versiculo_id = v.id
        JOIN livros l ON v.livro_id = l.id
        ORDER BY f.criado_em DESC
      `);
      return { success: true, data: favoritos };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async adicionarFavorito(versiculoId: number): Promise<DatabaseResponse<void>> {
    try {
      await this.db.run(`
        INSERT OR IGNORE INTO favoritos (versiculo_id) VALUES (?)
      `, [versiculoId]);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async removerFavorito(versiculoId: number): Promise<DatabaseResponse<void>> {
    try {
      await this.db.run(`
        DELETE FROM favoritos WHERE versiculo_id = ?
      `, [versiculoId]);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async verificarFavorito(versiculoId: number): Promise<DatabaseResponse<boolean>> {
    try {
      const favorito = await this.db.get<{ count: number }>(`
        SELECT COUNT(*) as count FROM favoritos WHERE versiculo_id = ?
      `, [versiculoId]);
      return { success: true, data: (favorito?.count || 0) > 0 };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Anotações
  async getAnotacoes(): Promise<DatabaseResponse<Anotacao[]>> {
    try {
      const anotacoes = await this.db.all<Anotacao>(`
        SELECT a.*, v.texto, v.capitulo, v.numero as versiculo_numero, l.nome as livro_nome
        FROM anotacoes a
        JOIN versiculos v ON a.versiculo_id = v.id
        JOIN livros l ON v.livro_id = l.id
        ORDER BY a.atualizado_em DESC
      `);
      return { success: true, data: anotacoes };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getAnotacoesPorVersiculo(versiculoId: number): Promise<DatabaseResponse<Anotacao[]>> {
    try {
      const anotacoes = await this.db.all<Anotacao>(`
        SELECT a.*, v.texto, v.capitulo, v.numero as versiculo_numero, l.nome as livro_nome
        FROM anotacoes a
        JOIN versiculos v ON a.versiculo_id = v.id
        JOIN livros l ON v.livro_id = l.id
        WHERE a.versiculo_id = ?
        ORDER BY a.criado_em ASC
      `, [versiculoId]);
      return { success: true, data: anotacoes };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async adicionarAnotacao(versiculoId: number, titulo: string, conteudo: string): Promise<DatabaseResponse<void>> {
    try {
      await this.db.run(`
        INSERT INTO anotacoes (versiculo_id, titulo, conteudo) VALUES (?, ?, ?)
      `, [versiculoId, titulo, conteudo]);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async atualizarAnotacao(id: number, titulo: string, conteudo: string): Promise<DatabaseResponse<void>> {
    try {
      await this.db.run(`
        UPDATE anotacoes 
        SET titulo = ?, conteudo = ?, atualizado_em = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [titulo, conteudo, id]);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async removerAnotacao(id: number): Promise<DatabaseResponse<void>> {
    try {
      await this.db.run(`DELETE FROM anotacoes WHERE id = ?`, [id]);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Histórico de leitura
  async adicionarHistorico(livroId: number, capitulo: number): Promise<DatabaseResponse<void>> {
    try {
      // Remove entradas antigas do mesmo livro/capítulo
      await this.db.run(`
        DELETE FROM historico_leitura 
        WHERE livro_id = ? AND capitulo = ?
      `, [livroId, capitulo]);

      // Adiciona nova entrada
      await this.db.run(`
        INSERT INTO historico_leitura (livro_id, capitulo) VALUES (?, ?)
      `, [livroId, capitulo]);

      // Mantém apenas os últimos 50 registros
      await this.db.run(`
        DELETE FROM historico_leitura 
        WHERE id NOT IN (
          SELECT id FROM historico_leitura 
          ORDER BY acessado_em DESC 
          LIMIT 50
        )
      `);

      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async getHistorico(): Promise<DatabaseResponse<HistoricoLeitura[]>> {
    try {
      const historico = await this.db.all<HistoricoLeitura>(`
        SELECT h.*, l.nome as livro_nome
        FROM historico_leitura h
        JOIN livros l ON h.livro_id = l.id
        ORDER BY h.acessado_em DESC
        LIMIT 20
      `);
      return { success: true, data: historico };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Versículo do dia
  async getVersiculoDia(): Promise<DatabaseResponse<VersiculoDia>> {
    try {
      // Usar data atual como seed para garantir mesmo versículo por dia
      const hoje = new Date();
      const seed = hoje.getFullYear() * 10000 + (hoje.getMonth() + 1) * 100 + hoje.getDate();
      
      const resultado = await this.db.get<{
        id: number;
        livro_id: number;
        capitulo: number;
        numero: number;
        texto: string;
        livro_nome: string;
        referencia: string;
      }>(`
        SELECT v.*, l.nome as livro_nome, 
               l.nome || ' ' || v.capitulo || ':' || v.numero as referencia
        FROM versiculos v
        JOIN livros l ON v.livro_id = l.id
        WHERE v.id = (
          SELECT id FROM versiculos 
          ORDER BY (id * 9301 + 49297) % 233280
          LIMIT 1 OFFSET (? % (SELECT COUNT(*) FROM versiculos))
        )
      `, [seed]);

      if (resultado) {
        return { 
          success: true, 
          data: {
            versiculo: {
              id: resultado.id,
              livro_id: resultado.livro_id,
              capitulo: resultado.capitulo,
              numero: resultado.numero,
              texto: resultado.texto
            },
            livro_nome: resultado.livro_nome,
            referencia: resultado.referencia
          }
        };
      } else {
        return { success: false, error: 'Nenhum versículo encontrado' };
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Configurações
  async getConfiguracao(chave: string): Promise<DatabaseResponse<string>> {
    try {
      const config = await this.db.get<{ valor: string }>(`
        SELECT valor FROM configuracoes WHERE chave = ?
      `, [chave]);
      return { success: true, data: config?.valor };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async setConfiguracao(chave: string, valor: string): Promise<DatabaseResponse<void>> {
    try {
      await this.db.run(`
        INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)
      `, [chave, valor]);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Estatísticas
  async getEstatisticas(): Promise<DatabaseResponse<Record<string, unknown>>> {
    try {
      const totalVersiculos = await this.db.get<{ count: number }>(`
        SELECT COUNT(*) as count FROM versiculos
      `);

      const totalFavoritos = await this.db.get<{ count: number }>(`
        SELECT COUNT(*) as count FROM favoritos
      `);

      const totalAnotacoes = await this.db.get<{ count: number }>(`
        SELECT COUNT(*) as count FROM anotacoes
      `);

      const livrosVisitados = await this.db.get<{ count: number }>(`
        SELECT COUNT(DISTINCT livro_id) as count FROM historico_leitura
      `);

      return {
        success: true,
        data: {
          total_versiculos: totalVersiculos?.count || 0,
          total_favoritos: totalFavoritos?.count || 0,
          total_anotacoes: totalAnotacoes?.count || 0,
          livros_visitados: livrosVisitados?.count || 0
        }
      };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Método para inserir versículos (usado para popular o banco)
  async inserirVersiculo(livroId: number, capitulo: number, numero: number, texto: string): Promise<DatabaseResponse<void>> {
    try {
      await this.db.run(`
        INSERT OR REPLACE INTO versiculos (livro_id, capitulo, numero, texto) 
        VALUES (?, ?, ?, ?)
      `, [livroId, capitulo, numero, texto]);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Método para inserir múltiplos versículos de uma vez
  async inserirVersiculosLote(versiculos: Array<{ livroId: number, capitulo: number, numero: number, texto: string }>): Promise<DatabaseResponse<void>> {
    try {
      for (const v of versiculos) {
        await this.inserirVersiculo(v.livroId, v.capitulo, v.numero, v.texto);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
}

// Instância singleton do serviço
let serviceInstance: BibliaService | null = null;

export const getBibliaService = (): BibliaService => {
  if (!serviceInstance) {
    serviceInstance = new BibliaService();
  }
  return serviceInstance;
};