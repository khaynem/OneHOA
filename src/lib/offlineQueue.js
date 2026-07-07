import { openDB } from "idb";
import { apiClient } from "./apiClient";
import { notify } from "./notify";

const DB_NAME = "onehoa-offline-queue";
const STORE_NAME = "mutations";
const DB_VERSION = 1;

let dbPromise = null;

function getDB() {
  if (typeof window === "undefined") return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

class OfflineQueue {
  constructor() {
    this.processing = false;
  }

  async enqueue(endpoint, method, payload, metadata = {}) {
    const db = await getDB();
    if (!db) return null;

    const item = {
      endpoint,
      method,
      payload,
      metadata: {
        type: metadata.type || "unknown",
        label: metadata.label || "Pending Action",
        createdAt: metadata.createdAt || Date.now(),
        retryCount: 0,
        maxRetries: metadata.maxRetries || 5,
        failed: false,
      },
    };

    const id = await db.add(STORE_NAME, item);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("offline-queue-changed"));
    }
    return id;
  }

  async dequeue(id) {
    const db = await getDB();
    if (!db) return;
    await db.delete(STORE_NAME, id);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("offline-queue-changed"));
    }
  }

  async getAll() {
    const db = await getDB();
    if (!db) return [];
    const items = await db.getAll(STORE_NAME);
    return items.sort((a, b) => a.id - b.id);
  }

  async getCount() {
    const db = await getDB();
    if (!db) return 0;
    const items = await db.getAll(STORE_NAME);
    return items.filter((item) => !item.metadata?.failed).length;
  }

  async getByType(type) {
    const items = await this.getAll();
    return items.filter((item) => item.metadata?.type === type);
  }

  async clearQueue() {
    const db = await getDB();
    if (!db) return;
    await db.clear(STORE_NAME);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("offline-queue-changed"));
    }
  }

  async processQueue() {
    if (typeof window === "undefined") return;
    if (this.processing) return;
    this.processing = true;

    try {
      const items = await this.getAll();
      const pendingItems = items.filter((item) => !item.metadata?.failed);

      if (pendingItems.length === 0) {
        return;
      }

      let succeededCount = 0;
      let hasNetworkInterruption = false;

      // Create a global notification toast for progress that we can update or dismiss
      let toastId = null;

      for (let i = 0; i < pendingItems.length; i++) {
        const item = pendingItems[i];
        
        // Show/Update status toast
        const msg = `Syncing ${i + 1} of ${pendingItems.length} items: "${item.metadata?.label || "Request"}"...`;
        if (toastId) {
          notify.loading(msg, { id: toastId });
        } else {
          toastId = notify.loading(msg);
        }

        try {
          await apiClient.request(item.endpoint, {
            method: item.method,
            body: item.payload,
            cache: false,
          });

          await this.dequeue(item.id);
          succeededCount++;
          
          notify.success({
            title: "Item Synced",
            description: `"${item.metadata?.label || "Action"}" synced successfully.`,
          });
        } catch (error) {
          // Determine if it is a connectivity/network error
          const isNetworkError =
            !error.status ||
            error.status === 0 ||
            error.message?.includes("Network Error") ||
            error.code === "ERR_NETWORK";

          if (isNetworkError) {
            hasNetworkInterruption = true;
            break;
          }

          // Logical failure (e.g. 400 Bad Request) - increment retry count
          item.metadata.retryCount = (item.metadata.retryCount || 0) + 1;
          if (item.metadata.retryCount >= (item.metadata.maxRetries || 5)) {
            item.metadata.failed = true;
            notify.error({
              title: "Sync Failed",
              description: `"${item.metadata?.label || "Action"}" failed permanently after ${item.metadata.maxRetries} retries.`,
            });
          }

          const db = await getDB();
          if (db) {
            await db.put(STORE_NAME, item);
            window.dispatchEvent(new CustomEvent("offline-queue-changed"));
          }
        }
      }

      if (toastId) {
        notify.dismiss(toastId);
      }

      if (hasNetworkInterruption) {
        notify.error({
          title: "Sync Interrupted",
          description: "Connection unreachable. Remaining items will sync when online.",
        });
      } else if (succeededCount > 0) {
        notify.success({
          title: "Sync Complete",
          description: "All offline changes have been synchronized successfully!",
        });
      }
    } catch (err) {
      console.error("Error processing offline queue:", err);
    } finally {
      this.processing = false;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("offline-queue-changed"));
      }
    }
  }
}

export const offlineQueue = new OfflineQueue();
