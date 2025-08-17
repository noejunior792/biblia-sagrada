import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { BibliaDatabase } from './database';

interface BibliaJSON {
  abbrev: string;
  chapters: string[][];
}

interface BookMapping {
  abbrev: string;
  nome: string;
  testamento: 'Antigo' | 'Novo';
  ordem: number;
}

class JSONToSQLiteMigrator {
  private db: BibliaDatabase;
  private bibliaData: BibliaJSON[] = [];
  
  // Mapeamento completo dos livros da Bíblia
  private bookMappings: BookMapping[] = [
    // Antigo Testamento
    { abbrev: 'Gn', nome: 'Gênesis', testamento: 'Antigo', ordem: 1 },
    { abbrev: 'Ex', nome: 'Êxodo', testamento: 'Antigo', ordem: 2 },
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
    { abbrev: '1Tm', nome: '1 Timóteo', testamento: 'Novo', ordem: 54 },
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

  constructor() {
    this.db = new BibliaDatabase();
  }

  private async loadBibliaJSON(): Promise<void> {
    try {
      const isDev = !app.isPackaged;
      let assetsPath: string;
      
      if (isDev) {
        // Em desenvolvimento, tentar múltiplos caminhos possíveis
        const possiblePaths = [
          path.join(process.cwd(), 'assets', 'KJA.json'),
          path.join(__dirname, '..', '..', '..', 'assets', 'KJA.json'),
          path.join(app.getAppPath(), 'assets', 'KJA.json')
        ];
        
        assetsPath = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
      } else {
        // Em produção
        assetsPath = path.join(process.resourcesPath, 'assets', 'KJA.json');
      }
      
      console.log('📖 Carregando dados da Bíblia de:', assetsPath);
      
      if (!fs.existsSync(assetsPath)) {
        throw new Error(`❌ Arquivo KJA.json não encontrado em: ${assetsPath}`);
      }
      
      const data = fs.readFileSync(assetsPath, 'utf-8');
      this.bibliaData = JSON.parse(data);
      console.log(`✅ ${this.bibliaData.length} livros carregados do JSON`);
    } catch (error) {
      console.error('❌ Erro ao carregar dados da Bíblia:', error);
      throw error;
    }
  }

  private getBookMapping(abbrev: string): BookMapping | undefined {
    return this.bookMappings.find(book => book.abbrev === abbrev);
  }

  private async clearExistingData(): Promise<void> {
    console.log('🧹 Limpando dados existentes...');
    
    // Limpar na ordem correta devido às foreign keys
    await this.db.run('DELETE FROM versiculos_fts');
    await this.db.run('DELETE FROM historico_leitura');
    await this.db.run('DELETE FROM anotacoes');
    await this.db.run('DELETE FROM favoritos');
    await this.db.run('DELETE FROM versiculos');
    await this.db.run('DELETE FROM capitulos');
    await this.db.run('DELETE FROM livros');
    
    console.log('✅ Dados existentes removidos');
  }

  private async insertBooks(): Promise<Map<string, number>> {
    console.log('📚 Inserindo livros...');
    
    const bookIdMap = new Map<string, number>();
    
    for (const bookData of this.bibliaData) {
      const mapping = this.getBookMapping(bookData.abbrev);
      
      if (!mapping) {
        console.warn(`⚠️ Mapeamento não encontrado para: ${bookData.abbrev}`);
        continue;
      }
      
      await this.db.run(
        `INSERT INTO livros (nome, abreviacao, testamento, ordem, capitulos_total) 
         VALUES (?, ?, ?, ?, ?)`,
        [
          mapping.nome,
          mapping.abbrev,
          mapping.testamento,
          mapping.ordem,
          bookData.chapters.length
        ]
      );
      
      // Buscar o ID gerado
      const result = await this.db.get<{ id: number }>(
        'SELECT id FROM livros WHERE abreviacao = ?',
        [mapping.abbrev]
      );
      
      if (result) {
        bookIdMap.set(bookData.abbrev, result.id);
      }
    }
    
    console.log(`✅ ${bookIdMap.size} livros inseridos`);
    return bookIdMap;
  }

  private async insertChaptersAndVerses(bookIdMap: Map<string, number>): Promise<void> {
    console.log('📝 Inserindo capítulos e versículos...');
    
    let totalVerses = 0;
    let totalChapters = 0;
    
    // Usar transação para melhor performance
    await this.db.run('BEGIN TRANSACTION');
    
    try {
      for (const bookData of this.bibliaData) {
        const bookId = bookIdMap.get(bookData.abbrev);
        
        if (!bookId) {
          console.warn(`⚠️ ID do livro não encontrado para: ${bookData.abbrev}`);
          continue;
        }
        
        const mapping = this.getBookMapping(bookData.abbrev);
        console.log(`📖 Processando ${mapping?.nome} (${bookData.abbrev})...`);
        
        for (let chapterIndex = 0; chapterIndex < bookData.chapters.length; chapterIndex++) {
          const chapterNumber = chapterIndex + 1;
          const verses = bookData.chapters[chapterIndex];
          
          // Inserir capítulo
          await this.db.run(
            `INSERT INTO capitulos (livro_id, numero, versiculos_total) 
             VALUES (?, ?, ?)`,
            [bookId, chapterNumber, verses.length]
          );
          
          totalChapters++;
          
          // Inserir versículos do capítulo
          for (let verseIndex = 0; verseIndex < verses.length; verseIndex++) {
            const verseNumber = verseIndex + 1;
            const verseText = verses[verseIndex];
            
            await this.db.run(
              `INSERT INTO versiculos (livro_id, capitulo, numero, texto) 
               VALUES (?, ?, ?, ?)`,
              [bookId, chapterNumber, verseNumber, verseText]
            );
            
            totalVerses++;
          }
        }
        
        console.log(`✅ ${mapping?.nome}: ${bookData.chapters.length} capítulos processados`);
      }
      
      await this.db.run('COMMIT');
      console.log(`✅ Total inserido: ${totalChapters} capítulos, ${totalVerses} versículos`);
      
    } catch (error) {
      await this.db.run('ROLLBACK');
      throw error;
    }
  }

  private async updateFTSIndex(): Promise<void> {
    console.log('🔍 Atualizando índice de busca (FTS)...');
    
    await this.db.run(`
      INSERT INTO versiculos_fts (rowid, livro_nome, capitulo, numero, texto)
      SELECT v.id, l.nome, v.capitulo, v.numero, v.texto
      FROM versiculos v
      JOIN livros l ON v.livro_id = l.id
    `);
    
    console.log('✅ Índice FTS atualizado');
  }

  private async generateStatistics(): Promise<void> {
    console.log('\n📊 Estatísticas da migração:');
    
    const stats = {
      livros: await this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM livros'),
      capitulos: await this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM capitulos'),
      versiculos: await this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM versiculos'),
      antigoTestamento: await this.db.get<{ count: number }>(
        "SELECT COUNT(*) as count FROM livros WHERE testamento = 'Antigo'"
      ),
      novoTestamento: await this.db.get<{ count: number }>(
        "SELECT COUNT(*) as count FROM livros WHERE testamento = 'Novo'"
      )
    };
    
    console.log(`📚 Livros: ${stats.livros?.count || 0}`);
    console.log(`📖 Capítulos: ${stats.capitulos?.count || 0}`);
    console.log(`📝 Versículos: ${stats.versiculos?.count || 0}`);
    console.log(`📜 Antigo Testamento: ${stats.antigoTestamento?.count || 0} livros`);
    console.log(`✨ Novo Testamento: ${stats.novoTestamento?.count || 0} livros`);
    
    // Verificar alguns versículos específicos
    const gn11 = await this.db.get<{ texto: string }>(
      `SELECT v.texto FROM versiculos v 
       JOIN livros l ON v.livro_id = l.id 
       WHERE l.abreviacao = 'Gn' AND v.capitulo = 1 AND v.numero = 1`
    );
    
    if (gn11) {
      console.log(`\n📖 Exemplo - Gênesis 1:1: "${gn11.texto.substring(0, 50)}..."`);
    }
  }

  private async testSearchFunction(): Promise<void> {
    console.log('\n🔍 Testando função de busca...');
    
    try {
      const searchResults = await this.db.all<{
        livro_nome: string;
        capitulo: number;
        numero: number;
        texto: string;
      }>(
        `SELECT livro_nome, capitulo, numero, texto 
         FROM versiculos_fts 
         WHERE versiculos_fts MATCH ? 
         LIMIT 3`,
        ['Deus']
      );
      
      console.log(`✅ Busca por "Deus" retornou ${searchResults.length} resultados:`);
      searchResults.forEach((result, index) => {
        const textoPreview = result.texto ? result.texto.substring(0, 80) : '[texto vazio]';
        console.log(`${index + 1}. ${result.livro_nome} ${result.capitulo}:${result.numero} - ${textoPreview}...`);
      });
      
    } catch (error) {
      console.error('❌ Erro ao testar busca:', error);
    }
  }

  async migrate(): Promise<void> {
    const startTime = Date.now();
    console.log('🚀 Iniciando migração do JSON para SQLite...\n');
    
    try {
      // 1. Inicializar banco de dados
      console.log('🔧 Inicializando banco de dados...');
      await this.db.initialize();
      
      // 2. Carregar dados do JSON
      await this.loadBibliaJSON();
      
      // 3. Verificar se já existem dados
      const existingBooks = await this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM livros');
      if (existingBooks && existingBooks.count > 0) {
        console.log(`⚠️ Banco já contém ${existingBooks.count} livros. Removendo dados existentes...`);
        await this.clearExistingData();
      }
      
      // 4. Inserir livros
      const bookIdMap = await this.insertBooks();
      
      // 5. Inserir capítulos e versículos
      await this.insertChaptersAndVerses(bookIdMap);
      
      // 6. Atualizar índice FTS
      await this.updateFTSIndex();
      
      // 7. Gerar estatísticas
      await this.generateStatistics();
      
      // 8. Testar busca
      await this.testSearchFunction();
      
      const duration = Date.now() - startTime;
      console.log(`\n🎉 Migração concluída com sucesso em ${duration}ms!`);
      console.log('✅ Banco de dados SQLite está pronto para uso.\n');
      
    } catch (error) {
      console.error('❌ Erro durante a migração:', error);
      throw error;
    } finally {
      await this.db.close();
    }
  }
}

// Função para executar a migração
export async function migrateJSONToSQLite(): Promise<void> {
  const migrator = new JSONToSQLiteMigrator();
  await migrator.migrate();
}

// Função para verificar se a migração é necessária
export async function isMigrationNeeded(): Promise<boolean> {
  const db = new BibliaDatabase();
  
  try {
    await db.initialize();
    const result = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM versiculos');
    await db.close();
    
    // Se não há versículos, migração é necessária
    return !result || result.count === 0;
  } catch (error) {
    console.error('Erro ao verificar se migração é necessária:', error);
    return true; // Em caso de erro, assumir que migração é necessária
  }
}

// Se executado diretamente
if (require.main === module) {
  migrateJSONToSQLite()
    .then(() => {
      console.log('Migração executada com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Erro na migração:', error);
      process.exit(1);
    });
}