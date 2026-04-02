import Link from 'next/link'
import {
  HiOutlineCalendarDays as ActivityIcon,
  HiOutlineCreditCard as PaymentIcon,
  HiOutlineUsers as HomeownerIcon,
} from 'react-icons/hi2'
import styles from './dashboard.module.css'

export default function DashboardPage() {
  const statCards = [
    { label: 'Total Homeowners', value: 0, Icon: HomeownerIcon },
    { label: 'Pending Payments', value: 0, Icon: PaymentIcon },
    { label: 'Upcoming Payments', value: 0, Icon: ActivityIcon },
  ]

  const recentPayments = [
    { homeowner: 'Homeowner #1001', details: 'Monthly HOA Fee', amount: 'P0.00' },
    { homeowner: 'Homeowner #1002', details: 'Monthly HOA Fee', amount: 'P0.00' },
    { homeowner: 'Homeowner #1003', details: 'Penalty Adjustment', amount: 'P0.00' },
    { homeowner: 'Homeowner #1004', details: 'Monthly HOA Fee', amount: 'P0.00' },
    { homeowner: 'Homeowner #1005', details: 'Quarterly Dues', amount: 'P0.00' },
  ]

  const previousActivities = [
    { title: 'General Assembly Meeting', date: 'March 15, 2025' },
    { title: 'Community Clean-up Drive', date: 'March 22, 2025' },
    { title: 'Board Coordination Meeting', date: 'April 5, 2025' },
    { title: 'Emergency Preparedness Seminar', date: 'April 20, 2025' },
    { title: 'Neighborhood Watch Briefing', date: 'May 2, 2025' },
  ]

  return (
    <main className={styles.dashboard}>
      <h1 className={styles.title}>Dashboard</h1>
      <p className={styles.subtitle}>Welcome to OneHOA Management System</p>

      <section className={styles.cardGrid} aria-label="Dashboard stats">
        {statCards.map(({ label, value, Icon }) => (
          <article key={label} className={styles.statCard}>
            <div>
              <p className={styles.statLabel}>{label}</p>
              <p className={styles.statValue}>{value}</p>
            </div>
            <div className={styles.statIconWrap}>
              <Icon className={styles.statIcon} aria-hidden="true" />
            </div>
          </article>
        ))}
      </section>

      <section className={styles.sectionGrid}>
        <article className={styles.listCard}>
          <h2 className={styles.sectionTitle}>
            <Link href="/payment-monitoring" className={styles.sectionLink}>
              Recent Payments
            </Link>
          </h2>

          <ul className={styles.list}>
            {recentPayments.map((item) => (
              <li key={`${item.homeowner}-${item.details}`} className={styles.listRow}>
                <div>
                  <p className={styles.rowTitle}>{item.homeowner}</p>
                  <p className={styles.rowSubtitle}>{item.details}</p>
                </div>
                <p className={styles.amount}>{item.amount}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className={styles.listCard}>
          <h2 className={styles.sectionTitle}>
            <Link href="/hoa-activities" className={styles.sectionLink}>
              Previous HOA Activities
            </Link>
          </h2>

          <ul className={styles.list}>
            {previousActivities.map((item) => (
              <li key={`${item.title}-${item.date}`} className={styles.activityRow}>
                <span className={styles.dot} aria-hidden="true" />

                <div>
                  <p className={styles.rowTitle}>{item.title}</p>
                  <p className={styles.rowSubtitle}>{item.date}</p>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  )
}
