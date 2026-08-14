export function resolveAssetUrl(url) {
  const clean = String(url || "").trim();
  if (!clean) return "";
  if (clean.startsWith("data:") || clean.startsWith("blob:") || clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean;
  }
  if (clean.startsWith("/auth-assets/")) {
    return clean;
  }

  // If running in development with separate ports and not proxied:
  const isDev = import.meta.env.DEV;
  if (clean.startsWith("/files/") || clean.startsWith("/uploads/")) {
    if (isDev && typeof window !== "undefined" && window.location.port === "5173") {
      const hostname = window.location.hostname || "localhost";
      return `http://${hostname}:5000${clean}`;
    }
    return clean;
  }

  return clean;
}
