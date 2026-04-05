"use client"

import { useState } from 'react'
import Link from 'next/link'
import { apiClient, ApiError } from '@/lib/apiClient'
import { notify } from '@/lib/notify'
import styles from './forgot-password.module.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [devCodeHint, setDevCodeHint] = useState('')

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

  const handleResetPassword = async (event) => {
    event.preventDefault()

    if (!email.trim() || !code.trim() || !newPassword) {
      notify.error('Email, code, and new password are required.')
      return
    }

    setIsResetting(true)

    try {
      await apiClient.post('/auth/reset-password', {
        email: email.trim().toLowerCase(),
        code: code.trim(),
        new_password: newPassword,
      })

      notify.success('Password reset successful. You can now login.')
      setCode('')
      setNewPassword('')
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
      <section className={styles.card}>
        <h1 className={styles.title}>Forgot Password</h1>
        <p className={styles.subtitle}>Enter your account email to receive a reset code.</p>

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

        <div className={styles.separator} />

        <form className={styles.form} onSubmit={handleResetPassword}>
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

          <label className={styles.field}>
            <span className={styles.label}>New Password</span>
            <input
              type="password"
              className={styles.input}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
            />
          </label>

          <button type="submit" className={styles.button} disabled={isResetting}>
            {isResetting ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <Link href="/login" className={styles.backLink}>Back to Login</Link>
      </section>
    </main>
  )
}
