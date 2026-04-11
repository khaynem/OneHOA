"use client"

import { useEffect, useMemo, useState } from 'react'
import { HiOutlineCircleStack as PaymentIcon } from 'react-icons/hi2'
import { apiClient } from '@/lib/apiClient'
import { notify } from '@/lib/notify'
import styles from './payment-monitoring.module.css'

const EMPTY_FORM = {
  recordId: '',
  homeownerSearch: '',
  amount: '',
  date: '',
  receiptNo: '',
  paymentPeriods: [],
  periodYear: String(new Date().getFullYear()),
  periodMonth: String(new Date().getMonth() + 1).padStart(2, '0'),
  paymentDetails: ''
}

const MONTH_OPTIONS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' }
]

const toUnitNumberFromAddress = (address) => {
  const phase = address?.phase
  const block = address?.block
  const lot = address?.lot

  if (phase === undefined || block === undefined || lot === undefined) {
    return '-'
  }

  return `${phase}-${block}-${lot}`
}

const getHomeownerName = (record = {}) => `${record.first_name || ''} ${record.last_name || ''}`.trim()

const parseCoveredPeriods = (record) => {
  if (Array.isArray(record.payment_for_periods) && record.payment_for_periods.length > 0) {
    return record.payment_for_periods.map(Number).filter((value) => Number.isInteger(value))
  }

  if (Number.isInteger(Number(record.billing_period))) {
    return [Number(record.billing_period)]
  }

  const paidDate = new Date(record.date)
  if (!Number.isNaN(paidDate.getTime())) {
    return [paidDate.getFullYear() * 100 + (paidDate.getMonth() + 1)]
  }

  return []
}

const getCurrentPeriod = () => {
  const now = new Date()
  return now.getFullYear() * 100 + (now.getMonth() + 1)
}

