const http = require('http');
const app = require('../src/app');
const { getDb } = require('../src/db');
const { seed } = require('./seed');

let server;
let baseUrl;

const results = [];

function recordTest(name, passed, details) {
  results.push({ name, passed, details });
  const badge = passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
  console.log(`${badge} ${name}`);
  if (!passed) {
    console.log(`       Details: ${details}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('       BDF LAB 3 - AUTOMATED REST API TEST SUITE     ');
  console.log('====================================================\n');

  // Re-seed database before tests
  await seed();

  // Start temporary test server on random open port
  await new Promise((resolve) => {
    server = http.createServer(app).listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`[Test Runner] Test server started on ${baseUrl}\n`);
      resolve();
    });
  });

  let createdBookId = null;

  try {
    // Test 1: GET / - Welcome Route
    {
      const res = await fetch(`${baseUrl}/`);
      const body = await res.json();
      recordTest(
        '1. GET / - Welcome info and endpoints documentation',
        res.status === 200 && body.name.includes('Books REST API'),
        `Status: ${res.status}`
      );
    }

    // Test 2: GET /books - Default parameters
    {
      const res = await fetch(`${baseUrl}/books`);
      const body = await res.json();
      recordTest(
        '2. GET /books - Retrieve all books with default params (limit=10, offset=0)',
        res.status === 200 && Array.isArray(body.data) && body.limit === 10 && body.offset === 0,
        `Status: ${res.status}, Count: ${body.count}`
      );
    }

    // Test 3: GET /books?search_q=JavaScript - Partial title match with LIKE
    {
      const res = await fetch(`${baseUrl}/books?search_q=JavaScript`);
      const body = await res.json();
      const allMatch = body.data.every((b) => b.title.toLowerCase().includes('javascript'));
      recordTest(
        '3. GET /books?search_q=JavaScript - Search partial title with LIKE',
        res.status === 200 && body.count > 0 && allMatch,
        `Status: ${res.status}, Found: ${body.count}`
      );
    }

    // Test 4: GET /books?order_by=price&order=DESC - Sorting
    {
      const res = await fetch(`${baseUrl}/books?order_by=price&order=DESC`);
      const body = await res.json();
      let isSorted = true;
      for (let i = 0; i < body.data.length - 1; i++) {
        if (body.data[i].price < body.data[i + 1].price) isSorted = false;
      }
      recordTest(
        '4. GET /books?order_by=price&order=DESC - Sort books by price descending',
        res.status === 200 && isSorted,
        `Status: ${res.status}, First price: ${body.data[0]?.price}, Last: ${body.data[body.data.length - 1]?.price}`
      );
    }

    // Test 5: GET /books?order_by=invalid_column - Rejection with 400
    {
      const res = await fetch(`${baseUrl}/books?order_by=password`);
      const body = await res.json();
      recordTest(
        '5. GET /books?order_by=password - Rejects invalid order_by column with 400',
        res.status === 400 && typeof body.message === 'string',
        `Status: ${res.status}, Message: ${body.message}`
      );
    }

    // Test 6: GET /books?order=SIDEWAYS - Rejection with 400
    {
      const res = await fetch(`${baseUrl}/books?order=SIDEWAYS`);
      const body = await res.json();
      recordTest(
        '6. GET /books?order=SIDEWAYS - Rejects invalid order direction with 400',
        res.status === 400 && typeof body.message === 'string',
        `Status: ${res.status}, Message: ${body.message}`
      );
    }

    // Test 7: GET /books?min_price=20&max_price=35 - Price range filter (BETWEEN)
    {
      const res = await fetch(`${baseUrl}/books?min_price=20&max_price=35`);
      const body = await res.json();
      const inRange = body.data.every((b) => b.price >= 20 && b.price <= 35);
      recordTest(
        '7. GET /books?min_price=20&max_price=35 - Filter books within price range (BETWEEN)',
        res.status === 200 && body.count > 0 && inRange,
        `Status: ${res.status}, Count in range: ${body.count}`
      );
    }

    // Test 8: GET /books?min_price=50&max_price=20 - Rejects invalid range with 400
    {
      const res = await fetch(`${baseUrl}/books?min_price=50&max_price=20`);
      const body = await res.json();
      recordTest(
        '8. GET /books?min_price=50&max_price=20 - Rejects min_price > max_price with 400',
        res.status === 400 && typeof body.message === 'string',
        `Status: ${res.status}, Message: ${body.message}`
      );
    }

    // Test 9: GET /books?limit=3&offset=3 - Pagination
    {
      const res = await fetch(`${baseUrl}/books?limit=3&offset=3`);
      const body = await res.json();
      recordTest(
        '9. GET /books?limit=3&offset=3 - Pagination with limit and offset',
        res.status === 200 && body.count === 3 && body.limit === 3 && body.offset === 3,
        `Status: ${res.status}, Count: ${body.count}`
      );
    }

    // Test 10: POST /books - Valid body returns 201 Created
    {
      const newBook = {
        title: 'Building RESTful APIs with Node.js',
        author: 'Joel Prashanth D',
        price: 29.50,
        genre: 'Web Development',
      };
      const res = await fetch(`${baseUrl}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBook),
      });
      const body = await res.json();
      createdBookId = body.data?.id;
      recordTest(
        '10. POST /books - Create book with valid body returns 201 Created',
        res.status === 201 && body.data?.id > 0 && body.data.title === newBook.title,
        `Status: ${res.status}, Created ID: ${createdBookId}`
      );
    }

    // Test 11: POST /books - Missing title returns 400 Bad Request
    {
      const res = await fetch(`${baseUrl}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: 'Author Only', price: 19.99 }),
      });
      const body = await res.json();
      recordTest(
        '11. POST /books - Missing title rejected with 400 and clear error message',
        res.status === 400 && body.message.includes('title is required'),
        `Status: ${res.status}, Message: ${body.message}`
      );
    }

    // Test 12: POST /books - Missing author returns 400 Bad Request
    {
      const res = await fetch(`${baseUrl}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Title Only', price: 19.99 }),
      });
      const body = await res.json();
      recordTest(
        '12. POST /books - Missing author rejected with 400 and clear error message',
        res.status === 400 && body.message.includes('author is required'),
        `Status: ${res.status}, Message: ${body.message}`
      );
    }

    // Test 13: POST /books - Non-numeric price returns 400 Bad Request
    {
      const res = await fetch(`${baseUrl}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Book Title', author: 'Author', price: 'twenty dollars' }),
      });
      const body = await res.json();
      recordTest(
        '13. POST /books - Non-numeric price string rejected with 400',
        res.status === 400 && body.message.includes('price is required and must be a non-negative number'),
        `Status: ${res.status}, Message: ${body.message}`
      );
    }

    // Test 14: POST /books - Negative price returns 400 Bad Request
    {
      const res = await fetch(`${baseUrl}/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Book Title', author: 'Author', price: -5 }),
      });
      const body = await res.json();
      recordTest(
        '14. POST /books - Negative price rejected with 400',
        res.status === 400 && body.message.includes('price is required and must be a non-negative number'),
        `Status: ${res.status}, Message: ${body.message}`
      );
    }

    // Test 15: GET /books/:id - Existing ID returns 200 OK
    {
      const res = await fetch(`${baseUrl}/books/${createdBookId}`);
      const body = await res.json();
      recordTest(
        `15. GET /books/${createdBookId} - Retrieve existing book returns 200 OK`,
        res.status === 200 && body.data?.id === createdBookId,
        `Status: ${res.status}, Title: ${body.data?.title}`
      );
    }

    // Test 16: GET /books/99999 - Non-existing ID returns 404 Not Found
    {
      const res = await fetch(`${baseUrl}/books/99999`);
      const body = await res.json();
      recordTest(
        '16. GET /books/99999 - Non-existing book ID returns 404 Not Found',
        res.status === 404 && body.message.includes('not found'),
        `Status: ${res.status}, Message: ${body.message}`
      );
    }

    // Test 17: GET /books/notanumber - Invalid ID param returns 400 Bad Request
    {
      const res = await fetch(`${baseUrl}/books/notanumber`);
      const body = await res.json();
      recordTest(
        '17. GET /books/notanumber - Non-integer ID returns 400 Bad Request',
        res.status === 400 && body.message.includes('must be a positive integer'),
        `Status: ${res.status}, Message: ${body.message}`
      );
    }

    // Test 18: PUT /books/:id - Update existing book returns 200 OK
    {
      const updateData = {
        title: 'Building RESTful APIs with Node.js & Express (2nd Edition)',
        author: 'Joel Prashanth D',
        price: 34.00,
        genre: 'Advanced Web Development',
      };
      const res = await fetch(`${baseUrl}/books/${createdBookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      const body = await res.json();
      recordTest(
        `18. PUT /books/${createdBookId} - Update existing book returns 200 OK`,
        res.status === 200 && body.data?.title === updateData.title && body.data?.price === 34.00,
        `Status: ${res.status}, Updated title: ${body.data?.title}`
      );
    }

    // Test 19: PUT /books/99999 - Update non-existent ID returns 404 Not Found
    {
      const res = await fetch(`${baseUrl}/books/99999`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Ghost', author: 'Nobody', price: 10 }),
      });
      const body = await res.json();
      recordTest(
        '19. PUT /books/99999 - Update non-existent book returns 404 Not Found',
        res.status === 404 && body.message.includes('not found'),
        `Status: ${res.status}, Message: ${body.message}`
      );
    }

    // Test 20: DELETE /books/:id - Delete existing book returns 200 OK
    {
      const res = await fetch(`${baseUrl}/books/${createdBookId}`, {
        method: 'DELETE',
      });
      const body = await res.json();
      recordTest(
        `20. DELETE /books/${createdBookId} - Delete existing book returns 200 OK`,
        res.status === 200 && body.message.includes('deleted successfully'),
        `Status: ${res.status}, Message: ${body.message}`
      );
    }

    // Test 21: DELETE /books/99999 - Delete non-existent ID returns 404 Not Found
    {
      const res = await fetch(`${baseUrl}/books/99999`, {
        method: 'DELETE',
      });
      const body = await res.json();
      recordTest(
        '21. DELETE /books/99999 - Delete non-existent book returns 404 Not Found',
        res.status === 404 && body.message.includes('not found'),
        `Status: ${res.status}, Message: ${body.message}`
      );
    }

    // Test 22: GET /unregistered-route - Non-existent route returns 404
    {
      const res = await fetch(`${baseUrl}/nonexistent/endpoint`);
      const body = await res.json();
      recordTest(
        '22. GET /nonexistent/endpoint - Undefined route returns 404 with standard format',
        res.status === 404 && body.message.includes('Route not found'),
        `Status: ${res.status}, Message: ${body.message}`
      );
    }
  } finally {
    server.close();
  }

  console.log('\n====================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED out of ${results.length}`);
  console.log('====================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('[Test Error]', err);
  process.exit(1);
});

