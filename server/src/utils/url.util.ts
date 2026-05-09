/** Returns true if the given string is an absolute HTTP/HTTPS URL. */
export function isRemoteFileUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
