import type { z, ZodTypeAny } from 'zod';

import { HttpError } from './errors';

export const parseSchema = <S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> => {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const message = issue.message;
    const field = issue.path.join('.') || undefined;
    throw new HttpError(400, 'VALIDATION_ERROR', message, field);
  }
  return result.data;
};
