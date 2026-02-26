/**
 * Profile Editor – lightweight face-centre detection.
 *
 * Uses a two-pass approach:
 *  1. Try the browser-native `FaceDetector` API (Chromium).
 *  2. Fall back to a skin-tone heuristic that finds the centroid
 *     of skin-coloured pixels, then returns normalised crop coordinates
 *     centred on that region.
 *
 * The returned crop rect is normalised 0–1 relative to the source image
 * and always fits within the image bounds.
 */

export interface CropRect {
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
}

/**
 * Detect the most prominent face in an image and return a crop rect
 * centred on it.  `aspectRatio = layer.width / layer.height` controls
 * the shape of the resulting crop window.
 */
export async function detectFaceAndCrop(
  img: HTMLImageElement,
  aspectRatio: number = 1,
): Promise<CropRect> {
  // 1. Try native FaceDetector (Chrome/Edge)
  const native = await tryNativeFaceDetector(img);
  if (native) return buildCropFromPoint(native.cx, native.cy, img, aspectRatio);

  // 2. Fall back to skin-tone heuristic
  const heuristic = skinToneCentroid(img);
  if (heuristic) return buildCropFromPoint(heuristic.cx, heuristic.cy, img, aspectRatio);

  // 3. Absolute fallback – centre crop
  return buildCropFromPoint(0.5, 0.5, img, aspectRatio);
}

// ─── Native FaceDetector ─────────────────────────────────
interface NativeResult {
  cx: number; // normalised 0–1
  cy: number;
}

async function tryNativeFaceDetector(
  img: HTMLImageElement,
): Promise<NativeResult | null> {
  try {
    // @ts-expect-error – FaceDetector is not in all TS libs
    if (typeof globalThis.FaceDetector === 'undefined') return null;

    // @ts-expect-error
    const detector = new globalThis.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
    const faces = await detector.detect(img);
    if (!faces.length) return null;

    const box = faces[0].boundingBox;
    return {
      cx: (box.x + box.width / 2) / img.naturalWidth,
      cy: (box.y + box.height / 2) / img.naturalHeight,
    };
  } catch {
    return null;
  }
}

// ─── Skin-Tone Heuristic ─────────────────────────────────
function skinToneCentroid(
  img: HTMLImageElement,
): NativeResult | null {
  // Down-sample to max 200px on the longest side for speed
  const MAX = 200;
  const scale = Math.min(MAX / img.naturalWidth, MAX / img.naturalHeight, 1);
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);

  const offscreen = document.createElement('canvas');
  offscreen.width = w;
  offscreen.height = h;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (isSkinTone(r, g, b)) {
        // Weight upper half slightly more (heads are at top)
        const weight = y < h * 0.5 ? 1.3 : 1;
        sumX += x * weight;
        sumY += y * weight;
        count += weight;
      }
    }
  }

  if (count < (w * h) * 0.01) return null; // less than 1% skin → unreliable

  return {
    cx: sumX / count / w,
    cy: sumY / count / h,
  };
}

/**
 * Simple skin-tone check in RGB space.
 * Based on well-known thresholds from computer-vision literature.
 */
function isSkinTone(r: number, g: number, b: number): boolean {
  // Rule-based skin classifier (Peer et al., 2003 + relaxed bounds)
  return (
    r > 60 &&
    g > 40 &&
    b > 20 &&
    r > g &&
    r > b &&
    Math.abs(r - g) > 15 &&
    r - b > 15 &&
    r < 250 &&
    g < 230 &&
    b < 210
  );
}

// ─── Build a crop rect centred on a point ────────────────
function buildCropFromPoint(
  cx: number,
  cy: number,
  img: HTMLImageElement,
  aspectRatio: number,
): CropRect {
  // We want to crop ~60% of the image, centred on the face
  const cropScale = 0.6;
  let cropW: number;
  let cropH: number;

  if (aspectRatio >= 1) {
    cropW = cropScale;
    cropH = cropScale / aspectRatio;
  } else {
    cropH = cropScale;
    cropW = cropScale * aspectRatio;
  }

  // Clamp so crop doesn't exceed image bounds
  cropW = Math.min(cropW, 1);
  cropH = Math.min(cropH, 1);

  let cropX = cx - cropW / 2;
  let cropY = cy - cropH / 2;

  // Clamp edges
  if (cropX < 0) cropX = 0;
  if (cropY < 0) cropY = 0;
  if (cropX + cropW > 1) cropX = 1 - cropW;
  if (cropY + cropH > 1) cropY = 1 - cropH;

  return {
    cropX: Math.max(0, cropX),
    cropY: Math.max(0, cropY),
    cropW,
    cropH,
  };
}
