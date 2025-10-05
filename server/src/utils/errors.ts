export class HttpError extends Error {
  status: number;
  code: string;
  field?: string;

  constructor(status: number, code: string, message: string, field?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

export const buildErrorBody = (code: string, message: string, field?: string) => ({
  error: {
    code,
    message,
    ...(field ? { field } : {}),
  },
});
