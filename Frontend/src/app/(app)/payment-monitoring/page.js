"use client"

import { useMemo, useState } from 'react'
import { HiOutlineCircleStack as PaymentIcon } from 'react-icons/hi2'
import { notify } from '@/lib/notify'
import styles from './payment-monitoring.module.css'

const HOMEOWNER_DIRECTORY = [
  { id: 'R-1001', name: 'Juan Dela Cruz', unitNumber: 'Unit 101' },
  { id: 'R-1002', name: 'Maria Luisa Reyes', unitNumber: 'Unit 102' },
  { id: 'R-1003', name: 'Carlo Miguel Lim', unitNumber: 'Unit 203' },
  { id: 'R-1004', name: 'Angela Navarro', unitNumber: 'Unit 305' }
]

const SAMPLE_PAYMENT_RECORDS = [
  { id: 1, homeownerName: 'Juan Dela Cruz', unitNumber: 'Unit 101', amount: 150, datePaid: '2026-03-02', receiptNo: 'RCPT-1001', details: 'March maintenance fee' },
  { id: 2, homeownerName: 'Maria Luisa Reyes', unitNumber: 'Unit 102', amount: 150, datePaid: '2026-03-01', receiptNo: 'RCPT-1002', details: 'March maintenance fee' },
  { id: 3, homeownerName: 'Carlo Miguel Lim', unitNumber: 'Unit 203', amount: 150, datePaid: '2026-03-07', receiptNo: 'RCPT-1003', details: 'March maintenance fee' },
  { id: 4, homeownerName: 'Angela Navarro', unitNumber: 'Unit 305', amount: 150, datePaid: '2026-03-10', receiptNo: 'RCPT-1004', details: 'March maintenance fee' },
  { id: 5, homeownerName: 'Juan Dela Cruz', unitNumber: 'Unit 101', amount: 150, datePaid: '2026-03-15', receiptNo: 'RCPT-1005', details: 'March maintenance fee' }
]

const EMPTY_FORM = {
  homeowner: '',
  amountPaid: '',
  paymentDate: '',
  receiptNo: '',
  paymentDetails: ''
}

const toPeso = (amount) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(Number(amount) || 0)

const formatDate = (dateValue) => {
  if (!dateValue) {
    return '-'
  }

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

const parseLocalDate = (dateValue) => {
  if (!dateValue) {
    return null
  }

  const [year, month, day] = String(dateValue).split('-').map(Number)
  if (!year || !month || !day) {
    return null
  }

  return new Date(year, month - 1, day)
}

const isToday = (date, now) =>
  date.getFullYear() === now.getFullYear() &&
  date.getMonth() === now.getMonth() &&
  date.getDate() === now.getDate()

const isThisMonth = (date, now) =>
  date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()

const isThisWeek = (date, now) => {
  const startOfWeek = new Date(now)
  const day = startOfWeek.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day

  startOfWeek.setHours(0, 0, 0, 0)
  startOfWeek.setDate(startOfWeek.getDate() + diffToMonday)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)

  return date >= startOfWeek && date <= endOfWeek
}

