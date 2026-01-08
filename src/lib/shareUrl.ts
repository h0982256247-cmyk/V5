/**
 * Build both the regular web URL and the LIFF URL for a share token.
 *
 * - webUrl: https://<your-domain>/share?token=...
 * - liffUrl: https://liff.line.me/<LIFF_ID>?token=...
 */
export function buildShareUrls(token: string) {
  const encoded = encodeURIComponent(token);
  const webUrl = `${window.location.origin}/share?token=${encoded}`;

  // Vite env var (build-time): VITE_LIFF_ID
  const liffId = (import.meta as any).env?.VITE_LIFF_ID as string | undefined;
  const liffUrl = liffId ? `https://liff.line.me/${liffId}?token=${encoded}` : null;

  return { webUrl, liffUrl };
}
