import { safeJsonLdStringify } from './security';

describe('safeJsonLdStringify', () => {
  it('should stringify a simple object', () => {
    const data = { name: 'Test' };
    expect(safeJsonLdStringify(data)).toBe('{"name":"Test"}');
  });

  it('should escape dangerous characters to Unicode equivalents', () => {
    const data = {
      html: '<script>alert(1)</script>',
      more: 'A & B > C'
    };
    const result = safeJsonLdStringify(data);

    // Check that characters are escaped
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).not.toContain('&');

    // Check Unicode escapes
    expect(result).toContain('\\u003c');
    expect(result).toContain('\\u003e');
    expect(result).toContain('\\u0026');

    // Ensure it's still valid JSON when parsed
    expect(JSON.parse(result!)).toEqual(data);
  });

  it('should handle null and undefined', () => {
    expect(safeJsonLdStringify(null)).toBe('null');
    expect(safeJsonLdStringify(undefined)).toBeUndefined();
  });

  it('should handle complex nested objects', () => {
    const data = {
      user: {
        bio: 'I like <b>tags</b> & "quotes"',
      },
      tags: ['<a href="test">Link</a>']
    };
    const result = safeJsonLdStringify(data);

    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).not.toContain('&');
    expect(JSON.parse(result!)).toEqual(data);
  });
});
