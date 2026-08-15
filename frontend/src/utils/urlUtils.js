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

    // Profile photos are stored by the API and returned as relative paths.
    // When the frontend and API are deployed on different domains, a plain
    // `/files/...` URL incorrectly points at the frontend domain.
    const configuredApi = String(import.meta.env.VITE_API_BASE_URL || "").trim();
    if (configuredApi && /^https?:\/\//i.test(configuredApi)) {
      try {
        return `${new URL(configuredApi).origin}${clean}`;
      } catch (_error) {
        // Keep the relative path if the configured URL is malformed.
      }
    }
    return clean;
  }

  return clean;
}
