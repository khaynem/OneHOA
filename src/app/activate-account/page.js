"use client"

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { FaCheckCircle } from 'react-icons/fa'
import { notify } from '@/lib/notify'
import { isStrongPassword, STRONG_PASSWORD_MESSAGE } from '@/lib/passwordPolicy'
import styles from './activate-account.module.css'

function ActivateAccountContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isActivated, setIsActivated] = useState(false)

  useEffect(() => {
    const emailParam = searchParams.get('email') || ''
    const codeParam = searchParams.get('code') || ''
    if (emailParam) setEmail(emailParam)
    if (codeParam) setCode(codeParam)
  }, [searchParams])

  const handleActivate = async (e) => {
    e.preventDefault()

    if (!email.trim() || !code.trim() || !newPassword || !confirmPassword) {
      notify.error({ title: 'Missing Fields', description: 'All fields are required.' })
      return
    }

    if (code.trim().length !== 6) {
      notify.error({ title: 'Invalid Code', description: 'Please enter a valid 6-digit activation code.' })
      return
    }

    if (newPassword !== confirmPassword) {
      notify.error({ title: 'Password Mismatch', description: 'New password and confirmation do not match.' })
      return
    }

    if (!isStrongPassword(newPassword)) {
      notify.error({ title: 'Weak Password', description: STRONG_PASSWORD_MESSAGE })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/auth/activate-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          new_password: newPassword,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Activation failed.')
      }

      setIsActivated(true)
      notify.success({ title: 'Account Activated!', description: 'You can now log in with your new password.' })
    } catch (err) {
      console.error(err)
      notify.error({ title: 'Activation Failed', description: err.message || 'Failed to activate your account.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isActivated) {
    return (
      <main className={styles.container}>
        <section className={styles.leftPane}>
          <div className={styles.dotGrid} aria-hidden="true" />
          <div className={styles.square1} aria-hidden="true" />
          <div className={styles.square2} aria-hidden="true" />
          <div className={styles.successCard}>
            <FaCheckCircle className={styles.successIcon} />
            <h1 className={styles.successTitle}>Account Activated!</h1>
            <p className={styles.successText}>
              Your homeowner account is now active. You can log in to OneHOA using your email and the password you just created.
            </p>
            <Link href="/login" className={styles.loginBtn}>
              Go to Login
            </Link>
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

  return (
    <main className={styles.container}>
      <section className={styles.leftPane}>
        <div className={styles.dotGrid} aria-hidden="true" />
        <div className={styles.square1} aria-hidden="true" />
        <div className={styles.square2} aria-hidden="true" />
        <div className={styles.formCard}>
          <h1 className={styles.title}>Activate Your Account</h1>
          <p className={styles.subtitle}>
            Set your password to complete account activation and start using OneHOA.
          </p>

          <form className={styles.form} onSubmit={handleActivate}>
            <label className={styles.field}>
              <span className={styles.label}>Email Address</span>
              <input
                type="email"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
                disabled={!!searchParams.get('email')}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Activation Code (6 Digits)</span>
              <input
                type="text"
                maxLength={6}
                className={styles.input}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                disabled={!!searchParams.get('code')}
              />
            </label>

            <label className={styles.field}>
              <span className={styles.label}>New Password</span>
              <div className={styles.passwordWrap}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={styles.input}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={() => setShowPassword((c) => !c)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FiEye className={styles.eyeIcon} /> : <FiEyeOff className={styles.eyeIcon} />}
                </button>
              </div>
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Confirm Password</span>
              <div className={styles.passwordWrap}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={styles.input}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                />
                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={() => setShowConfirmPassword((c) => !c)}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <FiEye className={styles.eyeIcon} /> : <FiEyeOff className={styles.eyeIcon} />}
                </button>
              </div>
            </label>

            <p className={styles.policyHint}>
              Password must be at least 8 characters with at least 1 uppercase letter, 1 lowercase letter, and 1 special character.
            </p>

            <button type="submit" className={styles.button} disabled={isSubmitting}>
              {isSubmitting ? 'Activating...' : 'Activate Account'}
            </button>
          </form>

          <Link href="/login" className={styles.backLink}>Already activated? Go to Login</Link>
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

export default function ActivateAccountPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'Poppins, sans-serif', color: '#003B75' }}>
        Loading account activation...
      </div>
    }>
      <ActivateAccountContent />
    </Suspense>
  )
}
