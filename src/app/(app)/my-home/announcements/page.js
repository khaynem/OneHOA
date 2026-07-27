"use client"

import { useEffect, useState } from 'react'
import { HiOutlineCalendarDays } from 'react-icons/hi2'
import { apiClient } from '@/lib/apiClient'
import { notify } from '@/lib/notify'
import styles from './announcements.module.css'

const formatDateTimeAMPM = (value) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(parsed)
}

export default function MyAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [selectedAnn, setSelectedAnn] = useState(null)

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        setErrorMessage('')
        const res = await apiClient.get('/activities')
        if (res?.success) {
          const raw = Array.isArray(res.data) ? res.data : []
          const mapped = raw
            .filter((a) => !a.archived)
            .map((a) => ({
              id: String(a._id || ''),
              title: String(a.title || ''),
              content: String(a.content || ''),
              postedDate: a.createdAt || a.date || null,
              reporter: a.users?._id
                ? (a.users._id.first_name || '') + ' ' + (a.users._id.last_name || '')
                : '',
            }))
            .sort((a, b) => new Date(b.postedDate || 0).getTime() - new Date(a.postedDate || 0).getTime())
          setAnnouncements(mapped)
        }
      } catch (error) {
        setErrorMessage(error.message || 'Failed to load announcements.')
        notify.error({
          title: 'Load Error',
          description: error.message || 'Unable to load announcements.',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
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
        {isLoading && <p className={styles.stateText}>Loading announcements...</p>}
        {!isLoading && errorMessage && <p className={styles.errorText}>{errorMessage}</p>}

        {!isLoading && !errorMessage && (
          <section className={styles.announcementsCard}>
            <h2 className={styles.cardTitle}>
              <HiOutlineCalendarDays className={styles.cardIcon} />
              HOA Announcements
            </h2>

            {announcements.length > 0 ? (
              <div className={styles.list}>
                {announcements.map((ann) => (
                  <button
                    key={ann.id}
                    type="button"
                    className={styles.announcementItem}
                    onClick={() => setSelectedAnn(ann)}
                  >
                    <p className={styles.announcementTitle}>
                      <span className={styles.announcementDot} />
                      {ann.title}
                    </p>
                    <p className={styles.announcementContent}>{ann.content}</p>
                    <p className={styles.announcementDate}>
                      Posted: {formatDateTimeAMPM(ann.postedDate)}
                      {ann.reporter ? ' by ' + ann.reporter : ''}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>No announcements posted yet.</div>
            )}
          </section>
        )}
      </div>

      {selectedAnn && (
        <div className={styles.modalOverlay} onClick={() => setSelectedAnn(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{selectedAnn.title}</h3>
              <button type="button" className={styles.closeBtn} onClick={() => setSelectedAnn(null)}>
                &times;
              </button>
            </div>
            <p className={styles.modalContent}>{selectedAnn.content}</p>
            <p className={styles.modalDate}>
              Posted: {formatDateTimeAMPM(selectedAnn.postedDate)}
              {selectedAnn.reporter ? ' by ' + selectedAnn.reporter : ''}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
