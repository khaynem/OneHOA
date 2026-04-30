"use client"
import { useEffect, useState } from 'react'
import { HiOutlineHome, HiOutlineUsers, HiOutlineCreditCard, HiOutlineCalendarDays } from 'react-icons/hi2'
import { apiClient } from '@/lib/apiClient'
import Sidebar from '../../components/sidebar/sidebar'
import Topnav from '../../components/topnav/topnav'
import styles from './layout.module.css'

const BASE_APP_LINKS = [
  { href: '/dashboard', label: 'Dashboard', Icon: HiOutlineHome },
  { href: '/homeowner-management', label: 'Homeowner Management', Icon: HiOutlineUsers },
  { href: '/payment-monitoring', label: 'Payment Monitoring', Icon: HiOutlineCreditCard },
  { href: '/hoa-activities', label: 'HOA Activities', Icon: HiOutlineCalendarDays },
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileView, setIsMobileView] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState('')

  const appLinks = canAccessAccountManagement(currentUserRole)
    ? [...BASE_APP_LINKS, ACCOUNT_MANAGEMENT_LINK]
    : BASE_APP_LINKS

  useEffect(() => {
    let isMounted = true

    const loadCurrentUser = async () => {
      try {
        const response = await apiClient.get('/auth/me')
        if (isMounted && response?.user?.role) {
          setCurrentUserRole(String(response.user.role))
        }
      } catch {
        if (isMounted) {
          setCurrentUserRole('')
        }
      }
    }

    loadCurrentUser()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const mobileBreakpoint = 900

    const handleResize = () => {
      const mobile = window.innerWidth <= mobileBreakpoint
      setIsMobileView(mobile)

      if (mobile) {
        setIsSidebarCollapsed(true)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div className={styles.shell}>
      <Sidebar isCollapsed={isSidebarCollapsed} links={appLinks} />
      <div className={styles.mainColumn}>
        <Topnav
          isSidebarCollapsed={isSidebarCollapsed}
          canToggleSidebar={!isMobileView}
          onToggleSidebar={() => {
            if (isMobileView) {
              return
            }
            setIsSidebarCollapsed((prev) => !prev)
          }}
        />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  )
}
