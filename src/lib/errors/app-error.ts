/**
 * Domain / transport errors — WHY: Map to HTTP status + stable `code` for clients and logs.
 */
export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "INSUFFICIENT_CREDITS"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static unauthorized(message = "Unauthorized"): AppError {
    return new AppError("UNAUTHORIZED", message, 401);
  }

  static forbidden(message = "Forbidden"): AppError {
    return new AppError("FORBIDDEN", message, 403);
  }

  static notFound(message = "Not found"): AppError {
    return new AppError("NOT_FOUND", message, 404);
  }

  static conflict(message: string, details?: unknown): AppError {
    return new AppError("CONFLICT", message, 409, details);
  }

  static validation(message: string, details?: unknown): AppError {
    return new AppError("VALIDATION_ERROR", message, 422, details);
  }

  static rateLimited(message = "Too many requests"): AppError {
    return new AppError("RATE_LIMITED", message, 429);
  }

  static insufficientCredits(message = "Insufficient credits"): AppError {
    return new AppError("INSUFFICIENT_CREDITS", message, 402);
  }

  static serviceUnavailable(message = "Service unavailable"): AppError {
    return new AppError("SERVICE_UNAVAILABLE", message, 503);
  }

  static internal(message = "Internal server error"): AppError {
    return new AppError("INTERNAL", message, 500);
  }
}
