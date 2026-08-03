"use client"

import { useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import {
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineClock,
  HiOutlineChartPie,
  HiOutlineMegaphone,
  HiOutlineCalendar,
  HiOutlineUser,
} from "react-icons/hi2"
import { ApiError, apiClient } from "@/lib/apiClient"
import styles from "./dashboard.module.css"

const getAnnouncementImageUrl = (item) => {
  if (item?.["pictures._id"]?.path) return item["pictures._id"].path
  if (item?.pictures?._id?.path) return item.pictures._id.path
  return null
}

const formatDateTime = (dateValue) => {
  if (!dateValue) return "-"
  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) return "-"
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(parsed)
}

export default function HomeownerDashboardView({ currentUser }) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState("")
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)

  useEffect(() => {
    async function loadHomeownerDashboard() {
      try {
        setIsLoading(true)
        setErrorMsg("")
        const res = await apiClient.get("/homeowner/dashboard")
        setData(res || null)
      } catch (err) {
        if (err instanceof ApiError) {
          setErrorMsg(err.message)
        } else {
          setErrorMsg("Failed to load homeowner dashboard data.")
        }
      } finally {
        setIsLoading(false)
      }
    }
    loadHomeownerDashboard()
  }, [])

  const stats = data?.stats || {}
  const record = data?.record || {}
  const announcements = data?.announcements || []
  const recentAnnouncements = announcements.slice(0, 3)

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat("en-PH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date())
  }, [])

  const homeownerName = record.first_name || currentUser?.first_name || "Homeowner"

  if (isLoading) {
    return (
      <>
        <div className={styles.backgroundContainer} aria-hidden="true">
          <div className={styles.gridOverlay} />
          <div className={styles.blob1} />
          <div className={styles.blob2} />
          <div className={styles.movingGradient} />
        </div>

        <div className={styles.pageContent}>
          {/* Skeleton Banner */}
          <div className={styles.skeletonBanner} aria-label="Loading homeowner dashboard">
            <div className={styles.skeletonBannerBadge} />
            <div className={styles.skeletonBannerTitle} />
            <div className={styles.skeletonBannerSubtitle} />
            <div className={styles.skeletonBannerDate} />
          </div>

          {/* Skeleton Stat Cards */}
          <div className={styles.skeletonStatGrid}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.skeletonStatCard}>
                <div className={styles.skeletonStatInfo}>
                  <div className={styles.skeletonStatLabel} />
                  <div className={styles.skeletonStatValue} />
                  <div className={styles.skeletonStatSubtext} />
                </div>
                <div className={styles.skeletonStatIconWrap} />
              </div>
            ))}
          </div>

          {/* Skeleton Announcements Section */}
          <div className={styles.skeletonSectionGrid} style={{ gridTemplateColumns: '1fr' }}>
            <div className={styles.skeletonListCard}>
              <div className={styles.skeletonSectionTitle} />
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className={styles.skeletonListRow}>
                  <div className={styles.skeletonDot} />
                  <div className={styles.skeletonRowText}>
                    <div className={styles.skeletonRowTitle} />
                    <div className={styles.skeletonRowSubtitle} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className={styles.backgroundContainer} aria-hidden="true">
        <div className={styles.gridOverlay} />
        <div className={styles.blob1} />
        <div className={styles.blob2} />
        <div className={styles.movingGradient} />
      </div>

      <div className={styles.pageContent}>
        {/* Welcome Banner */}
        <div className={styles.welcomeBanner}>
          <div className={styles.bannerContent}>
            <span className={styles.bannerBadge}>Homeowner Portal &bull; Fiesta Community</span>
            <h1 className={styles.bannerTitle}>
              Welcome, <span className={styles.nameHighlight}>{homeownerName}</span>!
            </h1>
            <p className={styles.bannerSubtitle}>
              Here is your personal monthly dues payment summary and the official HOA community announcement board.
            </p>
            <div className={styles.bannerDate}>
              <HiOutlineCalendar aria-hidden="true" />
              <span>{formattedDate}</span>
              {record.generated_id && (
                <span className={styles.idBadge}>ID: #{record.generated_id}</span>
              )}
            </div>
          </div>
          <div className={styles.bannerVisual} aria-hidden="true">
            <div className={styles.bannerLogoBg} />
          </div>
        </div>

        {errorMsg && <p className={styles.errorText}>{errorMsg}</p>}

        {/* Top 3 Stat Cards for Homeowner - styled consistently with officer/president interface */}
        <section className={styles.cardGrid} aria-label="Homeowner dues summary">
          {/* Card 1: Current Month Payment Reminder */}
          <Link
            href="/my-payments"
            className={`${styles.statCard} ${stats.isCurrentMonthPaid ? styles.teal : styles.amber}`}
            aria-label="Current Month Reminder"
          >
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Current Month Reminder</p>
              <p className={styles.statValue}>
                {stats.isCurrentMonthPaid ? "PAID" : "UNPAID"}
              </p>
              <p className={styles.statSubtext}>
                {stats.isCurrentMonthPaid
                  ? `Dues for ${stats.currentMonthLabel || "this month"} settled`
                  : `Due for ${stats.currentMonthLabel || "this month"}`}
              </p>
            </div>
            <div className={styles.statIconWrap}>
              {stats.isCurrentMonthPaid ? (
                <HiOutlineCheckCircle className={styles.statIcon} aria-hidden="true" />
              ) : (
                <HiOutlineExclamationTriangle className={styles.statIcon} aria-hidden="true" />
              )}
            </div>
          </Link>

          {/* Card 2: Pending Payments */}
          <Link
            href="/my-payments"
            className={`${styles.statCard} ${stats.pendingMonthsCount > 0 ? styles.amber : styles.blue}`}
            aria-label="Pending Payments"
          >
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Pending Payments</p>
              <p className={styles.statValue}>
                {stats.pendingMonthsCount ?? 0} {stats.pendingMonthsCount === 1 ? "Month" : "Months"}
              </p>
              <p className={styles.statSubtext}>
                {stats.pendingMonthsCount > 0
                  ? `Pending: ${stats.pendingPeriods?.slice(0, 2).join(", ")}${
                      stats.pendingPeriods?.length > 2 ? "..." : ""
                    }`
                  : "All dues up to date"}
              </p>
            </div>
            <div className={styles.statIconWrap}>
              <HiOutlineClock className={styles.statIcon} aria-hidden="true" />
            </div>
          </Link>

          {/* Card 3: Percentage of Paid Monthly Dues */}
          <Link
            href="/my-payments"
            className={`${styles.statCard} ${styles.blue}`}
            aria-label="Paid Dues Rate"
          >
            <div className={styles.statInfo}>
              <p className={styles.statLabel}>Paid Dues Rate</p>
              <p className={styles.statValue}>{stats.paidPercentage ?? 100}%</p>
              <p className={styles.statSubtext}>
                {stats.totalPaidCount ?? 0} out of {stats.totalEligibleCount ?? 0} total months settled
              </p>
            </div>
            <div className={styles.statIconWrap}>
              <HiOutlineChartPie className={styles.statIcon} aria-hidden="true" />
            </div>
          </Link>
        </section>

        {/* Bottom Section: Announcement Board of Homeowners */}
        <section className={styles.announcementSection}>
          <div className={styles.sectionHeaderRow}>
            <div className={styles.titleWithBadge}>
              <div className={styles.badgeIconWrap}>
                <HiOutlineMegaphone className={styles.megaphoneIcon} />
              </div>
              <div>
                <h2 className={styles.announcementBoardTitle}>HOA Homeowner Announcement Board</h2>
                <p className={styles.announcementBoardSub}>
                  Stay updated with official community notices, meetings, and activities from the Board of Officers.
                </p>
              </div>
            </div>
          </div>

          {recentAnnouncements.length === 0 && !isLoading && (
            <div className={styles.emptyAnnouncementsCard}>
              <HiOutlineMegaphone className={styles.emptyIcon} />
              <h3>No announcements posted yet</h3>
              <p>Check back later for official announcements and community news.</p>
            </div>
          )}

          <div className={styles.announcementsVerticalList}>
            {recentAnnouncements.map((item) => {
              const authorName = item["users._id"]
                ? `${item["users._id"].first_name || ""} ${item["users._id"].last_name || ""}`.trim() || "HOA Board"
                : "HOA Officer"

              return (
                <article key={item._id} className={styles.announcementRowCard}>
                  <div className={styles.announcementRowBody}>
                    <div className={styles.announcementMeta}>
                      <span className={styles.authorBadge}>
                        <HiOutlineUser className={styles.metaIcon} />
                        {authorName}
                      </span>
                      <span className={styles.dateBadge}>
                        <HiOutlineCalendar className={styles.metaIcon} />
                        {formatDateTime(item.date || item.createdAt)}
                      </span>
                    </div>

                    <h3 className={styles.announcementTitle}>{item.title}</h3>
                    <p className={styles.announcementSnippet}>
                      {item.content || "No details provided."}
                    </p>

                    <button
                      type="button"
                      className={styles.readMoreBtn}
                      onClick={() => setSelectedAnnouncement(item)}
                    >
                      Read Full Announcement &rarr;
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        {/* Modal for Full Announcement View */}
        {selectedAnnouncement && createPortal(
          <div
            className={styles.modalBackdrop}
            onClick={() => setSelectedAnnouncement(null)}
            aria-hidden="true"
          >
            <div
              className={styles.modalCard}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
              <div className={styles.modalHeader}>
                <div>
                  <span className={styles.authorBadge}>Official HOA Announcement</span>
                  <h2 className={styles.modalTitle}>{selectedAnnouncement.title}</h2>
                  <p className={styles.modalMeta}>
                    Posted on {formatDateTime(selectedAnnouncement.date || selectedAnnouncement.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={() => setSelectedAnnouncement(null)}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>

              <div className={styles.modalBody}>
                {getAnnouncementImageUrl(selectedAnnouncement) && (
                  <div className={styles.modalImgWrap}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getAnnouncementImageUrl(selectedAnnouncement)}
                      alt={selectedAnnouncement.title}
                      className={styles.modalImage}
                    />
                  </div>
                )}
                <div className={styles.modalContentText}>
                  {selectedAnnouncement.content ? (
                    selectedAnnouncement.content.split("\n").map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))
                  ) : (
                    <p>No extra content provided.</p>
                  )}
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.modalDoneBtn}
                  onClick={() => setSelectedAnnouncement(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    </>
  )
}
