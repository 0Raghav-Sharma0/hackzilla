import { ZodError } from "zod";
import { AppError } from "./app-error";

export function mapZodError(err: ZodError): AppError {
  return AppError.validation("Validation failed", err.flatten());
}

export function mapUnknownError(err: unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof ZodError) return mapZodError(err);
  if (err instanceof Error) return AppError.internal(err.message);
  return AppError.internal();
}
