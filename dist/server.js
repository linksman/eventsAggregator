import app from './app.js';
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
});
