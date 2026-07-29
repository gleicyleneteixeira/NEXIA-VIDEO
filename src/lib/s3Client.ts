import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT!,
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
});

const BUCKET = process.env.S3_BUCKET_NAME!;

export function getS3PublicUrl(key: string): string {
  return `${process.env.S3_ENDPOINT}/${BUCKET}/${key}`;
}

/**
 * Upload genérico para S3/MinIO
 */
export async function uploadToS3(
  key: string,
  body: Buffer | Blob | ArrayBuffer | Uint8Array,
  contentType: string = "video/mp4"
): Promise<string> {
  let data: Uint8Array;
  if (body instanceof Blob) {
    const buf = await body.arrayBuffer();
    data = new Uint8Array(buf);
  } else if (body instanceof ArrayBuffer) {
    data = new Uint8Array(body);
  } else {
    data = body;
  }

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: data,
      ContentType: contentType,
    })
  );

  return getS3PublicUrl(key);
}

/**
 * Upload de vídeo com path organizado por data
 */
export async function uploadVideo(
  file: File | Blob,
  filename: string,
  userId: string = "default",
  folder: string = "uploads"
): Promise<{ url: string; key: string }> {
  const now = new Date();
  const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}`;
  const key = `${folder}/${userId}/${datePath}/${filename}`;
  const buf = await file.arrayBuffer();
  const url = await uploadToS3(key, new Uint8Array(buf), "video/mp4");
  return { url, key };
}

/**
 * Deleta arquivo do S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}
