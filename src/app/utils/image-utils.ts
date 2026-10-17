/**
 * Utility functions for robust cross-browser image handling and client-side compression.
 * Solves iPhone (HEIC/HEIF), high-resolution phone camera photos (8MB-20MB),
 * and missing MIME type issues on mobile web browsers.
 */

/**
 * Checks if a file is an acceptable image or PDF, evaluating both MIME type and file extension.
 * Handles cases where mobile browsers (especially Safari/iOS WebViews) set file.type to empty string.
 */
export function isValidImageFile(file: File): boolean {
  if (!file) return false;

  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif', '.bmp', '.pdf'];
  const fileName = (file.name || '').toLowerCase();
  const hasValidExt = validExtensions.some(ext => fileName.endsWith(ext));

  if (hasValidExt) return true;

  const mimeType = (file.type || '').toLowerCase();
  if (mimeType.startsWith('image/') || mimeType === 'application/pdf') return true;

  return false;
}

/**
 * Compresses an image file on the client side using HTMLCanvasElement.
 * Resizes images exceeding maxDim (default 1920px) and converts to standardized image/jpeg.
 * Reduces 15MB phone photos to ~150-300KB instantly.
 * Falls back gracefully to original file if non-image, PDF, or if canvas rendering fails.
 */
export async function compressAndNormalizeImage(
  file: File,
  maxDim: number = 1920,
  quality: number = 0.82
): Promise<File> {
  // If file is PDF or missing, return as-is
  if (!file || file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    return file;
  }

  // Check if browser supports Image / HTMLCanvasElement
  if (typeof window === 'undefined' || !window.FileReader || !window.HTMLCanvasElement) {
    return file;
  }

  try {
    const dataUrl = await readFileAsDataURL(file);
    const img = await loadImage(dataUrl);

    // Calculate target dimensions
    let { width, height } = img;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    // Fill white background (handles transparent PNGs converting to JPEG gracefully)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    ctx.drawImage(img, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    if (!blob) return file;

    // Construct a sanitized new file name ending in .jpg
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || 'receipt';
    const newFileName = `${baseName}_compressed.jpg`;

    return new File([blob], newFileName, {
      type: 'image/jpeg',
      lastModified: Date.now()
    });
  } catch (err) {
    console.warn('⚠️ Image compression skipped/failed, using original file:', err);
    return file;
  }
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (canvas.toBlob) {
      canvas.toBlob((blob) => resolve(blob), mimeType, quality);
    } else {
      // Fallback for very old browsers
      try {
        const dataUri = canvas.toDataURL(mimeType, quality);
        const byteString = atob(dataUri.split(',')[1]);
        const ia = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        resolve(new Blob([ia], { type: mimeType }));
      } catch (e) {
        resolve(null);
      }
    }
  });
}

/**
 * Transforms Cloudinary URLs to modern formats (WebP/AVIF) and reduces resolution dynamically.
 * Example: https://res.cloudinary.com/demo/image/upload/v1234/sample.jpg
 *       -> https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_400,c_limit/v1234/sample.jpg
 */
export function optimizeCloudinaryUrl(url: string, width: number = 400, height?: number): string {
  if (!url || typeof url !== 'string') return url || '';
  if (!url.includes('cloudinary.com') || !url.includes('/image/upload/')) return url;
  
  if (url.includes('/image/upload/f_auto') || url.includes('/image/upload/w_') || url.includes('/image/upload/q_auto')) {
    return url;
  }
  
  const transform = height 
    ? `f_auto,q_auto,w_${width},h_${height},c_limit` 
    : `f_auto,q_auto,w_${width},c_limit`;
    
  return url.replace('/image/upload/', `/image/upload/${transform}/`);
}
