"use client"

import { useEffect, useMemo, useState } from 'react'
import { HiOutlineCreditCard } from 'react-icons/hi2'
import { apiClient } from '@/lib/apiClient'
import { notify } from '@/lib/notify'

const formatDate = (value) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)
}

const toPeso = (value) => {
  if (value === undefined || value === null) return '\u20b10.00'
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(value)
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const formatPaymentPeriod = (periodValue) => {
  if (!periodValue) return ''
  const year = Math.floor(Number(periodValue) / 100)
  const month = Number(periodValue) % 100
  if (month < 1 || month > 12) return String(periodValue)
  return monthNames[month - 1] + ' ' + year
}

const formatMethod = (method) => String(method || '-').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

import styles from './payments.module.css'

export default function MyPaymentsPage() {
  const [payments, setPayments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        setErrorMessage('')
        const res = await apiClient.get('/homeowner/my-payments')
        if (res?.success) {
          setPayments(res.data || [])
        }
      } catch (error) {
        setErrorMessage(error.message || 'Failed to load payment history.')
        notify.error({
          title: 'Load Error',
          description: error.message || 'Unable to load your payments.',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const totalPaid = useMemo(() => {
    return payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  }, [payments])

  return (
    <>
      <div className={styles.backgroundContainer} aria-hidden="true">
        <div className={styles.gridOverlay} />
        <div className={styles.blob1} />
        <div className={styles.blob2} />
        <div className={styles.movingGradient} />
      </div>

      <div className={styles.pageContent}>
        {isLoading && <p className={styles.stateText}>Loading your payment history...</p>}
        {!isLoading && errorMessage && <p className={styles.errorText}>{errorMessage}</p>}

        {!isLoading && !errorMessage && (
          <section className={styles.paymentsCard}>
            <h2 className={styles.cardTitle}>
              <HiOutlineCreditCard className={styles.cardIcon} />
              My Payment History
            </h2>

            {payments.length > 0 ? (
              <>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Total Payments Made:</span>
                  <span className={styles.summaryValue}>{toPeso(totalPaid)}</span>
                </div>

                <div className={styles.tableScroll}>
                  <table className={styles.paymentTable}>
                    <thead>
                      <tr>
                        <th>Receipt #</th>
                        <th>Period Covered</th>
                        <th>Amount</th>
                        <th>Date Paid</th>
                        <th>Method</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => {
                        const periods = Array.isArray(p.payment_for_periods)
                          ? p.payment_for_periods
                          : [p.billing_period]
                        return (
                          <tr key={String(p._id)}>
                            <td style={{ fontWeight: 600 }}>{p.receipt_no}</td>
                            <td>{periods.map(formatPaymentPeriod).join(', ')}</td>
                            <td className={styles.amount}>{toPeso(p.amount)}</td>
                            <td>{formatDate(p.date)}</td>
                            <td>{formatMethod(p.payment_method)}</td>
                            <td>
                              <span className={styles.statusBadge + ' ' + styles.statusPaid}>
                                {String(p.payment_status || 'paid').toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className={styles.emptyState}>
                No payment records found. Your payment history will appear here once the HOA treasurer logs your dues.
              </div>
            )}
          </section>
        )}
      </div>
    </>
  )
}
