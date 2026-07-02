"use client"
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { HiOutlineHome, HiOutlineUsers, HiOutlineCreditCard, HiOutlineCalendarDays, HiOutlineIdentification } from 'react-icons/hi2'
import { apiClient } from '@/lib/apiClient'
import Sidebar from '../../components/sidebar/sidebar'
import Topnav from '../../components/topnav/topnav'
import styles from './layout.module.css'

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

function canAccessAccountManagement(role) {
  const normalizedRole = String(role || '').trim().toLowerCase()
  return normalizedRole === 'admin'
}

export default function AppRouteGroupLayout({ children }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true)
  const [isMobileView, setIsMobileView] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const pathname = usePathname()

  const currentUserRole = currentUser?.role || ''
  const normalizedRole = String(currentUserRole).trim().toLowerCase()

  const appLinks = [...BASE_APP_LINKS]
  if (normalizedRole === 'admin' || normalizedRole === 'president') {
    appLinks.splice(2, 0, {
      href: '/pending-registrations',
      label: 'Pending Registrations',
      Icon: HiOutlineIdentification,
    })
  }
  if (normalizedRole === 'admin') {
    appLinks.push(ACCOUNT_MANAGEMENT_LINK)
  }

  useEffect(() => {
    let isMounted = true

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
      }
    }

    loadCurrentUser()

    return () => {
      isMounted = false
    }
  }, [])

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
      setIsSidebarCollapsed(true)
    }
  }, [pathname, isMobileView])

  return (
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
  )
}
