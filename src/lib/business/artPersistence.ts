/**
 * Persistência das artes geradas (dataURL PNG) no IndexedDB.
 * As artes 1080×1080 são pesadas demais para o localStorage; guardamos aqui
 * indexadas por `profileId:postId` e recuperamos ao reabrir o estúdio.
 */

const DB_NAME = "nexia-studio-arts";
const STORE = "arts";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const store = t.objectStore(STORE);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      })
  );
}

export async function persistArt(key: string, dataUrl: string): Promise<void> {
  try {
    await tx("readwrite", (store) => store.put({ key, dataUrl, savedAt: Date.now() }));
  } catch (e) {
    console.error("persistArt failed", e);
  }
}

export async function getArt(key: string): Promise<string | null> {
  try {
    const row = await tx<{ dataUrl?: string } | undefined>("readonly", (store) => store.get(key));
    return row?.dataUrl ?? null;
  } catch (e) {
    console.error("getArt failed", e);
    return null;
  }
}

export async function deleteArt(key: string): Promise<void> {
  try {
    await tx("readwrite", (store) => store.delete(key));
  } catch (e) {
    console.error("deleteArt failed", e);
  }
}

export async function getAllArtsForProfile(profileId: string): Promise<Record<string, string>> {
  try {
    const all = await tx<{ key: string; dataUrl: string }[]>("readonly", (store) => store.getAll());
    const prefix = `${profileId}:`;
    const result: Record<string, string> = {};
    for (const row of all) {
      if (row.key.startsWith(prefix)) {
        result[row.key.slice(prefix.length)] = row.dataUrl;
      }
    }
    return result;
  } catch (e) {
    console.error("getAllArtsForProfile failed", e);
    return {};
  }
}

export async function clearArtsForProfile(profileId: string): Promise<void> {
  try {
    const all = await tx<{ key: string }[]>("readwrite", (store) => store.getAll());
    const prefix = `${profileId}:`;
    const t = (await openDB()).transaction(STORE, "readwrite");
    const store = t.objectStore(STORE);
    for (const row of all) {
      if (row.key.startsWith(prefix)) {
        store.delete(row.key);
      }
    }
    await new Promise<void>((resolve, reject) => {
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
  } catch (e) {
    console.error("clearArtsForProfile failed", e);
  }
}
