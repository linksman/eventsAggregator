import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import eventsRouter from './routes/events.js';
import customersRouter from './routes/customers.js';
import { registry } from './metrics.js';
import logger from './logger.js';

const app = express();

app.use(helmet());
app.use(express.json({ limit: '100kb' }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({ method: req.method, path: req.path, status: res.statusCode, latencyMs: Date.now() - start });
  });
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/metrics', async (_req: Request, res: Response) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

app.use('/events', eventsRouter);
app.use('/customers', customersRouter);

export function errorHandler(err: Error & { status?: number }, req: Request, res: Response, _next: NextFunction): void {
  const status = err.status ?? 500;
  if (status >= 400 && status < 500) {
    logger.warn({ method: req.method, path: req.path, status, err: err.message }, 'client error');
    res.status(status).json({ error: 'Bad request' });
  } else {
    logger.error({ method: req.method, path: req.path, err }, 'unhandled error');
    res.status(500).json({ error: 'Internal server error' });
  }
}

app.use(errorHandler);

export default app;
