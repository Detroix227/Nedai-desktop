import { request } from "@/lib/http";

export type PresignResponse = {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
};

export type ConfirmResponse = {
  document: {
    id: string;
    title: string;
    status: string;
  };
};

/** Step 1 — Ask the server for a presigned R2 upload URL. */
export function presignUpload(
  token: string,
  opts: { fileName: string; mimeType: string; fileSize: number },
) {
  return request<{ uploadUrl: string; fileKey: string; publicUrl: string }>(
    "/documents/presign",
    {
      method: "POST",
      token,
      body: opts,
    },
  );
}

/** Step 2 — Upload the file directly to R2 using the presigned URL. */
export async function uploadToR2(
  presignedUrl: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presignedUrl, true);
    xhr.setRequestHeader("Content-Type", file.type);

    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`R2 upload failed with status ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("R2 upload network error"));
    xhr.send(file);
  });
}

/** Step 3 — Confirm the upload with the server to create the DB record. */
export function confirmUpload(
  token: string,
  opts: {
    title?: string;
    file: {
      name: string;
      size: number;
      type: string;
      key: string;
      publicUrl: string;
    };
  },
) {
  return request<{ document: { id: string; title: string; status: string } }>(
    "/documents/confirm",
    {
      method: "POST",
      token,
      body: opts,
    },
  );
}
