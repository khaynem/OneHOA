"use client"
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import styles from './landing.module.css'
import { FaUsers, FaMoneyCheckAlt, FaCalendarAlt, FaClipboardList, FaPhoneAlt, FaEnvelope, FaMapMarkerAlt, FaBell, FaBars, FaTimes } from 'react-icons/fa'
import { apiClient } from '@/lib/apiClient'

const formatAnnouncementDate = (value) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (isNaN(parsed.getTime())) return '-'
  return new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(parsed)
}

const getAnnouncementBadgeInfo = (title = '', content = '') => {
  const text = `${title} ${content}`.toLowerCase()
  if (text.includes('urgent') || text.includes('important') || text.includes('maintenance') || text.includes('warning') || text.includes('gate') || text.includes('due') || text.includes('penalty')) {
    return { label: 'Important', badgeClass: styles.badgeImportant, cardClass: styles.cardImportant }
  }
  if (text.includes('event') || text.includes('tournament') || text.includes('fiesta') || text.includes('celebration') || text.includes('game') || text.includes('meeting') || text.includes('basketball')) {
    return { label: 'Event', badgeClass: styles.badgeEvent, cardClass: styles.cardEvent }
  }
  return { label: 'Notice', badgeClass: styles.badgeNotice, cardClass: styles.cardNotice }
}

export default function LandingPage() {
  const [active, setActive] = useState('home')
  const [announcements, setAnnouncements] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  const handleNavClick = (sectionId) => {
    setActive(sectionId)
  }

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900) {
        setMenuOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const response = await apiClient.get('/activities')
        const raw = Array.isArray(response?.data) ? response.data : []
        const mapped = raw
          .filter(item => !item.archived)
          .map(item => {
            const firstName = String(item.users?._id?.first_name || '').trim()
            const lastName = String(item.users?._id?.last_name || '').trim()
            const fullName = `${firstName} ${lastName}`.trim()
            const reporter = fullName || String(item.users?._id?.email || '').trim() || 'HOA Admin'
            return {
              id: item._id,
              title: item.title,
              content: item.content,
              date: item.date || item.createdAt,
              reporter
            }
          })
        setAnnouncements(mapped)
      } catch (err) {
        console.error('Failed to fetch announcements:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAnnouncements()
  }, [])

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
      <header className={`${styles.header} ${menuOpen ? styles.headerOpen : ''}`}>
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

        <button
          className={styles.menuToggle}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle Navigation Menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>

        <div className={`${styles.menuDropdown} ${menuOpen ? styles.menuDropdownActive : ''}`}>
          <nav className={styles.nav}>
            <Link href="#home" onClick={() => { handleNavClick('home'); setMenuOpen(false); }} className={`${styles.navLink} ${active === 'home' ? styles.active : ''}`}>Home</Link>
            <Link href="#about" onClick={() => { handleNavClick('about'); setMenuOpen(false); }} className={`${styles.navLink} ${active === 'about' ? styles.active : ''}`}>About</Link>
            <Link href="#features" onClick={() => { handleNavClick('features'); setMenuOpen(false); }} className={`${styles.navLink} ${active === 'features' ? styles.active : ''}`}>Features</Link>
            <Link href="#announcements" onClick={() => { handleNavClick('announcements'); setMenuOpen(false); }} className={`${styles.navLink} ${active === 'announcements' ? styles.active : ''}`}>Announcements</Link>
          </nav>

          <div className={styles.headerActions}>
            <Link href="/register-homeowner" onClick={() => setMenuOpen(false)} className={styles.registerBtn}>Homeowner Registration</Link>
            <Link href="/login" onClick={() => setMenuOpen(false)} className={styles.loginBtn}>Login</Link>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div
          className={styles.menuBackdrop}
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

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
          {isLoading ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 1rem', color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem' }}>
              Loading announcements...
            </div>
          ) : announcements.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem 1rem', color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem' }}>
              No announcements posted yet.
            </div>
          ) : (
            announcements.slice(0, 3).map((announcement) => {
              const { label, badgeClass, cardClass } = getAnnouncementBadgeInfo(announcement.title, announcement.content)
              return (
                <article key={announcement.id} className={`${styles.announcementCard} ${cardClass}`}>
                  <div className={styles.announcementCardTop}>
                    <span className={`${styles.announcementBadge} ${badgeClass}`}>
                      <FaBell /> {label}
                    </span>
                    <span className={styles.announcementDate}>
                      {formatAnnouncementDate(announcement.date)}
                    </span>
                  </div>
                  <h3 className={styles.announcementTitle}>{announcement.title}</h3>
                  <p className={styles.announcementDescription}>{announcement.content}</p>
                  <div className={styles.announcementFooter}>
                    Posted by: {announcement.reporter}
                  </div>
                </article>
              )
            })
          )}
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
