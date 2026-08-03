"use client"
import { useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { HiOutlineHome, HiOutlineUsers, HiOutlineCreditCard, HiOutlineCalendarDays, HiOutlineIdentification } from 'react-icons/hi2'
import { apiClient } from '@/lib/apiClient'
import Sidebar from '../../components/sidebar/sidebar'
import Topnav from '../../components/topnav/topnav'
import OfflineIndicator from '../../components/offline-indicator/offline-indicator'
import styles from './layout.module.css'
import loadingStyles from './loading.module.css'

const BASE_APP_LINKS = [
  { href: '/dashboard', label: 'Dashboard', Icon: HiOutlineHome },
  { href: '/homeowner-management', label: 'Masterlist Record', Icon: HiOutlineUsers },
  { href: '/payment-monitoring', label: 'Payment Tracker', Icon: HiOutlineCreditCard },
  { href: '/hoa-announcements', label: 'HOA Announcements', Icon: HiOutlineCalendarDays },
]

const ACCOUNT_MANAGEMENT_LINK = {
  href: '/admin/account-management',
  label: 'Account Management',
  Icon: HiOutlineUsers,
}

const ACTIVITY_LOGS_LINK = {
  href: '/admin/activity-logs',
  label: 'Activity Log',
  Icon: HiOutlineCalendarDays,
}

function canAccessAccountManagement(role) {
  const normalizedRole = String(role || '').trim().toLowerCase()
  return normalizedRole === 'admin' || normalizedRole === 'president'
}

const MIN_LOADING_DISPLAY_MS = 800

export default function AppRouteGroupLayout({ children }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true)
  const [isMobileView, setIsMobileView] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [isSessionLoaded, setIsSessionLoaded] = useState(false)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [showLoadingScreen, setShowLoadingScreen] = useState(true)
  const pathname = usePathname()

  const currentUserRole = currentUser?.role || ''
  const normalizedRole = String(currentUserRole).trim().toLowerCase()

  let appLinks = []
  if (normalizedRole === 'homeowner') {
    appLinks = [
      { href: '/dashboard', label: 'Dashboard', Icon: HiOutlineHome },
      { href: '/my-profile', label: 'My Profile', Icon: HiOutlineIdentification },
      { href: '/my-payments', label: 'My Payments', Icon: HiOutlineCreditCard },
    ]
  } else if (normalizedRole === 'secretary') {
    appLinks = [
      { href: '/dashboard', label: 'Dashboard', Icon: HiOutlineHome },
      { href: '/homeowner-management', label: 'Masterlist Record', Icon: HiOutlineUsers },
      { href: '/hoa-announcements', label: 'HOA Announcements', Icon: HiOutlineCalendarDays },
    ]
  } else if (normalizedRole === 'treasurer') {
    appLinks = [
      { href: '/dashboard', label: 'Dashboard', Icon: HiOutlineHome },
      { href: '/payment-monitoring', label: 'Payment Tracker', Icon: HiOutlineCreditCard },
    ]
  } else {
    // Admin, President, or general officer
    appLinks = [...BASE_APP_LINKS]
    if (normalizedRole === 'admin' || normalizedRole === 'president') {
      appLinks.splice(2, 0, {
        href: '/pending-registrations',
        label: 'Pending Registrations',
        Icon: HiOutlineIdentification,
      })
      appLinks.push(ACCOUNT_MANAGEMENT_LINK)
      appLinks.push(ACTIVITY_LOGS_LINK)
    }
  }

  useEffect(() => {
    let isMounted = true
    const startTime = Date.now()

    const loadCurrentUser = async () => {
      try {
        const response = await apiClient.get('/auth/me')
        if (isMounted && response?.user) {
          setCurrentUser(response.user)
        }
      } catch {
        if (isMounted) {
          setCurrentUser(null)
        }
      } finally {
        if (isMounted) {
          const elapsed = Date.now() - startTime
          const remaining = Math.max(0, MIN_LOADING_DISPLAY_MS - elapsed)

          setTimeout(() => {
            if (isMounted) {
              setIsSessionLoaded(true)
            }
          }, remaining)
        }
      }
    }

    loadCurrentUser()

    return () => {
      isMounted = false
    }
  }, [])

  // Handle fade-out transition when session finishes loading
  useEffect(() => {
    if (isSessionLoaded && showLoadingScreen) {
      setIsFadingOut(true)

      const fadeTimer = setTimeout(() => {
        setShowLoadingScreen(false)
        setIsFadingOut(false)
      }, 500) // matches the CSS fade-out animation duration

      return () => clearTimeout(fadeTimer)
    }
  }, [isSessionLoaded, showLoadingScreen])

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const modalActive = !!document.querySelector('[class*="modalOverlay"]')
      if (modalActive) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    return () => {
      observer.disconnect()
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    const mobileBreakpoint = 1024

    const handleResize = () => {
      const mobile = window.innerWidth <= mobileBreakpoint
      setIsMobileView(mobile)

      if (mobile) {
        setIsSidebarCollapsed(true)
      } else {
        setIsSidebarCollapsed(false)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  useEffect(() => {
    if (isMobileView) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSidebarCollapsed(true)
    }
  }, [pathname, isMobileView])

  return (
    <>
      {showLoadingScreen && (
        <div className={isFadingOut ? loadingStyles.loadingOverlayFadeOut : loadingStyles.loadingOverlay}>
          <div className={loadingStyles.bgGrid} aria-hidden="true" />
          <div className={loadingStyles.bgBlob1} aria-hidden="true" />
          <div className={loadingStyles.bgBlob2} aria-hidden="true" />
          <div className={loadingStyles.bgSquare} aria-hidden="true" />
          <div className={loadingStyles.bgSquare2} aria-hidden="true" />

          <div className={loadingStyles.loadingContent}>
            <div className={loadingStyles.logoContainer}>
              <div className={loadingStyles.pulseRing} aria-hidden="true" />
              <div className={loadingStyles.pulseRing2} aria-hidden="true" />
              <Image
                src="/images/HOA_Logo.png"
                alt="OneHOA Logo"
                width={72}
                height={72}
                className={loadingStyles.logoImage}
                priority
              />
            </div>

            <span className={loadingStyles.brandName}>OneHOA</span>
            <span className={loadingStyles.loadingText}>Preparing your dashboard…</span>

            <div className={loadingStyles.progressTrack}>
              <div className={loadingStyles.progressBar} />
            </div>

            <div className={loadingStyles.skeletonPreview} aria-hidden="true">
              <div className={loadingStyles.skeletonCard} />
              <div className={loadingStyles.skeletonCard} />
              <div className={loadingStyles.skeletonCard} />
            </div>
          </div>
        </div>
      )}

      <div className={styles.shell}>
        <Sidebar isCollapsed={isSidebarCollapsed} links={appLinks} user={currentUser} />

        {isMobileView && !isSidebarCollapsed && (
          <div
            className={styles.mobileBackdrop}
            onClick={() => setIsSidebarCollapsed(true)}
            aria-hidden="true"
          />
        )}

        <div className={styles.mainColumn}>
          <OfflineIndicator />
          <Topnav
            user={currentUser}
            isSidebarCollapsed={isSidebarCollapsed}
            canToggleSidebar={true}
            onToggleSidebar={() => {
              setIsSidebarCollapsed((prev) => !prev)
            }}
          />
          <main className={styles.content}>{children}</main>
        </div>
      </div>
    </>
  )
}

