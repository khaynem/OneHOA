"use client"

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiArrowLeft, FiShield } from 'react-icons/fi'
import styles from './privacy.module.css'

const SECTIONS = [
  { id: 'compliance', label: '1. Compliance Statement' },
  { id: 'collection', label: '2. Information We Collect' },
  { id: 'purpose', label: '3. Purpose of Processing' },
  { id: 'sharing', label: '4. Disclosure & Sharing' },
  { id: 'security', label: '5. Security & Retention' },
  { id: 'rights', label: '6. Your Rights under DPA' },
  { id: 'dpo', label: '7. Data Protection Officer' }
]

export default function PrivacyPolicyPage() {
  const [activeSection, setActiveSection] = useState('compliance')
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
        <h1 className={styles.bannerTitle}>Data Privacy Policy</h1>
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
                At <strong>OneHOA</strong>, representing the <strong>Fiesta Community Hanjin Village Association (FCHVHOA)</strong>,
                we respect your privacy and are committed to protecting the personal and sensitive information that homeowners entrust to us.
                This Privacy Policy explains how we collect, process, secure, and retain your data when it is registered within our Management Information System.
              </p>

              <h2 id="compliance">1. DPA 2012 Compliance Statement</h2>
              <p>
                In compliance with <strong>Republic Act No. 10173</strong>, also known as the <strong>Data Privacy Act of 2012 (DPA 2012)</strong> of the Philippines, and its Implementing Rules and Regulations (IRR),
                FCHVHOA strictly adheres to the core principles of transparency, legitimate purpose, and proportionality in all aspects of data processing.
              </p>
              <p>
                All personal data submitted to the OneHOA database is managed using technical, organizational, and physical security measures, ensuring the protection of homeowners against unauthorized access, disclosure, or misuse.
              </p>

              <h2 id="collection">2. Personal Information We Collect</h2>
              <p>
                When an association officer registers a resident in the OneHOA system, we collect personal and sensitive information necessary for official association administration. This includes:
              </p>
              <ul>
                <li><strong>Identification Details:</strong> Full Name (First Name, Middle Name, Last Name).</li>
                <li><strong>Contact Information:</strong> Phone/Mobile Number.</li>
                <li><strong>Homeowner Location:</strong> Address details within the community (Phase, Block, Lot).</li>
                <li><strong>Socio-Economic Data:</strong> Occupation / Job Description and Work Status (e.g., self-employed, retired, contractual).</li>
                <li><strong>Community Membership Metadata:</strong> Entry Year into the village and Occupant Status (Owner, Relative, Renter, Caretaker).</li>
                <li><strong>Household Information:</strong> Number of household members under the address.</li>
                <li><strong>Images / Visual Data:</strong> Homeowner profile picture (uploaded for ID generation purposes).</li>
                <li><strong>Financial Transaction Records:</strong> Log of monthly maintenance dues paid, payment methods, receipt reference numbers, and outstanding balances.</li>
              </ul>

              <h2 id="purpose">3. Legitimate Purpose of Processing</h2>
              <p>
                We do not practice &quot;bundled consent&quot; and only collect and process personal data for explicit, legitimate, and declared purposes, which include:
              </p>
              <ul>
                <li><strong>Masterlist Directory Maintenance:</strong> Establishing a secure, centralized database of all community residents.</li>
                <li><strong>HOA Dues and Payments Tracking:</strong> Recording and auditing monthly maintenance contributions to ensure transparent funding for village services.</li>
                <li><strong>Document &amp; ID Generation:</strong> Creating standardized Homeowner Identification Cards and generating residency certificates.</li>
                <li><strong>Official Communication:</strong> Contacting homeowners regarding emergencies, dues notifications, and association assemblies.</li>
                <li><strong>Community Activity Planning:</strong> Coordinating community events, security updates, and general homeowners assemblies.</li>
              </ul>

              <h2 id="sharing">4. Information Disclosure &amp; Third-Party Sharing</h2>
              <p>
                Your personal and sensitive data is strictly kept within the FCHVHOA administration system.
              </p>
              <ul>
                <li><strong>No Commercial Sharing:</strong> We do not sell, rent, or trade homeowners&apos; personal information to third-party marketing companies, advertisers, or developers.</li>
                <li><strong>Authorized Personnel Access:</strong> Access to your personal data is restricted solely to authorized association officers (e.g., President, Treasurer, Officers, Admins) who require it to perform their official duties.</li>
                <li><strong>Legal Disclosures:</strong> Personal information may only be shared with external government bodies, law enforcement, or regulatory entities when strictly mandated by Philippine laws, courts, or legally issued warrants.</li>
              </ul>

              <h2 id="security">5. Data Security &amp; Retention Policy</h2>
              <p>
                We execute standard protective actions to secure your personal records.
              </p>
              <ul>
                <li><strong>System Safeguards:</strong> Personal information stored in the OneHOA cloud/server database is protected with password-protected accounts, role-based access restrictions, and secure socket layers during transfer.</li>
                <li><strong>Retention Limit:</strong> We retain homeowner information as long as the individual remains a resident or property owner in Fiesta Community Hanjin Village. </li>
                <li><strong>Data Disposal:</strong> Upon property sale, lease termination (for renters), or formal membership resignation, your personal information is permanently deleted, anonymized, or securely shredded from the digital databases in accordance with NPC guidelines.</li>
              </ul>

              <h2 id="rights">6. Your Rights as a Data Subject</h2>
              <p>
                Under the Data Privacy Act of 2012, homeowners are granted specific rights regarding their personal data, which we fully respect:
              </p>
              <ul>
                <li><strong>Right to Be Informed:</strong> You have the right to know whether your personal data is being processed, and to receive descriptions of the processing parameters.</li>
                <li><strong>Right to Access:</strong> You can request a copy of all personal records we hold about you in our system.</li>
                <li><strong>Right to Correct (Rectification):</strong> You have the right to dispute any inaccurate or outdated information in your profile and request its immediate correction.</li>
                <li><strong>Right to Object:</strong> You can object to the processing of your data under specific conditions, especially if the purpose diverges from essential HOA maintenance.</li>
                <li><strong>Right to Erasure or Blocking:</strong> You have the right to request the suspension, withdrawal, or ordering of blocking/removal of your personal data from our directory under legally valid conditions.</li>
                <li><strong>Right to Damages:</strong> You have the right to be indemnified for any damages sustained due to inaccurate, incomplete, outdated, false, or unauthorized use of personal data.</li>
              </ul>

              <h2 id="dpo">7. Contact the Data Protection Officer (DPO)</h2>
              <p>
                In compliance with National Privacy Commission regulations, FCHVHOA has appointed a dedicated <strong>Data Protection Officer (DPO)</strong> to oversee our data collection practices and handle requests regarding data subject rights.
              </p>
              <p>
                If you wish to access, correct, or request the removal of your personal records, or if you have any questions concerning our privacy practices, please contact our DPO:
              </p>

              <div className={styles.dpoCard}>
                <h3>
                  <FiShield aria-hidden="true" />
                  FCHVHOA Data Privacy &amp; Security Office
                </h3>
                <div className={styles.dpoGrid}>

                  <span className={styles.dpoLabel}>Email:</span>
                  <span className={styles.dpoValue}>
                    <a href="mailto:onehoa22@gmail.com">onehoa22@gmail.com</a>
                  </span>

                  <span className={styles.dpoLabel}>General Contact:</span>
                  <span className={styles.dpoValue}>
                    <a href="mailto:vinalacentrohvhoa11@gmail.com">vinalacentrohvhoa11@gmail.com</a>
                  </span>

                  <span className={styles.dpoLabel}>Address:</span>
                  <span className={styles.dpoValue}>Castillejos, Zambales, Philippines</span>

                  <span className={styles.dpoLabel}>Response SLA:</span>
                  <span className={styles.dpoValue}>All official privacy requests are reviewed and responded to within fifteen (15) business days.</span>
                </div>
              </div>
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
