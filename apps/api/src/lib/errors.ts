// Typed application error carrying an HTTP status and a stable machine code.
export class AppError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (msg: string, details?: unknown) =>
  new AppError(400, 'bad_request', msg, details);
export const unauthorized = (msg = 'Authentication required') =>
  new AppError(401, 'unauthorized', msg);
export const forbidden = (msg = 'You do not have permission to do that') =>
  new AppError(403, 'forbidden', msg);
export const notFound = (msg = 'Not found') => new AppError(404, 'not_found', msg);
export const conflict = (msg: string, details?: unknown) =>
  new AppError(409, 'conflict', msg, details);
// 402 rather than 403: the request is well-formed and the user is permitted to
// do this, they just have to pay first. The distinct code lets the frontend
// route them to checkout instead of showing a generic "not allowed".
export const paymentRequired = (msg: string, details?: unknown) =>
  new AppError(402, 'payment_required', msg, details);
export const tooMany = (msg = 'Too many requests') => new AppError(429, 'rate_limited', msg);
