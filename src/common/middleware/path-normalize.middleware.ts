import type { Request, Response, NextFunction } from 'express';

export function normalizeRepeatedSlashes(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (req.url.includes('//')) {
    req.url = req.url.replace(/\/{2,}/g, '/');
  }
  next();
}
