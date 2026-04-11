"use client"

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  HiOutlineCalendarDays as ActivityIcon,
  HiOutlineCreditCard as PaymentIcon,
  HiOutlineUsers as HomeownerIcon,
} from 'react-icons/hi2'
import { ApiError, apiClient } from '@/lib/apiClient'
import styles from './dashboard.module.css'

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      try {
        setIsLoading(true)
        setErrorMessage('')

        const response = await apiClient.get('/analytics/dashboard')
        setDashboardData(response?.data || null)
      } catch (error) {
        if (error instanceof ApiError) {
          setErrorMessage(error.message)
        } else {
          setErrorMessage('Failed to load dashboard analytics.')
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const statCards = useMemo(() => {
    const stats = dashboardData?.stats || {}

    return [
      { label: 'Total Homeowners', value: stats.totalHomeowners || 0, Icon: HomeownerIcon },
      { label: 'Pending Payments (Since Jan, 2026)', value: stats.pendingPayments || 0, Icon: PaymentIcon },
      { label: 'Upcoming Payments', value: stats.upcomingPayments || 0, Icon: ActivityIcon },
    ]
  }, [dashboardData])

  const recentPayments = dashboardData?.recentPayments || []
  const previousActivities = dashboardData?.previousActivities || []

  return (
    <main className={styles.dashboard}>
      <h1 className={styles.title}>Dashboard</h1>
      <p className={styles.subtitle}>Welcome to OneHOA Management System</p>

      {isLoading && <p className={styles.stateText}>Loading dashboard analytics...</p>}
      {!isLoading && errorMessage && <p className={styles.errorText}>{errorMessage}</p>}

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
            {recentPayments.length === 0 && !isLoading && (
              <li className={styles.emptyText}>No recent payments yet.</li>
            )}

            {recentPayments.map((item, index) => (
              <li key={item.id || `${item.homeowner}-${item.details}-${index}`} className={styles.listRow}>
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
            {previousActivities.length === 0 && !isLoading && (
              <li className={styles.emptyText}>No previous activities yet.</li>
            )}

            {previousActivities.map((item, index) => (
              <li key={item.id || `${item.title}-${item.date}-${index}`} className={styles.activityRow}>
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
