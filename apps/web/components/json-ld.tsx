/**
 * Renders a JSON-LD <script> for SEO structured data. The "<" escaping prevents
 * any string value from breaking out of the script context (XSS-safe).
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
