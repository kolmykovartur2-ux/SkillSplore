import type { NextFunction, Request, Response } from 'express';
import { z, type ZodType } from 'zod';
import { AppError } from './errors.js';

interface Schemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query);
        Object.assign(req.query as Record<string, unknown>, parsed);
        (req as unknown as { validatedQuery: unknown }).validatedQuery = parsed;
      }
      if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(
          new AppError(400, 'validation_error', 'Some fields need attention.', {
            fields: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
          }),
        );
      } else {
        next(err);
      }
    }
  };
}
