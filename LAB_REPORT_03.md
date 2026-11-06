# AURORA HIGHER EDUCATION
### Department of Computer Science & Engineering
### Academic Year: II & II · Term II

---

## LAB REPORT - 03

| Field | Details |
|---|---|
| **Student Name** | PAKA GOPINADH |
| **Student Registration Number** | 252U1R1175 |
| **Class & Section** | CSE-2D, Slot S19 |
| **Study Level** | Undergraduate (UG) |
| **Year & Term** | Year II & Term II |
| **Subject Name** | Backend Development Fundamentals (BDF) |
| **Faculty In-Charge** | Joel Prashanth D |
| **Name of Assessment** | LAB JOURNAL - 3 |
| **Date of Submission** | 06/11/2026 |

---

## Title: REST API, Query Parameters, Validation, and Debugging

---

## 1. Objectives
1. Convert CRUD routes into an industry-standard RESTful API adhering strictly to noun-based URI naming (`/books`) and standard HTTP verbs (`GET`, `POST`, `PUT`, `DELETE`).
2. Implement flexible query parameter handling on `GET /books`:
   - `search_q`: partial title matching via SQL `LIKE ?`.
   - `order_by`: safe column sorting with allowed whitelist (`id`, `title`, `author`, `price`, `genre`, `created_at`).
   - `order`: sorting direction (`ASC` / `DESC`).
   - `limit` and `offset`: pagination controls with sensible defaults.
3. Implement price-range filtering using `min_price` and `max_price` (`BETWEEN ? AND ?` or individual relational bounds).
4. Implement rigorous request body validation for `POST /books`:
   - Reject missing or blank `title` with HTTP `400` and clear JSON error message.
   - Reject missing or blank `author` with HTTP `400` and clear JSON error message.
   - Reject non-numeric or negative `price` with HTTP `400` and clear JSON error message.
5. Adhere to REST status code semantics:
   - `201 Created` for successful resource creation.
   - `200 OK` for successful read, update, and deletion operations.
   - `404 Not Found` when a requested entity ID does not exist.
   - `400 Bad Request` for invalid user input and malformed queries.
6. Enforce uniform response contracts, specifically `{ "message": "..." }` for error conditions.
7. Conduct the debugging exercise diagnosing and correcting four common backend bugs:
   - Port conflict (`EADDRINUSE`)
   - Wrong module import path (`MODULE_NOT_FOUND`)
   - Table-name typo (`SQLITE_ERROR: no such table`)
   - Missing `await` keyword before asynchronous database queries.

---

## 2. REST API Design & Endpoints Specification

### 2.1 Route Architecture

| Method | Endpoint | Purpose | Request Body / Query Params | Status Codes |
|---|---|---|---|---|
| `GET` | `/books` | Retrieve list of books with filters | Query: `search_q`, `order_by`, `order`, `limit`, `offset`, `min_price`, `max_price` | `200 OK`<br>`400 Bad Request` |
| `GET` | `/books/:id` | Retrieve single book by primary key | Path parameter: `:id` (integer) | `200 OK`<br>`400 Bad Request`<br>`404 Not Found` |
| `POST` | `/books` | Create a new book record | Body: `{ title, author, price, genre? }` | `201 Created`<br>`400 Bad Request` |
| `PUT` | `/books/:id` | Update an existing book record | Path: `:id`<br>Body: `{ title, author, price, genre? }` | `200 OK`<br>`400 Bad Request`<br>`404 Not Found` |
| `DELETE` | `/books/:id` | Remove a book record | Path parameter: `:id` (integer) | `200 OK`<br>`400 Bad Request`<br>`404 Not Found` |

---

## 3. Implementation Details & Source Code

### 3.1 Database Connection and Table DDL (`src/db.js`)
Parameterized schema definition with table constraints:
```javascript
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
require('dotenv').config();

let dbInstance = null;

async function getDb() {
  if (dbInstance) return dbInstance;

  const dbPath = process.env.DB_PATH || './data/books.db';
  const resolvedPath = path.resolve(process.cwd(), dbPath);
  const dir = path.dirname(resolvedPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  dbInstance = await open({
    filename: resolvedPath,
    driver: sqlite3.Database,
  });

  await dbInstance.run('PRAGMA foreign_keys = ON;');
  await initDb(dbInstance);

  return dbInstance;
}

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

module.exports = { getDb, initDb };
```

