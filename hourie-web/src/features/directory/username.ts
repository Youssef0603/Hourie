/**
 * Preview of the username the server generates from a person's full name
 * ("Awa Koné" → "awa.kone"). The server adds a number if it is already taken.
 */
export function generatedUsername(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}
