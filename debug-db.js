#!/usr/bin/env node

const { Database } = require('sqlite3');
const path = require('path');
const fs = require('fs');

// Simular o caminho userData do Electron
const userDataPath = process.env.HOME ? 
  path.join(process.env.HOME, '.config', 'biblia-sagrada') : 
  path.join(__dirname, 'debug-data');

// Criar diretório se não existir
if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true });
}

const dbPath = path.join(userDataPath, 'biblia.db');

console.log('🔍 Debug do Banco de Dados SQLite');
console.log('📍 Caminho do banco:', dbPath);
console.log('📁 UserData path:', userDataPath);
console.log('');

async function testDatabase() {
  return new Promise((resolve, reject) => {
    console.log('🔗 Tentando conectar ao banco...');
    
    const db = new Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Erro ao conectar:', err);
        reject(err);
        return;
      }
      
      console.log('✅ Conexão estabelecida');
      
      // Configurar WAL mode
      db.run('PRAGMA journal_mode = WAL', (walErr) => {
        if (walErr) {
          console.warn('⚠️ Erro ao configurar WAL mode:', walErr);
        } else {
          console.log('✅ WAL mode configurado');
        }
        
        // Configurar busy timeout
        db.run('PRAGMA busy_timeout = 30000', (timeoutErr) => {
          if (timeoutErr) {
            console.warn('⚠️ Erro ao configurar timeout:', timeoutErr);
          } else {
            console.log('✅ Timeout configurado');
          }
          
          // Testar operações básicas
          testOperations(db).then(resolve).catch(reject);
        });
      });
    });
  });
}

async function testOperations(db) {
  return new Promise((resolve, reject) => {
    console.log('\n🧪 Testando operações...');
    
    // Verificar tabelas existentes
    db.all(`SELECT name FROM sqlite_master WHERE type='table'`, (err, tables) => {
      if (err) {
        console.error('❌ Erro ao listar tabelas:', err);
        reject(err);
        return;
      }
      
      console.log('📋 Tabelas encontradas:', tables.map(t => t.name));
      
      if (tables.length === 0) {
        console.log('⚠️ Nenhuma tabela encontrada - banco vazio');
        resolve();
        return;
      }
      
      // Testar contagem de livros
      db.get(`SELECT COUNT(*) as count FROM livros`, (livrosErr, livrosResult) => {
        if (livrosErr) {
          console.error('❌ Erro ao contar livros:', livrosErr);
        } else {
          console.log('📚 Total de livros:', livrosResult?.count || 0);
        }
        
        // Testar contagem de versículos
        db.get(`SELECT COUNT(*) as count FROM versiculos`, (versErr, versResult) => {
          if (versErr) {
            console.error('❌ Erro ao contar versículos:', versErr);
          } else {
            console.log('📖 Total de versículos:', versResult?.count || 0);
          }
          
          // Testar busca de um versículo específico
          db.all(`
            SELECT v.*, l.nome as livro_nome 
            FROM versiculos v 
            JOIN livros l ON v.livro_id = l.id 
            WHERE v.livro_id = 1 AND v.capitulo = 1 
            LIMIT 5
          `, (searchErr, verses) => {
            if (searchErr) {
              console.error('❌ Erro ao buscar versículos:', searchErr);
            } else {
              console.log('📝 Primeiros 5 versículos do primeiro livro:');
              verses.forEach(v => {
                console.log(`   ${v.livro_nome} ${v.capitulo}:${v.numero} - ${v.texto.substring(0, 50)}...`);
              });
            }
            
            // Verificar FTS
            db.get(`SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='versiculos_fts'`, (ftsErr, ftsResult) => {
              if (ftsErr) {
                console.error('❌ Erro ao verificar FTS:', ftsErr);
              } else {
                console.log('🔍 Tabela FTS existe:', (ftsResult?.count || 0) > 0);
              }
              
              // Fechar conexão
              db.close((closeErr) => {
                if (closeErr) {
                  console.error('❌ Erro ao fechar banco:', closeErr);
                  reject(closeErr);
                } else {
                  console.log('\n✅ Teste concluído com sucesso!');
                  resolve();
                }
              });
            });
          });
        });
      });
    });
  });
}

async function main() {
  try {
    console.log('🚀 Iniciando debug...\n');
    
    // Verificar se arquivo do banco existe
    if (fs.existsSync(dbPath)) {
      console.log('📁 Arquivo do banco encontrado');
      const stats = fs.statSync(dbPath);
      console.log('📏 Tamanho do arquivo:', Math.round(stats.size / 1024), 'KB');
      console.log('📅 Última modificação:', stats.mtime.toLocaleString());
    } else {
      console.log('❌ Arquivo do banco não encontrado');
    }
    
    // Verificar arquivos WAL e SHM
    const walPath = dbPath + '-wal';
    const shmPath = dbPath + '-shm';
    
    if (fs.existsSync(walPath)) {
      const walStats = fs.statSync(walPath);
      console.log('📝 Arquivo WAL encontrado, tamanho:', Math.round(walStats.size / 1024), 'KB');
    }
    
    if (fs.existsSync(shmPath)) {
      console.log('🔗 Arquivo SHM encontrado');
    }
    
    console.log('');
    
    await testDatabase();
    
  } catch (error) {
    console.error('\n💥 Erro durante o debug:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { main, testDatabase };