import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { ZodSchema } from "zod";
import { randomUUID } from "crypto";
import { AppError } from "@/lib/errors/app-error";
import { mapUnknownError, mapZodError } from "@/lib/errors/map-error";
import { failure, success } from "@/lib/api/response";
import { logger } from "@/lib/logger";
import type { ApiResult } from "@/types/api";

export type ApiContext = {
  requestId: string;
  /** Clerk `userId` when session present; null for public routes. */
  clerkUserId: string | null;
};

type HandlerOptions<TBody, TQuery, TResponse> = {
  bodySchema?: ZodSchema<TBody>;
  querySchema?: ZodSchema<TQuery>;
  requireAuth?: boolean;
  handler: (ctx: ApiContext, input: { body: TBody; query: TQuery }) => Promise<TResponse>;
};

function json<T>(data: ApiResult<T>, status: number) {
  return NextResponse.json(data, { status });
}

/**
 * Route handler wrapper — WHY: One place for auth, validation, logging, and error shape.
 */
export function createApiHandler<TBody, TQuery, TResponse>(
  opts: HandlerOptions<TBody, TQuery, TResponse>,
) {
  return async function handle(req: NextRequest): Promise<NextResponse> {
    const requestId = req.headers.get("x-request-id") ?? randomUUID();

    try {
      const { userId } = await auth();
      const ctx: ApiContext = { requestId, clerkUserId: userId };

      if (opts.requireAuth && !ctx.clerkUserId) {
        const err = AppError.unauthorized();
        return json(failure(err, requestId), err.status);
      }

      let body = undefined as TBody;
      if (opts.bodySchema && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
        const raw = await req.json().catch(() => undefined);
        const parsed = opts.bodySchema.safeParse(raw);
        if (!parsed.success) {
          const err = mapZodError(parsed.error);
          return json(failure(err, requestId), err.status);
        }
        body = parsed.data;
      }

      let query = undefined as TQuery;
      if (opts.querySchema) {
        const params = Object.fromEntries(req.nextUrl.searchParams.entries());
        const parsed = opts.querySchema.safeParse(params);
        if (!parsed.success) {
          const err = mapZodError(parsed.error);
          return json(failure(err, requestId), err.status);
        }
        query = parsed.data;
      }

      const data = await opts.handler(ctx, { body, query } as { body: TBody; query: TQuery });
      return json(success(data, { requestId }), 200);
    } catch (err) {
      const mapped = mapUnknownError(err);
      logger.error("api.unhandled", { requestId, err: mapped.message, code: mapped.code });
      return json(failure(mapped, requestId), mapped.status);
    }
  };
}
