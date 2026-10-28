import "server-only";

import { z } from "zod";

const EnvSchema = z.object({
  GEMINI_API_KEY: z.string().trim().min(1, "GEMINI_API_KEY is required"),
});

export type Env = z.infer<typeof EnvSchema>;

/** Validates the server environment, failing fast without echoing any value. */
export const readEnv = (source: Record<string, string | undefined> = process.env): Env => {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error("Missing configuration: set the GEMINI_API_KEY environment variable.");
  }
  return parsed.data;
};
