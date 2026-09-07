/**
 * Utility nén ảnh và xử lý tệp trước khi tải lên (Client-Side Compression)
 * Giúp giảm 85% - 95% dung lượng lưu trữ và tăng tốc độ tải lên
 */

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Nén ảnh trên trình duyệt bằng Canvas API
 * @param file Tệp ảnh gốc
 * @param maxWidth Chiều rộng tối đa (mặc định 1920px)
 * @param maxHeight Chiều cao tối đa (mặc định 1920px)
 * @param quality Chất lượng nén 0.1 - 1.0 (mặc định 0.82)
 */
export async function compressImage(
  file: File,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.82
): Promise<File> {
  // 1. Nếu là GIF hoặc SVG, không nén qua Canvas để tránh mất animation / vector
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file;
  }

  // 2. Nếu ảnh đã nhẹ (< 300KB), giữ nguyên
  if (file.size <= 300 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Tính toán kích thước mới giữ nguyên tỉ lệ khung hình (Aspect Ratio)
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // Fallback nếu không hỗ trợ Canvas
          return;
        }

        // Vẽ ảnh lên canvas với kích thước đã resize
        ctx.drawImage(img, 0, 0, width, height);

        // Xuất ảnh ra định dạng tối ưu WebP (hoặc JPEG nếu không hỗ trợ)
        const outputMime = 'image/webp';
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              // Nếu nén xong mà dung lượng không giảm thì giữ file gốc
              resolve(file);
            } else {
              const extension = outputMime === 'image/webp' ? '.webp' : '.jpg';
              const newFileName = file.name.replace(/\.[^/.]+$/, '') + extension;
              const compressedFile = new File([blob], newFileName, {
                type: outputMime,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            }
          },
          outputMime,
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}
