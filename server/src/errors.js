export class AppError extends Error {
  constructor(message, { statusCode = 500, code = 'INTERNAL_ERROR', details } = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message, details) {
    super(message, { statusCode: 400, code: 'VALIDATION_ERROR', details });
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Não autorizado.') {
    super(message, { statusCode: 401, code: 'UNAUTHORIZED' });
    this.name = 'UnauthorizedError';
  }
}

export function globalErrorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';

  res.status(statusCode).json({
    message: statusCode >= 500 ? 'Erro interno no servidor.' : err.message,
    code,
    details: err.details,
    requestId: req.requestId
  });
}
