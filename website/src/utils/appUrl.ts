export function resolveAppUrl(path = ""): string {
  const normalizedPath = path.replace(/^\/+/, "");
  const baseUrl =
    typeof window !== "undefined"
      ? new URL(import.meta.env.BASE_URL, window.location.origin).toString()
      : import.meta.env.BASE_URL;

  return new URL(normalizedPath, baseUrl).toString();
}