### 3.2 Request Validation Middleware (`src/middleware/validate.js`)
Validates body fields, route IDs, and query parameters:
```javascript
function validateBookBody(req, res, next) {
  const { title, author, price, genre } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({
      message: 'Validation failed: title is required and must be a non-empty string.',
    });
  }

  if (!author || typeof author !== 'string' || author.trim() === '') {
    return res.status(400).json({
      message: 'Validation failed: author is required and must be a non-empty string.',
    });
  }

  if (price === undefined || typeof price !== 'number' || isNaN(price) || price < 0) {
    return res.status(400).json({
      message: 'Validation failed: price is required and must be a non-negative number.',
    });
  }

  req.sanitizedBody = {
    title: title.trim(),
    author: author.trim(),
    price: Number(price),
    genre: genre ? String(genre).trim() : null,
  };

  next();
}

function validateQueryParams(req, res, next) {
  const {
    search_q = '',
    order_by = 'id',
    order = 'ASC',
    limit = '10',
    offset = '0',
    min_price,
    max_price,
  } = req.query;

  const allowedOrderByColumns = ['id', 'title', 'author', 'price', 'genre', 'created_at'];
  const sanitizedOrderBy = String(order_by).toLowerCase();

  if (!allowedOrderByColumns.includes(sanitizedOrderBy)) {
    return res.status(400).json({
      message: `Validation failed: order_by must be one of [${allowedOrderByColumns.join(', ')}].`,
    });
  }

  const sanitizedOrder = String(order).toUpperCase();
  if (!['ASC', 'DESC'].includes(sanitizedOrder)) {
    return res.status(400).json({
      message: 'Validation failed: order must be either "ASC" or "DESC".',
    });
  }

  const parsedLimit = parseInt(limit, 10);
  if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) {
    return res.status(400).json({
      message: 'Validation failed: limit must be a positive integer between 1 and 100.',
    });
  }

  const parsedOffset = parseInt(offset, 10);
  if (isNaN(parsedOffset) || parsedOffset < 0) {
    return res.status(400).json({
      message: 'Validation failed: offset must be a non-negative integer.',
    });
  }

  let parsedMinPrice = min_price !== undefined ? parseFloat(min_price) : undefined;
  let parsedMaxPrice = max_price !== undefined ? parseFloat(max_price) : undefined;

  if (parsedMinPrice !== undefined && (isNaN(parsedMinPrice) || parsedMinPrice < 0)) {
    return res.status(400).json({ message: 'Validation failed: min_price must be a non-negative number.' });
  }

  if (parsedMaxPrice !== undefined && (isNaN(parsedMaxPrice) || parsedMaxPrice < 0)) {
    return res.status(400).json({ message: 'Validation failed: max_price must be a non-negative number.' });
  }

  if (parsedMinPrice !== undefined && parsedMaxPrice !== undefined && parsedMinPrice > parsedMaxPrice) {
    return res.status(400).json({ message: 'Validation failed: min_price cannot be greater than max_price.' });
  }

  req.sanitizedQuery = {
    search_q: String(search_q).trim(),
    order_by: sanitizedOrderBy,
    order: sanitizedOrder,
    limit: parsedLimit,
    offset: parsedOffset,
    min_price: parsedMinPrice,
    max_price: parsedMaxPrice,
  };

  next();
}
```

