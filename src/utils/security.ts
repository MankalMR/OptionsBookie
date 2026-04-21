/**
 * Safely stringifies an object for use in a JSON-LD <script> tag.
 * It escapes <, >, &, /, \u2028, and \u2029 characters to their Unicode equivalents
 * to prevent XSS attacks (e.g., </script> injection) and ensure compatibility
 * with JavaScript parsers.
 *
 * @param data The object to stringify
 * @returns A safe JSON string
 */
export function safeJsonLdStringify(data: any): string {
  if (!data || typeof data !== 'object') {
    return '';
  }

  const json = JSON.stringify(data);
  if (!json) return '';

  return json.replace(/[<>&/\u2028\u2029]/g, (char) => {
    switch (char) {
      case '<':
        return '\\u003c';
      case '>':
        return '\\u003e';
      case '&':
        return '\\u0026';
      case '/':
        return '\\u002f';
      case '\u2028':
        return '\\u2028';
      case '\u2029':
        return '\\u2029';
      default:
        return char;
    }
  });
}
