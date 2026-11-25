import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import apiRoutes from './routes/apiRoutes.js';
import viewRoutes from './routes/viewRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_DIR = path.resolve(__dirname, '..');

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', path.join(ROOT_DIR, 'src/views'));

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Static assets (/public/* and root /css/*, /js/*, /vendor/*)
  app.use('/public', express.static(path.join(ROOT_DIR, 'public'), { index: false }));
  app.use(express.static(path.join(ROOT_DIR, 'public'), { index: false }));

  // Isomorphic ES Modules shared between Node backend and Browser
  app.use('/shared', express.static(path.join(ROOT_DIR, 'src/shared')));

  // Hardened static serving for processed B&W engravings
  app.use(
    '/storage/engravings',
    (_req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
      next();
    },
    express.static(path.join(ROOT_DIR, 'storage/engravings'))
  );

  // API & View routes
  app.use('/api', apiRoutes);
  app.use('/', viewRoutes);

  // API 404 handler
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Endpoint API no encontrado.' });
  });

  // Centralized error handler
  app.use((err, req, res, _next) => {
    if (err && err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Formato JSON inválido en la solicitud.' });
    }
    if (err && err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'El tamaño de los datos supera el límite permitido de 5 MB.' });
    }

    const status = Number(err?.statusCode || err?.status) || 500;
    const message = err?.message || 'Error interno del servidor.';

    if (req.path.startsWith('/api')) {
      return res.status(status).json({ error: message });
    }

    return res.status(status).type('text/plain').send(message);
  });

  return app;
}

export const app = createApp();
export default app;
