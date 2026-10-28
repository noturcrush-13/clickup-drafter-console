import "server-only";
import { z } from "zod";

const envSchema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  CLICKUP_TOKEN: z.string().min(1),
  CLICKUP_FOLDER_ID: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

// Dibaca saat dipakai (bukan saat build). Pesan error hanya menyebut NAMA variabel, tidak pernah nilainya.
export function getEnv(): Env {
  if (cached) return cached;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const names = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Environment variable belum diisi atau tidak valid: ${names}`);
  }
  cached = result.data;
  return cached;
}
