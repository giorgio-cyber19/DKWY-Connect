/**
 * Turns a picked photo into a small square JPEG (as a data URL) for use as a profile picture:
 * centre-cropped, scaled down, and compressed until it is comfortably small to store and send.
 */
export const MAX_PHOTO_INPUT_BYTES = 20 * 1024 * 1024;
/** The server accepts up to 60,000 characters; stay well under it. */
const TARGET_MAX_LENGTH = 45_000;

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    try {
      // "from-image" applies the photo's rotation (phones store portraits sideways).
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

export async function squareJpegDataUrl(file: File, size = 192): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("not_an_image");
  if (file.size > MAX_PHOTO_INPUT_BYTES) throw new Error("image_too_large");

  const image = await decode(file);
  try {
    if (!image.width || !image.height) throw new Error("not_an_image");
    const side = Math.min(image.width, image.height);
    const sx = (image.width - side) / 2;
    const sy = (image.height - side) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("not_an_image");
    ctx.fillStyle = "#ffffff"; // transparent PNGs get a white background instead of black
    ctx.fillRect(0, 0, size, size);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image.source, sx, sy, side, side, 0, 0, size, size);

    for (const quality of [0.85, 0.75, 0.62, 0.5]) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrl.length <= TARGET_MAX_LENGTH) return dataUrl;
    }
    return canvas.toDataURL("image/jpeg", 0.4);
  } finally {
    image.close();
  }
}
