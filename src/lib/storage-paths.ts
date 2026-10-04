/** Makes a user's file name safe to use in a Storage object path. */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

/** The original file name, without the folder or the "<uuid>-" prefix added at upload time. */
export function filenameFromPath(path: string): string {
  const lastSegment = path.split("/").pop() ?? path;
  return lastSegment.replace(/^[0-9a-f-]{36}-/, "");
}
