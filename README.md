# BDF Lab 03: REST API, Query Parameters, Validation & Debugging

**Course:** Backend Development Fundamentals (BDF)  
**Institution:** Aurora Higher Education  
**Faculty:** Mr Sai Siva Teja Chintakrindi  
**Student:** Paka Gopinadh (Registration No: 252U1R1175, Class: CSE-2D, Slot: S19)  

---

## 🎯 Lab Objectives
- Design and implement a standard RESTful API adhering to noun-based URL conventions and HTTP methods.
- Implement versatile query parameters: `search_q` (LIKE partial match), `order_by`, `order` (ASC/DESC), `limit`, and `offset`.
- Add price-range filtering using `min_price` and `max_price` (`BETWEEN` condition).
- Implement robust request body validation for `POST /books` with HTTP status `400` and consistent error JSON.
- Adhere to HTTP status conventions: `201 Created` for resource creation, `200 OK` for retrieval/updates/deletions, and `404 Not Found` for nonexistent resources.
- Ensure consistent response formatting (`{ "message": "..." }` for errors).
- Complete the debugging exercise analyzing and resolving 4 classic errors: `EADDRINUSE`, wrong import path, table-name typo, and missing `await`.

---

## 📁 Project Structure

```text
lab3/
├── .env                                       # Environment variables (PORT, DB_PATH, NODE_ENV)
├── .env.example                               # Template for environment configuration
├── .gitignore                                 # Git ignore rules (node_modules, .env, *.db)
├── package.json                               # NPM dependencies and runner scripts
├── README.md                                  # Setup and API documentation
├── LAB_REPORT_03.md                           # Complete submission report & viva answers
├── BDF_Lab_03_REST_API_...docx                # Faculty assignment sheet
├── src/
│   ├── app.js                                 # Express application configuration & middlewares
│   ├── server.js                              # Server listener with EADDRINUSE conflict handling
│   ├── db.js                                  # SQLite connection and schema initialization
│   ├── routes/
│   │   └── books.js                           # RESTful router for /books
│   └── middleware/
│       ├── validate.js                        # Body, query, and param validation middleware
│       └── errorHandler.js                    # 404 and global error handlers ({ message: "..." })
├── scripts/
│   ├── seed.js                                # Database seeder with sample book records
│   └── test-api.js                            # Automated test suite (22 test cases)
├── postman/
│   └── BDF_Lab_03_Postman_Collection.json     # Importable Postman collection with tests
└── debugging_exercise/
    ├── broken_app.js                          # Faculty broken code demonstrating 4 bugs
    ├── fixed_app.js                           # Fully resolved and corrected version
    └── DEBUGGING_REPORT.md                    # Technical bug diagnosis and root-cause report
```

---

## 🚀 Quick Start Guide

### 1. Installation
Install project dependencies:
```bash
npm install
```

### 2. Seed Database
Initialize SQLite database with 10 sample books across diverse genres and price ranges:
```bash
npm run seed
```

### 3. Run Server
Start the REST API server:
```bash
npm start
```
The server will start on `http://localhost:3000`.

### 4. Run Automated Test Suite
Run the test suite verifying all 22 scenarios (success, validation, filtering, pagination, and error cases):
```bash
npm test
```

---

## 📡 REST API Endpoints Specification

| Method | Endpoint | Description | Query / Body Params | Status Codes |
|---|---|---|---|---|
| `GET` | `/` | API Information | None | `200` |
| `GET` | `/books` | List books | `search_q`, `order_by`, `order`, `limit`, `offset`, `min_price`, `max_price` | `200`, `400` |
| `GET` | `/books/:id` | Get book by ID | Path parameter: `id` | `200`, `400`, `404` |
| `POST` | `/books` | Create new book | JSON body: `{ title, author, price, genre }` | `201`, `400` |
| `PUT` | `/books/:id` | Update book | JSON body: `{ title, author, price, genre }` | `200`, `400`, `404` |
| `DELETE` | `/books/:id` | Delete book | Path parameter: `id` | `200`, `400`, `404` |

---

## 🧪 Postman Collection
Import the file at `postman/BDF_Lab_03_Postman_Collection.json` into Postman to run all 18 pre-built requests equipped with automated JavaScript status and response assertions.

