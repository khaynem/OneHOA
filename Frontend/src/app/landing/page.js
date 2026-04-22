"use client"
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import styles from './landing.module.css'
import { FaUsers, FaMoneyCheckAlt, FaCalendarAlt, FaChartLine, FaPhoneAlt, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa'

export default function LandingPage() {
  const [active, setActive] = useState('home')

  useEffect(() => {
    const ids = ['home', 'about', 'features']
    const sections = ids.map(id => document.getElementById(id)).filter(Boolean)
    if (!sections.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(entry.target.id)
        })
      },
      { threshold: 0.55 }
    )

    sections.forEach((s) => observer.observe(s))
    return () => sections.forEach((s) => observer.unobserve(s))
  }, [])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <Image
            src="/images/HOA Logo.png"
            alt="OneHOA Logo"
            width={44}
            height={44}
            className={styles.logo}
            priority
          />
          <span className={styles.brandText}>OneHOA</span>
        </div>

        <nav className={styles.nav}>
          <Link href="/" className={`${styles.navLink} ${active === 'home' ? styles.active : ''}`}>Home</Link>
          <Link href="#about" className={`${styles.navLink} ${active === 'about' ? styles.active : ''}`}>About</Link>
          <Link href="#features" className={`${styles.navLink} ${active === 'features' ? styles.active : ''}`}>Features</Link>
        </nav>

        <div className={styles.headerActions}>
          <Link href="/login" className={styles.loginBtn}>Login</Link>
        </div>
      </header>

      <section id="home" className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>Welcome to OneHOA</h1>
          <p className={styles.heroSubtitle}>FC Hanjin Village&apos;s comprehensive Homeowners Association Management System</p>
          <p className={styles.heroLead}>Stay informed, stay connected, and keep your community organized.</p>
          <div className={styles.cta}>
            <Link href="/login" className={`${styles.btn} ${styles.btnPrimary}`}>Login</Link>
            <a href="#about" className={`${styles.btn} ${styles.btnGhost}`}>Learn More →</a>
          </div>
        </div>
      </section>

      <section id="about" className={styles.about}>
        <div className={styles.aboutHeader}>
          <h2>About</h2>
          <div className={styles.aboutTopSubtitle}>Fiesta Community Hanjin Village Association & OneHOA</div>
        </div>

        <div className={styles.aboutInner}>
          <div className={styles.aboutText}>
            <p><strong>FC Hanjin Village Homeowners Association (FVHOA)</strong> is committed to maintaining a safe, organized, and thriving community. The association manages homeowner records, oversees maintenance fees, coordinates community activities, and issues important documents like residency certificates and IDs.</p>
            <p><strong>OneHOA</strong> is a web-based platform designed to support HVHOA officers in these tasks. It centralizes homeowner information, tracks payments, generates documents, and posts community announcements, making administrative processes faster, more accurate, and transparent for everyone.</p>
          </div>

          <div className={styles.aboutLogo}>
            <Image
              src="/images/HOA Logo.png"
              alt="HOA Logo"
              width={200}
              height={200}
            />
          </div>
        </div>
      </section>

      <section id="features" className={styles.features}>
        <h2 className={styles.sectionTitle}>Core Features</h2>
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
            <h3>Track HOA Activities</h3>
            <p>Keep residents informed with timely updates on HOA activities and community events.</p>
          </article>

          <article className={styles.card}>
            <div className={styles.iconWrap}><FaChartLine /></div>
            <h3>Dashboard Analytics</h3>
            <p>Quickly view key community insights, including total homeowners, pending payments, and upcoming events.</p>
          </article>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.contact}>
            <div><FaMapMarkerAlt /> Castillejos, Zambales</div>
            <div><FaPhoneAlt /> 0900 XXX XXXX</div>
            <div><FaEnvelope /> vinalacentrohvhoa11@gmail.com</div>
          </div>

          <div className={styles.footerBrand}>
            <Image
              src="/images/HOA Logo.png"
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
      </footer>
    </div>
  )
}
