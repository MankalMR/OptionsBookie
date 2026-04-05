/**
 * Safely stringifies an object for use in a JSON-LD <script> tag.
 * It escapes <, >, and & characters to their Unicode equivalents
 * to prevent XSS attacks (e.g., </script> injection).
 *
 * @param data The object to stringify
 * @returns A safe JSON string
 */
export function safeJsonLdStringify(data: any): string {
  const json = JSON.stringify(data);
  if (!json) return '';
  return json.replace(/[<>&]/g, (char) => {
    switch (char) {
      case '<':
        return '\\u003c';
      case '>':
        return '\\u003e';
      case '&':
        return '\\u0026';
      default:
        return char;
    }
  });
}
