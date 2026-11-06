/**
 * BDF Lab 3 - Debugging Exercise: Fixed Version
 * 
 * Demonstrates the clean resolution of all 4 common bugs:
 * 1. Port conflict (EADDRINUSE) -> Dynamic port / fallback / error handler
 * 2. Wrong import path -> Correct relative path resolution
 * 3. Table-name typo -> Accurate SQL schema referencing ('books')
 * 4. Missing await -> Proper async/await handling on asynchronous database calls
 */

require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.json());

// ✅ FIX 2: Correct import path pointing to '../src/db'
const { getDb } = require('../src/db');

// ✅ FIX 3: Fixed table-name typo ('books' instead of 'book')
app.get('/fixed-books-table', async (req, res, next) => {
  try {
    const db = await getDb();
    // Correct table name 'books'
    const books = await db.all('SELECT id, title, author, price FROM books LIMIT 5');
    res.status(200).json({
      status: 'fixed',
      message: 'Query executed successfully on table "books".',
      data: books,
    });
  } catch (err) {
    next(err);
  }
});

// ✅ FIX 4: Added 'await' before db.all() to unwrap the Promise
app.get('/fixed-books-await', async (req, res, next) => {
  try {
    const db = await getDb();
    // 'await' properly awaits the promise resolution before responding
    const books = await db.all('SELECT id, title, author, price FROM books LIMIT 5');
    res.status(200).json({
      status: 'fixed',
      message: 'Promise unwrapped successfully with await keyword.',
      data: books,
    });
  } catch (err) {
    next(err);
  }
});

// ✅ FIX 1: Port conflict resolution with dynamic fallback and error event handler
const BASE_PORT = parseInt(process.env.PORT, 10) || 3000;

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`[Fixed Server] Running smoothly on http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Fixed Server Warning] Port ${port} is in use (EADDRINUSE). Automatically falling back to ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('[Fixed Server Error]', err);
    }
  });

  return server;
}

if (require.main === module) {
  startServer(BASE_PORT);
}

module.exports = { app, startServer };

