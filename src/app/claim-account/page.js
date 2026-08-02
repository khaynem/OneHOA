"use client"

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FaArrowLeft, FaSearch, FaCheckCircle, FaUserCheck, FaExclamationTriangle, FaEnvelope, FaKey, FaSpinner, FaLock } from 'react-icons/fa'
import { notify } from '@/lib/notify'
import styles from './claim-account.module.css'

export default function ClaimAccountPage() {
  const router = useRouter()

  // Step state: 'search' | 'match_linked' | 'match_unlinked' | 'otp_verification' | 'completed'
  const [step, setStep] = useState('search')

  // Search Inputs
  const [searchForm, setSearchForm] = useState({
    phase: '',
    block: '',
    lot: '',
    first_name: '',
    last_name: '',
  })
  const [isSearching, setIsSearching] = useState(false)

  // Record details returned from search
  const [matchedRecord, setMatchedRecord] = useState(null)

  // OTP Verification state
  const [emailInput, setEmailInput] = useState('')
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)
  const [devCode, setDevCode] = useState('')
  const [activationUrl, setActivationUrl] = useState('')

  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const timer = setInterval(() => setCooldownSeconds(prev => prev - 1), 1000)
    return () => clearInterval(timer)
  }, [cooldownSeconds])

  const handleSearchChange = (key, value) => {
    setSearchForm(prev => ({ ...prev, [key]: value }))
  }

  const handleSearchSubmit = async (e) => {
    e.preventDefault()
    const { phase, block, lot, first_name, last_name } = searchForm

    if (!phase || !block || !lot || !first_name.trim() || !last_name.trim()) {
      notify.error({
        title: 'Missing Fields',
        description: 'Please fill in Phase, Block, Lot, First Name, and Last Name to search.'
      })
      return
    }

    setIsSearching(true)
    try {
      const res = await fetch('/api/auth/claim-account/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchForm),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to search masterlist record.')
      }

      if (!data.matchFound) {
        // Scenario B: No record found -> direct to self-registration request
        notify.info({
          title: 'No Record Found',
          description: 'No matching homeowner record was found in the official masterlist. You may submit a registration request.'
        })
        router.push('/register-homeowner')
        return
      }

      setMatchedRecord(data)

      if (data.isLinked) {
        // Scenario A - Sub-case 1: Already linked
        setStep('match_linked')
      } else {
        // Scenario A - Sub-case 2: Matching unlinked record found
        setEmailInput(data.existingEmail || '')
        setStep('match_unlinked')
      }
    } catch (err) {
      console.error(err)
      notify.error({
        title: 'Search Error',
        description: err.message || 'An error occurred while searching.'
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleSendOtp = async () => {
    const trimmedEmail = emailInput.trim().toLowerCase()
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      notify.error({ title: 'Invalid Email', description: 'Please enter a valid email address.' })
      return
    }

    setIsSendingOtp(true)
    setDevCode('')
    try {
      const res = await fetch('/api/auth/register-verification/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to send verification code.')
      }

      setOtpSent(true)
      setStep('otp_verification')
      setCooldownSeconds(60)
      if (data.dev_code) setDevCode(data.dev_code)

      notify.success({
        title: 'OTP Code Sent',
        description: `A 6-digit verification code was sent to ${trimmedEmail}.`
      })
    } catch (err) {
      console.error(err)
      notify.error({ title: 'Sending Failed', description: err.message || 'Failed to send OTP code.' })
    } finally {
      setIsSendingOtp(false)
    }
  }

  const handleVerifyOtpAndClaim = async (e) => {
    e.preventDefault()
    if (!otpCode || otpCode.trim().length !== 6) {
      notify.error({ title: 'Invalid Code', description: 'Please enter a valid 6-digit verification code.' })
      return
    }

    setIsVerifying(true)
    try {
      const res = await fetch('/api/auth/claim-account/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: matchedRecord.recordId,
          email: emailInput.trim().toLowerCase(),
          verificationCode: otpCode.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Claim verification failed.')
      }

      if (data.activationUrl) setActivationUrl(data.activationUrl)
      if (data.dev_code) setDevCode(data.dev_code)

      setStep('completed')
      notify.success({
        title: 'Record Claimed!',
        description: 'An activation link has been sent to your email. Set your password to complete activation.'
      })
    } catch (err) {
      console.error(err)
      notify.error({ title: 'Verification Failed', description: err.message || 'Failed to claim record.' })
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.bgDots} aria-hidden="true" />
      <div className={styles.glowYellow} aria-hidden="true" />
      <div className={styles.glowBlue} aria-hidden="true" />
      <div className={styles.square1} aria-hidden="true" />
      <div className={styles.square2} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.backLink}>
            <FaArrowLeft /> Back to Home
          </Link>
          <div className={styles.brand}>
            <Image
              src="/images/HOA Logo.png"
              alt="OneHOA Logo"
              width={40}
              height={40}
              className={styles.logo}
              priority
            />
            <span className={styles.brandText}>OneHOA</span>
          </div>
        </div>
      </header>

      <main className={styles.mainContent}>
        {/* STEP 1: Search Masterlist */}
        {step === 'search' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <FaSearch className={styles.headerIcon} />
              <h1 className={styles.title}>Claim Your Homeowner Account</h1>
              <p className={styles.subtitle}>
                Search the official HOA homeowner masterlist to verify if your record already exists.
              </p>
            </div>

            <form onSubmit={handleSearchSubmit} className={styles.form}>
              <div className={styles.grid3}>
                <div className={styles.field}>
                  <label className={styles.label}>Phase <span className={styles.required}>*</span></label>
                  <input
                    type="number"
                    className={styles.input}
                    value={searchForm.phase}
                    onChange={(e) => handleSearchChange('phase', e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 1"
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Block <span className={styles.required}>*</span></label>
                  <input
                    type="number"
                    className={styles.input}
                    value={searchForm.block}
                    onChange={(e) => handleSearchChange('block', e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 12"
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Lot <span className={styles.required}>*</span></label>
                  <input
                    type="number"
                    className={styles.input}
                    value={searchForm.lot}
                    onChange={(e) => handleSearchChange('lot', e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 5"
                    required
                  />
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className={styles.label}>First Name <span className={styles.required}>*</span></label>
                  <input
                    type="text"
                    className={styles.input}
                    value={searchForm.first_name}
                    onChange={(e) => handleSearchChange('first_name', e.target.value)}
                    placeholder="e.g. Juan"
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Last Name <span className={styles.required}>*</span></label>
                  <input
                    type="text"
                    className={styles.input}
                    value={searchForm.last_name}
                    onChange={(e) => handleSearchChange('last_name', e.target.value)}
                    placeholder="e.g. Dela Cruz"
                    required
                  />
                </div>
              </div>

              <button type="submit" className={styles.submitBtn} disabled={isSearching}>
                {isSearching ? (
                  <>
                    <FaSpinner className={styles.spinner} /> Searching Masterlist...
                  </>
                ) : (
                  <>
                    <FaSearch /> Search Masterlist
                  </>
                )}
              </button>
            </form>

            <div className={styles.noticeBox}>
              <p>Not found in masterlist? No worries! You will be guided to submit a registration request if no record matches.</p>
            </div>
          </div>
        )}

        {/* SCENARIO A - Subcase 1: Already Linked Account */}
        {step === 'match_linked' && (
          <div className={styles.card}>
            <div className={styles.iconWrapperWarning}>
              <FaUserCheck className={styles.statusIconWarning} />
            </div>
            <h2 className={styles.cardTitle}>Account Already Exists!</h2>
            <p className={styles.cardText}>
              A user account is already linked to the homeowner record for <strong>{matchedRecord?.fullName}</strong>.
            </p>
            <div className={styles.actionGroup}>
              <Link href="/login" className={styles.primaryBtn}>
                <FaLock /> Sign In
              </Link>
              <Link href="/forgot-password" className={styles.secondaryBtn}>
                <FaKey /> Forgot Password
              </Link>
            </div>
            <button type="button" className={styles.textBtn} onClick={() => setStep('search')}>
              ← Search another record
            </button>
          </div>
        )}

        {/* SCENARIO A - Subcase 2: Unlinked Record Found -> Enter Email */}
        {step === 'match_unlinked' && (
          <div className={styles.card}>
            <div className={styles.iconWrapperSuccess}>
              <FaCheckCircle className={styles.statusIconSuccess} />
            </div>
            <h2 className={styles.cardTitle}>Homeowner Record Found!</h2>
            <p className={styles.cardText}>
              Welcome, <strong>{matchedRecord?.fullName}</strong>! Your official record was found in the HOA masterlist.
            </p>
            <p className={styles.subtext}>
              To securely claim this record and create your online user account, please enter your email address below. We will send you an OTP verification code.
            </p>

            <div className={styles.emailStepForm}>
              <div className={styles.field}>
                <label className={styles.label}>Your Email Address</label>
                <div className={styles.inputWrap}>
                  <FaEnvelope className={styles.inputIcon} />
                  <input
                    type="email"
                    className={styles.inputWithIcon}
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="e.g. juan.delacruz@example.com"
                  />
                </div>
              </div>

              <button
                type="button"
                className={styles.submitBtn}
                onClick={handleSendOtp}
                disabled={isSendingOtp}
              >
                {isSendingOtp ? (
                  <>
                    <FaSpinner className={styles.spinner} /> Sending OTP Code...
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </button>
            </div>

            <button type="button" className={styles.textBtn} onClick={() => setStep('search')}>
              ← Back to Search
            </button>
          </div>
        )}

        {/* SCENARIO A - Subcase 3: Verify OTP Code */}
        {step === 'otp_verification' && (
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>Verify Your Email</h2>
            <p className={styles.cardText}>
              We sent a 6-digit OTP code to <strong>{emailInput}</strong>. Enter the code to verify ownership.
            </p>

            {devCode && (
              <div className={styles.devCodeNotice}>
                <strong>Local Test Mode:</strong> Your OTP code is <code>{devCode}</code>
              </div>
            )}

            <form onSubmit={handleVerifyOtpAndClaim} className={styles.form}>
              <div className={styles.field}>
                <label className={styles.label}>6-Digit Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  className={styles.otpInput}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  required
                />
              </div>

              <div className={styles.resendRow}>
                <span>Didn&apos;t receive the code?</span>
                <button
                  type="button"
                  className={styles.resendBtn}
                  onClick={handleSendOtp}
                  disabled={cooldownSeconds > 0 || isSendingOtp}
                >
                  {cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : 'Resend Code'}
                </button>
              </div>

              <button type="submit" className={styles.submitBtn} disabled={isVerifying}>
                {isVerifying ? (
                  <>
                    <FaSpinner className={styles.spinner} /> Verifying & Claiming...
                  </>
                ) : (
                  'Verify Code & Claim Record'
                )}
              </button>
            </form>
          </div>
        )}

        {/* SCENARIO A - Completed */}
        {step === 'completed' && (
          <div className={styles.card}>
            <div className={styles.iconWrapperSuccess}>
              <FaCheckCircle className={styles.statusIconSuccess} />
            </div>
            <h2 className={styles.cardTitle}>Record Claimed Successfully!</h2>
            <p className={styles.cardText}>
              We have verified your email and generated an account activation link for <strong>{emailInput}</strong>.
            </p>
            <p className={styles.subtext}>
              Please check your inbox and click the activation link to set your password and complete account creation.
            </p>

            {activationUrl && (
              <div className={styles.activationBox}>
                <p>Click below to complete password creation:</p>
                <Link href={activationUrl} className={styles.primaryBtn}>
                  Activate Account Now
                </Link>
              </div>
            )}

            <div style={{ marginTop: '1.5rem' }}>
              <Link href="/login" className={styles.secondaryBtn}>
                Go to Login Page
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
