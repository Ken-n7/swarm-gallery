export interface BlurRegion {
  x: number;
  y: number;
  size: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load image for face blur'));
    image.src = src;
  });
}

export async function applyBlurRegionsToFile(
  file: File,
  regions: BlurRegion[],
): Promise<File> {
  if (!regions.length) return file;

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not prepare image editor');

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const region of regions) {
      const radius = Math.max(12, region.size * Math.min(canvas.width, canvas.height) * 0.5);
      const centerX = region.x * canvas.width;
      const centerY = region.y * canvas.height;
      const blurPx = Math.max(12, Math.round(radius * 0.65));

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.filter = `blur(${blurPx}px)`;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      ctx.filter = 'none';
    }

    const outputType = file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg';
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) resolve(value);
        else reject(new Error('Could not export blurred image'));
      }, outputType, outputType === 'image/png' ? undefined : 0.92);
    });

    return new File([blob], file.name, {
      type: blob.type || outputType,
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
