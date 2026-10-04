/**
 * Converts a title into a URL-friendly slug and appends a safe 4-char suffix
 * Example: "The Startup GTM Guide" -> "the-startup-gtm-guide-9f2b"
 */
export function generatePublicSlug(title: string): string {
  const cleanTitle = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return cleanTitle ? `${cleanTitle}-${randomSuffix}` : `resource-${randomSuffix}`;
}
