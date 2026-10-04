import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config.ts';

export const MAX_PDF_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface UploadProgressCallback {
  (progressPercent: number): void;
}

/**
 * Converts a File object to base64 data string (fallback storage)
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
 * Uploads a PDF resource file.
 * Tries Firebase Storage first; falls back to embedded data URL if storage bucket is not configured.
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
          // Log storage failure and reject to trigger fallback
          console.warn('Firebase Storage upload failed, attempting fallback:', error);
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
    // Graceful fallback: convert to base64 Data URL so the MVP works even without Blaze billing
    if (onProgress) onProgress(50);
    const dataUrl = await fileToBase64(file);
    if (onProgress) onProgress(100);
    return dataUrl;
  }
}

/**
 * Uploads an optional cover image or avatar.
 */
export async function uploadImageFile(
  folder: 'covers' | 'avatars',
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

  try {
    const storagePath = `${folder}/${creatorId}/${id}/${file.name}`;
    const storageRef = ref(storage, storagePath);
    await uploadBytesResumable(storageRef, file, { contentType: file.type });
    return await getDownloadURL(storageRef);
  } catch {
    return await fileToBase64(file);
  }
}
