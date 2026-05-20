"use client"

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import { apiClient, ApiError } from '@/lib/apiClient'
import { notify } from '@/lib/notify'
import styles from './login.module.css'

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!email.trim() || !password) {
      notify.error('Email and password are required.')
      return
    }

    setIsLoading(true)

    try {
      await apiClient.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      })

      notify.success('Login successful. Redirecting to dashboard...')
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      if (error instanceof ApiError) {
        notify.error(error.message)
      } else {
        notify.error('Unable to login right now. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className={styles.container}>
      <section className={styles.leftPane}>
        <div className={styles.formCard}>
          <h1 className={styles.title}>Login</h1>
          <p className={styles.lead}>Login your account to continue</p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.field}>
              <span className={styles.labelText}>Email</span>
              <input
                type="email"
                name="email"
                className={styles.input}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </label>

            <label className={styles.field}>
              <span className={styles.labelText}>Password</span>
              <div className={styles.passwordWrap}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className={styles.input}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <FiEye className={styles.eyeIcon} aria-hidden="true" />
                  ) : (
                    <FiEyeOff className={styles.eyeIcon} aria-hidden="true" />
                  )}
                </button>
              </div>
            </label>

            <div className={styles.rowOptions}>
              <Link href="/forgot-password" className={styles.forgot}>
                Forgot Password?
              </Link>
            </div>

            <button type="submit" className={styles.button} disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className={styles.disclaimer}>
            By logging in, you agree to our{' '}
            <Link href="/terms-and-conditions" className={styles.disclaimerLink}>
              Terms & Conditions
            </Link>{' '}
            and acknowledge our{' '}
            <Link href="/privacy-policy" className={styles.disclaimerLink}>
              Privacy Policy
            </Link>.
          </p>
        </div>
      </section>

      <section className={styles.rightPane}>
        <div className={styles.brandContent}>
          <Image
            src="/images/HOA_Logo.png"
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
            Homeowner Records, ID Generation,
            <br />
            and Dues Monitoring
          </p>
        </div>
        <p className={styles.copyright}>© 2026 Endurix. All rights reserved.</p>
      </section>
    </main>
  )
}

