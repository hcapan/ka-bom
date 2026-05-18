// app/lib/hardware/validation.ts
// ============================================================
// VALIDATION UTILITIES — strict in production, lenient in dev
// ============================================================

import { z } from "zod";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Validates data against a Zod schema with environment-aware behavior:
 *  - Production: throws on any validation error (strict)
 *  - Development: logs detailed warnings, then attempts strict parse
 *
 * Use this for catalog data load (where bad data should fail loudly).
 *
 * @throws ZodError if validation fails (always, in both modes — but dev
 *         shows a friendly warning first to make debugging easier)
 */
export function validateOrThrow<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  contextName: string
): z.infer<T> {
  if (isDev) {
    const result = schema.safeParse(data);
    if (!result.success) {
      console.warn(
        `\n⚠️  [Catalog Validation] ${contextName} has issues:\n`,
        formatValidationErrors(result.error.issues).map((e) => `   • ${e}`).join("\n"),
        "\n"
      );
      // Still throw so the dev sees the actual ZodError stack
      throw result.error;
    }
    return result.data;
  }

  // Production: strict — throws on any error
  return schema.parse(data);
}

/**
 * Safe validation that NEVER throws — returns success/failure result.
 * Use for user-facing operations (CCW imports, manual edits in UI)
 * where we want to display errors gracefully.
 */
export function validateSafe<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { ok: true; data: z.infer<T> } | { ok: false; errors: z.ZodIssue[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return { ok: false, errors: result.error.issues };
}

/**
 * Formats Zod errors into human-readable strings for display.
 *
 * @example
 *   formatValidationErrors(error.issues)
 *   // → ["series.Catalyst 9300.pids.0.bundle.smartnet: Invalid enum value..."]
 */
export function formatValidationErrors(errors: z.ZodIssue[]): string[] {
  return errors.map((err) => {
    const path = err.path.length > 0 ? err.path.join(".") : "(root)";
    return `${path}: ${err.message}`;
  });
}

/**
 * Returns true if the running environment is development.
 * Catalog loader uses this to decide whether to log warnings.
 */
export function isDevelopment(): boolean {
  return isDev;
}