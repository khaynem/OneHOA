"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HiOutlineSignalSlash, HiOutlineArrowPath, HiCheck } from "react-icons/hi2";
import { offlineQueue } from "@/lib/offlineQueue";
import styles from "./offline-indicator.module.css";

const SYNC_COMPLETE_DURATION = 3000;

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncComplete, setSyncComplete] = useState(false);

  const syncCompleteTimerRef = useRef(null);
  const mountedRef = useRef(true);
  const initialSyncDoneRef = useRef(false);

  const refreshQueueCount = useCallback(async () => {
    const count = await offlineQueue.getCount();
    if (mountedRef.current) {
      setQueueCount(count);
    }
  }, []);

  const triggerSync = useCallback(async (showBanner) => {
    if (showBanner) {
      setIsSyncing(true);
      setSyncComplete(false);

      if (syncCompleteTimerRef.current) {
        clearTimeout(syncCompleteTimerRef.current);
      }
    }

    await offlineQueue.processQueue();

    if (mountedRef.current) {
      if (showBanner) {
        setIsSyncing(false);
        await refreshQueueCount();

        if (mountedRef.current && navigator.onLine) {
          setSyncComplete(true);
          syncCompleteTimerRef.current = setTimeout(() => {
            if (mountedRef.current) {
              setSyncComplete(false);
            }
          }, SYNC_COMPLETE_DURATION);
        }
      } else {
        // Silent sync - just refresh count
        await refreshQueueCount();
      }
    }
  }, [refreshQueueCount]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    mountedRef.current = true;

    // Set initial states
    setIsOnline(navigator.onLine);

    // Silently sync any pending items on page load without showing banner
    refreshQueueCount().then(() => {
      if (navigator.onLine && !initialSyncDoneRef.current) {
        initialSyncDoneRef.current = true;
        offlineQueue.processQueue().then(() => {
          if (mountedRef.current) {
            refreshQueueCount();
          }
        });
      }
    });

    const handleOnline = () => {
      if (mountedRef.current) {
        setIsOnline(true);
        // Auto-sync with banner when coming back online
        // triggerSync handles refreshing the queue count after processing
        triggerSync(true);
      }
    };

    const handleOffline = () => {
      if (mountedRef.current) {
        setIsOnline(false);
        setSyncComplete(false);
        setIsSyncing(false);
        refreshQueueCount();
      }
    };

    const handleQueueChange = () => {
      refreshQueueCount();
      if (mountedRef.current) {
        setIsSyncing(offlineQueue.processing);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("offline-queue-changed", handleQueueChange);

    return () => {
      mountedRef.current = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("offline-queue-changed", handleQueueChange);
      if (syncCompleteTimerRef.current) {
        clearTimeout(syncCompleteTimerRef.current);
      }
    };
  }, [refreshQueueCount, triggerSync]);

  // Determine banner state
  const isOffline = !isOnline;
  const showBanner = isOffline || isSyncing || syncComplete;

  if (!showBanner) {
    return null;
  }

  // Build banner content based on state
  let statusIcon = null;
  let messageText = "";
  let controls = null;
  let bannerClass = styles.online;

  if (isOffline) {
    // State: Offline
    statusIcon = <HiOutlineSignalSlash className={styles.statusIcon} />;
    messageText = "You are offline. Changes will be saved locally and synced when you reconnect.";
    bannerClass = styles.offline;

    if (queueCount > 0) {
      controls = (
        <span className={styles.badge}>
          {queueCount} pending sync{queueCount > 1 ? "s" : ""}
        </span>
      );
    }

  } else if (isSyncing) {
    // State: Syncing in progress
    statusIcon = <HiOutlineArrowPath className={`${styles.statusIcon} ${styles.spinning}`} />;
    messageText = `Syncing ${queueCount} pending change${queueCount > 1 ? "s" : ""}...`;

  } else if (syncComplete) {
    // State: Sync just completed
    statusIcon = <HiCheck className={styles.statusIcon} />;
    messageText = "Sync Complete! All changes have been saved.";
  }

  return (
    <div className={`${styles.banner} ${bannerClass}`}>
      <div className={styles.container}>
        <div className={styles.messageGroup}>
          {statusIcon}
          <span className={styles.messageText}>{messageText}</span>
        </div>
        {controls && (
          <div className={styles.controlsGroup}>
            {controls}
          </div>
        )}
      </div>
    </div>
  );
}
