"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { apiClient, ApiError } from '@/lib/apiClient'
import { notify } from '@/lib/notify'
import {
  getPasswordResetFlowState,
  setPasswordResetFlowState,
} from '@/lib/passwordResetFlow'
import styles from './forgot-password.module.css'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [devCodeHint, setDevCodeHint] = useState('')

  useEffect(() => {
    const existingFlow = getPasswordResetFlowState()
    if (existingFlow.email) {
      setEmail(existingFlow.email)
    }
  }, [])

  const handleSendCode = async (event) => {
    event.preventDefault()

    if (!email.trim()) {
      notify.error('Email is required.')
      return
    }

    setIsSendingCode(true)
    setDevCodeHint('')

    try {
      const response = await apiClient.post('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      })

      notify.success('If your account exists, a reset code has been sent to your email.')

      if (response?.dev_reset_code) {
        setDevCodeHint(`Dev code (SMTP not configured): ${response.dev_reset_code}`)
      }

      setPasswordResetFlowState({
        email: email.trim().toLowerCase(),
        code: '',
      })
      router.push('/forgot-password/verify')
    } catch (error) {
      if (error instanceof ApiError) {
        notify.error(error.message)
      } else {
        notify.error('Unable to send reset code right now. Please try again.')
      }
    } finally {
      setIsSendingCode(false)
    }
  }

  return (
    <main className={styles.container}>
      <section className={styles.leftPane}>
        <div className={styles.formCard}>
          <div className={styles.stepHeader}>
            <span className={`${styles.stepPill} ${styles.stepActive}`}>1</span>
            <span className={styles.stepLabel}>Request Code</span>
            <span className={styles.stepPill}>2</span>
            <span className={styles.stepLabel}>Verify</span>
            <span className={styles.stepPill}>3</span>
            <span className={styles.stepLabel}>Reset Password</span>
          </div>

          <h1 className={styles.title}>Forgot Password</h1>
          <p className={styles.subtitle}>Enter your account email and we will send a reset code.</p>

          <form className={styles.form} onSubmit={handleSendCode}>
            <label className={styles.field}>
              <span className={styles.label}>Email</span>
              <input
                type="email"
                className={styles.input}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </label>

            <button type="submit" className={styles.button} disabled={isSendingCode}>
              {isSendingCode ? 'Sending code...' : 'Send Reset Code'}
            </button>
          </form>

          {devCodeHint && <p className={styles.devHint}>{devCodeHint}</p>}

          <Link href="/login" className={styles.backLink}>Back to Login</Link>
        </div>
      </section>

      <section className={styles.rightPane}>
        <div className={styles.brandContent}>
          <Image
            src="/images/HOA Logo.png"
            alt="OneHOA Logo"
            width={170}
            height={170}
            className={styles.logo}
            priority
          />
          <h2 className={styles.brandTitle}>OneHOA</h2>
          <p className={styles.brandLead}>
            Management Information System for
            <br />
            Homeowner Records, Certification,
            <br />
            and Dues Monitoring
          </p>
        </div>
        <p className={styles.copyright}>© 2026 Endurix. All rights reserved.</p>
      </section>
    </main>
  )
}
