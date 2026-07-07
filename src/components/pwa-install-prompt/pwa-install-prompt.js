"use client"
import { useEffect, useState } from 'react'
import { HiOutlineArrowDownTray, HiOutlineXMark, HiOutlineShare } from 'react-icons/hi2'
import styles from './pwa-install-prompt.module.css'

export default function PwaInstallPrompt() {
  const [installPromptEvent, setInstallPromptEvent] = useState(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isDismissed, setIsDismissed] = useState(true) // Start dismissed to avoid flashing, check localStorage on mount
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    const checkPwaStatus = () => {
      // 1. Detect if already running in standalone mode (installed app)
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator.standalone === true);

      if (isStandalone) {
        return; // Already installed, do not show any prompt
      }

      // 2. Check if user previously dismissed this prompt
      const dismissed = localStorage.getItem('pwa-prompt-dismissed') === 'true';
      setIsDismissed(dismissed);

      // 3. Detect iOS and Safari (since iOS Safari has no native 'beforeinstallprompt' event)
      const ua = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(ua);
      const isSafari = /safari/.test(ua) && !/crios/.test(ua) && !/fxios/.test(ua); // Exclude Chrome/Firefox on iOS

      if (isIosDevice && isSafari && !dismissed) {
        setIsIOS(true);
        setIsInstallable(true);
      }
    };

    setTimeout(checkPwaStatus, 0);

    // 4. Listen for Chrome/Android's native beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
      const dismissed = localStorage.getItem('pwa-prompt-dismissed') === 'true';
      if (!dismissed) {
        setIsInstallable(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!installPromptEvent) return;

    // Trigger Chrome's native pop-up installation dialog
    installPromptEvent.prompt();

    const { outcome } = await installPromptEvent.userChoice;
    console.log(`User installation choice outcome: ${outcome}`);

    if (outcome === 'accepted') {
      setIsInstallable(false);
    }

    setInstallPromptEvent(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa-prompt-dismissed', 'true');
    setIsDismissed(true);
  };

  if (isDismissed || !isInstallable) {
    return null;
  }

  return (
    <>
      <div className={styles.promptCard} role="alert" aria-live="polite">
        <button
          className={styles.closeBtn}
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
        >
          <HiOutlineXMark />
        </button>

        <div className={styles.content}>
          <div className={styles.iconCircle}>
            <HiOutlineArrowDownTray className={styles.trayIcon} />
          </div>
          <div className={styles.textColumn}>
            <h4 className={styles.title}>Install OneHOA</h4>
            <p className={styles.description}>
              Add OneHOA to your home screen for quick, offline-ready payment tracking and management.
            </p>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.dismissTextBtn} onClick={handleDismiss}>
            Maybe Later
          </button>
          <button className={styles.installBtn} onClick={handleInstallClick}>
            Install Now
          </button>
        </div>
      </div>

      {showIOSGuide && (
        <div className={styles.overlay} onClick={() => setShowIOSGuide(false)} role="dialog" aria-modal="true">
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalCloseBtn} onClick={() => setShowIOSGuide(false)} aria-label="Close">
              <HiOutlineXMark />
            </button>
            <h3 className={styles.modalTitle}>Install on your iPhone / iPad</h3>
            <p className={styles.modalText}>
              iOS requires manual PWA installation. Follow these 3 quick steps to save OneHOA to your home screen:
            </p>

            <ol className={styles.stepsList}>
              <li className={styles.stepItem}>
                Tap the **Share** button in Safari’s bottom toolbar.
                <div className={styles.shareIconWrap}>
                  <HiOutlineShare className={styles.shareIcon} /> <span className={styles.iconLabel}>(Box with Up Arrow)</span>
                </div>
              </li>
              <li className={styles.stepItem}>
                Scroll down the share sheet and tap **Add to Home Screen**.
              </li>
              <li className={styles.stepItem}>
                Tap **Add** in the upper-right corner of the screen.
              </li>
            </ol>

            <button className={styles.modalConfirmBtn} onClick={() => setShowIOSGuide(false)}>
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  )
}
