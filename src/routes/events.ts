import { Router, Request, Response } from 'express';
import { validateEvent } from '../validation/schemas.js';
import { recordEvent } from '../store/store.js';
import { ZodError } from 'zod';

const router = Router();

router.post('/', (req: Request, res: Response) => {
  try {
    const event = validateEvent(req.body);
    recordEvent(event);
    res.status(201).end();
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: err.errors[0].message });
    } else {
      throw err;
    }
  }
});

export default router;
