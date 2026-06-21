import app from './app.js';
import logger from './logger.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, 'server started');
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down');
  server.close(() => {
    logger.info('server closed');
    process.exit(0);
  });
});
