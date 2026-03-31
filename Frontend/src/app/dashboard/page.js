"use client"

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient,ApiError } from '@/lib/apiClient'
import styles from './dashboard.module.css'

export default function DashboardPage() {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState('')

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout')
      router.push('/login')
      router.refresh()
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('Unable to logout right now. Please try again.')
      }
    }
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Dashboard</h1>
      <p className={styles.lead}>Overview of the OneHOA system: quick links and summaries.</p>

      <ul className={styles.list}>
        <li><Link href="/homeowner-management">Homeowner Management</Link></li>
        <li><Link href="/payment-monitoring">Payment Monitoring</Link></li>
        <li><Link href="/hoa-activities">HOA Activities</Link></li>
      </ul>

      <nav className={styles.nav}>
        <Link href="/">Landing</Link> {' | '}
        <Link href="/login">Login</Link> {' | '}
        <button href="/logout" onClick={handleLogout}>
          Logout
        </button>
      </nav>
    </main>
  )
}