### 3.3 Books Router (`src/routes/books.js`)
Implements parameterized SQL queries with SQL injection protection:
```javascript
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { validateBookBody, validateBookId, validateQueryParams } = require('../middleware/validate');

// GET /books - Search, Sort, Filter, Paginate
router.get('/', validateQueryParams, async (req, res, next) => {
  try {
    const db = await getDb();
    const { search_q, order_by, order, limit, offset, min_price, max_price } = req.sanitizedQuery;

    const conditions = [];
    const params = [];

    if (search_q) {
      conditions.push('title LIKE ?');
      params.push(`%${search_q}%`);
    }

    if (min_price !== undefined && max_price !== undefined) {
      conditions.push('price BETWEEN ? AND ?');
      params.push(min_price, max_price);
    } else if (min_price !== undefined) {
      conditions.push('price >= ?');
      params.push(min_price);
    } else if (max_price !== undefined) {
      conditions.push('price <= ?');
      params.push(max_price);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.get(`SELECT COUNT(*) AS total FROM books ${whereClause}`, params);
    const total = countResult ? countResult.total : 0;

    const dataSql = `
      SELECT id, title, author, price, genre, created_at
      FROM books
      ${whereClause}
      ORDER BY ${order_by} ${order}
      LIMIT ? OFFSET ?
    `;

    const books = await db.all(dataSql, [...params, limit, offset]);

    res.status(200).json({
      total,
      limit,
      offset,
      count: books.length,
      data: books,
    });
  } catch (err) {
    next(err);
  }
});

// GET /books/:id - Single record retrieval
router.get('/:id', validateBookId, async (req, res, next) => {
  try {
    const db = await getDb();
    const book = await db.get('SELECT * FROM books WHERE id = ?', [req.bookId]);
    if (!book) {
      return res.status(404).json({ message: `Book with id ${req.bookId} not found.` });
    }
    res.status(200).json({ data: book });
  } catch (err) {
    next(err);
  }
});

// POST /books - Create
router.post('/', validateBookBody, async (req, res, next) => {
  try {
    const db = await getDb();
    const { title, author, price, genre } = req.sanitizedBody;
    const result = await db.run(
      'INSERT INTO books (title, author, price, genre) VALUES (?, ?, ?, ?)',
      [title, author, price, genre]
    );
    const createdBook = await db.get('SELECT * FROM books WHERE id = ?', [result.lastID]);
    res.status(201).json({ message: 'Book created successfully.', data: createdBook });
  } catch (err) {
    next(err);
  }
});

// PUT /books/:id - Update
router.put('/:id', validateBookId, validateBookBody, async (req, res, next) => {
  try {
    const db = await getDb();
    const { title, author, price, genre } = req.sanitizedBody;
    const existing = await db.get('SELECT id FROM books WHERE id = ?', [req.bookId]);
    if (!existing) {
      return res.status(404).json({ message: `Book with id ${req.bookId} not found.` });
    }
    await db.run(
      'UPDATE books SET title = ?, author = ?, price = ?, genre = ? WHERE id = ?',
      [title, author, price, genre, req.bookId]
    );
    const updatedBook = await db.get('SELECT * FROM books WHERE id = ?', [req.bookId]);
    res.status(200).json({ message: 'Book updated successfully.', data: updatedBook });
  } catch (err) {
    next(err);
  }
});

// DELETE /books/:id - Delete
router.delete('/:id', validateBookId, async (req, res, next) => {
  try {
    const db = await getDb();
    const existing = await db.get('SELECT id FROM books WHERE id = ?', [req.bookId]);
    if (!existing) {
      return res.status(404).json({ message: `Book with id ${req.bookId} not found.` });
    }
    await db.run('DELETE FROM books WHERE id = ?', [req.bookId]);
    res.status(200).json({ message: `Book with id ${req.bookId} deleted successfully.` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
```

---

## 4. Debugging Exercise Analysis

| # | Bug Observed | Error Code / Stack Trace | Root Cause | Fix Applied |
|---|---|---|---|---|
| **1** | Port Conflict | `Error: listen EADDRINUSE: address already in use :::3000` | Port 3000 was held by another active process; server crashed without handling the `'error'` event. | Handled server `'error'` event, emitted warning, and automatically fell back to `port + 1`. Supported `process.env.PORT`. |
| **2** | Wrong Import Path | `Error: Cannot find module './databse' [MODULE_NOT_FOUND]` | Typographical spelling mistake in relative import path (`./databse` instead of `../db`). | Corrected path to `require('../src/db')`. |
| **3** | Table Name Typo | `SQLITE_ERROR: no such table: book` | The schema created table `books` (plural), but the SQL query referenced `book` (singular). | Changed `SELECT * FROM book` to `SELECT * FROM books`. |
| **4** | Missing `await` | Response returned `{}` or `Promise { <pending> }` | Asynchronous function `db.all()` returns a Promise. Without `await`, the unresolved Promise was passed directly to `res.json()`. | Added `await` before `db.all()` within the `async` route handler. |

