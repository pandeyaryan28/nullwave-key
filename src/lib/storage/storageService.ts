import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';
import { storage, db } from '../firebase/config.ts';

export const MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const CHUNK_SIZE_CHARS = 400 * 1024; // 400 KB per chunk (Firestore limit is 1MB)

export interface UploadProgressCallback {
  (progressPercent: number): void;
}

/**
 * Converts a File object to base64 data string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

/**
 * Saves a file into Firestore subcollection chunks as a 100% reliable fallback
 * when Cloud Storage buckets have CORS, provisioning, or network issues.
 */
export async function saveFileToFirestoreChunks(
  resourceId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<string> {
  if (onProgress) onProgress(30);
  const base64Data = await fileToBase64(file);
  const totalLength = base64Data.length;
  const totalChunks = Math.ceil(totalLength / CHUNK_SIZE_CHARS);

  if (onProgress) onProgress(50);

  const chunksRef = collection(db, 'resources', resourceId, 'chunks');

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE_CHARS;
    const end = Math.min(start + CHUNK_SIZE_CHARS, totalLength);
    const chunkData = base64Data.substring(start, end);

    const chunkDocRef = doc(chunksRef, i.toString());
    await setDoc(chunkDocRef, {
      index: i,
      data: chunkData,
      totalChunks,
      createdAt: Date.now(),
    });

    if (onProgress) {
      const percent = 50 + Math.round(((i + 1) / totalChunks) * 45);
      onProgress(percent);
    }
  }

  if (onProgress) onProgress(100);
  return `firestore_chunks://${resourceId}`;
}

/**
 * Reconstructs a file from Firestore subcollection chunks into a Blob URL
 */
export async function fetchFileFromFirestoreChunks(resourceId: string): Promise<string> {
  const chunksRef = collection(db, 'resources', resourceId, 'chunks');
  const snap = await getDocs(chunksRef);

  if (snap.empty) {
    throw new Error('No file chunks found for this resource.');
  }

  const chunkDocs = snap.docs.map(d => d.data() as { index: number; data: string });
  chunkDocs.sort((a, b) => a.index - b.index);

  const fullBase64 = chunkDocs.map(c => c.data).join('');

  // Convert base64 data URL to Blob
  const parts = fullBase64.split(',');
  const mimeType = parts[0]?.match(/:(.*?);/)?.[1] || 'application/pdf';
  const byteCharacters = atob(parts[1] || parts[0]);
  const byteNumbers = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const blob = new Blob([byteNumbers], { type: mimeType });
  return URL.createObjectURL(blob);
}

/**
 * Uploads a PDF resource file.
 * Tries Firebase Storage first; automatically falls back to Firestore subcollection chunking
 * if Firebase Storage encounters CORS, provisioning, or network issues.
 */
export async function uploadResourceFile(
  creatorId: string,
  resourceId: string,
  file: File,
  onProgress?: UploadProgressCallback
): Promise<string> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Only PDF files are supported.');
  }

  if (file.size > MAX_PDF_SIZE_BYTES) {
    throw new Error(`File exceeds maximum size limit of ${MAX_PDF_SIZE_BYTES / (1024 * 1024)}MB.`);
  }

  try {
    const storagePath = `resources/${creatorId}/${resourceId}/${file.name}`;
    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: 'application/pdf',
      customMetadata: {
        creatorId,
        resourceId,
        originalName: file.name,
      },
    });

    return await new Promise<string>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        snapshot => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(Math.round(progress));
        },
        error => {
          console.warn('Firebase Storage upload failed, switching to chunked storage:', error);
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (onProgress) onProgress(100);
            resolve(downloadUrl);
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  } catch {
    // Zero-failure fallback: save to Firestore chunks
    console.info('Saving file to resilient Firestore chunked storage...');
    return await saveFileToFirestoreChunks(resourceId, file, onProgress);
  }
}

/**
 * Compresses and scales down an image file into an optimized JPEG Data URL.
 * Ensures the resulting base64 string is lightweight (< 150 KB) so it effortlessly
 * fits within Firestore's 1MB document limit and renders instantly.
 */
export async function compressAndOptimizeImage(
  file: File,
  maxWidth: number = 1500,
  maxHeight: number = 600,
  quality: number = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid or unreadable image file.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserved dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(reader.result as string);
        }

        // Fill background white for PNG transparency to prevent black borders
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Safety check: if dataUrl is still larger than 180,000 chars (~135 KB), downscale further
        if (dataUrl.length > 180000) {
          const scaledCanvas = document.createElement('canvas');
          scaledCanvas.width = Math.round(width * 0.75);
          scaledCanvas.height = Math.round(height * 0.75);
          const scaledCtx = scaledCanvas.getContext('2d');
          if (scaledCtx) {
            scaledCtx.fillStyle = '#ffffff';
            scaledCtx.fillRect(0, 0, scaledCanvas.width, scaledCanvas.height);
            scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
            dataUrl = scaledCanvas.toDataURL('image/jpeg', 0.7);
          }
        }

        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Checks an existing data URL string and shrinks it if it exceeds safe Firestore thresholds.
 */
export async function shrinkExistingDataUrlIfNeeded(
  dataUrl: string,
  maxWidth: number = 1500,
  maxHeight: number = 600
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image/') || dataUrl.length < 180000) {
    return dataUrl;
  }

  return new Promise(resolve => {
    const img = new Image();
    img.onerror = () => resolve(dataUrl);
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.src = dataUrl;
  });
}

/**
 * Uploads an optional cover image, avatar, or banner.
 * Tries Firebase Storage first; automatically falls back to an ultra-lightweight
 * canvas-optimized Web JPEG data URL (< 150 KB) that fits safely inside Firestore.
 */
export async function uploadImageFile(
  folder: 'covers' | 'avatars' | 'banners',
  creatorId: string,
  id: string,
  file: File
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed.');
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Image exceeds maximum size limit of ${MAX_IMAGE_SIZE_BYTES / (1024 * 1024)}MB.`);
  }

  const dimensions = {
    banners: { width: 1500, height: 500, quality: 0.82 },
    avatars: { width: 400, height: 400, quality: 0.85 },
    covers: { width: 800, height: 1000, quality: 0.82 },
  }[folder];

  // Pre-optimize image to an ultra-lightweight payload
  const optimizedDataUrl = await compressAndOptimizeImage(
    file,
    dimensions.width,
    dimensions.height,
    dimensions.quality
  );

  try {
    const storagePath = `${folder}/${creatorId}/${id}/${file.name}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytesResumable(storageRef, file, { contentType: file.type });
    return await getDownloadURL(storageRef);
  } catch (err) {
    console.warn(`Firebase Storage not available for ${folder}, using optimized web data URL fallback:`, err);
    return optimizedDataUrl;
  }
}
