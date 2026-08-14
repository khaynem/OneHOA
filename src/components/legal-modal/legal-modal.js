"use client"

import { useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { FiShield, FiFileText, FiX } from 'react-icons/fi'
import styles from './legal-modal.module.css'

/* ── Privacy Policy content ── */
function PrivacyContent() {
  return (
    <>
      <p className={styles.sectionTitle}>Introduction</p>
      <p className={styles.sectionIntro}>
        Your privacy is important to us. OneHOA is committed to protecting the personal information of homeowners and other system users while providing a secure and convenient way to manage HOA-related records and services.
      </p>
      <p className={styles.sectionIntro}>
        This Privacy Policy explains what information we collect, how it is collected and used, where it is stored, and your rights regarding your personal information.
      </p>

      <p className={styles.sectionTitle}>Organization and Scope</p>
      <p className={styles.sectionIntro}>
        This Privacy Policy applies to personal information collected and processed through OneHOA for the FC Hanjin Village Homeowners Association. The information collected through the system is used only for legitimate HOA-related and administrative purposes.
      </p>

      <p className={styles.sectionTitle}>Data Collected</p>
      <p className={styles.sectionIntro}>OneHOA may collect information necessary for homeowner registration, identification, record management, and other HOA-related processes, including:</p>
      <ul className={styles.bulletList}>
        <li>Full name, email address, and phone number</li>
        <li>Residential information, including Phase, Block, and Lot</li>
        <li>Employment or source of income information</li>
        <li>Household information</li>
        <li>Homeowner profile image and other registration information</li>
        <li>Monthly maintenance fee and payment records</li>
        <li>Other information necessary for maintaining homeowner records</li>
      </ul>

      <p className={styles.sectionTitle}>How We Collect Your Data</p>
      <p className={styles.sectionIntro}>Personal information may be collected through:</p>
      <ul className={styles.bulletList}>
        <li>Existing HOA records maintained by authorized association officials</li>
        <li>Information provided through the OneHOA homeowner registration process</li>
        <li>Information provided or updated while using the system</li>
      </ul>

      <p className={styles.sectionTitle}>How We Use Your Data</p>
      <p className={styles.sectionIntro}>The information collected through OneHOA is used to support the administrative operations of the association, including:</p>
      <ul className={styles.bulletList}>
        <li>Processing and verifying homeowner registrations</li>
        <li>Maintaining accurate homeowner records</li>
        <li>Recording and monitoring monthly maintenance fee payments</li>
        <li>Generating homeowner IDs and administrative reports</li>
        <li>Managing user accounts and providing access to appropriate system features</li>
        <li>Supporting HOA announcements and other necessary administrative activities</li>
      </ul>

      <p className={styles.sectionTitle}>Data Storage and Access</p>
      <ul className={styles.bulletList}>
        <li>Personal information is stored using MongoDB Atlas for system records and Cloudinary for uploaded images.</li>
        <li>OneHOA does not sell or rent personal information for marketing purposes. Access to personal information is limited according to authorized user roles and assigned system permissions.</li>
      </ul>

      <p className={styles.sectionTitle}>Your Privacy Rights</p>
      <ul className={styles.bulletList}>
        <li>In accordance with the Data Privacy Act of 2012 (Republic Act No. 10173), users may exercise applicable rights regarding their personal information, including the right to access, request correction, object to certain processing, and request appropriate deletion or blocking of personal information where permitted by law.</li>
        <li>Requests or concerns regarding personal information may be directed to the FC Hanjin Village Homeowners Association for proper review and assistance.</li>
      </ul>

      <p className={styles.sectionTitle}>Data Protection</p>
      <ul className={styles.bulletList}>
        <li>Reasonable measures are implemented to protect personal information stored in OneHOA against unauthorized access, misuse, alteration, or disclosure. Users are also encouraged to protect their account credentials and immediately report suspected unauthorized access to the HOA administration.</li>
      </ul>
    </>
  )
}

/* ── Terms & Conditions content ── */
function TermsContent() {
  return (
    <>
      <p className={styles.sectionTitle}>Introduction</p>
      <p className={styles.sectionIntro}>
        Welcome to OneHOA, the web-based Management Information System of the FC Hanjin Village Homeowners Association. These Terms and Conditions provide the basic rules and responsibilities for the proper and secure use of the system.
      </p>
      <p className={styles.sectionIntro}>
        By agreeing to these terms during registration, you acknowledge that you have read and accepted these Terms and Conditions.
      </p>

      <p className={styles.sectionTitle}>Acceptance of Terms</p>
      <p className={styles.sectionIntro}>
        These Terms and Conditions apply to all OneHOA users, including homeowners, HOA officers, the Association President, and system administrators. Users are expected to use the system responsibly and comply with applicable HOA policies.
      </p>

      <p className={styles.sectionTitle}>User Accounts &amp; Security</p>
      <p className={styles.sectionIntro}>
        Users are responsible for keeping their login credentials confidential and for activities performed through their accounts. Accurate information must be provided when registering and using the system. Any unauthorized access or suspected account misuse should be reported to the HOA administration.
      </p>

      <p className={styles.sectionTitle}>Acceptable Use</p>
      <p className={styles.sectionIntro}>Users must NOT:</p>
      <ul className={styles.bulletList}>
        <li>Submit false, fraudulent, or intentionally inaccurate information.</li>
        <li>Attempt to access accounts, records, or system features without authorization.</li>
        <li>Introduce malware or perform activities that may disrupt or damage the system.</li>
        <li>Misuse, alter, copy, or distribute system records, documents, or other assets without authorization.</li>
      </ul>

      <p className={styles.sectionTitle}>Payments &amp; Penalties</p>
      <ul className={styles.bulletList}>
        <li>Homeowners are responsible for applicable fees and financial obligations established by the association. Fees and corresponding penalties may change according to current HOA policies.</li>
        <li>Payment concerns or discrepancies should be reported to the HOA administration and may be verified using official receipts or other supporting records.</li>
      </ul>

      <p className={styles.sectionTitle}>Account Suspension or Termination</p>
      <ul className={styles.bulletList}>
        <li>The HOA administration may restrict, suspend, or terminate an account due to unauthorized access, fraudulent activity, misuse of the system, or violation of these Terms and Conditions.</li>
        <li>Suspension or termination of an account does not remove existing homeowner records or obligations with the association.</li>
      </ul>

      <p className={styles.sectionTitle}>Intellectual Property &amp; Protection of Assets</p>
      <ul className={styles.bulletList}>
        <li>The OneHOA system, logo, design, content, records, documents, reports, identification cards, and other system assets must not be copied, altered, misused, or distributed without proper authorization.</li>
      </ul>

      <p className={styles.sectionTitle}>Limitation of Liability</p>
      <ul className={styles.bulletList}>
        <li>OneHOA is provided “as is” and does not guarantee uninterrupted availability due to internet connectivity, system maintenance, hosting availability, or other technical circumstances.</li>
        <li>Financial disputes or discrepancies should be verified using official HOA records and supporting documents.</li>
      </ul>

      <p className={styles.sectionTitle}>Governing Law</p>
      <ul className={styles.bulletList}>
        <li>Governed by Philippine law; disputes fall under Zambales courts jurisdiction.</li>
        <li>Fiesta Community Hanjin Village Homeowner's Association may update these terms at any time — continued use constitutes acceptance.</li>
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