---

## 5. Automated Test Results

A full test suite running 22 comprehensive assertions was executed via `npm test`:

```text
====================================================
       BDF LAB 3 - AUTOMATED REST API TEST SUITE     
====================================================

[Seed] Connecting to database...
[Seed] Clearing existing books...
[Seed] Inserting 10 sample books...
  + Added "Clean Code: A Handbook of Agile Software Craftsmanship" ($32.5)
  + Added "The Pragmatic Programmer: Your Journey to Mastery" ($39.99)
  + Added "Design Patterns: Elements of Reusable Object-Oriented Software" ($44.95)
  + Added "JavaScript: The Good Parts" ($18.2)
  + Added "Eloquent JavaScript: A Modern Introduction" ($24.99)
  + Added "You Don’t Know JS Yet: Get Started" ($15)
  + Added "Introduction to Algorithms (CLRS)" ($68)
  + Added "Designing Data-Intensive Applications" ($41.5)
  + Added "Site Reliability Engineering" ($29.99)
  + Added "Database System Concepts" ($52)
[Seed] Database seeding completed successfully!

[Test Runner] Test server started on http://localhost:55835

[PASS] 1. GET / - Welcome info and endpoints documentation
[PASS] 2. GET /books - Retrieve all books with default params (limit=10, offset=0)
[PASS] 3. GET /books?search_q=JavaScript - Search partial title with LIKE
[PASS] 4. GET /books?order_by=price&order=DESC - Sort books by price descending
[PASS] 5. GET /books?order_by=password - Rejects invalid order_by column with 400
[PASS] 6. GET /books?order=SIDEWAYS - Rejects invalid order direction with 400
[PASS] 7. GET /books?min_price=20&max_price=35 - Filter books within price range (BETWEEN)
[PASS] 8. GET /books?min_price=50&max_price=20 - Rejects min_price > max_price with 400
[PASS] 9. GET /books?limit=3&offset=3 - Pagination with limit and offset
[PASS] 10. POST /books - Create book with valid body returns 201 Created
[PASS] 11. POST /books - Missing title rejected with 400 and clear error message
[PASS] 12. POST /books - Missing author rejected with 400 and clear error message
[PASS] 13. POST /books - Non-numeric price string rejected with 400
[PASS] 14. POST /books - Negative price rejected with 400
[PASS] 15. GET /books/11 - Retrieve existing book returns 200 OK
[PASS] 16. GET /books/99999 - Non-existing book ID returns 404 Not Found
[PASS] 17. GET /books/notanumber - Non-integer ID returns 400 Bad Request
[PASS] 18. PUT /books/11 - Update existing book returns 200 OK
[PASS] 19. PUT /books/99999 - Update non-existent book returns 404 Not Found
[PASS] 20. DELETE /books/11 - Delete existing book returns 200 OK
[PASS] 21. DELETE /books/99999 - Delete non-existent book returns 404 Not Found
[PASS] 22. GET /nonexistent/endpoint - Undefined route returns 404 with standard format

====================================================
TEST SUMMARY: 22 PASSED, 0 FAILED out of 22
====================================================
```

---

## 6. Postman Test Suite Coverage

The deliverable collection located at `postman/BDF_Lab_03_Postman_Collection.json` covers:

1. **Query Parameters & Filters (GET /books)**
   - `GET /books` (Defaults: limit 10, offset 0) -> `200 OK`
   - `GET /books?search_q=Clean` (Partial title match) -> `200 OK`
   - `GET /books?order_by=price&order=DESC` (Sorting) -> `200 OK`
   - `GET /books?min_price=20&max_price=40` (Price range BETWEEN) -> `200 OK`
   - `GET /books?limit=3&offset=3` (Pagination) -> `200 OK`
   - `GET /books?order_by=hacked` (Invalid sort column) -> `400 Bad Request`
   - `GET /books?min_price=60&max_price=30` (min_price > max_price) -> `400 Bad Request`
