/**
 * IndexedDB Storage Utility
 * Persistência local de vídeos processados
 */

const DB_NAME = "ContentHubDB";
const DB_VERSION = 1;
const STORE_NAME = "videos";

interface StoredVideo {
  id: string;
  variationId: number;
  hookName: string;
  painName?: string;
  solutionName?: string;
  bodyName: string;
  ctaName: string;
  blob: Blob;
  duration: number;
  createdAt: Date;
}

/**
 * Abre/conecta ao IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("variationId", "variationId", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });
}

/**
 * Salva um vídeo no IndexedDB
 */
export async function saveVideoToDB(video: StoredVideo): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(video);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    tx.oncomplete = () => db.close();
  });
}

/**
 * Busca um vídeo no IndexedDB
 */
export async function getVideoFromDB(id: string): Promise<StoredVideo | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);

    tx.oncomplete = () => db.close();
  });
}

/**
 * Lista todos os vídeos salvos
 */
export async function listVideosFromDB(): Promise<StoredVideo[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);

    tx.oncomplete = () => db.close();
  });
}

/**
 * Remove um vídeo do IndexedDB
 */
export async function deleteVideoFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    tx.oncomplete = () => db.close();
  });
}

/**
 * Limpa todos os vídeos do IndexedDB
 */
export async function clearAllVideosFromDB(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);

    tx.oncomplete = () => db.close();
  });
}

/**
 * Converte Blob para ArrayBuffer para armazenamento
 */
export function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * Converte ArrayBuffer de volta para Blob
 */
export function arrayBufferToBlob(buffer: ArrayBuffer, type: string): Blob {
  return new Blob([buffer], { type });
}
