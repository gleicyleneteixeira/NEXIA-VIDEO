// IndexedDB persistence for imported media files.
// Blob URLs only live for the current page session, so on refresh the project
// items would lose their video/image/audio. We store the actual blobs here
// (keyed by a stable id) and re-create object URLs on load.

export interface StoredMedia {
  id: string;
  name: string;
  type: "video" | "audio" | "image";
  blob: Blob;
  importedAt: number;
}

const DB_NAME = "contenthub-media-db";
const STORE = "files";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<any> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

export async function persistMediaToIdb(media: StoredMedia): Promise<void> {
  try {
    await tx("readwrite", (store) => store.put(media));
  } catch (e) {
    console.error("persistMediaToIdb failed", e);
  }
}

export async function deleteMediaFromIdb(id: string): Promise<void> {
  try {
    await tx("readwrite", (store) => store.delete(id));
  } catch (e) {
    console.error("deleteMediaFromIdb failed", e);
  }
}

export async function getAllMediaFromIdb(): Promise<StoredMedia[]> {
  try {
    const all = await tx("readonly", (store) => store.getAll());
    return (all as StoredMedia[]) || [];
  } catch (e) {
    console.error("getAllMediaFromIdb failed", e);
    return [];
  }
}

// Store an arbitrary generated blob (recording, extracted audio) under a
// stable id so it survives a refresh. Returns the id for the TimelineItem.mediaId.
export function persistStandaloneMedia(file: Blob | File, type: StoredMedia["type"]): string {
  const id = crypto.randomUUID();
  const blob = file instanceof Blob ? file : new Blob([file]);
  persistMediaToIdb({
    id,
    name: (file as File).name || `media-${id.slice(0, 8)}`,
    type,
    blob,
    importedAt: Date.now(),
  });
  return id;
}
