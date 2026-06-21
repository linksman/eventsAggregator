import { Router, Request, Response } from 'express';
import { getSummary } from '../store/store.js';

const router = Router();

router.get('/:customerId/summary', (req: Request, res: Response) => {
  const summary = getSummary(req.params.customerId);
  if (!summary) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }
  res.json(summary);
});

export default router;
