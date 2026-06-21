import { Router, Request, Response } from 'express';
import { validateEvent } from '../validation/schemas.js';
import { recordEvent } from '../store/store.js';
import { ZodError } from 'zod';
import { eventsIngestedTotal, eventsRejectedTotal } from '../metrics.js';
import logger from '../logger.js';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  try {
    const event = validateEvent(req.body);
    recordEvent(event);
    eventsIngestedTotal.inc();
    logger.debug({ customerId: event.customerId, endpoint: event.endpoint, statusCode: event.statusCode }, 'event recorded');
    res.status(201).end();
  } catch (err) {
    if (err instanceof ZodError) {
      eventsRejectedTotal.inc();
      const message = err.errors[0].message;
      logger.warn({ body: req.body, reason: message }, 'event rejected');
      res.status(400).json({ error: message });
    } else {
      throw err;
    }
  }
});

export default router;
