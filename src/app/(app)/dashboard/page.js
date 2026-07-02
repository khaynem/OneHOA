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

const formatDateTimeAMPM = (dateValue) => {
  if (!dateValue) {
    return '-'
  }

  const parsedDate = new Date(dateValue)
  if (Number.isNaN(parsedDate.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(parsedDate)
}

const getInitials = (name) => {
  if (!name) return 'H'
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'H'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      try {
        setIsLoading(true)
        setErrorMessage('')

        const dashboardResponse = await apiClient.get('/analytics/dashboard')
        setDashboardData(dashboardResponse?.data || null)

        try {
          const userResponse = await apiClient.get('/auth/me')
          if (userResponse?.user) {
            setCurrentUser(userResponse.user)
          }
        } catch (e) {
          // Fallback gracefully if auth/me fails (unauthenticated layout handles redirects)
        }
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
      {
        label: 'Total Homeowners',
        value: stats.totalHomeowners || 0,
        Icon: HomeownerIcon,
        href: '/homeowner-management?occupantFilter=owner',
        description: 'Registered active owners',
        type: 'blue'
      },
      {
        label: 'Pending Homeowners (Past Months)',
        value: stats.pendingPayments || 0,
        Icon: PaymentIcon,
        href: '/homeowner-management?paymentFilter=past-due&occupantFilter=owner',
        description: 'Outstanding balances before current month',
        type: 'amber'
      },
      {
        label: 'Upcoming Payments',
        value: stats.upcomingPayments || 0,
        Icon: ActivityIcon,
        href: '/homeowner-management?paymentFilter=current-due&occupantFilter=owner',
        description: 'Due for the current month',
        type: 'teal'
      },
    ]
  }, [dashboardData])

  const recentPayments = (dashboardData?.recentPayments || []).slice(0, 5)
  const previousActivities = (dashboardData?.previousActivities || []).slice(0, 5)

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat('en-PH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date())
  }, [])

  return (
    <>
      <div className={styles.backgroundContainer} aria-hidden="true">
        <div className={styles.gridOverlay} />
        <div className={styles.blob1} />
        <div className={styles.blob2} />
        <div className={styles.movingGradient} />
      </div>

      <div className={styles.pageContent}>
        <div className={styles.welcomeBanner}>
          <div className={styles.bannerContent}>
            <span className={styles.bannerBadge}>Fiesta Community Hanjin Village</span>
            <h1 className={styles.bannerTitle}>
              Welcome back, <span className={styles.nameHighlight}>{currentUser?.first_name || 'HOA Officer'}</span>!
            </h1>
            <p className={styles.bannerSubtitle}>
              Welcome to the FVHOA management system. Keep track of homeowner records, payments, and community activities.
            </p>
            <div className={styles.bannerDate}>
              <span>{formattedDate}</span>
            </div>
          </div>
          <div className={styles.bannerVisual} aria-hidden="true">
            <div className={styles.bannerLogoBg} />
          </div>
        </div>

        {isLoading && <p className={styles.stateText}>Loading dashboard analytics...</p>}
        {!isLoading && errorMessage && <p className={styles.errorText}>{errorMessage}</p>}

        <section className={styles.cardGrid} aria-label="Dashboard stats">
          {statCards.map(({ label, value, Icon, href, description, type }) => (
            <Link key={label} href={href} className={`${styles.statCard} ${styles[type]}`} aria-label={label}>
              <div className={styles.statInfo}>
                <p className={styles.statLabel}>{label}</p>
                <p className={styles.statValue}>{value}</p>
                {description && <p className={styles.statSubtext}>{description}</p>}
              </div>
              <div className={styles.statIconWrap}>
                <Icon className={styles.statIcon} aria-hidden="true" />
              </div>
            </Link>
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

              {recentPayments.map((item, index) => {
                const initials = getInitials(item.homeowner)
                const colors = [styles.avatarBlue, styles.avatarGreen, styles.avatarPurple, styles.avatarOrange]
                const avatarClass = colors[item.homeowner.length % colors.length]

                return (
                  <li key={item.id || `${item.homeowner}-${item.details}-${index}`} className={styles.listRow}>
                    <div className={styles.rowLeft}>
                      {item.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.photoUrl}
                          alt={item.homeowner}
                          className={styles.avatarImage}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className={`${styles.avatar} ${avatarClass}`} aria-hidden="true">
                          {initials}
                        </div>
                      )}
                      <div>
                        <p className={styles.rowTitle}>{item.homeowner}</p>
                        <p className={styles.rowSubtitle}>
                          {item.date ? `${item.details} • ${formatDateTimeAMPM(item.date)}` : item.details}
                        </p>
                      </div>
                    </div>
                    <div className={styles.rowRight}>
                      <span className={styles.amountPill}>{item.amount}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </article>

          <article className={styles.listCard}>
            <h2 className={styles.sectionTitle}>
              <Link href="/hoa-announcements" className={styles.sectionLink}>
                Previous HOA Announcements
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
                    <p className={styles.rowSubtitle}>{formatDateTimeAMPM(item.date)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        </section>
      </div>
    </>
  )
}
