/**
 * Build the frontmatter block for a published article.
 *
 * Per spec:
 *   - title pulled from first `# ` heading in the body
 *   - YAML-unsafe characters in the title are stripped/replaced
 *   - date is today's date (YYYY-MM-DD) at publish time
 *   - hide block is injected verbatim, including the commented `- toc` line
 *   - H1 is NOT removed from the body
 */

export interface FrontmatterResult {
  yaml: string;
  title: string;
}

/**
 * Find the first H1 (`# Heading`) line in the body and return its text.
 * Falls back to a provided default if none is found.
 */
export function extractTitleFromBody(body: string, fallback: string): string {
  // Strip an existing frontmatter block before scanning so we don't pick up
  // a `# something` inside it (rare but possible).
  const stripped = body.replace(/^---\n[\s\S]*?\n---\n?/, "");
  const lines = stripped.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^#\s+(.+?)\s*$/);
    if (m) return m[1].trim();
  }
  return fallback;
}

/**
 * Sanitize a title for safe inclusion as a double-quoted YAML scalar.
 * - Replace YAML-breaking and filesystem-iffy characters with a space
 * - Collapse whitespace
 * - Escape any remaining double quotes and backslashes
 */
export function sanitizeTitle(raw: string): string {
  // Replace characters that frequently cause YAML parse issues or just look ugly.
  // Colon is the big one. Also handle some quote-y bits.
  let t = raw
    .replace(/[:#\[\]{}|>!&*?%@`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Escape backslash first, then double quotes, for safe quoting.
  t = t.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return t;
}

/**
 * Today's date in YYYY-MM-DD using local time.
 */
export function todayISODate(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Build the YAML frontmatter block (with leading/trailing `---` fences).
 */
export function buildFrontmatter(
  body: string,
  fallbackTitle: string,
  now: Date = new Date()
): FrontmatterResult {
  const rawTitle = extractTitleFromBody(body, fallbackTitle);
  const safeTitle = sanitizeTitle(rawTitle);
  const date = todayISODate(now);

  const yaml =
    `---\n` +
    `title: "${safeTitle}"\n` +
    `date: ${date}\n` +
    `hide:\n` +
    `  - navigation\n` +
    `#  - toc\n` +
    `---\n`;

  return { yaml, title: safeTitle };
}

/**
 * If the body already starts with a `---\n...\n---\n` block, strip it so
 * we can replace it with our generated one. This avoids double frontmatter.
 */
export function stripExistingFrontmatter(body: string): string {
  return body.replace(/^---\n[\s\S]*?\n---\n?/, "");
}
