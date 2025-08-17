#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-var-requires */
const { Database } = require('sqlite3');
const path = require('path');
const fs = require('fs');

// Mock do Electron app para ambiente CLI - função robusta
function createElectronMock() {
  const userDataPath = path.join(process.cwd(), '.tmp', 'user-data');
  
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  
  return {
    isPackaged: false,
    getPath: (name) => {
      if (name === 'userData') return userDataPath;
      return process.cwd();
    },
    getAppPath: () => process.cwd()
  };
}

// Tentar usar Electron real, senão usar mock
let app;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const electron = require('electron');
  app = electron.app;
  
  // Se não temos as propriedades necessárias, criar mock
  if (!app || typeof app.getPath !== 'function') {
    app = createElectronMock();
  }
} catch (error) {
  // Electron não disponível, usar mock
  app = createElectronMock();
}

// Mapeamento dos livros da Bíblia
const bookMappings = [
  // Antigo Testamento
  { abbrev: 'Gn', nome: 'Gênesis', testamento: 'Antigo', ordem: 1 },
  { abbrev: 'Êx', nome: 'Êxodo', testamento: 'Antigo', ordem: 2 },
  { abbrev: 'Lv', nome: 'Levítico', testamento: 'Antigo', ordem: 3 },
  { abbrev: 'Nm', nome: 'Números', testamento: 'Antigo', ordem: 4 },
  { abbrev: 'Dt', nome: 'Deuteronômio', testamento: 'Antigo', ordem: 5 },
  { abbrev: 'Js', nome: 'Josué', testamento: 'Antigo', ordem: 6 },
  { abbrev: 'Jz', nome: 'Juízes', testamento: 'Antigo', ordem: 7 },
  { abbrev: 'Rt', nome: 'Rute', testamento: 'Antigo', ordem: 8 },
  { abbrev: '1Sm', nome: '1 Samuel', testamento: 'Antigo', ordem: 9 },
  { abbrev: '2Sm', nome: '2 Samuel', testamento: 'Antigo', ordem: 10 },
  { abbrev: '1Rs', nome: '1 Reis', testamento: 'Antigo', ordem: 11 },
  { abbrev: '2Rs', nome: '2 Reis', testamento: 'Antigo', ordem: 12 },
  { abbrev: '1Cr', nome: '1 Crônicas', testamento: 'Antigo', ordem: 13 },
  { abbrev: '2Cr', nome: '2 Crônicas', testamento: 'Antigo', ordem: 14 },
  { abbrev: 'Ed', nome: 'Esdras', testamento: 'Antigo', ordem: 15 },
  { abbrev: 'Ne', nome: 'Neemias', testamento: 'Antigo', ordem: 16 },
  { abbrev: 'Et', nome: 'Ester', testamento: 'Antigo', ordem: 17 },
  { abbrev: 'Jó', nome: 'Jó', testamento: 'Antigo', ordem: 18 },
  { abbrev: 'Sl', nome: 'Salmos', testamento: 'Antigo', ordem: 19 },
  { abbrev: 'Pv', nome: 'Provérbios', testamento: 'Antigo', ordem: 20 },
  { abbrev: 'Ec', nome: 'Eclesiastes', testamento: 'Antigo', ordem: 21 },
  { abbrev: 'Ct', nome: 'Cantares', testamento: 'Antigo', ordem: 22 },
  { abbrev: 'Is', nome: 'Isaías', testamento: 'Antigo', ordem: 23 },
  { abbrev: 'Jr', nome: 'Jeremias', testamento: 'Antigo', ordem: 24 },
  { abbrev: 'Lm', nome: 'Lamentações', testamento: 'Antigo', ordem: 25 },
  { abbrev: 'Ez', nome: 'Ezequiel', testamento: 'Antigo', ordem: 26 },
  { abbrev: 'Dn', nome: 'Daniel', testamento: 'Antigo', ordem: 27 },
  { abbrev: 'Os', nome: 'Oséias', testamento: 'Antigo', ordem: 28 },
  { abbrev: 'Jl', nome: 'Joel', testamento: 'Antigo', ordem: 29 },
  { abbrev: 'Am', nome: 'Amós', testamento: 'Antigo', ordem: 30 },
  { abbrev: 'Ob', nome: 'Obadias', testamento: 'Antigo', ordem: 31 },
  { abbrev: 'Jn', nome: 'Jonas', testamento: 'Antigo', ordem: 32 },
  { abbrev: 'Mq', nome: 'Miquéias', testamento: 'Antigo', ordem: 33 },
  { abbrev: 'Na', nome: 'Naum', testamento: 'Antigo', ordem: 34 },
  { abbrev: 'Hc', nome: 'Habacuque', testamento: 'Antigo', ordem: 35 },
  { abbrev: 'Sf', nome: 'Sofonias', testamento: 'Antigo', ordem: 36 },
  { abbrev: 'Ag', nome: 'Ageu', testamento: 'Antigo', ordem: 37 },
  { abbrev: 'Zc', nome: 'Zacarias', testamento: 'Antigo', ordem: 38 },
  { abbrev: 'Ml', nome: 'Malaquias', testamento: 'Antigo', ordem: 39 },
  
  // Novo Testamento
  { abbrev: 'Mt', nome: 'Mateus', testamento: 'Novo', ordem: 40 },
  { abbrev: 'Mc', nome: 'Marcos', testamento: 'Novo', ordem: 41 },
  { abbrev: 'Lc', nome: 'Lucas', testamento: 'Novo', ordem: 42 },
  { abbrev: 'Jo', nome: 'João', testamento: 'Novo', ordem: 43 },
  { abbrev: 'At', nome: 'Atos', testamento: 'Novo', ordem: 44 },
  { abbrev: 'Rm', nome: 'Romanos', testamento: 'Novo', ordem: 45 },
  { abbrev: '1Co', nome: '1 Coríntios', testamento: 'Novo', ordem: 46 },
  { abbrev: '2Co', nome: '2 Coríntios', testamento: 'Novo', ordem: 47 },
  { abbrev: 'Gl', nome: 'Gálatas', testamento: 'Novo', ordem: 48 },
  { abbrev: 'Ef', nome: 'Efésios', testamento: 'Novo', ordem: 49 },
  { abbrev: 'Fp', nome: 'Filipenses', testamento: 'Novo', ordem: 50 },
  { abbrev: 'Cl', nome: 'Colossenses', testamento: 'Novo', ordem: 51 },
  { abbrev: '1Ts', nome: '1 Tessalonicenses', testamento: 'Novo', ordem: 52 },
  { abbrev: '2Ts', nome: '2 Tessalonicenses', testamento: 'Novo', ordem: 53 },
  { abbrev: '1Tn', nome: '1 Timóteo', testamento: 'Novo', ordem: 54 },
  { abbrev: '2Tm', nome: '2 Timóteo', testamento: 'Novo', ordem: 55 },
  { abbrev: 'Tt', nome: 'Tito', testamento: 'Novo', ordem: 56 },
  { abbrev: 'Fm', nome: 'Filemom', testamento: 'Novo', ordem: 57 },
  { abbrev: 'Hb', nome: 'Hebreus', testamento: 'Novo', ordem: 58 },
  { abbrev: 'Tg', nome: 'Tiago', testamento: 'Novo', ordem: 59 },
  { abbrev: '1Pe', nome: '1 Pedro', testamento: 'Novo', ordem: 60 },
  { abbrev: '2Pe', nome: '2 Pedro', testamento: 'Novo', ordem: 61 },
  { abbrev: '1Jo', nome: '1 João', testamento: 'Novo', ordem: 62 },
  { abbrev: '2Jo', nome: '2 João', testamento: 'Novo', ordem: 63 },
  { abbrev: '3Jo', nome: '3 João', testamento: 'Novo', ordem: 64 },
  { abbrev: 'Jd', nome: 'Judas', testamento: 'Novo', ordem: 65 },
  { abbrev: 'Ap', nome: 'Apocalipse', testamento: 'Novo', ordem: 66 }
];

