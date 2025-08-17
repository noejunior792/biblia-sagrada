import { Database } from 'sqlite3';
import { app } from 'electron';
import * as path from 'path';


export class BibliaDatabase {
  private db: Database | null = null;
  private dbPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'biblia.db');
  }

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db = new Database(this.dbPath, (err) => {
        if (err) {
          console.error('Erro ao abrir banco de dados:', err);
          reject(err);
        } else {
          console.log('Banco de dados SQLite conectado');
          // Configure database for better performance and concurrency
          this.configureDatabase()
            .then(() => this.createTables())
            .then(resolve)
            .catch(reject);
        }
      });
    });
  }

  private async configureDatabase(): Promise<void> {
    if (!this.db) {
      throw new Error('Database não inicializado');
    }

    // Enable WAL mode for better concurrency
    await this.run('PRAGMA journal_mode = WAL');
    // Set synchronous mode to NORMAL for better performance
    await this.run('PRAGMA synchronous = NORMAL');
    // Set busy timeout to 30 seconds
    await this.run('PRAGMA busy_timeout = 30000');
    // Enable foreign keys
    await this.run('PRAGMA foreign_keys = ON');
    
    console.log('✅ Configurações do banco aplicadas');
  }

  private async createTables(): Promise<void> {
    const tables = [
      `CREATE TABLE IF NOT EXISTS livros (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        abreviacao TEXT NOT NULL,
        testamento TEXT NOT NULL CHECK(testamento IN ('Antigo', 'Novo')),
        ordem INTEGER NOT NULL,
        capitulos_total INTEGER NOT NULL
      )`,
      
      `CREATE TABLE IF NOT EXISTS capitulos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        livro_id INTEGER NOT NULL,
        numero INTEGER NOT NULL,
        versiculos_total INTEGER NOT NULL,
        FOREIGN KEY (livro_id) REFERENCES livros(id),
        UNIQUE(livro_id, numero)
      )`,
      
      `CREATE TABLE IF NOT EXISTS versiculos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        livro_id INTEGER NOT NULL,
        capitulo INTEGER NOT NULL,
        numero INTEGER NOT NULL,
        texto TEXT NOT NULL,
        FOREIGN KEY (livro_id) REFERENCES livros(id),
        UNIQUE(livro_id, capitulo, numero)
      )`,
      
      `CREATE TABLE IF NOT EXISTS favoritos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        versiculo_id INTEGER NOT NULL,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (versiculo_id) REFERENCES versiculos(id),
        UNIQUE(versiculo_id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS anotacoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        versiculo_id INTEGER NOT NULL,
        titulo TEXT NOT NULL,
        conteudo TEXT NOT NULL,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (versiculo_id) REFERENCES versiculos(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS historico_leitura (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        livro_id INTEGER NOT NULL,
        capitulo INTEGER NOT NULL,
        acessado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (livro_id) REFERENCES livros(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS configuracoes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chave TEXT UNIQUE NOT NULL,
        valor TEXT NOT NULL
      )`
    ];

    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_versiculos_livro_capitulo ON versiculos(livro_id, capitulo)`,
      `CREATE INDEX IF NOT EXISTS idx_versiculos_texto ON versiculos(texto)`,
      `CREATE INDEX IF NOT EXISTS idx_favoritos_versiculo ON favoritos(versiculo_id)`,
      `CREATE INDEX IF NOT EXISTS idx_anotacoes_versiculo ON anotacoes(versiculo_id)`,
      `CREATE INDEX IF NOT EXISTS idx_historico_livro ON historico_leitura(livro_id)`,
      `CREATE VIRTUAL TABLE IF NOT EXISTS versiculos_fts USING fts5(
        livro_nome,
        capitulo,
        numero,
        texto,
        content=''
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }

    for (const index of indexes) {
      await this.run(index);
    }

    // Configurações padrão
    await this.initializeDefaultConfigurations();
  }

  private async initializeDefaultConfigurations(): Promise<void> {
    const defaultConfigs = [
      { chave: 'tema', valor: 'claro' },
      { chave: 'tamanho_fonte', valor: 'media' },
      { chave: 'familia_fonte', valor: 'system-ui' },
      { chave: 'mostrar_numeros_versiculos', valor: 'true' },
      { chave: 'versao_biblia', valor: 'King James em Português' }
    ];

    for (const config of defaultConfigs) {
      await this.run(
        `INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES (?, ?)`,
        [config.chave, config.valor]
      );
    }
  }

  async run(sql: string, params: unknown[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database não inicializado'));
        return;
      }
      
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async get<T = unknown>(sql: string, params: unknown[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database não inicializado'));
        return;
      }
      
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row as T);
        }
      });
    });
  }

  async all<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database não inicializado'));
        return;
      }
      
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }
      
      // Close WAL mode properly before closing database
      this.db.run('PRAGMA wal_checkpoint(TRUNCATE)', (err) => {
        if (err) {
          console.warn('Aviso ao fazer checkpoint WAL:', err);
        }
        
        this.db!.close((closeErr) => {
          if (closeErr) {
            reject(closeErr);
          } else {
            console.log('Conexão com banco de dados fechada');
            this.db = null;
            resolve();
          }
        });
      });
    });
  }

  // Método para popular o banco com dados da Bíblia
  async populateWithBibleData(): Promise<void> {
    // Verificar se já existe dados
    const existingBooks = await this.all('SELECT COUNT(*) as count FROM livros');
    if ((existingBooks[0] as { count: number })?.count > 0) {
      console.log('Banco já possui dados da Bíblia');
      return;
    }

    console.log('Populando banco com dados da Bíblia...');
    
    // Inserir livros do Antigo Testamento
    const antigoTestamento = [
      { nome: 'Gênesis', abreviacao: 'Gn', capitulos: 50 },
      { nome: 'Êxodo', abreviacao: 'Ex', capitulos: 40 },
      { nome: 'Levítico', abreviacao: 'Lv', capitulos: 27 },
      { nome: 'Números', abreviacao: 'Nm', capitulos: 36 },
      { nome: 'Deuteronômio', abreviacao: 'Dt', capitulos: 34 },
      { nome: 'Josué', abreviacao: 'Js', capitulos: 24 },
      { nome: 'Juízes', abreviacao: 'Jz', capitulos: 21 },
      { nome: 'Rute', abreviacao: 'Rt', capitulos: 4 },
      { nome: '1 Samuel', abreviacao: '1Sm', capitulos: 31 },
      { nome: '2 Samuel', abreviacao: '2Sm', capitulos: 24 },
      { nome: '1 Reis', abreviacao: '1Rs', capitulos: 22 },
      { nome: '2 Reis', abreviacao: '2Rs', capitulos: 25 },
      { nome: '1 Crônicas', abreviacao: '1Cr', capitulos: 29 },
      { nome: '2 Crônicas', abreviacao: '2Cr', capitulos: 36 },
      { nome: 'Esdras', abreviacao: 'Ed', capitulos: 10 },
      { nome: 'Neemias', abreviacao: 'Ne', capitulos: 13 },
      { nome: 'Ester', abreviacao: 'Et', capitulos: 10 },
      { nome: 'Jó', abreviacao: 'Jó', capitulos: 42 },
      { nome: 'Salmos', abreviacao: 'Sl', capitulos: 150 },
      { nome: 'Provérbios', abreviacao: 'Pv', capitulos: 31 },
      { nome: 'Eclesiastes', abreviacao: 'Ec', capitulos: 12 },
      { nome: 'Cantares', abreviacao: 'Ct', capitulos: 8 },
      { nome: 'Isaías', abreviacao: 'Is', capitulos: 66 },
      { nome: 'Jeremias', abreviacao: 'Jr', capitulos: 52 },
      { nome: 'Lamentações', abreviacao: 'Lm', capitulos: 5 },
      { nome: 'Ezequiel', abreviacao: 'Ez', capitulos: 48 },
      { nome: 'Daniel', abreviacao: 'Dn', capitulos: 12 },
      { nome: 'Oséias', abreviacao: 'Os', capitulos: 14 },
      { nome: 'Joel', abreviacao: 'Jl', capitulos: 3 },
      { nome: 'Amós', abreviacao: 'Am', capitulos: 9 },
      { nome: 'Obadias', abreviacao: 'Ob', capitulos: 1 },
      { nome: 'Jonas', abreviacao: 'Jn', capitulos: 4 },
      { nome: 'Miquéias', abreviacao: 'Mq', capitulos: 7 },
      { nome: 'Naum', abreviacao: 'Na', capitulos: 3 },
      { nome: 'Habacuque', abreviacao: 'Hc', capitulos: 3 },
      { nome: 'Sofonias', abreviacao: 'Sf', capitulos: 3 },
      { nome: 'Ageu', abreviacao: 'Ag', capitulos: 2 },
      { nome: 'Zacarias', abreviacao: 'Zc', capitulos: 14 },
      { nome: 'Malaquias', abreviacao: 'Ml', capitulos: 4 }
    ];

    // Inserir livros do Novo Testamento
    const novoTestamento = [
      { nome: 'Mateus', abreviacao: 'Mt', capitulos: 28 },
      { nome: 'Marcos', abreviacao: 'Mc', capitulos: 16 },
      { nome: 'Lucas', abreviacao: 'Lc', capitulos: 24 },
      { nome: 'João', abreviacao: 'Jo', capitulos: 21 },
      { nome: 'Atos', abreviacao: 'At', capitulos: 28 },
      { nome: 'Romanos', abreviacao: 'Rm', capitulos: 16 },
      { nome: '1 Coríntios', abreviacao: '1Co', capitulos: 16 },
      { nome: '2 Coríntios', abreviacao: '2Co', capitulos: 13 },
      { nome: 'Gálatas', abreviacao: 'Gl', capitulos: 6 },
      { nome: 'Efésios', abreviacao: 'Ef', capitulos: 6 },
      { nome: 'Filipenses', abreviacao: 'Fp', capitulos: 4 },
      { nome: 'Colossenses', abreviacao: 'Cl', capitulos: 4 },
      { nome: '1 Tessalonicenses', abreviacao: '1Ts', capitulos: 5 },
      { nome: '2 Tessalonicenses', abreviacao: '2Ts', capitulos: 3 },
      { nome: '1 Timóteo', abreviacao: '1Tm', capitulos: 6 },
      { nome: '2 Timóteo', abreviacao: '2Tm', capitulos: 4 },
      { nome: 'Tito', abreviacao: 'Tt', capitulos: 3 },
      { nome: 'Filemom', abreviacao: 'Fm', capitulos: 1 },
      { nome: 'Hebreus', abreviacao: 'Hb', capitulos: 13 },
      { nome: 'Tiago', abreviacao: 'Tg', capitulos: 5 },
      { nome: '1 Pedro', abreviacao: '1Pe', capitulos: 5 },
      { nome: '2 Pedro', abreviacao: '2Pe', capitulos: 3 },
      { nome: '1 João', abreviacao: '1Jo', capitulos: 5 },
      { nome: '2 João', abreviacao: '2Jo', capitulos: 1 },
      { nome: '3 João', abreviacao: '3Jo', capitulos: 1 },
      { nome: 'Judas', abreviacao: 'Jd', capitulos: 1 },
      { nome: 'Apocalipse', abreviacao: 'Ap', capitulos: 22 }
    ];

    // Inserir livros do Antigo Testamento
    for (let i = 0; i < antigoTestamento.length; i++) {
      const livro = antigoTestamento[i];
      await this.run(
        `INSERT INTO livros (nome, abreviacao, testamento, ordem, capitulos_total) VALUES (?, ?, ?, ?, ?)`,
        [livro.nome, livro.abreviacao, 'Antigo', i + 1, livro.capitulos]
      );
    }

    // Inserir livros do Novo Testamento
    for (let i = 0; i < novoTestamento.length; i++) {
      const livro = novoTestamento[i];
      await this.run(
        `INSERT INTO livros (nome, abreviacao, testamento, ordem, capitulos_total) VALUES (?, ?, ?, ?, ?)`,
        [livro.nome, livro.abreviacao, 'Novo', antigoTestamento.length + i + 1, livro.capitulos]
      );
    }

    console.log('Estrutura básica da Bíblia criada com sucesso!');
  }

  // Método para atualizar índice FTS
  async updateFTSIndex(): Promise<void> {
    // Para FTS5 contentless, usamos rebuild ao invés de DELETE
    try {
      await this.run(`INSERT INTO versiculos_fts(versiculos_fts) VALUES('rebuild')`);
    } catch (error) {
      console.log('⚠️ Aviso ao reconstruir FTS5:', error);
      // Fallback: recriar a tabela FTS5
      await this.run(`DROP TABLE IF EXISTS versiculos_fts`);
      await this.run(`
        CREATE VIRTUAL TABLE IF NOT EXISTS versiculos_fts USING fts5(
          livro_nome,
          capitulo,
          numero,
          texto,
          content='versiculos',
          content_rowid='id'
        )
      `);
      await this.run(`INSERT INTO versiculos_fts(versiculos_fts) VALUES('rebuild')`);
    }
  }
}

// Instância singleton do banco
let databaseInstance: BibliaDatabase | null = null;

export const getDatabase = (): BibliaDatabase => {
  if (!databaseInstance) {
    databaseInstance = new BibliaDatabase();
  }
  return databaseInstance;
};