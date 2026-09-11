const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

const DB_FILE = process.env.DB_FILE || path.resolve(__dirname, '../../database.sqlite');

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    // Ensure parent directory exists
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    dbInstance = new DatabaseSync(DB_FILE);
    // Enable foreign keys and WAL mode for reliability and performance
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
  }
  return dbInstance;
}

function initDb() {
  const db = getDb();
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
  return db;
}

/**
 * Execute query returning all rows
 */
function query(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

/**
 * Execute query returning single row
 */
function get(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  return stmt.get(...params) || null;
}

/**
 * Execute insert/update/delete query
 * Returns { changes, lastInsertRowid }
 */
function run(sql, params = []) {
  const db = getDb();
  const stmt = db.prepare(sql);
  const result = stmt.run(...params);
  return {
    changes: result.changes,
    lastInsertRowid: Number(result.lastInsertRowid)
  };
}

/**
 * Transaction helper for atomic operations
 * callback receives an object with query, get, run
 */
function transaction(callback) {
  const db = getDb();
  db.exec('BEGIN TRANSACTION;');
  try {
    const result = callback({
      query: (sql, params = []) => db.prepare(sql).all(...params),
      get: (sql, params = []) => db.prepare(sql).get(...params) || null,
      run: (sql, params = []) => {
        const res = db.prepare(sql).run(...params);
        return { changes: res.changes, lastInsertRowid: Number(res.lastInsertRowid) };
      }
    });
    db.exec('COMMIT;');
    return result;
  } catch (error) {
    db.exec('ROLLBACK;');
    throw error;
  }
}

module.exports = {
  getDb,
  initDb,
  query,
  get,
  run,
  transaction
};
