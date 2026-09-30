"use client";

// Runs client-side only, before upload (SPEC §10 "Images are compressed in
// the browser before upload").

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.8;

/**
 * Compresses an image file for upload. Non-image files (PDFs) pass through
 * unchanged. Always re-encodes as JPEG at a capped resolution.
 *
 * Uses `createImageBitmap(file, { imageOrientation: "from-image" })` rather
 * than an `<img>` + `drawImage`: that option makes the browser bake the
 * file's EXIF orientation into the decoded pixels before we ever touch a
 * canvas, so a portrait phone photo (which is very often stored "sideways"
 * with an EXIF rotation flag) comes out right-side up instead of rotated.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // An undecodable/corrupt image must not block the whole submission —
    // let the (uncompressed) original through and leave type/size
    // validation to the caller.
    return file;
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) return file;

  const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}
