/**
 * Escape special SQL LIKE pattern characters to prevent unintended wildcard matching.
 * Characters escaped: % (matches any sequence), _ (matches single char), \ (escape char)
 * 
 * @param str - The search string to escape
 * @returns The escaped string safe for use in ILIKE patterns
 */
export function escapeLikePattern(str: string): string {
  if (!str) return '';
  // Escape backslash first, then % and _
  return str.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Create a safe ILIKE search pattern from user input.
 * Wraps the escaped input with % wildcards for partial matching.
 * 
 * @param str - The search string
 * @returns A safe pattern like "%escaped_input%"
 */
export function createSearchPattern(str: string): string {
  if (!str || !str.trim()) return '';
  return `%${escapeLikePattern(str.trim())}%`;
}
