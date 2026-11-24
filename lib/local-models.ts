const headerSize = 20;
export const maxModelBytes = 35 * 1024 * 1024;

export async function validateModel(file: File) {
  if (!file.name.toLowerCase().endsWith(".glb") || file.size < headerSize) {
    throw new Error("Choose a GLB model file.");
  }
  if (file.size > maxModelBytes) {
    throw new Error("Choose a GLB model under 35 MiB.");
  }

  const header = new DataView(await file.slice(0, headerSize).arrayBuffer());
  const jsonSize = header.getUint32(12, true);
  if (
    header.getUint32(0, true) !== 0x46546c67 ||
    header.getUint32(4, true) !== 2 ||
    header.getUint32(8, true) !== file.size ||
    header.getUint32(16, true) !== 0x4e4f534a ||
    !jsonSize ||
    jsonSize > file.size - headerSize
  ) {
    throw new Error("This file is not a valid glTF 2.0 GLB.");
  }

  const document = JSON.parse(
    await file.slice(headerSize, headerSize + jsonSize).text(),
  ) as {
    buffers?: { uri?: string }[];
    images?: { uri?: string }[];
  };
  const usesExternalFiles = [
    ...(document.buffers ?? []),
    ...(document.images ?? []),
  ].some(({ uri }) => uri !== undefined && !uri.startsWith("data:"));
  if (usesExternalFiles) {
    throw new Error(
      "Choose a self-contained GLB with embedded textures and buffers.",
    );
  }
}

async function modelStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("genshin-character-models", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("models");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction("models", mode);
      const request = operation(transaction.objectStore("models"));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export function readModel(id: string): Promise<File | undefined> {
  return modelStore("readonly", (store) => store.get(id));
}

export function saveModel(id: string, file: File) {
  return modelStore("readwrite", (store) => store.put(file, id));
}

export function removeModel(id: string) {
  return modelStore("readwrite", (store) => store.delete(id));
}
