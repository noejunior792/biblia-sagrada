# Database Fixes - Bíblia Sagrada App

## Problem Summary

The packaged `.deb` application was experiencing critical crashes with the following symptoms:

- `SQLITE_BUSY: database is locked` errors
- `SQLITE_ERROR: no such table: versiculos_fts` errors
- App crashing with `FATAL ERROR: Error::ThrowAsJavaScriptException napi_throw`
- Multiple concurrent migration attempts
- Database corruption in production environment

## Root Causes Identified

1. **Concurrent Database Operations**: Multiple instances of the migration process running simultaneously
2. **Database Locking**: SQLite WAL mode not properly configured, leading to lock conflicts
3. **FTS Table Management**: Improper handling of FTS5 virtual tables during data clearing
4. **Initialization Race Conditions**: Service initialization happening multiple times concurrently
5. **Error Handling**: Insufficient error recovery mechanisms

## Fixes Implemented

### 1. Migration Lock Mechanism (`migrate-json-to-sqlite.ts`)

```typescript
// Added migration lock to prevent concurrent migrations
let migrationInProgress = false;
let migrationPromise: Promise<void> | null = null;

export async function migrateJSONToSQLite(): Promise<void> {
  if (migrationInProgress) {
    console.log('⏳ Migração já em andamento, aguardando...');
    if (migrationPromise) {
      await migrationPromise;
    }
    return;
  }
  // ... rest of implementation
}
```

### 2. Database Configuration Improvements (`database.ts`)

```typescript
// Added WAL mode and proper database configuration
private async configureDatabase(): Promise<void> {
  // Enable WAL mode for better concurrency
  await this.run('PRAGMA journal_mode = WAL');
  // Set synchronous mode to NORMAL for better performance
  await this.run('PRAGMA synchronous = NORMAL');
  // Set busy timeout to 30 seconds
  await this.run('PRAGMA busy_timeout = 30000');
  // Enable foreign keys
  await this.run('PRAGMA foreign_keys = ON');
}
```

### 3. Proper Database Cleanup (`database.ts`)

```typescript
// Improved close method with WAL checkpoint
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
```

### 4. FTS Table Handling Fix (`migrate-json-to-sqlite.ts`)

```typescript
// Improved FTS table clearing
private async clearExistingData(): Promise<void> {
  try {
    // Check if FTS table exists before dropping
    const ftsExists = await this.db.get<{ count: number }>(`
      SELECT COUNT(*) as count FROM sqlite_master 
      WHERE type='table' AND name='versiculos_fts'
    `);
    
    if (ftsExists && ftsExists.count > 0) {
      await this.db.run('DROP TABLE versiculos_fts');
      console.log('✅ Tabela FTS removida');
    }
  } catch (error) {
    console.log('⚠️ Aviso ao remover tabela FTS:', error);
  }
  // ... rest of implementation
}
```

### 5. Service Initialization Guard (`biblia-service.ts`)

```typescript
// Added initialization guard to prevent concurrent initialization
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
  // ... rest of implementation
}
```

### 6. Better Error Recovery (`biblia-service.ts`)

```typescript
// Enhanced error handling with fallback mechanisms
try {
  await Promise.race([this.db.initialize(), initTimeout]);
  console.log('✅ Banco SQLite inicializado');
} catch (dbError) {
  console.error('❌ Falha ao inicializar SQLite:', dbError);
  throw new Error('SQLite_INIT_FAILED');
}
```

### 7. IPC Handler Protection (`main.ts`)

```typescript
// Added null checks for service availability
ipcMain.handle('get-livros', async () => {
  try {
    if (!bibliaService) {
      console.error('📚 Serviço da Bíblia não disponível');
      return { success: false, error: 'Serviço não inicializado', data: null };
    }
    // ... rest of implementation
  } catch (error) {
    // Error handling
  }
});
```

### 8. Build Script Enhancements (`build.sh`)

```bash
# Added database cleanup function
clean_db() {
    log "Limpando banco de dados de desenvolvimento..."
    
    # Remove database files from project directory
    find . -name "biblia.db*" -type f -delete 2>/dev/null || true
    
    # Clean development user cache
    if [ -d "$HOME/.config/biblia-sagrada" ]; then
        warning "Encontrado diretório de dados de desenvolvimento"
        read -p "Deseja limpar os dados de desenvolvimento? (s/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            rm -rf "$HOME/.config/biblia-sagrada"
            success "Dados de desenvolvimento removidos"
        fi
    fi
}
```

### 9. Debug Script (`debug-db.js`)

Created a standalone debug script to test database operations:

```javascript
#!/usr/bin/env node
// Comprehensive database testing script
// Can be run independently to verify database status
```

## Testing and Verification

### Before Deploying:

1. **Clean Build Environment**:
   ```bash
   ./build.sh --clean-db
   ./build.sh --clean
   ```

2. **Full Build Process**:
   ```bash
   ./build.sh --full
   ```

3. **Database Debug Test**:
   ```bash
   node debug-db.js
   ```

### Post-Installation Testing:

1. **Check Database Files**:
   ```bash
   ls -la ~/.config/biblia-sagrada/
   ```

2. **Monitor Logs**:
   ```bash
   journalctl -f | grep biblia-sagrada
   ```

3. **Test App Functionality**:
   - Launch app: `biblia-sagrada`
   - Verify books load correctly
   - Test verse loading
   - Check search functionality

## Prevention Measures

1. **Database Isolation**: Each app instance uses its own database file
2. **Graceful Degradation**: Automatic fallback to JSON service if SQLite fails
3. **Timeout Mechanisms**: Prevent infinite waiting on database operations
4. **Proper Resource Cleanup**: WAL files are properly closed and checkpointed
5. **Build Hygiene**: Clean database files before packaging

## Migration Path

For existing installations experiencing issues:

1. **Stop the application**
2. **Remove corrupted database**:
   ```bash
   rm -rf ~/.config/biblia-sagrada/
   ```
3. **Reinstall the fixed version**
4. **Launch app** - it will recreate the database cleanly

## Monitoring

Key log messages to watch for:

- ✅ `Banco de dados SQLite conectado` - Successful connection
- ✅ `WAL mode configurado` - Proper configuration
- ✅ `Migração concluída com sucesso` - Successful migration
- ⚠️ `Fallback para serviço JSON` - SQLite failed, using JSON backup
- ❌ `SQLITE_BUSY` - Should not appear with these fixes

## Known Limitations

1. **First Launch**: May take longer due to initial migration
2. **Large Datasets**: Migration time scales with data size
3. **Disk Space**: WAL mode requires additional disk space
4. **Concurrent Access**: Still limited by SQLite's concurrency model

## Future Improvements

1. **Background Migration**: Move migration to background thread
2. **Progressive Loading**: Load data in chunks
3. **Database Versioning**: Better schema migration system
4. **Health Checks**: Periodic database integrity verification