// Browser-side image preparation: checks a chosen file and re-encodes it as a
// downscaled JPEG, so uploads stay small and EXIF metadata (including GPS) is
// dropped before anything leaves the device.

export const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

export type PreparedImage = {
  dataUrl: string;
  /** Base64 payload without the data: prefix. */
  base64: string;
  bytes: number;
  width: number;
  height: number;
};

export class ImageProblem extends Error {
  constructor(
    public code: "not-image" | "too-large" | "unreadable",
    message: string,
  ) {
    super(message);
  }
}

export function checkImageFile(file: File): void {
  if (file.type && !file.type.startsWith("image/")) {
    throw new ImageProblem("not-image", "That file isn't an image. Choose a JPEG, PNG, WebP or HEIC photo.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new ImageProblem("too-large", "That photo is larger than 15 MB. Choose a smaller one.");
  }
}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // Fall through to <img>, which some browsers decode more broadly.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    throw new ImageProblem("unreadable", "This browser couldn't open that photo. Try a JPEG or PNG.");
  }
}

/**
 * Downscales to `maxEdge` and encodes as JPEG, lowering quality until the
 * result fits `maxBytes`.
 */
export async function prepareImage(file: File, maxEdge: number, maxBytes: number): Promise<PreparedImage> {
  checkImageFile(file);
  const decoded = await decode(file);
  try {
    const scale = Math.min(1, maxEdge / Math.max(decoded.width, decoded.height));
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new ImageProblem("unreadable", "This browser couldn't process that photo.");
    context.drawImage(decoded.source, 0, 0, width, height);

    for (const quality of [0.85, 0.75, 0.65, 0.55, 0.45]) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
      const bytes = Math.floor((base64.length * 3) / 4);
      if (bytes <= maxBytes) return { dataUrl, base64, bytes, width, height };
    }
    throw new ImageProblem("too-large", "That photo is too detailed to send. Try a different one.");
  } finally {
    decoded.close();
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
