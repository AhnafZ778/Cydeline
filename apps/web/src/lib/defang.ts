/** Normalize defanged indicators the way an analyst pastes them from a ticket. */
export function defang(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/hxxps/g, "https")
    .replace(/hxxp/g, "http")
    .replace(/\[\.\]/g, ".")
    .replace(/\[dot\]/g, ".")
    .replace(/\s+/g, " ");
}
