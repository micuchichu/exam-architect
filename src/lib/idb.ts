const DB_NAME = 'exam-generator-db';
const DB_VERSION = 1;
const IMAGES_STORE = 'question-images';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IMAGES_STORE)) {
        db.createObjectStore(IMAGES_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveImage(id: string, dataUrl: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGES_STORE, 'readwrite');
    tx.objectStore(IMAGES_STORE).put(dataUrl, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getImage(id: string): Promise<string | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGES_STORE, 'readonly');
    const req = tx.objectStore(IMAGES_STORE).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteImage(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGES_STORE, 'readwrite');
    tx.objectStore(IMAGES_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getImages(ids: string[]): Promise<Map<string, string>> {
  const db = await openDB();
  const map = new Map<string, string>();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IMAGES_STORE, 'readonly');
    const store = tx.objectStore(IMAGES_STORE);
    let remaining = ids.length;
    if (remaining === 0) return resolve(map);
    for (const id of ids) {
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) map.set(id, req.result);
        if (--remaining === 0) resolve(map);
      };
      req.onerror = () => reject(req.error);
    }
  });
}
