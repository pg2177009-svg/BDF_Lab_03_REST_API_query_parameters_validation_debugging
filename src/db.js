const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
require('dotenv').config();

let dbInstance = null;

/**
 * Initializes and returns the SQLite database connection promise.
 * Uses connection caching (singleton pattern) to prevent redundant file opens.
 */
async function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = process.env.DB_PATH || './data/books.db';
  const resolvedPath = path.resolve(process.cwd(), dbPath);
  const dir = path.dirname(resolvedPath);

  // Ensure data directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  dbInstance = await open({
    filename: resolvedPath,
    driver: sqlite3.Database,
  });

  // Enable foreign keys
  await dbInstance.run('PRAGMA foreign_keys = ON;');

  // Initialize books table schema
  await initDb(dbInstance);

  return dbInstance;
}

/**
 * Creates the required tables and constraints if they do not already exist.
 */
async function initDb(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      price REAL NOT NULL CHECK(price >= 0),
      genre TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

module.exports = {
  getDb,
  initDb,
};

