import Link from 'next/link'
import styles from './landing.module.css'

export default function LandingPage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>OneHOA — Landing</h1>
      <p className={styles.lead}>OneHOA is a lightweight HOA management system. This page provides basic information about the system.</p>

      <nav className={styles.nav}>
        <Link href="/login">Login</Link> {' | '}
        <Link href="/dashboard">Dashboard</Link>
      </nav>
    </main>
  )
}
