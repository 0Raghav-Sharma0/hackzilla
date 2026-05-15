/**
 * Typed API envelope — WHY: Consistent client parsing + observability (`requestId`, `meta`).
 */
export type ApiSuccess<T> = {
  ok: true;
  data: T;
  meta?: {
    requestId?: string;
    cursor?: string | null;
    hasMore?: boolean;
  };
};

export type ApiErrorBody = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
};

export type ApiResult<T> = ApiSuccess<T> | ApiErrorBody;
