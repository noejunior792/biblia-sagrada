#!/usr/bin/env node

/**
 * Test script to verify database migration and connection handling
 * Run this to test if the database fixes work correctly
 */

const { Database } = require('sqlite3');
const path = require('path');
const fs = require('fs');

// Test configuration
const TEST_CONFIG = {
  testDir: path.join(__dirname, 'test-data'),
  dbPath: null,
  verbose: true
};

// Setup test directory
TEST_CONFIG.dbPath = path.join(TEST_CONFIG.testDir, 'test-biblia.db');

function log(message) {
  if (TEST_CONFIG.verbose) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
}

function error(message) {
  console.error(`[${new Date().toISOString()}] ❌ ${message}`);
}

function success(message) {
  console.log(`[${new Date().toISOString()}] ✅ ${message}`);
}

// Create test directory
function setupTestDir() {
  if (!fs.existsSync(TEST_CONFIG.testDir)) {
    fs.mkdirSync(TEST_CONFIG.testDir, { recursive: true });
    log(`Created test directory: ${TEST_CONFIG.testDir}`);
  }
}

// Cleanup test files
function cleanup() {
  try {
    if (fs.existsSync(TEST_CONFIG.testDir)) {
      fs.rmSync(TEST_CONFIG.testDir, { recursive: true, force: true });
      log('Test directory cleaned up');
    }
  } catch (err) {
    error(`Cleanup failed: ${err.message}`);
  }
}

// Test database connection
function testDatabaseConnection() {
  return new Promise((resolve, reject) => {
    log('Testing database connection...');
    
    const db = new Database(TEST_CONFIG.dbPath, (err) => {
      if (err) {
        error(`Database connection failed: ${err.message}`);
        reject(err);
        return;
      }
      
      success('Database connection established');
      
      // Configure database
      db.run('PRAGMA journal_mode = WAL', (walErr) => {
        if (walErr) {
          error(`WAL mode setup failed: ${walErr.message}`);
        } else {
          success('WAL mode configured');
        }
        
        db.run('PRAGMA busy_timeout = 30000', (timeoutErr) => {
          if (timeoutErr) {
            error(`Timeout setup failed: ${timeoutErr.message}`);
          } else {
            success('Busy timeout configured');
          }
          
          // Test basic operations
          testBasicOperations(db).then(() => {
            db.close((closeErr) => {
              if (closeErr) {
                error(`Database close failed: ${closeErr.message}`);
                reject(closeErr);
              } else {
                success('Database connection closed properly');
                resolve();
              }
            });
          }).catch(reject);
        });
      });
    });
  });
}

// Test basic database operations
function testBasicOperations(db) {
  return new Promise((resolve, reject) => {
    log('Testing basic database operations...');
    
    // Create test table
    db.run(`
      CREATE TABLE IF NOT EXISTS test_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        value TEXT NOT NULL
      )
    `, (createErr) => {
      if (createErr) {
        error(`Table creation failed: ${createErr.message}`);
        reject(createErr);
        return;
      }
      
      success('Test table created');
      
      // Insert test data
      db.run('INSERT INTO test_table (name, value) VALUES (?, ?)', ['test1', 'value1'], (insertErr) => {
        if (insertErr) {
          error(`Data insertion failed: ${insertErr.message}`);
          reject(insertErr);
          return;
        }
        
        success('Test data inserted');
        
        // Query test data
        db.get('SELECT * FROM test_table WHERE name = ?', ['test1'], (queryErr, row) => {
          if (queryErr) {
            error(`Data query failed: ${queryErr.message}`);
            reject(queryErr);
            return;
          }
          
          if (row && row.value === 'value1') {
            success('Test data queried successfully');
            resolve();
          } else {
            error('Test data query returned unexpected result');
            reject(new Error('Query validation failed'));
          }
        });
      });
    });
  });
}

// Test concurrent connections
function testConcurrentConnections() {
  return new Promise((resolve, reject) => {
    log('Testing concurrent database connections...');
    
    const connections = [];
    const totalConnections = 3;
    let completedConnections = 0;
    let hasError = false;
    
    for (let i = 0; i < totalConnections; i++) {
      const db = new Database(TEST_CONFIG.dbPath, (err) => {
        if (err && !hasError) {
          hasError = true;
          error(`Concurrent connection ${i + 1} failed: ${err.message}`);
          reject(err);
          return;
        }
        
        if (!hasError) {
          log(`Concurrent connection ${i + 1} established`);
          
          // Test simple query
          db.get('SELECT COUNT(*) as count FROM test_table', (queryErr, result) => {
            if (queryErr && !hasError) {
              hasError = true;
              error(`Concurrent query ${i + 1} failed: ${queryErr.message}`);
              reject(queryErr);
              return;
            }
            
            if (!hasError) {
              log(`Concurrent query ${i + 1} completed, count: ${result?.count || 0}`);
              
              db.close((closeErr) => {
                if (closeErr && !hasError) {
                  hasError = true;
                  error(`Concurrent close ${i + 1} failed: ${closeErr.message}`);
                  reject(closeErr);
                  return;
                }
                
                if (!hasError) {
                  completedConnections++;
                  log(`Concurrent connection ${i + 1} closed properly`);
                  
                  if (completedConnections === totalConnections) {
                    success('All concurrent connections handled properly');
                    resolve();
                  }
                }
              });
            }
          });
        }
      });
      
      connections.push(db);
    }
  });
}

