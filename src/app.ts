import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import pino from 'pino';
import eventsRouter from './routes/events.js';
import customersRouter from './routes/customers.js';

const logger = pino();

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

app.use('/events', eventsRouter);
app.use('/customers', customersRouter);

export function errorHandler(err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction): void {
  const status = err.status ?? 500;
  if (status >= 400 && status < 500) {
    res.status(status).json({ error: err.message });
  } else {
    res.status(500).json({ error: 'Internal server error' });
  }
}

app.use(errorHandler);

export default app;
