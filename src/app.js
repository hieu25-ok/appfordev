import express from 'express';
import { ingredientsRouter } from './routes/ingredients.js';
import { recipesRouter } from './routes/recipes.js';

const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || '*';

function corsMiddleware(_req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
}

export function createApp() {
  const app = express();

  app.use(corsMiddleware);
  app.options('*', (_req, res) => res.sendStatus(204));
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.json({
      name: 'Meal Finder API',
      version: '1.0.0',
      resources: {
        ingredients: '/api/ingredients',
        recipes: '/api/recipes'
      }
    });
  });

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/ingredients', ingredientsRouter);
  app.use('/api/recipes', recipesRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    const message = status === 500 ? 'Internal server error' : err.message;

    if (status === 500) {
      console.error(err);
    }

    res.status(status).json({ error: message });
  });

  return app;
}