const paymentPeriodToLabel = (period) => {
  const numeric = Number(period)
  const year = Math.floor(numeric / 100)
  const month = numeric % 100
  const monthLabel = MONTH_OPTIONS.find((entry) => Number(entry.value) === month)?.label || `M${month}`
  return `${monthLabel} ${year}`
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

  const raw = String(dateValue)
  const ymdMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)

  if (ymdMatch) {
    const year = Number(ymdMatch[1])
    const month = Number(ymdMatch[2])
    const day = Number(ymdMatch[3])
    return new Date(year, month - 1, day)
  }

  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
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
  const [records, setRecords] = useState([])
  const [homeowners, setHomeowners] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [isHomeownerSuggestOpen, setIsHomeownerSuggestOpen] = useState(false)

  const homeownerDirectory = useMemo(
    () =>
      homeowners.map((homeowner) => {
        const address = homeowner.address?._id || homeowner['address._id'] || null
        const name = getHomeownerName(homeowner)

        return {
          id: String(homeowner._id),
          name,
          unitNumber: toUnitNumberFromAddress(address)
        }
      }),
    [homeowners]
  )

  const loadPaymentMonitoringData = async () => {
    try {
      setIsLoading(true)

      const [paymentsResponse, recordsResponse] = await Promise.all([
        apiClient.get('/payments'),
        apiClient.get('/records', {
          query: {
            page: 1,
            limit: 500
          }
        })
      ])

      const rawHomeowners = Array.isArray(recordsResponse?.data) ? recordsResponse.data : []
      const homeownersById = new Map(rawHomeowners.map((entry) => [String(entry._id), entry]))

      const paymentRows = (Array.isArray(paymentsResponse?.data) ? paymentsResponse.data : []).map((payment) => {
        const linkedRecord = payment.records?._id
        const linkedRecordId = linkedRecord?._id ? String(linkedRecord._id) : String(payment.records?._id || '')
        const homeownerFromRecords = homeownersById.get(linkedRecordId)
        const address = homeownerFromRecords?.address?._id || homeownerFromRecords?.['address._id'] || null

        const homeownerName = linkedRecord
          ? `${linkedRecord.first_name || ''} ${linkedRecord.last_name || ''}`.trim() || 'Unlinked Homeowner'
          : 'Unlinked Homeowner'

        return {
          id: String(payment._id),
          recordId: linkedRecordId,
          homeownerName,
          unitNumber: toUnitNumberFromAddress(address),
          amount: Number(payment.amount) || 0,
          datePaid: payment.date,
          receiptNo: String(payment.receipt_no || '-'),
          details: String(payment.payment_details || payment.payment_method || '-'),
          paymentStatus: String(payment.payment_status || '').toLowerCase(),
          coveredPeriods: parseCoveredPeriods(payment)
        }
      })

      setHomeowners(rawHomeowners)
      setRecords(paymentRows)
    } catch (error) {
      notify.error({
        title: 'Failed to Load Payments',
        description: error.message || 'Unable to fetch payment monitoring data.'
      })
      setHomeowners([])
      setRecords([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPaymentMonitoringData()
  }, [])

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

  const homeownerSuggestions = useMemo(() => {
    const query = form.homeownerSearch.trim().toLowerCase()

    if (!query) {
      return homeownerDirectory.slice(0, 8)
    }

    return homeownerDirectory
      .filter((homeowner) => {
        const searchable = `${homeowner.name} ${homeowner.unitNumber}`.toLowerCase()
        return searchable.includes(query)
      })
      .slice(0, 8)
  }, [form.homeownerSearch, homeownerDirectory])

  const handleHomeownerSearchChange = (value) => {
    handleFormChange('homeownerSearch', value)
    handleFormChange('recordId', '')
    setIsHomeownerSuggestOpen(true)
  }

  const selectHomeowner = (homeowner) => {
    handleFormChange('recordId', homeowner.id)
    handleFormChange('homeownerSearch', `${homeowner.name} (${homeowner.unitNumber})`)
    setIsHomeownerSuggestOpen(false)
  }

  const savePaymentRecord = async () => {
    const amountPaid = Number(form.amount)
    const numericReceiptNo = Number(String(form.receiptNo).replace(/\D/g, ''))
    const paymentForPeriods = Array.isArray(form.paymentPeriods) ? form.paymentPeriods : []

    if (!form.recordId || !form.date || !form.receiptNo.trim() || !amountPaid || !numericReceiptNo) {
      notify.error({
        title: 'Missing Required Details',
        description: 'Please complete homeowner, amount, date, and numeric receipt number.'
      })
      return
    }

    if (paymentForPeriods.length === 0) {
      notify.error({
        title: 'Missing Payment Periods',
        description: 'Add at least one payment period to compute amount.'
      })
      return
    }

    const matchedHomeowner = homeownerDirectory.find((entry) => entry.id === form.recordId)

    if (!matchedHomeowner) {
      notify.error({
        title: 'Homeowner Not Found',
        description: 'Please select a valid homeowner.'
      })
      return
    }

    try {
      await apiClient.post('/payments', {
        receipt_no: numericReceiptNo,
        amount: amountPaid,
        date: form.date,
        payment_details: form.paymentDetails.trim() || 'Maintenance fee payment',
        record_id: form.recordId,
        payment_for_periods: paymentForPeriods.length > 0 ? paymentForPeriods : undefined
      })
      notify.success({
        title: 'Payment Recorded',
        description: `${matchedHomeowner.name}'s payment has been added.`
      })
      closeRecordModal()
      await loadPaymentMonitoringData()
    } catch (error) {
      notify.error({
        title: 'Failed to Record Payment',
        description: error.message || 'Unable to save payment record.'
      })
    }
  }

  const stats = useMemo(() => {
    const currentPeriod = getCurrentPeriod()
    const now = new Date()

    const currentMonthPaidByDate = records.filter((record) => {
      if (record.paymentStatus !== 'paid') {
        return false
      }

      const paidDate = parseLocalDate(record.datePaid)
      return Boolean(paidDate) && isThisMonth(paidDate, now)
    })

    const currentMonthPaidRecords = records.filter(
      (record) => record.paymentStatus === 'paid' && record.coveredPeriods.includes(currentPeriod)
    )

    const totalCollectedCurrentMonth = currentMonthPaidByDate.reduce((sum, record) => sum + (Number(record.amount) || 0), 0)

    const paidHomeownerIds = new Set(currentMonthPaidRecords.map((record) => record.recordId).filter(Boolean))
    const totalHomeowners = homeowners.length
    const pendingPayments = Math.max(totalHomeowners - paidHomeownerIds.size, 0)
    const collectionRate = totalHomeowners > 0 ? Math.round((paidHomeownerIds.size / totalHomeowners) * 100) : 0

    return {
      totalCollectedCurrentMonth,
      pendingPayments,
      collectionRate
    }
  }, [homeowners.length, records])

  const addPaymentPeriod = () => {
    const year = Number(form.periodYear)
    const month = Number(form.periodMonth)

    if (!Number.isInteger(year) || year < 2000 || year > 3000 || !Number.isInteger(month) || month < 1 || month > 12) {
      notify.error({
        title: 'Invalid Period',
        description: 'Please pick a valid year and month.'
      })
      return
    }

    const period = year * 100 + month
    const nextPeriods = Array.from(new Set([...(form.paymentPeriods || []), period])).sort((a, b) => a - b)
    setForm((prev) => ({
      ...prev,
      paymentPeriods: nextPeriods,
      amount: String(nextPeriods.length * 100)
    }))
  }

  const removePaymentPeriod = (periodToRemove) => {
    const nextPeriods = (form.paymentPeriods || []).filter((period) => period !== periodToRemove)
    setForm((prev) => ({
      ...prev,
      paymentPeriods: nextPeriods,
      amount: nextPeriods.length > 0 ? String(nextPeriods.length * 100) : ''
    }))
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
          <p className={styles.statValue}>{toPeso(stats.totalCollectedCurrentMonth)}</p>
          <p className={styles.statSubtext}>From recorded payments</p>
        </article>

        <article className={styles.statCard}>
          <p className={styles.statLabel}>Pending Payments</p>
          <p className={styles.statValue}>{stats.pendingPayments}</p>
          <p className={styles.statSubtext}>Outstanding balances</p>
        </article>

        <article className={styles.statCard}>
          <p className={styles.statLabel}>Collection Rate</p>
          <p className={styles.statValue}>{`${stats.collectionRate}%`}</p>
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
                <th>Receipt No.</th>
                <th>Amount</th>
                <th>Date Paid</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className={styles.emptyRow}>
                    Loading payment records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyRow}>
                    No payment records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{record.homeownerName}</td>
                    <td>{record.unitNumber}</td>
                    <td>{record.receiptNo}</td>
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
                <label className={styles.fieldLabel}>Homeowner</label>
                <div className={styles.autocompleteWrap}>
                  <input
                    type="search"
                    className={styles.input}
                    value={form.homeownerSearch}
                    onChange={(event) => handleHomeownerSearchChange(event.target.value)}
                    onFocus={() => setIsHomeownerSuggestOpen(true)}
                    onBlur={() => {
                      setTimeout(() => {
                        setIsHomeownerSuggestOpen(false)
                      }, 120)
                    }}
                    placeholder="Search homeowner name or unit number"
                  />
                  {isHomeownerSuggestOpen && homeownerSuggestions.length > 0 ? (
                    <ul className={styles.suggestionList}>
                      {homeownerSuggestions.map((homeowner) => (
                        <li key={homeowner.id}>
                          <button
                            type="button"
                            className={styles.suggestionItem}
                            onClick={() => selectHomeowner(homeowner)}
                          >
                            <span>{homeowner.name}</span>
                            <small>{homeowner.unitNumber}</small>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>

              <div>
                <label className={styles.fieldLabel}>Amount Paid</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={styles.input}
                  value={form.amount}
                  disabled
                  readOnly
                  placeholder="Add payment periods to compute"
                />
              </div>

              <div>
                <label className={styles.fieldLabel}>Date</label>
                <input
                  type="date"
                  className={styles.input}
                  value={form.date}
                  onChange={(event) => handleFormChange('date', event.target.value)}
                />
              </div>

              <div>
                <label className={styles.fieldLabel}>Receipt No.</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className={styles.input}
                  value={form.receiptNo}
                  onChange={(event) => handleFormChange('receiptNo', event.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 1201"
                />
              </div>

              <div>
                <label className={styles.fieldLabel}>Payment For Periods (YYYYMM)</label>
                <div className={styles.periodPickerRow}>
                  <select
                    className={styles.input}
                    value={form.periodMonth}
                    onChange={(event) => handleFormChange('periodMonth', event.target.value)}
                  >
                    {MONTH_OPTIONS.map((month) => (
                      <option key={month.value} value={month.value}>
                        {month.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    className={styles.input}
                    value={form.periodYear}
                    min="2000"
                    max="3000"
                    onChange={(event) => handleFormChange('periodYear', event.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="Year"
                  />
                  <button type="button" className={styles.addPeriodButton} onClick={addPaymentPeriod}>
                    Add
                  </button>
                </div>
                <p className={styles.periodHint}>Optional. Add one or more covered months for this payment.</p>
                <div className={styles.periodTags}>
                  {(form.paymentPeriods || []).length === 0 ? (
                    <span className={styles.periodEmpty}>No periods added yet</span>
                  ) : (
                    form.paymentPeriods.map((period) => (
                      <button
                        key={period}
                        type="button"
                        className={styles.periodTag}
                        onClick={() => removePaymentPeriod(period)}
                        title="Remove period"
                      >
                        {paymentPeriodToLabel(period)} x
                      </button>
                    ))
                  )}
                </div>
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
