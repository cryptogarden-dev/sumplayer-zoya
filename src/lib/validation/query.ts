import { z } from "zod";

/**
 * Parser boolean untuk query string (`?includeInactive=true`). SENGAJA
 * tidak memakai `z.coerce.boolean()` karena itu memakai koersi `Boolean()`
 * JavaScript - string apa pun yang tidak kosong (termasuk literal
 * `"false"`) akan menjadi `true`, sebuah jebakan umum.
 */
export const booleanQueryParam = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => value === "true");
