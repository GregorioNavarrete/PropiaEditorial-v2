import { app } from './app.js';

const PORT = Number(process.env.PORT) || 3000;

export const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[Editorial Personal] Servidor editorial activo en http://localhost:${PORT}`);
});

function shutdown() {
  server.close(() => {
    process.exit(0);
  });
}

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);

export default server;
