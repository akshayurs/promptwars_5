import "server-only";

import { z } from "zod";

const EnvSchema = z.object({
  GEMINI_API_KEY: z.string().trim().min(1, "GEMINI_API_KEY is required"),
});

export type Env = z.infer<typeof EnvSchema>;

export const readEnv = (source: Record<string, string | undefined> = process.env): Env => {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new Error("Missing configuration: set GEMINI_API_KEY in .env.local (see .env.example).");
  }
  return parsed.data;
};
