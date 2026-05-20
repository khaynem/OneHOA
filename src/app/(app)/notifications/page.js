'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/lib/apiClient'
import styles from './notifications.module.css'

const PAGE_SIZE = 10

const formatTimestamp = (value) => {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date)
}

const getSummaryText = (notification) => {
  if (notification?.audit_log_id?.summary) {
    return String(notification.audit_log_id.summary)
  }

  return ''
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const loadNotifications = async (pageNumber = 1) => {
    try {
      setIsLoading(true)
      setErrorMessage('')

      const response = await apiClient.get('/notifications', {
        query: { page: pageNumber, limit: PAGE_SIZE }
      })

      const data = Array.isArray(response?.data) ? response.data : []
      const nextMeta = response?.meta || {}

      setNotifications(data)
      setPage(Number(nextMeta.page) || pageNumber)
      setTotalPages(Number(nextMeta.totalPages) || 1)
      setUnreadCount(Number(nextMeta.unreadCount) || 0)
    } catch (error) {
      setErrorMessage(error.message || 'Unable to load notifications.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications(1)
  }, [])

  const handleMarkRead = async (notificationId) => {
    try {
      await apiClient.patch(`/notifications/${notificationId}/read`)
      setNotifications((prev) =>
        prev.map((item) =>
          String(item._id) === String(notificationId)
            ? { ...item, read: true, read_at: new Date().toISOString() }
            : item
        )
      )
      setUnreadCount((prev) => Math.max(prev - 1, 0))
    } catch {
      // Ignore read-state failures in the UI.
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await apiClient.patch('/notifications/mark-all-read')
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true, read_at: new Date().toISOString() })))
      setUnreadCount(0)
    } catch {
      // Ignore read-state failures in the UI.
    }
  }

  const canGoPrev = useMemo(() => page > 1, [page])
  const canGoNext = useMemo(() => page < totalPages, [page, totalPages])

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Notifications</h1>
          <p className={styles.subtitle}>Officer activity updates and audit details</p>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.unreadBadge}>{unreadCount} unread</span>
          <button type="button" className={styles.secondaryButton} onClick={handleMarkAllRead}>
            Mark all read
          </button>
        </div>
      </header>

      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}

      <section className={styles.listCard}>
        {isLoading ? (
          <p className={styles.emptyState}>Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <p className={styles.emptyState}>No notifications to show.</p>
        ) : (
          <ul className={styles.list}>
            {notifications.map((item) => {
              const summary = getSummaryText(item)
              const message = String(item.message || '')
              const showSummary = summary && summary !== message

              return (
                <li key={item._id} className={`${styles.item} ${item.read ? styles.itemRead : ''}`}>
                  <div className={styles.itemHeader}>
                    <div>
                      <p className={styles.itemTitle}>{item.title}</p>
                      <p className={styles.itemMessage}>{message}</p>
                      {showSummary ? <p className={styles.itemSummary}>{summary}</p> : null}
                    </div>
                    <div className={styles.itemMeta}>
                      <span>{formatTimestamp(item.createdAt)}</span>
                      {!item.read ? (
                        <button
                          type="button"
                          className={styles.linkButton}
                          onClick={() => handleMarkRead(item._id)}
                        >
                          Mark read
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {totalPages > 1 ? (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageButton}
            onClick={() => loadNotifications(page - 1)}
            disabled={!canGoPrev || isLoading}
          >
            Prev
          </button>
          <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
          <button
            type="button"
            className={styles.pageButton}
            onClick={() => loadNotifications(page + 1)}
            disabled={!canGoNext || isLoading}
          >
            Next
          </button>
        </div>
      ) : null}
    </main>
  )
}
