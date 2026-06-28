"use client"

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiArrowLeft } from 'react-icons/fi'
import styles from './terms.module.css'

const SECTIONS = [
  { id: 'intro', label: '1. Acceptance of Terms' },
  { id: 'accounts', label: '2. User Accounts & Security' },
  { id: 'acceptable-use', label: '3. Acceptable Use Policy' },
  { id: 'intellectual-property', label: '4. Intellectual Property' },
  { id: 'disclaimer', label: '5. Limitation of Liability' },
  { id: 'governing-law', label: '6. Governing Law' },
  { id: 'updates', label: '7. Amendments & Contact' }
]

export default function TermsAndConditionsPage() {
  const [activeSection, setActiveSection] = useState('intro')
  const router = useRouter()

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 120

      for (const section of SECTIONS) {
        const element = document.getElementById(section.id)
        if (element) {
          const offsetTop = element.offsetTop
          const offsetHeight = element.offsetHeight

          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id)
            break
          }
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (id) => {
    const element = document.getElementById(id)
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 100,
        behavior: 'smooth'
      })
      setActiveSection(id)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.backgroundContainer} aria-hidden="true">
        <div className={styles.gridOverlay} />
        <div className={styles.blob1} />
        <div className={styles.blob2} />
        <div className={styles.movingGradient} />
      </div>

      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <Image
            src="/images/HOA_Logo.png"
            alt="OneHOA Logo"
            width={40}
            height={40}
            className={styles.logo}
          />
          <span className={styles.brandText}>OneHOA</span>
        </Link>
        <button
          type="button"
          onClick={() => router.back()}
          className={styles.backLink}
        >
          <FiArrowLeft aria-hidden="true" />
          Back
        </button>
      </header>

      <section className={styles.banner}>
        <h1 className={styles.bannerTitle}>Terms and Conditions</h1>
        <p className={styles.bannerMeta}>Last Updated: May 2026 • Fiesta Community Hanjin Village Association</p>
      </section>

      <div className={styles.contentWrapper}>
        <div className={styles.contentLayout}>
          <aside className={styles.tocContainer}>
            <h2 className={styles.tocTitle}>Table of Contents</h2>
            <ul className={styles.tocList}>
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={`${styles.tocLink} ${activeSection === section.id ? styles.tocActive : ''}`}
                  >
                    {section.label}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <main className={styles.legalCard}>
            <article className={styles.legalContent}>
              <p>
                Welcome to <strong>OneHOA</strong>, the Management Information System (MIS) for the <strong>Fiesta Community Hanjin Village Association (FCHVHOA)</strong>.
                By accessing or using our website, database systems, and associated administrative tools, you agree to comply with and be bound by the following Terms and Conditions. Please read these terms carefully.
              </p>

              <h2 id="intro">1. Acceptance of Terms</h2>
              <p>
                By logging in, creating user records, managing transactions, or utilizing any portion of the OneHOA web platform, you accept these Terms and Conditions in full.
                If you disagree with any part of these terms, you are prohibited from using the platform and its associated services.
              </p>
              <p>
                These terms constitute a legally binding agreement between you (whether as a Homeowner, Officer, Admin, or authorized user) and the <strong>Fiesta Community Hanjin Village Association (FCHVHOA)</strong> governing your use of this software.
              </p>

              <h2 id="accounts">2. User Accounts &amp; Security</h2>
              <p>
                To access features of OneHOA (such as record management, dues tracking, and ID generation), accounts are issued to authorized Homeowner Association officers and administrators.
              </p>
              <ul>
                <li><strong>Account Confidentiality:</strong> You are responsible for maintaining the confidentiality of your account credentials (email, username, password). You must not share your login details with unauthorized individuals.</li>
                <li><strong>Activity Responsibility:</strong> You are entirely responsible for all administrative actions, data edits, and reports generated under your account credentials.</li>
                <li><strong>Unauthorized Access:</strong> You agree to notify the association immediately of any unauthorized use of your account or any other breach of system security.</li>
                <li><strong>Right to Suspend:</strong> FCHVHOA reserves the right to suspend or terminate accounts that violate security policies or represent a threat to data integrity.</li>
              </ul>

              <h2 id="acceptable-use">3. Acceptable Use Policy</h2>
              <p>
                The OneHOA platform is designed to streamline homeowners association workflows, including tracking homeowner registration, monthly dues payments, certificate issues, and event listings.
              </p>
              <p>You agree NOT to use the system to:</p>
              <ul>
                <li>Submit false, fraudulent, or inaccurate homeowner data, payment logs, or certificates.</li>
                <li>Introduce any malware, viruses, trojans, or code intended to damage, interrupt, or intercept data from the system.</li>
                <li>Engage in scraping, automated data collection, or bulk exporting of personal homeowner directories unless explicitly authorized for official HOA business.</li>
                <li>Access or attempt to access administrative routes, directories, API endpoints, or database fields without appropriate role permissions (e.g. attempting to gain Super Admin privileges).</li>
              </ul>

              <h2 id="intellectual-property">4. Intellectual Property</h2>
              <p>
                The software, design, logos, user interface layout, codebases, text, graphics, icons, and visual configurations of OneHOA are owned by the developers (<strong>Endurix</strong>) and FCHVHOA, and are protected under Philippine and international copyright, trademark, and intellectual property laws.
              </p>
              <p>
                You may not copy, modify, distribute, reverse-engineer, sell, or lease any part of the system or its source code without prior written consent from the copyright holders.
              </p>

              <h2 id="disclaimer">5. Limitation of Liability</h2>
              <p>
                The OneHOA application is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. While we strive to maintain 100% accuracy in homeowners records and dues tracking:
              </p>
              <ul>
                <li>FCHVHOA and its technical partners make no warranties, express or implied, regarding the continuous, uninterrupted, or error-free operation of the system.</li>
                <li>Under no circumstances shall FCHVHOA, Endurix, or its officers be liable for any direct, indirect, incidental, special, or consequential damages resulting from system downtime, data loss, or reliance on information presented within the system.</li>
                <li>All financial disputes concerning monthly dues records should be validated against physically signed paper receipts or direct banking confirmations.</li>
              </ul>

              <h2 id="governing-law">6. Governing Law</h2>
              <p>
                These Terms and Conditions are governed by and construed in accordance with the laws of the <strong>Republic of the Philippines</strong>. Any dispute arising out of or in connection with the use of the OneHOA system shall be subject to the exclusive jurisdiction of the courts of Zambales, Philippines.
              </p>

              <h2 id="updates">7. Amendments &amp; Contact Information</h2>
              <p>
                FCHVHOA reserves the right to revise or update these Terms and Conditions at any time. Updates will be indicated by a change in the &quot;Last Updated&quot; date at the top of this page. Your continued use of the platform after changes are posted constitutes acceptance of the modified Terms.
              </p>
              <p>
                If you have any questions or concerns regarding these Terms and Conditions, please contact us:
              </p>
              <ul>
                <li><strong>Entity:</strong> Fiesta Community Hanjin Village Association (FCHVHOA)</li>
                <li><strong>Location:</strong> Castillejos, Zambales, Philippines</li>
                <li><strong>Email:</strong> vinluanefrenhvzam1911@gmail.com</li>
              </ul>
            </article>
          </main>
        </div>
      </div>

      <footer className={styles.footer}>
        <p>© 2026 Fiesta Community Hanjin Village Association (FCHVHOA). All rights reserved.</p>
      </footer>
    </div>
  )
}
