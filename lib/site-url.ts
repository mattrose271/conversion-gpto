const DEFAULT_SITE_URL = "https://www.consultingsr.com";

export function normalizeSiteUrl(raw: string | null | undefined, fallback: string = DEFAULT_SITE_URL): string {
  const source = (raw || "").trim() || fallback;
  const withProtocol = /^https?:\/\//i.test(source) ? source : `https://${source}`;

  try {
    const url = new URL(withProtocol);
    if (url.hostname === "consultingsr.com") {
      url.hostname = "www.consultingsr.com";
    }
    return url.origin;
  } catch {
    return fallback;
  }
}

