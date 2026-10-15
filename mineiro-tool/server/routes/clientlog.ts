import { Router } from 'express';

export function clientLogRouter(): Router {
  const router = Router();

  router.post('/api/client-log', (req, res) => {
    const { kind, message, stack, url, ua } = req.body || {};
    const cut = (value: unknown, max: number) => String(value ?? '').slice(0, max);
    console.error(`[client:${cut(kind, 20)}] ${cut(message, 300)} @ ${cut(url, 200)}\n${cut(stack, 1200)}\nua=${cut(ua, 160)}`);
    res.status(204).end();
  });

  return router;
}
