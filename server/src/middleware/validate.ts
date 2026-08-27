import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { fail } from '../utils/response';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      fail(res, 400, result.error.flatten().fieldErrors);
      return;
    }
    req.body = result.data;
    next();
  };
}