export default function PaymentMonitoringPage() {
  const [searchText, setSearchText] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [records, setRecords] = useState(SAMPLE_PAYMENT_RECORDS)
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)

  const filteredRecords = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    const now = new Date()

    return records
      .filter((record) => {
        if (!q) {
          return true
        }

        return (
          record.homeownerName.toLowerCase().includes(q) ||
          record.unitNumber.toLowerCase().includes(q) ||
          record.receiptNo.toLowerCase().includes(q)
        )
      })
      .filter((record) => {
        if (dateFilter === 'all') {
          return true
        }

        const paidDate = parseLocalDate(record.datePaid)
        if (!paidDate || Number.isNaN(paidDate.getTime())) {
          return false
        }

        if (dateFilter === 'today') {
          return isToday(paidDate, now)
        }

        if (dateFilter === 'thisWeek') {
          return isThisWeek(paidDate, now)
        }

        return isThisMonth(paidDate, now)
      })
      .sort((a, b) => {
        const dateA = parseLocalDate(a.datePaid)
        const dateB = parseLocalDate(b.datePaid)
        return (dateB?.getTime() || 0) - (dateA?.getTime() || 0)
      })
  }, [records, searchText, dateFilter])

  const openRecordModal = () => {
    setForm(EMPTY_FORM)
    setIsRecordModalOpen(true)
  }

  const closeRecordModal = () => {
    setIsRecordModalOpen(false)
    setForm(EMPTY_FORM)
  }

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const savePaymentRecord = () => {
    const homeownerInput = form.homeowner.trim()
    const amountPaid = Number(form.amountPaid)

    if (!homeownerInput || !form.paymentDate || !form.receiptNo.trim() || !amountPaid) {
      notify.error({
        title: 'Missing Required Details',
        description: 'Please complete homeowner, amount, payment date, and receipt number.'
      })
      return
    }

    const matchedHomeowner = HOMEOWNER_DIRECTORY.find((entry) => {
      const normalized = `${entry.id} ${entry.name}`.toLowerCase()
      return normalized.includes(homeownerInput.toLowerCase()) || entry.name.toLowerCase() === homeownerInput.toLowerCase()
    })

    const newRecord = {
      id: Date.now(),
      homeownerName: matchedHomeowner?.name || homeownerInput,
      unitNumber: matchedHomeowner?.unitNumber || '-',
      amount: amountPaid,
      datePaid: form.paymentDate,
      receiptNo: form.receiptNo.trim(),
      details: form.paymentDetails.trim() || 'Maintenance fee payment'
    }

    setRecords((prev) => [newRecord, ...prev])
    notify.success({
      title: 'Payment Recorded',
      description: `${newRecord.homeownerName}'s payment has been added.`
    })
    closeRecordModal()
  }

  return (
    <main className={styles.page}>
      <section className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Payment Monitoring</h1>
          <p className={styles.subtitle}>Track and record monthly maintenance fee payments</p>
        </div>

        <button type="button" className={styles.recordButton} onClick={openRecordModal}>
          <PaymentIcon className={styles.recordButtonIcon} aria-hidden="true" />
          Add Record Payment
        </button>
      </section>

      <section className={styles.cardGrid} aria-label="Payment monitoring stats">
        <article className={styles.statCard}>
          <p className={styles.statLabel}>Total Collected (Current Month)</p>
          <p className={styles.statValue}>{toPeso(0)}</p>
          <p className={styles.statSubtext}>From recorded payments</p>
        </article>

        <article className={styles.statCard}>
          <p className={styles.statLabel}>Pending Payments</p>
          <p className={styles.statValue}>0</p>
          <p className={styles.statSubtext}>Outstanding balances</p>
        </article>

        <article className={styles.statCard}>
          <p className={styles.statLabel}>Collection Rate</p>
          <p className={styles.statValue}>0%</p>
          <p className={styles.statSubtext}>Current month</p>
        </article>
      </section>

      <section className={styles.searchWrap}>
        <div className={styles.searchRow}>
          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className={styles.searchInput}
            placeholder="Search by homeowner, unit number, or receipt number"
            aria-label="Search payment records"
          />

          <select
            className={styles.filterSelect}
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            aria-label="Filter payment records by date"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="thisWeek">This Week</option>
            <option value="thisMonth">This Month</option>
          </select>
        </div>
      </section>

      <section className={styles.tableCard}>
        <h2 className={styles.tableTitle}>Recent Payment Records</h2>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Homeowner</th>
                <th>Unit Number</th>
                <th>Amount</th>
                <th>Date Paid</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className={styles.emptyRow}>
                    No payment records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{record.homeownerName}</td>
                    <td>{record.unitNumber}</td>
                    <td>{toPeso(record.amount)}</td>
                    <td>{formatDate(record.datePaid)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isRecordModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Record Payment</h2>
            <p className={styles.modalLead}>Enter payment details for the homeowner</p>

            <div className={styles.formGrid}>
              <div>
                <label className={styles.fieldLabel}>Homeowner ID/Name</label>
                <input
                  type="text"
                  className={styles.input}
                  value={form.homeowner}
                  onChange={(event) => handleFormChange('homeowner', event.target.value)}
                  placeholder="e.g. R-1001 Juan Dela Cruz"
                  list="homeowner-suggestions"
                />
                <datalist id="homeowner-suggestions">
                  {HOMEOWNER_DIRECTORY.map((homeowner) => (
                    <option key={homeowner.id} value={`${homeowner.id} ${homeowner.name}`}>
                      {homeowner.unitNumber}
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className={styles.fieldLabel}>Amount Paid</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={styles.input}
                  value={form.amountPaid}
                  onChange={(event) => handleFormChange('amountPaid', event.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className={styles.fieldLabel}>Payment Date</label>
                <input
                  type="date"
                  className={styles.input}
                  value={form.paymentDate}
                  onChange={(event) => handleFormChange('paymentDate', event.target.value)}
                />
              </div>

              <div>
                <label className={styles.fieldLabel}>Receipt No.</label>
                <input
                  type="text"
                  className={styles.input}
                  value={form.receiptNo}
                  onChange={(event) => handleFormChange('receiptNo', event.target.value)}
                  placeholder="e.g. RCPT-1201"
                />
              </div>
            </div>

            <div>
              <label className={styles.fieldLabel}>Payment Details</label>
              <textarea
                className={styles.textarea}
                value={form.paymentDetails}
                onChange={(event) => handleFormChange('paymentDetails', event.target.value)}
                placeholder="Optional notes"
              />
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={closeRecordModal}>
                Cancel
              </button>
              <button type="button" className={styles.primaryButton} onClick={savePaymentRecord}>
                Add Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