// Test WAL mode files
function testWalFiles() {
  log('Testing WAL mode files...');
  
  const walFile = TEST_CONFIG.dbPath + '-wal';
  const shmFile = TEST_CONFIG.dbPath + '-shm';
  
  if (fs.existsSync(walFile)) {
    const walStats = fs.statSync(walFile);
    success(`WAL file exists, size: ${walStats.size} bytes`);
  } else {
    log('WAL file not found (may be normal if no writes occurred)');
  }
  
  if (fs.existsSync(shmFile)) {
    success('SHM file exists');
  } else {
    log('SHM file not found (may be normal)');
  }
}

// Test migration simulation
function testMigrationSimulation() {
  return new Promise((resolve, reject) => {
    log('Testing migration simulation...');
    
    const db = new Database(TEST_CONFIG.dbPath, (err) => {
      if (err) {
        error(`Migration simulation connection failed: ${err.message}`);
        reject(err);
        return;
      }
      
      // Simulate creating tables like in migration
      const tables = [
        `CREATE TABLE IF NOT EXISTS livros (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nome TEXT NOT NULL,
          abreviacao TEXT NOT NULL,
          testamento TEXT NOT NULL,
          ordem INTEGER NOT NULL,
          capitulos_total INTEGER NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS versiculos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          livro_id INTEGER NOT NULL,
          capitulo INTEGER NOT NULL,
          numero INTEGER NOT NULL,
          texto TEXT NOT NULL,
          FOREIGN KEY (livro_id) REFERENCES livros(id)
        )`
      ];
      
      let tablesCreated = 0;
      
      tables.forEach((sql, index) => {
        db.run(sql, (tableErr) => {
          if (tableErr) {
            error(`Table ${index + 1} creation failed: ${tableErr.message}`);
            reject(tableErr);
            return;
          }
          
          tablesCreated++;
          success(`Table ${index + 1} created successfully`);
          
          if (tablesCreated === tables.length) {
            // Insert test data
            db.run('INSERT INTO livros (nome, abreviacao, testamento, ordem, capitulos_total) VALUES (?, ?, ?, ?, ?)', 
              ['Gênesis', 'Gn', 'Antigo', 1, 50], (insertErr) => {
              if (insertErr) {
                error(`Test book insertion failed: ${insertErr.message}`);
                reject(insertErr);
                return;
              }
              
              success('Test book inserted');
              
              db.close((closeErr) => {
                if (closeErr) {
                  error(`Migration simulation close failed: ${closeErr.message}`);
                  reject(closeErr);
                } else {
                  success('Migration simulation completed successfully');
                  resolve();
                }
              });
            });
          }
        });
      });
    });
  });
}

// Main test function
async function runTests() {
  console.log('🧪 Starting Database Connection Tests');
  console.log('=====================================\n');
  
  try {
    // Setup
    setupTestDir();
    success('Test environment setup completed');
    
    // Test 1: Basic connection
    await testDatabaseConnection();
    
    // Test 2: Concurrent connections
    await testConcurrentConnections();
    
    // Test 3: WAL files
    testWalFiles();
    
    // Test 4: Migration simulation
    await testMigrationSimulation();
    
    console.log('\n=====================================');
    success('All tests completed successfully! 🎉');
    
    // Show final file status
    if (fs.existsSync(TEST_CONFIG.dbPath)) {
      const dbStats = fs.statSync(TEST_CONFIG.dbPath);
      log(`Final database file size: ${dbStats.size} bytes`);
    }
    
  } catch (err) {
    console.log('\n=====================================');
    error(`Tests failed: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  } finally {
    // Cleanup
    setTimeout(() => {
      cleanup();
      console.log('\n✅ Test cleanup completed');
    }, 1000);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n⚠️ Tests interrupted by user');
  cleanup();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  error(`Uncaught exception: ${err.message}`);
  cleanup();
  process.exit(1);
});

// Run tests if called directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testDatabaseConnection,
  testConcurrentConnections,
  cleanup
};