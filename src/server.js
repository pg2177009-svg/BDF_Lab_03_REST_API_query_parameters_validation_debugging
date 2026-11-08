require('dotenv').config();
const app = require('./app');
const { getDb } = require('./db');

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 3000;

async function startServer(port = DEFAULT_PORT) {
  try {
    // Ensure database connection and tables are ready
    await getDb();
    console.log('[Database] SQLite connected and schema verified.');

    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`[Server] Running successfully on http://0.0.0.0:${port}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Handle port conflict error (EADDRINUSE) - Part of Task 7 debugging exercise
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`[Server Error] Port ${port} is already in use (EADDRINUSE).`);
        console.log(`[Server] Retrying on alternative port ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error('[Server Error]', err);
        process.exit(1);
      }
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n[Server] Gracefully shutting down...');
      server.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
    });

    return server;
  } catch (error) {
    console.error('[Startup Error] Failed to initialize server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };

