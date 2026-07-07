'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/lib/apiClient'
import { notify } from '@/lib/notify'
import styles from './activity-logs.module.css'

const PAGE_SIZE = 20

const ROLE_OPTIONS = [
  { label: 'All Roles', value: 'all' },
  { label: 'Super Admin', value: 'admin' },
  { label: 'HOA President', value: 'president' },
  { label: 'Officer', value: 'officer' }
]

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
    minute: '2-digit',
    second: '2-digit'
  }).format(date)
}

const getActorName = (log) => {
  const actor = log.actor_user_id
  if (actor && actor.first_name) {
    return `${actor.first_name} ${actor.last_name || ''}`.trim()
  }
  return 'System'
}

const getRoleClass = (role) => {
  const normalized = String(role || '').toLowerCase()
  if (normalized === 'admin') return styles.roleAdmin
  if (normalized === 'president') return styles.rolePresident
  if (normalized === 'officer') return styles.roleOfficer
  return styles.roleUser
}

const getRoleLabel = (role) => {
  const normalized = String(role || '').toLowerCase()
  if (normalized === 'admin') return 'Super Admin'
  if (normalized === 'president') return 'HOA President'
  if (normalized === 'officer') return 'Officer'
  return role || 'User'
}

export default function ActivityLogsClient() {
  const [logs, setLogs] = useState([])
  const [searchText, setSearchText] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState(null)

  const fetchLogs = useCallback(async (pageNumber = 1) => {
    try {
      setIsLoading(true)
      const queryParams = {
        page: pageNumber,
        limit: PAGE_SIZE,
        search: searchText.trim()
      }

      if (roleFilter !== 'all') {
        queryParams.actor_role = roleFilter
      }

      const response = await apiClient.get('/audit-logs', { query: queryParams })
      const items = Array.isArray(response?.data) ? response.data : []
      const meta = response?.meta || {}

      setLogs(items)
      setPage(Number(meta.page) || pageNumber)
      setTotalPages(Number(meta.totalPages) || 1)
    } catch (error) {
      notify.error(error.message || 'Unable to load activity logs.')
      setLogs([])
    } finally {
      setIsLoading(false)
    }
  }, [searchText, roleFilter])

  // Debounced fetch on search and filter change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs(1)
    }, 300)

    return () => clearTimeout(timer)
  }, [fetchLogs])

  const canGoPrev = page > 1
  const canGoNext = page < totalPages

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
            <h1 className={styles.bannerTitle}>Activity Log</h1>
            <p className={styles.bannerSubtitle}>
              Audit history of user interactions, modifications, settings changes, and events across the platform.
            </p>
          </div>
          <div className={styles.bannerVisual} aria-hidden="true">
            <div className={styles.bannerLogoBg} />
          </div>
        </div>

        <div className={styles.searchWrap}>
          <div className={styles.searchRow}>
            <input
              type="text"
              placeholder="Search by user email, summary, or path..."
              className={styles.searchInput}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            <select
              className={styles.filterSelect}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              {ROLE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Activity Summary</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className={styles.emptyRow}>
                      <div className={styles.loadingSpinner} />
                      <p>Loading activity logs...</p>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className={styles.emptyRow}>
                      <p>No activity logs found.</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id}>
                      <td>{formatTimestamp(log.createdAt)}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{getActorName(log)}</div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{log.actor_email}</div>
                      </td>
                      <td>
                        <span className={`${styles.roleBadge} ${getRoleClass(log.actor_role)}`}>
                          {getRoleLabel(log.actor_role)}
                        </span>
                      </td>
                      <td style={{ maxWidth: '320px', wordBreak: 'break-word' }}>
                        {log.summary}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.viewButton}
                          onClick={() => setSelectedLog(log)}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageButton}
              onClick={() => fetchLogs(page - 1)}
              disabled={!canGoPrev || isLoading}
            >
              ← Prev
            </button>
            <span className={styles.pageInfo}>
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              className={styles.pageButton}
              onClick={() => fetchLogs(page + 1)}
              disabled={!canGoNext || isLoading}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div className={styles.modalOverlay} onClick={() => setSelectedLog(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Activity Details</h2>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setSelectedLog(null)}
              >
                ✕
              </button>
            </div>

            <div className={styles.formGrid}>
              <div>
                <span className={styles.fieldLabel}>Actor Name</span>
                <div className={styles.detailValue}>{getActorName(selectedLog)}</div>
              </div>
              <div>
                <span className={styles.fieldLabel}>Actor Email</span>
                <div className={styles.detailValue}>{selectedLog.actor_email || 'N/A'}</div>
              </div>
              <div>
                <span className={styles.fieldLabel}>User Role</span>
                <div className={styles.detailValue}>{getRoleLabel(selectedLog.actor_role)}</div>
              </div>
              <div>
                <span className={styles.fieldLabel}>Timestamp</span>
                <div className={styles.detailValue}>{formatTimestamp(selectedLog.createdAt)}</div>
              </div>
              <div>
                <span className={styles.fieldLabel}>Request Method</span>
                <div className={styles.detailValue} style={{ textTransform: 'uppercase' }}>
                  {selectedLog.method || 'N/A'}
                </div>
              </div>
              <div>
                <span className={styles.fieldLabel}>HTTP Status</span>
                <div className={styles.detailValue}>{selectedLog.status_code || 'N/A'}</div>
              </div>
              <div className={styles.fullWidth}>
                <span className={styles.fieldLabel}>API Path</span>
                <div className={styles.detailValue}>{selectedLog.path || 'N/A'}</div>
              </div>
              <div className={styles.fullWidth}>
                <span className={styles.fieldLabel}>IP Address</span>
                <div className={styles.detailValue}>{selectedLog.metadata?.ip || 'N/A'}</div>
              </div>
              <div className={styles.fullWidth}>
                <span className={styles.fieldLabel}>User Agent</span>
                <div className={styles.detailValue} style={{ fontSize: '0.85rem' }}>
                  {selectedLog.metadata?.userAgent || 'N/A'}
                </div>
              </div>
              {selectedLog.metadata?.details && (
                <div className={styles.fullWidth}>
                  <span className={styles.fieldLabel}>Operation Payload / Details</span>
                  <pre className={styles.jsonBlock}>
                    {JSON.stringify(selectedLog.metadata.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setSelectedLog(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
