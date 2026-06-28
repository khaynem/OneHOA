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
import styles from '../forgot-password.module.css'

export default function VerifyResetCodePage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [devCodeHint, setDevCodeHint] = useState('')

  useEffect(() => {
    const flowState = getPasswordResetFlowState()

    if (!flowState.email) {
      notify.info('Please request a reset code first.')
      router.replace('/forgot-password')
      return
    }

    setEmail(flowState.email)
    if (flowState.code) {
      setCode(flowState.code)
    }
  }, [router])

  const handleVerifyCode = (event) => {
    event.preventDefault()

    if (!email.trim() || !code.trim()) {
      notify.error('Email and reset code are required.')
      return
    }

    if (!/^\d{6}$/.test(code.trim())) {
      notify.error('Reset code must be a 6-digit number.')
      return
    }

    setIsVerifying(true)

    setPasswordResetFlowState({
      email: email.trim().toLowerCase(),
      code: code.trim(),
    })

    notify.success('Code captured. Continue to reset your password.')
    router.push('/forgot-password/reset')
  }

  const handleResendCode = async () => {
    if (!email.trim()) {
      notify.error('Email is required.')
      return
    }

    setIsResending(true)
    setDevCodeHint('')

    try {
      const response = await apiClient.post('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      })

      notify.success('A new reset code has been sent if your account exists.')

      if (response?.dev_reset_code) {
        setDevCodeHint(`Dev code (SMTP not configured): ${response.dev_reset_code}`)
      }
    } catch (error) {
      if (error instanceof ApiError) {
        notify.error(error.message)
      } else {
        notify.error('Unable to resend code right now. Please try again.')
      }
    } finally {
      setIsResending(false)
    }
  }

  return (
    <main className={styles.container}>
      <section className={styles.leftPane}>
        <div className={styles.dotGrid} aria-hidden="true" />
        <div className={styles.square1} aria-hidden="true" />
        <div className={styles.square2} aria-hidden="true" />
        <div className={styles.formCard}>
          <div className={styles.stepHeader}>
            <span className={styles.stepPill}>1</span>
            <span className={styles.stepLabel}>Request Code</span>
            <span className={`${styles.stepPill} ${styles.stepActive}`}>2</span>
            <span className={styles.stepLabel}>Verify</span>
            <span className={styles.stepPill}>3</span>
            <span className={styles.stepLabel}>Reset Password</span>
          </div>

          <h1 className={styles.title}>Verify Reset Code</h1>
          <p className={styles.subtitle}>Enter the code sent to your email address.</p>

          <form className={styles.form} onSubmit={handleVerifyCode}>
            <label className={styles.field}>
              <span className={styles.label}>Email</span>
              <input type="email" className={styles.input} value={email} disabled />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Reset Code</span>
              <input
                type="text"
                className={styles.input}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                maxLength={6}
              />
            </label>

            <button type="submit" className={styles.button} disabled={isVerifying}>
              {isVerifying ? 'Processing...' : 'Verify Code'}
            </button>
          </form>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleResendCode}
            disabled={isResending}
          >
            {isResending ? 'Resending code...' : 'Resend Code'}
          </button>

          {devCodeHint && <p className={styles.devHint}>{devCodeHint}</p>}

          <Link href="/forgot-password" className={styles.backLink}>Back to Email Step</Link>
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