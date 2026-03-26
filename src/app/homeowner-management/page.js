import Link from 'next/link'
import styles from './homeowner-management.module.css'

export default function HomeownerManagementPage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Homeowner Management</h1>
      <p className={styles.lead}>Manage homeowner profiles and contact information here.</p>

      <section className={styles.section}>
        <h2>Homeowners (placeholder)</h2>
        <p>No data yet — this page will list homeowners and allow editing.</p>
      </section>

      <nav className={styles.nav}>
        <Link href="/dashboard">Back to Dashboard</Link>
      </nav>
    </main>
  )
}
