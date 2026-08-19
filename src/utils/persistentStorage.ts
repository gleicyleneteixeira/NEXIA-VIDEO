/**
 * StorageDB — armazenamento chave->valor persistente via IndexedDB.
 *
 * Diferente do localStorage, o IndexedDB suporta Blobs/File nativos (structured
 * clone), então é possível gravar os binários dos vídeos gerados sem depender de
 * URLs de blob efêmeras. API espelhada ao spec: getItem / setItem / removeItem.
 */

const DB_NAME = "ContentHubKV";
const DB_VERSION = 1;
const STORE_NAME = "kv";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB indisponivel no contexto atual."));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
  });
  return dbPromise;
}

function tx(mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return openDB().then((db) => db.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
}

export const StorageDB = {
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const store = await tx("readonly");
      return await new Promise<T | null>((resolve, reject) => {
        const req = store.get(key);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const record = req.result as { key: string; value: T } | undefined;
          resolve(record ? record.value : null);
        };
      });
    } catch (err) {
      console.warn(`[StorageDB] Falha ao ler "${key}":`, err);
      return null;
    }
  },

  async setItem<T>(key: string, value: T): Promise<void> {
    const store = await tx("readwrite");
    await new Promise<void>((resolve, reject) => {
      const req = store.put({ key, value });
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  },

  async removeItem(key: string): Promise<void> {
    try {
      const store = await tx("readwrite");
      await new Promise<void>((resolve, reject) => {
        const req = store.delete(key);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve();
      });
    } catch (err) {
      console.warn(`[StorageDB] Falha ao remover "${key}":`, err);
    }
  },

  async keys(): Promise<string[]> {
    try {
      const store = await tx("readonly");
      return await new Promise<string[]>((resolve, reject) => {
        const req = store.getAllKeys();
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve((req.result as IDBValidKey[]).map(String));
      });
    } catch {
      return [];
    }
  },
};