/** Encodes bytes as unpadded base64url: letters, digits, `-` and `_`. */
export function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Decodes base64url, padded or not.
 *
 * @throws Error if the text is not base64url.
 */
export function decodeBase64Url(text: string): Uint8Array<ArrayBuffer> {
  let binary: string;
  try {
    binary = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  } catch {
    throw new Error("The text is not base64url.");
  }
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
