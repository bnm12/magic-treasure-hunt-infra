export function resolveAppUrl(path = ""): string {
  const normalizedPath = path.replace(/^\/+/, "");
  const baseUrl =
    typeof document !== "undefined"
      ? document.baseURI.replace(/management\//, "")
      : import.meta.env.BASE_URL;

  return new URL(normalizedPath, baseUrl).toString();
}

export function withBuildVersion(url: string): string {
  const versionedUrl = new URL(url);
  versionedUrl.searchParams.set("v", __APP_BUILD_ID__);
  return versionedUrl.toString();
}

export function resolveVersionedAppUrl(path = ""): string {
  return withBuildVersion(resolveAppUrl(path));
}
