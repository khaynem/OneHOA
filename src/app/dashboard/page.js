import Link from 'next/link'
import styles from './dashboard.module.css'

export default function DashboardPage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Dashboard</h1>
      <p className={styles.lead}>Overview of the OneHOA system: quick links and summaries.</p>

      <ul className={styles.list}>
        <li><Link href="/homeowner-management">Homeowner Management</Link></li>
        <li><Link href="/payment-monitoring">Payment Monitoring</Link></li>
        <li><Link href="/hoa-activities">HOA Activities</Link></li>
      </ul>

      <nav className={styles.nav}>
        <Link href="/">Landing</Link> {' | '}
        <Link href="/login">Login</Link>
      </nav>
    </main>
  )
}
