// Ambil ID dokumen Google dari URL, atau terima ID mentah.
// Contoh: https://docs.google.com/document/d/1AbC.../edit → "1AbC..."
export function extractGoogleId(input: string, kind: "document" | "presentation"): string | null {
  const value = input.trim();
  if (!value) return null;
  const fromUrl = new RegExp(`/${kind}/d/([A-Za-z0-9_-]+)`).exec(value);
  if (fromUrl) return fromUrl[1];
  return /^[A-Za-z0-9_-]{20,}$/.test(value) ? value : null;
}
