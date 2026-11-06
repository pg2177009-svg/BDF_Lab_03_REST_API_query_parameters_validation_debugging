/**
 * BDF Lab 3 - Debugging Exercise: Broken Version
 * 
 * This file demonstrates the 4 common backend errors handed out for the lab exercise:
 * 1. Port conflict (EADDRINUSE) - Hardcoded static port without conflict handling
 * 2. Wrong import path (MODULE_NOT_FOUND) - E.g., './databse' or '../src/data/db'
 * 3. Table-name typo (SQLITE_ERROR: no such table: book) - E.g. 'book' instead of 'books'
 * 4. Missing await - E.g. omitting 'await' on db.all() returning a pending Promise
 */

const express = require('express');
const app = express();
app.use(express.json());

// ❌ BUG 2: Wrong import path (Typo in path: './databse' instead of '../src/db')
// Causes: Error: Cannot find module './databse' [MODULE_NOT_FOUND]
// const { getDb } = require('./databse');

// Correct import path for demonstration purposes so script can highlight the remaining bugs:
const { getDb } = require('../src/db');

// ❌ BUG 3: Table-name typo in SQL query ('book' singular instead of 'books' plural)
// Causes: SQLITE_ERROR: no such table: book
app.get('/broken-books-table-typo', async (req, res, next) => {
  try {
    const db = await getDb();
    // Typo: table is named 'books', but query asks for 'book'
    const books = await db.all('SELECT * FROM book');
    res.json(books);
  } catch (err) {
    next(err);
  }
});

// ❌ BUG 4: Missing 'await' before asynchronous database call
// Causes: db.all() returns Promise { <pending> }.
// Express res.json(Promise) serializes an empty object {} or hangs because the promise never unwrapped.
app.get('/broken-books-missing-await', async (req, res, next) => {
  try {
    const db = await getDb();
    // Missing 'await' here!
    const booksPromise = db.all('SELECT * FROM books');
    // booksPromise is a Promise object, not the resolved array of rows!
    res.json({
      note: 'Notice the data returned is empty or improperly serialized because await was omitted!',
      data: booksPromise,
    });
  } catch (err) {
    next(err);
  }
});

// ❌ BUG 1: Port conflict (EADDRINUSE)
// Hardcoding a fixed port without listening for 'error' event or using environment fallback.
// If another instance or server is running on port 3000, process crashes with:
// Error: listen EADDRINUSE: address already in use :::3000
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Broken app running on port ${PORT}`);
});

