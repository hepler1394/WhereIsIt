/**
 * WhereIsIt — Centralized Error & Response Handler
 * Production-grade error definitions, HTTP error classes,
 * and consistent response formatting.
 */

// ══════════════════════════════════════════
// Custom Error Classes
// ══════════════════════════════════════════

export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource', id = null) {
    super(
      id ? `${resource} with ID '${id}' not found` : `${resource} not found`,
      404,
      'NOT_FOUND'
    );
  }
}

export class ValidationError extends AppError {
  constructor(message, fields = null) {
    super(message, 400, 'VALIDATION_ERROR', fields);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter = 60) {
    super('Rate limit exceeded. Please try again later.', 429, 'RATE_LIMITED', { retryAfter });
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(service = 'Service') {
    super(`${service} is currently unavailable`, 503, 'SERVICE_UNAVAILABLE');
  }
}

export class ExternalServiceError extends AppError {
  constructor(service, originalError = null) {
    super(
      `External service '${service}' failed`,
      502,
      'EXTERNAL_SERVICE_ERROR',
      originalError ? { originalMessage: originalError.message } : null
    );
  }
}

// ══════════════════════════════════════════
// Response Formatting
// ══════════════════════════════════════════

/**
 * Build a standardized success response.
 */
export function success(data, meta = {}) {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * Build a standardized paginated response.
 */
export function paginated(data, { page, perPage, total }) {
  return {
    success: true,
    data,
    pagination: {
      page,
      per_page: perPage,
      total,
      total_pages: Math.ceil(total / perPage),
      has_more: page * perPage < total,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Build a standardized error response.
 */
export function errorResponse(error) {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Unknown errors — don't leak internal details in production
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isProduction ? 'An unexpected error occurred' : error.message,
      details: isProduction ? null : { stack: error.stack },
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}

// ══════════════════════════════════════════
// Fastify Error Handler Plugin
// ══════════════════════════════════════════

export async function errorHandlerPlugin(app) {
  app.setErrorHandler((error, request, reply) => {
    // Fastify validation errors
    if (error.validation) {
      const fields = error.validation.map(v => ({
        field: v.instancePath || v.params?.missingProperty || 'unknown',
        message: v.message,
        rule: v.keyword,
      }));
      const appError = new ValidationError('Request validation failed', fields);
      reply.status(400).send(errorResponse(appError));
      return;
    }

    // Our custom AppErrors
    if (error instanceof AppError) {
      request.log.warn({ err: error, code: error.code }, error.message);
      reply.status(error.statusCode).send(errorResponse(error));
      return;
    }

    // Rate limit errors from @fastify/rate-limit
    if (error.statusCode === 429) {
      reply.status(429).send(errorResponse(new RateLimitError()));
      return;
    }

    // Unexpected errors
    request.log.error({ err: error }, 'Unhandled error');
    reply.status(500).send(errorResponse(error));
  });

  // Handle 404s for unknown routes
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send(errorResponse(
      new NotFoundError('Route', `${request.method} ${request.url}`)
    ));
  });
}
