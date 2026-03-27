"use client"

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { FiEye, FiEyeOff } from 'react-icons/fi'
import styles from './login.module.css'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <main className={styles.container}>
      <section className={styles.leftPane}>
        <div className={styles.formCard}>
          <h1 className={styles.title}>Login</h1>
          <p className={styles.lead}>Login your account to continue</p>

          <form className={styles.form}>
            <label className={styles.field}>
              <span className={styles.labelText}>Username</span>
              <input type="text" name="username" className={styles.input} />
            </label>

            <label className={styles.field}>
              <span className={styles.labelText}>Password</span>
              <div className={styles.passwordWrap}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className={styles.input}
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
              <label className={styles.remember}>
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <Link href="#" className={styles.forgot}>
                Forgot Password?
              </Link>
            </div>

            <button type="submit" className={styles.button}>Login</button>
          </form>

          <div className={styles.separator} />
          <p className={styles.googleText}>or login using Google Account</p>
          <div className={styles.googleSpace} aria-hidden="true" />
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