class SimpleMigrator {
  constructor() {
    this.db = null;
    this.bibliaData = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      const userDataPath = app.getPath('userData');
      const dbPath = path.join(userDataPath, 'biblia.db');
      
      console.log('🔧 Conectando ao banco:', dbPath);
      
      this.db = new Database(dbPath, (err) => {
        if (err) {
          console.error('❌ Erro ao conectar ao banco:', err);
          reject(err);
        } else {
          console.log('✅ Conectado ao SQLite');
          resolve();
        }
      });
    });
  }

  async createTables() {
    console.log('🏗️ Criando tabelas...');
    
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
      )`,
      
      `CREATE VIRTUAL TABLE IF NOT EXISTS versiculos_fts USING fts5(
        livro_nome,
        capitulo,
        numero,
        texto
      )`
    ];

    for (const sql of tables) {
      await this.runSQL(sql);
    }

    // Inserir configurações padrão
    const defaultConfigs = [
      ['tema', 'claro'],
      ['tamanho_fonte', 'media'],
      ['familia_fonte', 'system-ui'],
      ['mostrar_numeros_versiculos', 'true'],
      ['versao_biblia', 'King James em Português']
    ];

    for (const [chave, valor] of defaultConfigs) {
      await this.runSQL(
        'INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES (?, ?)',
        [chave, valor]
      );
    }
  }

  runSQL(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }

  getSQL(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async loadBibleJSON() {
    console.log('📖 Carregando dados da Bíblia...');
    
    const jsonPath = path.join(__dirname, '..', 'assets', 'KJA.json');
    
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`❌ Arquivo KJA.json não encontrado: ${jsonPath}`);
    }
    
    const data = fs.readFileSync(jsonPath, 'utf-8');
    this.bibliaData = JSON.parse(data);
    
    console.log(`✅ ${this.bibliaData.length} livros carregados`);
  }

  getBookMapping(abbrev) {
    return bookMappings.find(book => book.abbrev === abbrev);
  }

  async clearExistingData() {
    console.log('🧹 Limpando dados existentes...');
    
    try {
      await this.runSQL('DROP TABLE IF EXISTS versiculos_fts');
      await this.runSQL('DELETE FROM historico_leitura');
      await this.runSQL('DELETE FROM anotacoes');
      await this.runSQL('DELETE FROM favoritos');
      await this.runSQL('DELETE FROM versiculos');
      await this.runSQL('DELETE FROM capitulos');
      await this.runSQL('DELETE FROM livros');
      
      // Recriar tabela FTS
      await this.runSQL(`CREATE VIRTUAL TABLE versiculos_fts USING fts5(
        livro_nome,
        capitulo,
        numero,
        texto
      )`);
    } catch (error) {
      console.warn('⚠️ Aviso na limpeza:', error.message);
    }
    
    console.log('✅ Dados removidos');
  }

  async insertBooks() {
    console.log('📚 Inserindo livros...');
    
    const bookIdMap = new Map();
    
    for (const bookData of this.bibliaData) {
      const mapping = this.getBookMapping(bookData.abbrev);
      
      if (!mapping) {
        console.warn(`⚠️ Mapeamento não encontrado: ${bookData.abbrev}`);
        continue;
      }
      
      await this.runSQL(
        'INSERT INTO livros (nome, abreviacao, testamento, ordem, capitulos_total) VALUES (?, ?, ?, ?, ?)',
        [mapping.nome, mapping.abbrev, mapping.testamento, mapping.ordem, bookData.chapters.length]
      );
      
      const result = await this.getSQL('SELECT id FROM livros WHERE abreviacao = ?', [mapping.abbrev]);
      if (result) {
        bookIdMap.set(bookData.abbrev, result.id);
      }
    }
    
    console.log(`✅ ${bookIdMap.size} livros inseridos`);
    return bookIdMap;
  }

  async insertChaptersAndVerses(bookIdMap) {
    console.log('📝 Inserindo capítulos e versículos...');
    
    let totalVerses = 0;
    let totalChapters = 0;
    
    await this.runSQL('BEGIN TRANSACTION');
    
    try {
      for (const bookData of this.bibliaData) {
        const bookId = bookIdMap.get(bookData.abbrev);
        
        if (!bookId) {
          console.warn(`⚠️ ID não encontrado: ${bookData.abbrev}`);
          continue;
        }
        
        const mapping = this.getBookMapping(bookData.abbrev);
        console.log(`📖 Processando ${mapping.nome}...`);
        
        for (let chapterIndex = 0; chapterIndex < bookData.chapters.length; chapterIndex++) {
          const chapterNumber = chapterIndex + 1;
          const verses = bookData.chapters[chapterIndex];
          
          // Inserir capítulo
          await this.runSQL(
            'INSERT INTO capitulos (livro_id, numero, versiculos_total) VALUES (?, ?, ?)',
            [bookId, chapterNumber, verses.length]
          );
          
          totalChapters++;
          
          // Inserir versículos
          for (let verseIndex = 0; verseIndex < verses.length; verseIndex++) {
            const verseNumber = verseIndex + 1;
            const verseText = verses[verseIndex];
            
            await this.runSQL(
              'INSERT INTO versiculos (livro_id, capitulo, numero, texto) VALUES (?, ?, ?, ?)',
              [bookId, chapterNumber, verseNumber, verseText]
            );
            
            totalVerses++;
          }
        }
        
        console.log(`✅ ${mapping.nome}: ${bookData.chapters.length} capítulos`);
      }
      
      await this.runSQL('COMMIT');
      console.log(`✅ Total: ${totalChapters} capítulos, ${totalVerses} versículos`);
      
    } catch (error) {
      await this.runSQL('ROLLBACK');
      throw error;
    }
  }

  async updateFTSIndex() {
    console.log('🔍 Criando índice de busca...');
    
    await this.runSQL(`
      INSERT INTO versiculos_fts (livro_nome, capitulo, numero, texto)
      SELECT l.nome, v.capitulo, v.numero, v.texto
      FROM versiculos v
      JOIN livros l ON v.livro_id = l.id
    `);
    
    console.log('✅ Índice FTS criado');
  }

  async generateStats() {
    console.log('\n📊 Estatísticas da migração:');
    
    const livros = await this.getSQL('SELECT COUNT(*) as count FROM livros');
    const capitulos = await this.getSQL('SELECT COUNT(*) as count FROM capitulos');
    const versiculos = await this.getSQL('SELECT COUNT(*) as count FROM versiculos');
    const antigo = await this.getSQL("SELECT COUNT(*) as count FROM livros WHERE testamento = 'Antigo'");
    const novo = await this.getSQL("SELECT COUNT(*) as count FROM livros WHERE testamento = 'Novo'");
    
    console.log(`📚 Livros: ${livros.count}`);
    console.log(`📖 Capítulos: ${capitulos.count}`);
    console.log(`📝 Versículos: ${versiculos.count}`);
    console.log(`📜 Antigo Testamento: ${antigo.count} livros`);
    console.log(`✨ Novo Testamento: ${novo.count} livros`);
    
    // Exemplo de versículo
    const gn11 = await this.getSQL(`
      SELECT v.texto FROM versiculos v 
      JOIN livros l ON v.livro_id = l.id 
      WHERE l.abreviacao = 'Gn' AND v.capitulo = 1 AND v.numero = 1
    `);
    
    if (gn11) {
      console.log(`\n📖 Exemplo - Gênesis 1:1:`);
      console.log(`"${gn11.texto.substring(0, 80)}..."`);
    }
  }

  async testSearch() {
    console.log('\n🔍 Testando busca...');
    
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT livro_nome, capitulo, numero, texto 
         FROM versiculos_fts 
         WHERE versiculos_fts MATCH ? 
         LIMIT 3`,
        ['Deus'],
        (err, rows) => {
          if (err) {
            console.error('❌ Erro na busca:', err);
            reject(err);
          } else {
            console.log(`✅ Busca por "Deus" retornou ${rows.length} resultados:`);
            rows.forEach((row, index) => {
              if (row && row.livro_nome && row.texto) {
                console.log(`${index + 1}. ${row.livro_nome} ${row.capitulo}:${row.numero}`);
                console.log(`   "${row.texto.substring(0, 60)}..."`);
              } else {
                console.log(`${index + 1}. Resultado inválido:`, row);
              }
            });
            resolve();
          }
        }
      );
    });
  }

  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) console.error('Erro ao fechar banco:', err);
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  async migrate() {
    const startTime = Date.now();
    console.log('🚀 Iniciando migração da Bíblia JSON para SQLite...\n');
    
    try {
      await this.initialize();
      await this.createTables();
      await this.loadBibleJSON();
      
      // Verificar se já existem dados
      const existing = await this.getSQL('SELECT COUNT(*) as count FROM livros');
      if (existing && existing.count > 0) {
        console.log(`⚠️ Banco contém ${existing.count} livros. Removendo...`);
        await this.clearExistingData();
      }
      
      const bookIdMap = await this.insertBooks();
      await this.insertChaptersAndVerses(bookIdMap);
      await this.updateFTSIndex();
      await this.generateStats();
      await this.testSearch();
      
      const duration = Date.now() - startTime;
      console.log(`\n🎉 Migração concluída em ${duration}ms!`);
      console.log('✅ Banco SQLite pronto para uso.\n');
      
    } catch (error) {
      console.error('\n❌ Erro na migração:', error);
      throw error;
    } finally {
      await this.close();
    }
  }
}

// Verificar argumentos
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const args = process.argv.slice(2);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const force = process.argv.includes('--force');

// Verificar se arquivo JSON existe
const jsonPath = path.join(__dirname, '..', 'assets', 'KJA.json');
if (!fs.existsSync(jsonPath)) {
  console.error('❌ Arquivo KJA.json não encontrado em:', jsonPath);
  console.log('📁 Certifique-se de que o arquivo está no diretório assets/');
  process.exit(1);
}

// Executar migração
async function run() {
  const migrator = new SimpleMigrator();
  
  try {
    await migrator.migrate();
    console.log('🎉 Migração executada com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Erro na migração:', error.message);
    process.exit(1);
  }
}

run();