const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const {
  validateBookBody,
  validateBookId,
  validateQueryParams,
} = require('../middleware/validate');

/**
 * Task 1, 2, 3: GET /books
 * Supports search_q (partial title match with LIKE), order_by, order (ASC/DESC),
 * limit, offset, and price range (min_price, max_price with BETWEEN or conditions).
 * Uses strictly parameterized SQL queries.
 */
router.get('/', validateQueryParams, async (req, res, next) => {
  try {
    const db = await getDb();
    const { search_q, order_by, order, limit, offset, min_price, max_price } = req.sanitizedQuery;

    const conditions = [];
    const params = [];

    // Partial title match with LIKE
    if (search_q) {
      conditions.push('title LIKE ?');
      params.push(`%${search_q}%`);
    }

    // Price-range filter using BETWEEN or individual bounds
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

    // Total count query for pagination awareness
    const countSql = `SELECT COUNT(*) AS total FROM books ${whereClause}`;
    const countResult = await db.get(countSql, params);
    const total = countResult ? countResult.total : 0;

    // Data query with ordering, limit, and offset (strictly parameterized)
    // Note: order_by and order are safely validated against whitelist in validateQueryParams
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
  } catch (error) {
    next(error);
  }
});

/**
 * Task 5: GET /books/:id
 * Retrieve a specific book by id.
 * Returns 200 with book details, or 404 if not found.
 */
router.get('/:id', validateBookId, async (req, res, next) => {
  try {
    const db = await getDb();
    const book = await db.get(
      'SELECT id, title, author, price, genre, created_at FROM books WHERE id = ?',
      [req.bookId]
    );

    if (!book) {
      return res.status(404).json({
        message: `Book with id ${req.bookId} not found.`,
      });
    }

    res.status(200).json({
      data: book,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Task 1, 4, 5: POST /books
 * Create a new book. Validates request body.
 * Returns 201 Created on success.
 */
router.post('/', validateBookBody, async (req, res, next) => {
  try {
    const db = await getDb();
    const { title, author, price, genre } = req.sanitizedBody;

    const result = await db.run(
      'INSERT INTO books (title, author, price, genre) VALUES (?, ?, ?, ?)',
      [title, author, price, genre]
    );

    const createdBook = await db.get(
      'SELECT id, title, author, price, genre, created_at FROM books WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json({
      message: 'Book created successfully.',
      data: createdBook,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Task 5: PUT /books/:id
 * Updates an existing book.
 * Returns 200 OK after update, or 404 if id does not exist.
 */
router.put('/:id', validateBookId, validateBookBody, async (req, res, next) => {
  try {
    const db = await getDb();
    const { title, author, price, genre } = req.sanitizedBody;

    // Check if book exists first
    const existing = await db.get('SELECT id FROM books WHERE id = ?', [req.bookId]);
    if (!existing) {
      return res.status(404).json({
        message: `Book with id ${req.bookId} not found.`,
      });
    }

    await db.run(
      'UPDATE books SET title = ?, author = ?, price = ?, genre = ? WHERE id = ?',
      [title, author, price, genre, req.bookId]
    );

    const updatedBook = await db.get(
      'SELECT id, title, author, price, genre, created_at FROM books WHERE id = ?',
      [req.bookId]
    );

    res.status(200).json({
      message: 'Book updated successfully.',
      data: updatedBook,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Task 5: DELETE /books/:id
 * Deletes a book by id.
 * Returns 200 OK after delete, or 404 if id does not exist.
 */
router.delete('/:id', validateBookId, async (req, res, next) => {
  try {
    const db = await getDb();

    // Check if book exists first
    const existing = await db.get('SELECT id FROM books WHERE id = ?', [req.bookId]);
    if (!existing) {
      return res.status(404).json({
        message: `Book with id ${req.bookId} not found.`,
      });
    }

    await db.run('DELETE FROM books WHERE id = ?', [req.bookId]);

    res.status(200).json({
      message: `Book with id ${req.bookId} deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

