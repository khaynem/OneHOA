import Link from 'next/link'
import styles from './hoa-activities.module.css'

export default function HOAActivitiesPage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>HOA Activities</h1>
      <p className={styles.lead}>Track events, meetings, and organization activities here.</p>

      <section className={styles.section}>
        <h2>Activities (placeholder)</h2>
        <p>Upcoming events and past activities will be listed here.</p>
      </section>

      <nav className={styles.nav}>
        <Link href="/dashboard">Back to Dashboard</Link>
      </nav>
    </main>
  )
}
