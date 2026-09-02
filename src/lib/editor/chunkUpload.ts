/**
 * Chunked upload for large video files (prevents 70% freeze)
 * Divide file into 5MB chunks and upload sequentially
 */

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

export async function uploadVideoChunked(
  file: File,
  mediaId: string,
  onProgress?: (pct: number) => void
): Promise<string | null> {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  let uploaded = 0;

  for (let i = 0; i < totalChunks; i++) {
    const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    const fd = new FormData();
    fd.append("file", chunk, file.name);
    fd.append("chunkIndex", String(i));
    fd.append("totalChunks", String(totalChunks));
    fd.append("mediaId", mediaId);

    const res = await fetch("/api/editor/upload-chunk", { method: "POST", body: fd });
    const data = await res.json();
    if (!data?.success) throw new Error(data?.error || "Chunk failed");

    uploaded++;
    if (onProgress) onProgress(Math.round((uploaded / totalChunks) * 100));
  }

  return `/api/editor/upload-commit?mediaId=${mediaId}`;
}
