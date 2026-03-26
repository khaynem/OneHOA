import Link from 'next/link'
import styles from './payment-monitoring.module.css'

export default function PaymentMonitoringPage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Payment Monitoring</h1>
      <p className={styles.lead}>Keep track of homeowner payments and outstanding balances.</p>

      <section className={styles.section}>
        <h2>Payments (placeholder)</h2>
        <p>Transactions and status will appear here.</p>
      </section>

      <nav className={styles.nav}>
        <Link href="/dashboard">Back to Dashboard</Link>
      </nav>
    </main>
  )
}
