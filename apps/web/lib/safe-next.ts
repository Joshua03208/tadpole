/**
 * Validate a user-supplied `?next=` redirect target. Only same-app paths pass:
 *   - must start with "/"
 *   - "//host" is rejected (protocol-relative URL → open redirect)
 *   - "\" is rejected (WHATWG URL treats it as "/", so "/\evil.com" === "//evil.com")
 *   - ":" is rejected (no scheme smuggling)
 * Anything else falls back.
 */
export function safeNextPath(value: string | null | undefined, fallback: string): string {
  if (
    value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !value.includes(":")
  ) {
    return value;
  }
  return fallback;
}
