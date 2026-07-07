"use client";

import { useEffect, useState } from "react";
import { HiOutlineCloud, HiOutlineSignalSlash, HiOutlineArrowPath } from "react-icons/hi2";
import { offlineQueue } from "@/lib/offlineQueue";
import styles from "./offline-indicator.module.css";

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Set initial states
    setIsOnline(navigator.onLine);
    offlineQueue.getCount().then(setQueueCount);

    const handleOnline = () => {
      setIsOnline(true);
      // Automatically trigger sync when coming back online
      offlineQueue.processQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleQueueChange = () => {
      offlineQueue.getCount().then(setQueueCount);
      setIsSyncing(offlineQueue.processing);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("offline-queue-changed", handleQueueChange);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("offline-queue-changed", handleQueueChange);
    };
  }, []);

  const handleSyncNow = async (e) => {
    e.preventDefault();
    if (isSyncing) return;
    setIsSyncing(true);
    await offlineQueue.processQueue();
    setIsSyncing(false);
  };

  // If online AND there are no pending syncs, hide the banner completely
  if (isOnline && queueCount === 0) {
    return null;
  }

  return (
    <div
      className={`${styles.banner} ${
        isOnline ? styles.online : styles.offline
      }`}
    >
      <div className={styles.container}>
        <div className={styles.messageGroup}>
          {isOnline ? (
            <HiOutlineCloud className={styles.statusIcon} />
          ) : (
            <HiOutlineSignalSlash className={styles.statusIcon} />
          )}
          <span className={styles.messageText}>
            {isOnline
              ? "Back online. Syncing pending offline changes..."
              : "You are offline. Changes will be saved locally and synced when you reconnect."}
          </span>
        </div>

        <div className={styles.controlsGroup}>
          {queueCount > 0 && (
            <span className={styles.badge}>
              {queueCount} pending sync{queueCount > 1 ? "s" : ""}
            </span>
          )}

          {isOnline && queueCount > 0 && (
            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className={`${styles.syncButton} ${isSyncing ? styles.syncing : ""}`}
              title="Sync changes now"
            >
              <HiOutlineArrowPath className={styles.buttonIcon} />
              <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
