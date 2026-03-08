export interface CropResult {
  dataUrl: string;
  originalWidth: number;
  croppedWidth: number;
  croppedHeight: number;
  avgRunLength: number; // average horizontal black pixel run length (text size indicator)
}

/**
 * Crops an image to the bounding box of dark pixels (text).
 * Returns the cropped image plus original width for uniform scaling.
 */
export function cropImageToContent(dataUrl: string, threshold = 180, padding = 10): Promise<CropResult> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const { data, width, height } = imageData;

      let minY = height, maxY = 0, minX = width, maxX = 0;
      let totalRunLength = 0;
      let runCount = 0;

      for (let y = 0; y < height; y++) {
        let inRun = false;
        let currentRun = 0;
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const isDark = r < threshold && g < threshold && b < threshold;
          if (isDark) {
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (!inRun) { inRun = true; currentRun = 0; }
            currentRun++;
          } else {
            if (inRun) {
              totalRunLength += currentRun;
              runCount++;
              inRun = false;
            }
          }
        }
        if (inRun) { totalRunLength += currentRun; runCount++; }
      }

      const avgRunLength = runCount > 0 ? totalRunLength / runCount : 0;

      // No dark pixels found — return original
      if (minY >= maxY || minX >= maxX) {
        resolve({ dataUrl, originalWidth: img.width, croppedWidth: img.width, croppedHeight: img.height, avgRunLength });
        return;
      }

      minX = Math.max(0, minX - padding);
      minY = Math.max(0, minY - padding);
      maxX = Math.min(width - 1, maxX + padding);
      maxY = Math.min(height - 1, maxY + padding);

      const cropW = maxX - minX + 1;
      const cropH = maxY - minY + 1;

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropW;
      cropCanvas.height = cropH;
      const cropCtx = cropCanvas.getContext('2d')!;
      cropCtx.fillStyle = '#ffffff';
      cropCtx.fillRect(0, 0, cropW, cropH);
      cropCtx.drawImage(img, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

      resolve({
        dataUrl: cropCanvas.toDataURL('image/png'),
        originalWidth: img.width,
        croppedWidth: cropW,
        croppedHeight: cropH,
        avgRunLength,
      });
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}
