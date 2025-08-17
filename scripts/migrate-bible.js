#!/usr/bin/env node

/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const fs = require('fs');

// Mock do Electron app para ambiente CLI
function createElectronMock() {
  const userDataPath = path.join(process.cwd(), '.tmp', 'user-data');
  
  // Criar diretório se não existir
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  
  return {
    getPath: (name) => {
      if (name === 'userData') return userDataPath;
      return process.cwd();
    },
    isPackaged: false,
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
  // Electron não está disponível, usar mock
  app = createElectronMock();
}

async function runMigration() {
  console.log('🚀 Iniciando migração da Bíblia JSON para SQLite...\n');
  
  try {
    // Importar dinamicamente o módulo de migração
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { migrateJSONToSQLite } = require('../dist/database/migrate-json-to-sqlite.js');
    
    console.log('📦 Executando migração...');
    await migrateJSONToSQLite();
    
    console.log('\n✅ Migração concluída com sucesso!');
    console.log('🎉 O banco de dados SQLite está pronto para uso.');
    
  } catch (error) {
    console.error('\n❌ Erro durante a migração:', error.message);
    console.error('\nDetalhes do erro:', error);
    process.exit(1);
  }
}

// Verificar se o arquivo de build existe
const buildPath = path.join(__dirname, '..', 'dist', 'database', 'migrate-json-to-sqlite.js');
if (!fs.existsSync(buildPath)) {
  console.error('❌ Arquivo de migração não encontrado!');
  console.log('🔧 Execute primeiro: npm run build');
  console.log('   ou: tsc src/database/migrate-json-to-sqlite.ts --outDir dist');
  process.exit(1);
}

// Verificar se o arquivo JSON existe
const jsonPath = path.join(__dirname, '..', 'assets', 'KJA.json');
if (!fs.existsSync(jsonPath)) {
  console.error('❌ Arquivo KJA.json não encontrado em:', jsonPath);
  console.log('📁 Certifique-se de que o arquivo KJA.json está no diretório assets/');
  process.exit(1);
}

// Executar migração
runMigration().catch(console.error);