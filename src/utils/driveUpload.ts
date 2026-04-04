/**
 * Upload vers une URL signée Supabase Storage avec suivi de progression (XHR).
 * Reproduit le corps FormData utilisé par @supabase/storage-js (uploadToSignedUrl).
 */
export function uploadFileToSignedUrl(
  signedUrl: string,
  file: File,
  onProgress: (percent: number) => void,
  cacheControl = "3600"
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("cacheControl", cacheControl);
    formData.append("", file, file.name);

    xhr.open("PUT", signedUrl);
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) {
        onProgress(Math.min(100, Math.round((evt.loaded / evt.total) * 100)));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(xhr.responseText || `Upload HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Erreur réseau pendant l’upload"));
    xhr.send(formData);
  });
}
