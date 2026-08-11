"use client"

import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { FiShield, FiFileText, FiX } from 'react-icons/fi'
import styles from './legal-modal.module.css'

/* ── Privacy Policy content ── */
function PrivacyContent() {
  return (
    <>
      <span className={styles.lastUpdated}>Last Updated: May 2026</span>

      <p className={styles.sectionTitle}>Data Collected</p>
      <ul className={styles.bulletList}>
        <li>Full name, email address, and phone number</li>
        <li>Residential address (Phase, Block, Lot)</li>
        <li>Employment status and job description</li>
        <li>Household member count</li>
        <li>Monthly dues payment records</li>
      </ul>

      <p className={styles.sectionTitle}>How We Collect</p>
      <ul className={styles.bulletList}>
        <li>Through existing HOA masterlist records maintained by association officers</li>
        <li>Through homeowner registration forms submitted during onboarding</li>
      </ul>

      <p className={styles.sectionTitle}>How We Use Your Data</p>
      <ul className={styles.bulletList}>
        <li>Tracking and recording monthly association dues</li>
        <li>Maintaining an accurate community resident directory</li>
        <li>Generating homeowner IDs and residency documents</li>
      </ul>

      <p className={styles.sectionTitle}>Data Storage &amp; Sharing</p>
      <ul className={styles.bulletList}>
        <li>Data is stored securely on <strong>MongoDB Atlas</strong> (database) and <strong>Cloudinary</strong> (uploaded images)</li>
        <li>We do not sell, rent, or share your data with any third-party marketers</li>
        <li>Access is limited to authorized HOA officers only</li>
      </ul>

      <p className={styles.sectionTitle}>Your Rights (DPA 2012)</p>
      <ul className={styles.bulletList}>
        <li>Under <strong>R.A. 10173 (Data Privacy Act of 2012)</strong>, you may request to access, correct, object to, or erase your personal data at any time</li>
        <li>Contact the HOA administration to exercise these rights</li>
      </ul>
    </>
  )
}

/* ── Terms & Conditions content ── */
function TermsContent() {
  return (
    <>
      <span className={styles.lastUpdated}>Last Updated: May 2026</span>

      <p className={styles.sectionTitle}>Acceptance of Terms</p>
      <ul className={styles.bulletList}>
        <li>By using OneHOA, you agree to comply with these Terms &amp; Conditions</li>
        <li>These terms bind all users — homeowners, officers, and administrators</li>
      </ul>

      <p className={styles.sectionTitle}>User Accounts &amp; Security</p>
      <ul className={styles.bulletList}>
        <li>Keep your login credentials confidential; do not share them</li>
        <li>You are responsible for all actions performed under your account</li>
        <li>Report any unauthorized access to the HOA administration immediately</li>
      </ul>

      <p className={styles.sectionTitle}>Acceptable Use</p>
      <ul className={styles.bulletList}>
        <li>Do not submit false, fraudulent, or inaccurate data</li>
        <li>Do not introduce malware or attempt to access unauthorized system areas</li>
        <li>Bulk data export is prohibited without explicit authorization</li>
      </ul>

      <p className={styles.sectionTitle}>Intellectual Property</p>
      <ul className={styles.bulletList}>
        <li>All software, design, and content are owned by Fiesta Community Hanjin Village Homeowner's Association and its developers</li>
        <li>Copying, modifying, or distributing any part of the system is prohibited without written consent</li>
      </ul>

      <p className={styles.sectionTitle}>Limitation of Liability</p>
      <ul className={styles.bulletList}>
        <li>The system is provided &quot;as is&quot; with no guarantee of uninterrupted service</li>
        <li>Financial disputes should be validated against physical receipts or bank confirmations</li>
      </ul>

      <p className={styles.sectionTitle}>Governing Law</p>
      <ul className={styles.bulletList}>
        <li>Governed by Philippine law; disputes fall under Zambales courts jurisdiction</li>
        <li>Fiesta Community Hanjin Village Homeowner's Association may update these terms at any time — continued use constitutes acceptance</li>
      </ul>
    </>
  )
}

/**
 * LegalModal — shared pop-up modal for Privacy Policy & Terms and Conditions.
 *
 * Props:
 *   isOpen       – boolean, controls visibility
 *   onClose      – callback to close the modal
 *   initialTab   – 'privacy' | 'terms' (default 'privacy')
 */
export default function LegalModal({ isOpen, onClose, initialTab = 'privacy' }) {
  const activeTab = initialTab

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (!isOpen) return
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  const isPrivacy = activeTab === 'privacy'

  const modal = (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isPrivacy ? 'Privacy Policy' : 'Terms and Conditions'}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.headerIcon}>
              {isPrivacy ? <FiShield /> : <FiFileText />}
            </span>
            <h2 className={styles.headerTitle}>
              {isPrivacy ? 'Privacy Policy' : 'Terms & Conditions'}
            </h2>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <FiX />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {isPrivacy ? <PrivacyContent /> : <TermsContent />}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button type="button" className={styles.doneBtn} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
