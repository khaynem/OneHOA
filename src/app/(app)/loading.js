import Image from 'next/image'
import styles from './loading.module.css'

export default function AppLoading() {
  return (
    <div className={styles.loadingOverlay}>
      {/* Decorative background */}
      <div className={styles.bgGrid} aria-hidden="true" />
      <div className={styles.bgBlob1} aria-hidden="true" />
      <div className={styles.bgBlob2} aria-hidden="true" />
      <div className={styles.bgSquare} aria-hidden="true" />
      <div className={styles.bgSquare2} aria-hidden="true" />

      {/* Center content */}
      <div className={styles.loadingContent}>
        <div className={styles.logoContainer}>
          <div className={styles.pulseRing} aria-hidden="true" />
          <div className={styles.pulseRing2} aria-hidden="true" />
          <Image
            src="/images/HOA_Logo.png"
            alt="OneHOA Logo"
            width={72}
            height={72}
            className={styles.logoImage}
            priority
          />
        </div>

        <span className={styles.brandName}>OneHOA</span>
        <span className={styles.loadingText}>Preparing your dashboard…</span>

        <div className={styles.progressTrack}>
          <div className={styles.progressBar} />
        </div>

        {/* Subtle skeleton hint */}
        <div className={styles.skeletonPreview} aria-hidden="true">
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      </div>
    </div>
  )
}
