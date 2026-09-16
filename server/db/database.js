import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let dbInstance = null;
let dbPath = null;
let saveTimer = null;

// Debounced save to avoid excessive disk writes
function scheduleSave(wrapper) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    wrapper._forceSave();
  }, 100);
}

// sql.js wrapper that provides a better-sqlite3 compatible API
class DbWrapper {
  constructor(db, filePath) {
    this._db = db;
    this._filePath = filePath;
  }

  exec(sql) {
    this._db.run(sql);
    scheduleSave(this);
  }

  prepare(sql) {
    return new StatementWrapper(this._db, sql, this);
  }

  // Compatibility: transaction() returns a function that executes a callback
  transaction(fn) {
    return (...args) => {
      this._db.run('BEGIN TRANSACTION');
      try {
        fn(...args);
        this._db.run('COMMIT');
        this._forceSave();
      } catch (err) {
        this._db.run('ROLLBACK');
        throw err;
      }
    };
  }

  _forceSave() {
    if (this._filePath) {
      try {
        const data = this._db.export();
        const buffer = Buffer.from(data);
        writeFileSync(this._filePath, buffer);
      } catch (e) {
        console.error('Failed to save database:', e);
      }
    }
  }

  close() {
    if (saveTimer) clearTimeout(saveTimer);
    this._forceSave();
    this._db.close();
  }
}

class StatementWrapper {
  constructor(db, sql, wrapper) {
    this._db = db;
    this._sql = sql;
    this._wrapper = wrapper;
  }

  run(...params) {
    const flatParams = this._flattenParams(params);
    this._db.run(this._sql, flatParams);
    scheduleSave(this._wrapper);
    return { changes: this._db.getRowsModified() };
  }

  get(...params) {
    const flatParams = this._flattenParams(params);
    const stmt = this._db.prepare(this._sql);
    if (flatParams.length > 0) stmt.bind(flatParams);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return undefined;
  }

  all(...params) {
    const flatParams = this._flattenParams(params);
    const results = [];
    const stmt = this._db.prepare(this._sql);
    if (flatParams.length > 0) stmt.bind(flatParams);
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  _flattenParams(params) {
    if (params.length === 0) return [];
    if (params.length === 1 && Array.isArray(params[0])) return params[0];
    return params;
  }
}

/**
 * Get the database instance. SYNCHRONOUS after initialization.
 * Must call initializeDatabase() first.
 */
export function getDb() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return dbInstance;
}

/**
 * Initialize the database. ASYNC - must be called once at startup.
 */
export async function initializeDatabase() {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();
  dbPath = process.env.DB_PATH || join(__dirname, 'studybuddy.db');

  // Ensure directory exists
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  if (existsSync(dbPath)) {
    const fileBuffer = readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);
    dbInstance = new DbWrapper(db, dbPath);
    console.log(`Loaded existing database from ${dbPath}`);
  } else {
    const db = new SQL.Database();
    dbInstance = new DbWrapper(db, dbPath);
    console.log(`Created new database at ${dbPath}`);
  }

  // Run schema
  try {
    try {
      dbInstance.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student';");
    } catch (e) {
      // column may already exist
    }

    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    const statements = schema.split(';').filter(s => s.trim().length > 0);
    for (const stmt of statements) {
      try {
        dbInstance.exec(stmt + ';');
      } catch (e) {
        // Continue if table or index already exists
      }
    }

    console.log('Database schema initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize database schema:', err);
    throw err;
  }

  return dbInstance;
}

export default { getDb, initializeDatabase };
