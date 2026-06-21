import { Router, Request, Response } from 'express';
import { getSummary } from '../store/store.js';
import logger from '../logger.js';

const router = Router();

router.get('/:customerId/summary', (req: Request, res: Response) => {
  const { customerId } = req.params;
  const summary = getSummary(customerId);
  if (!summary) {
    logger.info({ customerId }, 'customer not found');
    res.status(404).json({ error: 'Customer not found' });
    return;
  }
  res.json(summary);
});

export default router;
