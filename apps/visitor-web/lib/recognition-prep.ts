// Photo preparation and result caching for monument recognition.
// COPIED from apk/ui/app/recognition/page.tsx (preprocessImage, hashFile and
// the 0.65 confidence threshold); the original is not modified. Changes: the
// canvas pipeline is unchanged apart from decoding through createImageBitmap
// first (respects EXIF orientation), and the cache uses sessionStorage with a
// 1-day expiry instead of the app's localStorage cache helper.

export const CONFIDENCE_THRESHOLD = 0.65;

/** SHA-256 of the file (first 32 hex chars), or a weaker fallback outside secure contexts. */
export async function hashFile(file: File): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
      return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
    } catch {
      // Fall back below.
    }
  }
  return `fallback_${file.name.replace(/[^a-zA-Z0-9]/g, "")}_${file.size}_${file.lastModified}`;
}

async function loadImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // Fall through to <img>.
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  try {
    img.src = url;
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    throw new Error("Invalid image format");
  }
  return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
}

/**
 * The app's recognition preprocessing: scale to 640px wide, gently normalise
 * contrast, apply a light sharpening kernel, encode JPEG at quality 0.6.
 * Returns base64 without the data: prefix.
 */
export async function preprocessForRecognition(file: File): Promise<string> {
  const image = await loadImage(file);
  try {
    const canvas = document.createElement("canvas");
    const maxW = 640;
    const scale = Math.min(1, maxW / image.width);
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(image.source, 0, 0, canvas.width, canvas.height);

    // Normalise contrast/lighting for monument textures.
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const enhanced = Math.min(255, Math.max(0, (avg - 120) * 1.12 + 120));
      data[i] = Math.min(255, data[i] * 0.82 + enhanced * 0.18);
      data[i + 1] = Math.min(255, data[i + 1] * 0.82 + enhanced * 0.18);
      data[i + 2] = Math.min(255, data[i + 2] * 0.82 + enhanced * 0.18);
    }

    // Lightweight edge emphasis to improve structure detection.
    const copy = new Uint8ClampedArray(data);
    const width = canvas.width;
    const height = canvas.height;
    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          let k = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) sum += copy[((y + ky) * width + (x + kx)) * 4 + c] * kernel[k++];
          }
          data[(y * width + x) * 4 + c] = Math.max(0, Math.min(255, sum));
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
  } finally {
    image.close();
  }
}

const CACHE_PREFIX = "sanskriti-recognition:";
const CACHE_MS = 24 * 60 * 60 * 1000;

export function readCachedResult<T>(hash: string): T | null {
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + hash);
    if (!raw) return null;
    const { at, value } = JSON.parse(raw) as { at: number; value: T };
    return Date.now() - at < CACHE_MS ? value : null;
  } catch {
    return null;
  }
}

export function writeCachedResult(hash: string, value: unknown): void {
  try {
    sessionStorage.setItem(CACHE_PREFIX + hash, JSON.stringify({ at: Date.now(), value }));
  } catch {
    // Cache is optional.
  }
}
