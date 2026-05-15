"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { apiClient, ApiError } from '@/lib/apiClient'
import { notify } from '@/lib/notify'
import { isStrongPassword, STRONG_PASSWORD_MESSAGE } from '@/lib/passwordPolicy'
import {
  clearPasswordResetFlowState,
  getPasswordResetFlowState,
} from '@/lib/passwordResetFlow'
import styles from '../forgot-password.module.css'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  useEffect(() => {
    const flowState = getPasswordResetFlowState()

    if (!flowState.email) {
      notify.info('Please request a reset code first.')
      router.replace('/forgot-password')
      return
    }

    if (!flowState.code) {
      notify.info('Please verify your reset code first.')
      router.replace('/forgot-password/verify')
      return
    }

    setEmail(flowState.email)
    setCode(flowState.code)
  }, [router])

  const handleResetPassword = async (event) => {
    event.preventDefault()

    if (!email.trim() || !code.trim() || !newPassword || !confirmNewPassword) {
      notify.error('Email, code, new password, and confirm new password are required.')
      return
    }

    if (newPassword !== confirmNewPassword) {
      notify.error('New password and confirm new password do not match.')
      return
    }

    if (!isStrongPassword(newPassword)) {
      notify.error(STRONG_PASSWORD_MESSAGE)
      return
    }

    setIsResetting(true)

    try {
      await apiClient.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        new_password: newPassword,
      })

      clearPasswordResetFlowState()
      notify.success('Password reset successful. You can now login.')
      router.push('/login')
    } catch (error) {
      if (error instanceof ApiError) {
        notify.error(error.message)
      } else {
        notify.error('Unable to reset password right now. Please try again.')
      }
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <main className={styles.container}>
      <section className={styles.leftPane}>
        <div className={styles.formCard}>
          <div className={styles.stepHeader}>
            <span className={styles.stepPill}>1</span>
            <span className={styles.stepLabel}>Request Code</span>
            <span className={styles.stepPill}>2</span>
            <span className={styles.stepLabel}>Verify</span>
            <span className={`${styles.stepPill} ${styles.stepActive}`}>3</span>
            <span className={styles.stepLabel}>Reset Password</span>
          </div>

          <h1 className={styles.title}>Create a New Password</h1>
          <p className={styles.subtitle}>Set your new password to complete account recovery.</p>

          <form className={styles.form} onSubmit={handleResetPassword}>
            <label className={styles.field}>
              <span className={styles.label}>Email</span>
              <input type="email" className={styles.input} value={email} disabled />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Verified Code</span>
              <input type="text" className={styles.input} value={code} disabled />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>New Password</span>
              <div className={styles.passwordWrap}>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className={styles.input}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={() => setShowNewPassword((current) => !current)}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showNewPassword}
                >
                  {showNewPassword ? (
                    <FiEye className={styles.eyeIcon} aria-hidden="true" />
                  ) : (
                    <FiEyeOff className={styles.eyeIcon} aria-hidden="true" />
                  )}
                </button>
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Confirm New Password</span>
              <div className={styles.passwordWrap}>
                <input
                  type={showConfirmNewPassword ? 'text' : 'password'}
                  className={styles.input}
                  value={confirmNewPassword}
                  onChange={(event) => setConfirmNewPassword(event.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={() => setShowConfirmNewPassword((current) => !current)}
                  aria-label={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showConfirmNewPassword}
                >
                  {showConfirmNewPassword ? (
                    <FiEye className={styles.eyeIcon} aria-hidden="true" />
                  ) : (
                    <FiEyeOff className={styles.eyeIcon} aria-hidden="true" />
                  )}
                </button>
              </div>
            </label>

            <p className={styles.devHint}>
              Strong password requirements: minimum 8 characters, with at least 1 uppercase letter, 1 lowercase letter, and 1 special character.
            </p>

            <button type="submit" className={styles.button} disabled={isResetting}>
              {isResetting ? 'Resetting...' : 'Save New Password'}
            </button>
          </form>

          <Link href="/forgot-password/verify" className={styles.backLink}>Back to Verification</Link>
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