2. **Single Resource Operations (GET /books/:id)**
   - `GET /books/1` (Existing ID) -> `200 OK`
   - `GET /books/99999` (Non-existent ID) -> `404 Not Found`
   - `GET /books/abc` (Malformed ID) -> `400 Bad Request`
3. **Create & Validation (POST /books)**
   - `POST /books` (Valid book) -> `201 Created`
   - `POST /books` (Missing title) -> `400 Bad Request`
   - `POST /books` (Missing author) -> `400 Bad Request`
   - `POST /books` (Non-numeric price) -> `400 Bad Request`
4. **Update Resource (PUT /books/:id)**
   - `PUT /books/:id` (Valid update) -> `200 OK`
   - `PUT /books/99999` (Non-existent ID) -> `404 Not Found`
5. **Delete Resource (DELETE /books/:id)**
   - `DELETE /books/:id` (Valid delete) -> `200 OK`
   - `DELETE /books/99999` (Non-existent ID) -> `404 Not Found`
6. **Error Handling Middleware**
   - `GET /undefined-route-path` -> `404 Not Found`

---

## 7. Viva Questions & Answers

### Q1: Query parameter vs Path parameter?
**Answer:**
- **Path Parameters (`/books/:id`):**
  - Used to identify a **specific resource** or unique entity within the resource hierarchy.
  - Form an integral part of the URL path itself (e.g., `/books/42` targets the unique book with ID 42).
  - Typically mandatory; omitting a path parameter matches a completely different endpoint or yields a 404.
- **Query Parameters (`/books?search_q=Clean&limit=10`):**
  - Used to **filter, search, sort, or paginate** collections of resources.
  - Appended after the question mark (`?`) as key-value pairs separated by ampersands (`&`).
  - Typically optional; when omitted, the server assumes well-defined default behavior (e.g., default page 1, default sort by ID).

---

### Q2: What does "stateless" mean in RESTful API architecture?
**Answer:**
- Statelessness is a fundamental architectural constraint of REST (Representational State Transfer).
- It means that **each request sent from the client to the server must contain all the information necessary to understand and process the request**.
- The server does **not** store any client session context between requests. No session state is held in server memory between calls.
- **Benefits:**
  1. **Scalability:** Any server instance in a load-balanced cluster can handle any request without synchronizing session storage.
  2. **Reliability:** Server crashes do not corrupt client sessions because every incoming request is self-contained.
  3. **Simplicity:** The server does not have to manage session lifecycle timeouts, expirations, or persistent session databases.

---

### Q3: Which status code should be used for bad input vs a missing record?
**Answer:**
- **Bad Input $\rightarrow$ `400 Bad Request`:**
  - Used when the client's request is syntactically invalid, fails validation rules, contains missing required fields (e.g., missing `title` or `author` in `POST /books`), has non-numeric prices, or passes illegal query parameters (e.g. invalid `order_by` column or `min_price > max_price`).
  - Indicates that the client made a request error that must be corrected before retrying.
- **Missing Record $\rightarrow$ `404 Not Found`:**
  - Used when the request syntax is valid, but the target resource identified by URI/ID does not exist in the database (e.g., `GET /books/99999` or `DELETE /books/99999`).
  - Distinguishes clearly between "the request was malformed" (400) versus "the request was understood, but the target entity cannot be found" (404).

---

## 8. Compliance with Course Rules
- **Rule 1 (.env protection):** `.env` is created locally and excluded from git tracking via `.gitignore`. A sanitized template `.env.example` is provided.
- **Rule 2 (No plaintext passwords):** No sensitive credentials are stored or exposed.
- **Rule 3 (Accurate HTTP status codes):** Every endpoint returns semantic status codes (`200`, `201`, `400`, `404`, `500`).
- **Rule 4 (Parameterized queries):** All SQL queries utilize SQLite parameter substitution (`?`) to guarantee complete immunity against SQL injection vulnerabilities.

