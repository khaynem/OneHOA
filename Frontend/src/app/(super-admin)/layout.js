"use client"
import { useEffect, useState } from 'react'
import { HiOutlineUsers } from 'react-icons/hi2'
import Sidebar from '@/components/sidebar/sidebar'
import Topnav from '@/components/topnav/topnav'
import styles from './layout.module.css'

const SUPER_ADMIN_LINKS = [
  {
    href: '/admin/account-management',
    label: 'Account Management',
    Icon: HiOutlineUsers
  }
]

export default function SuperAdminLayout({ children }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileView, setIsMobileView] = useState(false)

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
      <Sidebar isCollapsed={isSidebarCollapsed} links={SUPER_ADMIN_LINKS} />
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
