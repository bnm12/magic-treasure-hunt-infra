export function resolveAppUrl(path = ""): string {
  const normalizedPath = path.replace(/^\/+/, "");
  const baseUrl =
    typeof document !== "undefined" ? document.baseURI : import.meta.env.BASE_URL;

  return new URL(normalizedPath, baseUrl).toString();
}
