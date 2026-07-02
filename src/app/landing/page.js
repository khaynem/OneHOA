"use client"
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import styles from './landing.module.css'
import { FaUsers, FaMoneyCheckAlt, FaCalendarAlt, FaClipboardList, FaPhoneAlt, FaEnvelope, FaMapMarkerAlt, FaBell } from 'react-icons/fa'

export default function LandingPage() {
  const [active, setActive] = useState('home')

  const handleNavClick = (sectionId) => {
    setActive(sectionId)
  }

  useEffect(() => {
    const ids = ['home', 'about', 'features', 'announcements', 'registration']
    const sections = ids.map(id => document.getElementById(id)).filter(Boolean)
    if (!sections.length) return

    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id)
        })
      },
      { threshold: 0.3 }
    )

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealed)
            revealObserver.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )

    sections.forEach((s) => {
      navObserver.observe(s)
      revealObserver.observe(s)
    })

    return () => {
      sections.forEach((s) => {
        navObserver.unobserve(s)
        revealObserver.unobserve(s)
      })
    }
  }, [])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <Image
            src="/images/HOA_Logo.png"
            alt="OneHOA Logo"
            width={44}
            height={44}
            className={styles.logo}
            priority
          />
          <span className={styles.brandText}>OneHOA</span>
        </div>

        <nav className={styles.nav}>
          <Link href="#home" onClick={() => handleNavClick('home')} className={`${styles.navLink} ${active === 'home' ? styles.active : ''}`}>Home</Link>
          <Link href="#about" onClick={() => handleNavClick('about')} className={`${styles.navLink} ${active === 'about' ? styles.active : ''}`}>About</Link>
          <Link href="#features" onClick={() => handleNavClick('features')} className={`${styles.navLink} ${active === 'features' ? styles.active : ''}`}>Features</Link>
          <Link href="#announcements" onClick={() => handleNavClick('announcements')} className={`${styles.navLink} ${active === 'announcements' ? styles.active : ''}`}>Announcements</Link>
        </nav>

        <div className={styles.headerActions}>
          <Link href="/register-homeowner" className={styles.registerBtn}>Homeowner Registration</Link>
          <Link href="/login" className={styles.loginBtn}>Login</Link>
        </div>
      </header>

      <section id="home" className={`${styles.hero} ${styles.revealSection} ${styles.revealed}`}>
        <div className={styles.heroContainer}>
          <div className={styles.heroContent}>
            <span className={styles.heroTagline}>Smart Community Ecosystem</span>
            <h1 className={styles.heroTitle}>
              Manage Your Community with <span className={styles.titleGradient}>OneHOA</span>
            </h1>
            <p className={styles.heroSubtitle}>FC Hanjin Village&apos;s comprehensive Homeowners Association Management System</p>
            <p className={styles.heroLead}>Simplify your HOA management with our intuitive, premium platform designed for efficiency, accuracy, and absolute transparency.</p>
            <div className={styles.cta}>
              <Link href="/login" className={`${styles.btn} ${styles.btnPrimary}`}>Get Started</Link>
              <a href="#about" className={`${styles.btn} ${styles.btnGhost}`}>Learn More →</a>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.logoContainer}>
              <Image
                src="/images/HOA_Logo.png"
                alt="OneHOA Logo"
                width={300}
                height={300}
                className={styles.heroLogo}
                priority
              />
              <div className={styles.accentBlob1}></div>
              <div className={styles.accentBlob2}></div>
            </div>
          </div>
        </div>

        <div className={styles.heroWaveDivider}>
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
            <path d="M0,32L120,42.7C240,53,480,75,720,74.7C960,75,1200,53,1320,42.7L1440,32L1440,120L1320,120C1200,120,960,120,720,120C480,120,240,120,120,120L0,120Z" fill="#e5f1ff"></path>
          </svg>
        </div>
      </section>

      <section id="about" className={`${styles.about} ${styles.revealSection}`}>
        <div className={styles.aboutAccentOrb} aria-hidden="true" />
        <div className={styles.aboutGlowBlue} aria-hidden="true" />
        <div className={styles.aboutDiagonalStripe} aria-hidden="true" />
        <div className={styles.aboutRing} aria-hidden="true" />
        <div className={styles.aboutSquare} aria-hidden="true" />
        <div className={styles.aboutSquare2} aria-hidden="true" />
        <div className={styles.aboutSquare3} aria-hidden="true" />

        <div className={styles.aboutHeader}>
          <span className={styles.sectionBadge}>Community & Innovation</span>
          <h2>About FVHOA & OneHOA</h2>
          <div className={styles.aboutTopSubtitle}>Fiesta Community Hanjin Village Association</div>
        </div>

        <div className={styles.aboutInner}>
          <div className={styles.aboutImageGallery}>
            <div className={styles.mainImageWrapper}>
              <img
                src="/images/community_preview.png"
                alt="Fiesta Community Hanjin Village"
                className={styles.communityImage}
              />
              <div className={styles.imageOverlay}>
                <span className={styles.imageOverlayBadge}>Castillejos, Zambales</span>
              </div>
            </div>
            <div className={styles.decorativeBlob}></div>
          </div>

          <div className={styles.aboutText}>
            <p><strong>FC Hanjin Village Homeowners Association (FVHOA)</strong> is committed to maintaining a safe, organized, and thriving community. The association manages homeowner records, oversees maintenance fees, coordinates community activities, and issues important documents like residency certificates and IDs.</p>
            <p><strong>OneHOA</strong> is a web-based platform designed to support HVHOA officers in these tasks. It centralizes homeowner information, tracks payments, and generates documents making administrative processes faster, more accurate, and transparent for everyone.</p>

            <div className={styles.aboutStats}>
              <div className={styles.statItem}>
                <h4>100%</h4>
                <p>Secure Records</p>
              </div>
              <div className={styles.statItem}>
                <h4>Easy</h4>
                <p>Payment Tracking</p>
              </div>
              <div className={styles.statItem}>
                <h4>Instant</h4>
                <p>ID Generation</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className={`${styles.features} ${styles.revealSection}`}>
        <div className={styles.featuresRingLeft} aria-hidden="true" />
        <div className={styles.featuresRingRight} aria-hidden="true" />
        <div className={styles.featuresDiagonal} aria-hidden="true" />
        <div className={styles.featuresGlowYellow} aria-hidden="true" />
        <div className={styles.featuresGlowBlue} aria-hidden="true" />
        <div className={styles.featuresAccentBlob} aria-hidden="true" />
        <div className={styles.featuresDiamond} aria-hidden="true" />
        <div className={styles.featuresSquare1} aria-hidden="true" />
        <div className={styles.featuresSquare2} aria-hidden="true" />
        <div className={styles.featuresSquare3} aria-hidden="true" />

        <div className={styles.sectionHeader}>
          <span className={styles.sectionBadge}>Administrative Suite</span>
          <h2 className={styles.sectionTitle}>Core Features</h2>
        </div>

        <div className={styles.featureGrid}>
          <article className={styles.card}>
            <div className={styles.iconWrap}><FaUsers /></div>
            <h3>Homeowner Management</h3>
            <p>Efficiently manage homeowner information and maintain a centralized database of all members.</p>
          </article>

          <article className={styles.card}>
            <div className={styles.iconWrap}><FaMoneyCheckAlt /></div>
            <h3>Payment Tracking</h3>
            <p>Monitor and record monthly maintenance fees with comprehensive payment history tracking.</p>
          </article>

          <article className={styles.card}>
            <div className={styles.iconWrap}><FaCalendarAlt /></div>
            <h3>Track HOA Announcements</h3>
            <p>Keep residents informed with timely updates on HOA Announcements and community events.</p>
          </article>

          <article className={styles.card}>
            <div className={styles.iconWrap}><FaClipboardList /></div>
            <h3>Homeowner Registration</h3>
            <p>Streamlined registration process for new homeowners. Submit your information and required documents for verification and approval.</p>
          </article>
        </div>
      </section>

      <section id="announcements" className={`${styles.announcements} ${styles.revealSection}`}>
        <div className={styles.announcementsGlowYellow} aria-hidden="true" />
        <div className={styles.announcementsOrbLeft} aria-hidden="true" />
        <div className={styles.announcementsArc} aria-hidden="true" />
        <div className={styles.announcementsDiagonal} aria-hidden="true" />
        <div className={styles.announcementsRing} aria-hidden="true" />
        <div className={styles.announcementsSquare} aria-hidden="true" />
        <div className={styles.announcementsSquare2} aria-hidden="true" />
        <div className={styles.announcementsSquare3} aria-hidden="true" />

        <div className={styles.announcementsHeader}>
          <span className={styles.sectionBadge}>Stay Informed</span>
          <h2>Announcements</h2>
          <p>Latest Updates from HOA Officers</p>
        </div>

        <div className={styles.announcementsList}>
          <article className={`${styles.announcementCard} ${styles.cardNotice}`}>
            <div className={styles.announcementCardTop}>
              <span className={`${styles.announcementBadge} ${styles.badgeNotice}`}><FaBell /> Notice</span>
              <span className={styles.announcementDate}>June 20, 2026 10:30 AM</span>
            </div>
            <h3 className={styles.announcementTitle}>Monthly Maintenance Fee Due</h3>
            <p className={styles.announcementDescription}>
              Reminder: Monthly maintenance fees for June are now due. Please submit your payments by June 30, 2026 to avoid penalties. Accepted payment methods include online transfer and over-the-counter payments at authorized centers.
            </p>
            <div className={styles.announcementFooter}>
              Posted by: HOA President
            </div>
          </article>

          <article className={`${styles.announcementCard} ${styles.cardEvent}`}>
            <div className={styles.announcementCardTop}>
              <span className={`${styles.announcementBadge} ${styles.badgeEvent}`}><FaBell /> Event</span>
              <span className={styles.announcementDate}>June 18, 2026 2:15 PM</span>
            </div>
            <h3 className={styles.announcementTitle}>Community Basketball Tournament</h3>
            <p className={styles.announcementDescription}>
              Join us for the Annual Community Basketball Tournament on July 10-15, 2026! Teams from different blocks will compete for the championship title. Registration is open for all residents. For more details, please contact the Events Committee.
            </p>
            <div className={styles.announcementFooter}>
              Posted by: HOA Officer
            </div>
          </article>

          <article className={`${styles.announcementCard} ${styles.cardImportant}`}>
            <div className={styles.announcementCardTop}>
              <span className={`${styles.announcementBadge} ${styles.badgeImportant}`}><FaBell /> Important</span>
              <span className={styles.announcementDate}>June 15, 2026 9:45 AM</span>
            </div>
            <h3 className={styles.announcementTitle}>Security Gate Maintenance</h3>
            <p className={styles.announcementDescription}>
              The main security gate will undergo maintenance on June 25, 2026 from 8:00 AM to 4:00 PM. During this time, access to the community will be temporarily restricted. Residents are advised to plan their schedules accordingly. An alternate entrance will be available for emergencies.
            </p>
            <div className={styles.announcementFooter}>
              Posted by: HOA President
            </div>
          </article>
        </div>
      </section>

      <section id="registration" className={`${styles.registrationSection} ${styles.revealSection}`}>
        <div className={styles.registrationInner}>
          <h2>Join Our Community</h2>
          <p>Register as a homeowner</p>
          <Link href="/register-homeowner" className={`${styles.btn} ${styles.btnPrimary}`}>Homeowner Registration</Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.contact}>
            <div><FaMapMarkerAlt /> Castillejos, Zambales</div>
            <div><FaPhoneAlt /> 0900 XXX XXXX</div>
            <div><FaEnvelope /> onehoa22@gmail.com</div>
          </div>

          <div className={styles.footerBrand}>
            <Image
              src="/images/HOA_Logo.png"
              alt="OneHOA Logo"
              width={72}
              height={72}
            />
            <div className={styles.footerBrandText}>
              <div className={styles.footerTitle}>OneHOA</div>
              <div className={styles.footerDesc}>FC Hanjin Village&apos;s comprehensive Homeowners Association Management System</div>
            </div>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p className={styles.footerCopyright}>© 2026 Endurix. All rights reserved.</p>
          <div className={styles.legalLinks}>
            <Link href="/terms-and-conditions" className={styles.footerLink}>Terms & Conditions</Link>
            <span className={styles.footerLinkSeparator}>•</span>
            <Link href="/privacy-policy" className={styles.footerLink}>Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
