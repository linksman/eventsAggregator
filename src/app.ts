import express from 'express';
import eventsRouter from './routes/events.js';

const app = express();

app.use(express.json());
app.use('/events', eventsRouter);

export default app;
