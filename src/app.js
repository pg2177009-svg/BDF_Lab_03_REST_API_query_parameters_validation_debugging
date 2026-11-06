const express = require('express');
const booksRouter = require('./routes/books');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Built-in JSON parsing middleware
app.use(express.json());

// Root welcome route
app.get('/', (_req, res) => {
  res.status(200).json({
    name: 'Books REST API - Lab 3',
    version: '1.0.0',
    course: 'Backend Development Fundamentals',
    faculty: 'Joel Prashanth D',
    student: 'Paka Gopinadh (252U1R1175)',
    endpoints: {
      'GET /books': 'List books with query parameters (search_q, order_by, order, limit, offset, min_price, max_price)',
      'GET /books/:id': 'Get single book by ID',
      'POST /books': 'Create new book (requires title, author, price)',
      'PUT /books/:id': 'Update existing book',
      'DELETE /books/:id': 'Delete book by ID',
    },
  });
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Register RESTful noun routes
app.use('/books', booksRouter);

// 404 handler for undefined routes
app.use(notFoundHandler);

// Global centralized error handler
app.use(errorHandler);

module.exports = app;

