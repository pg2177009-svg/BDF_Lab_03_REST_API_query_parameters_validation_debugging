# Lab 3: Debugging Exercise Technical Report
**Course:** Backend Development Fundamentals (BDF) · Year II Term II · Aurora  
**Faculty:** Mr Sai Siva Teja Chintakrindi  
**Student:** Paka Gopinadh (252U1R1175)  

---

## Overview
During backend development, runtime exceptions, module loading failures, asynchronous misconceptions, and database typos are common stumbling blocks. This report documents the root causes, diagnostic symptoms, and step-by-step solutions for the four common bugs handed out in the Lab 3 debugging exercise.

---

## Bug 1: Port Conflict (`EADDRINUSE`)

### 1. Diagnostic Symptom & Error Stack
When starting the Express server using `node server.js`, the process crashes immediately with the following error:
```text
Error: listen EADDRINUSE: address already in use :::3000
    at Server.setupListenHandle [as _listen2] (node:net:1904:16)
    at listenInCluster (node:net:1961:12)
    at Server.listen (node:net:2063:7)
    at Function.listen (c:\Users\pg217\OneDrive\Desktop\lab3\node_modules\express\lib\application.js:635:24)
```

### 2. Root Cause
Another application, background task, or a previous unclosed Node.js process is already bound to port `3000`. Operating systems do not allow two distinct listening sockets to bind to the same IP address and TCP port simultaneously without `SO_REUSEPORT`.

### 3. Solution & Best Practice
1. **Configurable Environment Variable**: Read port from `process.env.PORT` instead of hardcoding `3000`.
2. **Listen Event Error Handler**: Attach an `'error'` event listener to the HTTP server instance to intercept `EADDRINUSE` and gracefully fall back to `port + 1`:
```javascript
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`Port ${port} in use, attempting port ${port + 1}...`);
    startServer(port + 1);
  }
});
```
3. **Manual Process Termination (Command Line)**:
   - On Windows PowerShell:
     ```powershell
     Get-NetTCPConnection -LocalPort 3000 | Select-Object OwningProcess
     Stop-Process -Id <PID> -Force
     ```

---

## Bug 2: Wrong Import Path (`MODULE_NOT_FOUND`)

### 1. Diagnostic Symptom & Error Stack
Starting the server fails during module resolution:
```text
node:internal/modules/cjs/loader:1607
  throw err;
  ^
Error: Cannot find module './databse'
Require stack:
- c:\Users\pg217\OneDrive\Desktop\lab3\src\routes\books.js
    at Module._resolveFilename (node:internal/modules/cjs/loader:1603:15)
    at Module._load (node:internal/modules/cjs/loader:1370:5)
    at Module.require (node:internal/modules/cjs/loader:1713:12)
```

### 2. Root Cause
Typographical error in the relative path provided to `require()` or `import` (`./databse` instead of `../db` or missing extension/directory traversal). Node's CommonJS loader scans only existing files and exact relative directory trees.

### 3. Solution & Best Practice
1. Check the relative directory depth: from `src/routes/books.js`, the database module located at `src/db.js` is reached by traversing up one directory (`../db`).
2. Correct the spelling:
```javascript
// ❌ Broken
const { getDb } = require('./databse');

// ✅ Fixed
const { getDb } = require('../db');
```

---

## Bug 3: Table-Name Typo (`SQLITE_ERROR: no such table`)

### 1. Diagnostic Symptom & Error Stack
When triggering an endpoint (e.g. `GET /books`), the request fails with status 500:
```text
[Error Handler] {
  [Error: SQLITE_ERROR: no such table: book]
  errno: 1,
  code: 'SQLITE_ERROR'
}
```

### 2. Root Cause
In SQL schema definition, the table was created as `books` (plural), but the query inside the route handler referred to `book` (singular):
`SELECT * FROM book;`

### 3. Solution & Best Practice
1. Always align SQL queries with the exact schema defined in the DDL (`CREATE TABLE IF NOT EXISTS books ...`).
2. Fix the query:
```javascript
// ❌ Broken
const books = await db.all('SELECT * FROM book');

// ✅ Fixed
const books = await db.all('SELECT * FROM books');
```
3. Maintain centralized table name constants (e.g., `TABLE_NAME = 'books'`) to prevent disparate typos across multiple route files.

---

## Bug 4: Missing `await` Keyword

### 1. Diagnostic Symptom & Output
Triggering `GET /books` returns an empty JSON object `{}` or `{ "data": {} }`, or logs `Promise { <pending> }`. No database error is thrown, but data is completely missing in the client response.
```json
{
  "total": 0,
  "data": {}
}
```

### 2. Root Cause
`db.all()` and `db.get()` are asynchronous operations that return a JavaScript `Promise`. Omitting `await` assigns the unfinished Promise object to the variable:
```javascript
const books = db.all('SELECT * FROM books'); // Returns Promise { <pending> }
res.json(books); // JSON.stringify(Promise) produces "{}"
```

### 3. Solution & Best Practice
1. Ensure the route handler function is marked as `async (req, res, next)`.
2. Always prepend `await` before asynchronous database calls:
```javascript
// ❌ Broken
const books = db.all('SELECT * FROM books');

// ✅ Fixed
const books = await db.all('SELECT * FROM books');
```
3. Use ESLint rules such as `@typescript-eslint/await-thenable` or `require-await` to catch missing promises during static analysis.

---

## Summary Matrix

| Bug # | Error / Symptom | Root Cause | Fix Applied |
|---|---|---|---|
| **1** | `listen EADDRINUSE :::3000` | Port collision with existing active process | Fallback port logic, error event listener, dynamic `PORT` from `.env` |
| **2** | `MODULE_NOT_FOUND` | Typo in path (`./databse` instead of `../db`) | Corrected relative file path traversal |
| **3** | `SQLITE_ERROR: no such table` | Singular `book` referenced instead of `books` | Updated query to target `books` table |
| **4** | Empty response `{}` / Pending Promise | Omitted `await` before `db.all()` | Added `await` to unwrap the Promise before responding |

