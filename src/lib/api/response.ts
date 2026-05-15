import type { ApiErrorBody, ApiResult, ApiSuccess } from "@/types/api";
import { AppError } from "@/lib/errors/app-error";

export function success<T>(data: T, meta?: ApiSuccess<T>["meta"]): ApiSuccess<T> {
  return { ok: true, data, meta };
}

export function failure(err: AppError, requestId?: string): ApiErrorBody {
  return {
    ok: false,
    error: {
      code: err.code,
      message: err.message,
      details: err.details,
      requestId,
    },
  };
}

export function toApiResult<T>(result: T | AppError, requestId?: string): ApiResult<T> {
  if (result instanceof AppError) {
    return failure(result, requestId);
  }
  return success(result, { requestId });
}
