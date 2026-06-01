"use client";

/**
 * Re-encode an avatar image client-side BEFORE upload. Re-drawing through a
 * canvas drops all EXIF metadata (including GPS) and resizes down, so we never
 * ship original-resolution or location-bearing images to Storage.
 */
export async function processAvatar(
  file: File,
  maxSize = 512,
): Promise<{ body: ArrayBuffer; contentType: "image/jpeg" }> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser can't process images.");
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Couldn't process that image."))),
        "image/jpeg",
        0.85,
      ),
    );
    return { body: await blob.arrayBuffer(), contentType: "image/jpeg" };
  } finally {
    bitmap.close();
  }
}
