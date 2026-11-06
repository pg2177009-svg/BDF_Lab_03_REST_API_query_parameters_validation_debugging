const { getDb } = require('../src/db');

const sampleBooks = [
  {
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    author: 'Robert C. Martin',
    price: 32.50,
    genre: 'Software Engineering',
  },
  {
    title: 'The Pragmatic Programmer: Your Journey to Mastery',
    author: 'David Thomas, Andrew Hunt',
    price: 39.99,
    genre: 'Software Engineering',
  },
  {
    title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
    author: 'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides',
    price: 44.95,
    genre: 'Computer Science',
  },
  {
    title: 'JavaScript: The Good Parts',
    author: 'Douglas Crockford',
    price: 18.20,
    genre: 'Programming',
  },
  {
    title: 'Eloquent JavaScript: A Modern Introduction',
    author: 'Marijn Haverbeke',
    price: 24.99,
    genre: 'Programming',
  },
  {
    title: 'You Don’t Know JS Yet: Get Started',
    author: 'Kyle Simpson',
    price: 15.00,
    genre: 'Programming',
  },
  {
    title: 'Introduction to Algorithms (CLRS)',
    author: 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein',
    price: 68.00,
    genre: 'Algorithms',
  },
  {
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    price: 41.50,
    genre: 'Systems Architecture',
  },
  {
    title: 'Site Reliability Engineering',
    author: 'Betsy Beyer, Chris Jones, Jennifer Petoff, Niall Richard Murphy',
    price: 29.99,
    genre: 'DevOps',
  },
  {
    title: 'Database System Concepts',
    author: 'Abraham Silberschatz, Henry F. Korth, S. Sudarshan',
    price: 52.00,
    genre: 'Databases',
  },
];

async function seed() {
  console.log('[Seed] Connecting to database...');
  const db = await getDb();

  console.log('[Seed] Clearing existing books...');
  await db.run('DELETE FROM books;');
  await db.run('DELETE FROM sqlite_sequence WHERE name = "books";');

  console.log(`[Seed] Inserting ${sampleBooks.length} sample books...`);
  const stmt = await db.prepare(
    'INSERT INTO books (title, author, price, genre) VALUES (?, ?, ?, ?)'
  );

  for (const book of sampleBooks) {
    await stmt.run(book.title, book.author, book.price, book.genre);
    console.log(`  + Added "${book.title}" ($${book.price})`);
  }

  await stmt.finalize();
  console.log('[Seed] Database seeding completed successfully!\n');
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed Error]', err);
      process.exit(1);
    });
}

module.exports = { seed, sampleBooks };

