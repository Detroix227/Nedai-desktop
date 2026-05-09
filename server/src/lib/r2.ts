import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/utils/env";

let r2Client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (r2Client) return r2Client;

  if (!env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_ACCOUNT_ID) {
    throw new Error("Cloudflare R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY.");
  }

  r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  return r2Client;
}

/** Returns a presigned PUT URL valid for 15 minutes. */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
): Promise<string> {
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn: 900 }); // 15 minutes
}

/** Builds the public URL for a stored file key. */
export function getR2PublicUrl(key: string): string {
  const base = env.R2_PUBLIC_URL!.replace(/\/$/, "");
  return `${base}/${key}`;
}

/** Extracts the object key from a public R2 URL, or null if not an R2 URL. */
export function getR2KeyFromUrl(url: string): string | null {
  try {
    const base = env.R2_PUBLIC_URL?.replace(/\/$/, "");
    if (!base) return null;
    if (url.startsWith(base + "/")) {
      return url.slice(base.length + 1);
    }
    return null;
  } catch {
    return null;
  }
}

/** Deletes a file from R2 by its object key. Swallows errors so deletes never block. */
export async function deleteR2File(key: string | null | undefined): Promise<void> {
  if (!key) return;

  try {
    const client = getR2Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: env.R2_BUCKET_NAME!,
        Key: key,
      }),
    );
  } catch (error) {
    console.error("[r2] failed to delete file", { key, error });
  }
}

/** Deletes a file from R2 by its public URL. */
export async function deleteR2FileByUrl(url: string): Promise<void> {
  const key = getR2KeyFromUrl(url);
  await deleteR2File(key);
}
