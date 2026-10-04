/**
 * Converts a title into a URL-friendly slug and appends a safe 4-char suffix
 * Example: "The Startup GTM Guide" -> "the-startup-gtm-guide-9f2b"
 */
export function generatePublicSlug(title: string): string {
  // Strip trailing .pdf if creator included it in the title
  const rawTitle = title.replace(/\.pdf$/i, '').trim();

  const cleanTitle = rawTitle
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  // Generate guaranteed 4-char alphanumeric random suffix
  const randomSuffix = Math.random().toString(36).substring(2, 6).padEnd(4, '0');
  return cleanTitle ? `${cleanTitle}-${randomSuffix}` : `resource-${randomSuffix}`;
}
