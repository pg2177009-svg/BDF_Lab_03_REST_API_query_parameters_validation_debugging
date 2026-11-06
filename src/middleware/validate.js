/**
 * Validation Middleware for Books REST API
 */

/**
 * Validates request body for POST (Create) and PUT (Update)
 * Rejects missing title, author or non-numeric/negative price with 400 and a clear JSON message.
 */
function validateBookBody(req, res, next) {
  const { title, author, price, genre } = req.body;

  // Title validation
  if (title === undefined || title === null || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({
      message: 'Validation failed: title is required and must be a non-empty string.',
    });
  }

  // Author validation
  if (author === undefined || author === null || typeof author !== 'string' || author.trim() === '') {
    return res.status(400).json({
      message: 'Validation failed: author is required and must be a non-empty string.',
    });
  }

  // Price validation
  if (price === undefined || price === null || typeof price !== 'number' || isNaN(price) || price < 0) {
    return res.status(400).json({
      message: 'Validation failed: price is required and must be a non-negative number.',
    });
  }

  // Genre validation (optional, but if present must be string)
  if (genre !== undefined && genre !== null && typeof genre !== 'string') {
    return res.status(400).json({
      message: 'Validation failed: genre must be a string if provided.',
    });
  }

  // Sanitized trimmed values passed forward
  req.sanitizedBody = {
    title: title.trim(),
    author: author.trim(),
    price: Number(price),
    genre: genre ? genre.trim() : null,
  };

  next();
}

/**
 * Validates route parameters like :id
 */
function validateBookId(req, res, next) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      message: 'Validation failed: book ID must be a positive integer.',
    });
  }

  req.bookId = id;
  next();
}

/**
 * Validates and defaults query parameters for GET /books
 * Supports: search_q, order_by, order, limit, offset, min_price, max_price
 */
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

  // Whitelist allowable columns for ORDER BY to protect against SQL injection
  const allowedOrderByColumns = ['id', 'title', 'author', 'price', 'genre', 'created_at'];
  const sanitizedOrderBy = String(order_by).toLowerCase();

  if (!allowedOrderByColumns.includes(sanitizedOrderBy)) {
    return res.status(400).json({
      message: `Validation failed: order_by must be one of [${allowedOrderByColumns.join(', ')}].`,
    });
  }

  // Whitelist allowable sorting directions
  const sanitizedOrder = String(order).toUpperCase();
  if (!['ASC', 'DESC'].includes(sanitizedOrder)) {
    return res.status(400).json({
      message: 'Validation failed: order must be either "ASC" or "DESC".',
    });
  }

  // Validate limit
  const parsedLimit = parseInt(limit, 10);
  if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) {
    return res.status(400).json({
      message: 'Validation failed: limit must be a positive integer between 1 and 100.',
    });
  }

  // Validate offset
  const parsedOffset = parseInt(offset, 10);
  if (isNaN(parsedOffset) || parsedOffset < 0) {
    return res.status(400).json({
      message: 'Validation failed: offset must be a non-negative integer.',
    });
  }

  // Validate price range if provided
  let parsedMinPrice = undefined;
  if (min_price !== undefined) {
    parsedMinPrice = parseFloat(min_price);
    if (isNaN(parsedMinPrice) || parsedMinPrice < 0) {
      return res.status(400).json({
        message: 'Validation failed: min_price must be a non-negative number.',
      });
    }
  }

  let parsedMaxPrice = undefined;
  if (max_price !== undefined) {
    parsedMaxPrice = parseFloat(max_price);
    if (isNaN(parsedMaxPrice) || parsedMaxPrice < 0) {
      return res.status(400).json({
        message: 'Validation failed: max_price must be a non-negative number.',
      });
    }
  }

  if (parsedMinPrice !== undefined && parsedMaxPrice !== undefined && parsedMinPrice > parsedMaxPrice) {
    return res.status(400).json({
      message: 'Validation failed: min_price cannot be greater than max_price.',
    });
  }

  // Attach sanitized query config to req
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

module.exports = {
  validateBookBody,
  validateBookId,
  validateQueryParams,
};

