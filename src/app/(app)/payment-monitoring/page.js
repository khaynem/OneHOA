"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  HiOutlineBanknotes as CollectedIcon,
  HiOutlineChartBar as RateIcon,
  HiOutlineCircleStack as PaymentIcon,
  HiOutlineClock as PendingIcon,
  HiOutlineEye,
} from 'react-icons/hi2'
import { Br, Cut, Line, Printer, Row, Text, render } from 'react-thermal-printer'
import { apiClient, offlineApiClient } from '@/lib/apiClient'
import { notify } from '@/lib/notify'
import styles from './payment-monitoring.module.css'

const EMPTY_FORM = {
  recordId: '',
  homeownerSearch: '',
  amount: '',
  date: '',
  receiptNo: '',
  paymentPeriods: [],
  rangeStartYear: '2026',
  rangeStartMonth: '01',
  rangeEndYear: '2026',
  rangeEndMonth: '01',
  paymentDetails: ''
}

const DEFAULT_MONTHLY_DUES = 100
const PAGE_SIZE = 10
const PRINTER_TYPE = 'epson'
const PRINTER_WIDTH = 32
const PRINTER_BAUD_RATE = 115200

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

const isOwnerOccupant = (value) => String(value || '').trim().toLowerCase() === 'owner'

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

const getUserDisplayName = (user = {}) => {
  const name = `${user.first_name || ''} ${user.last_name || ''}`.trim()
  return name || user.email || '-'
}

const getIssuedByLabel = (payment = {}) => {
  const recordedBy = payment.recorded_by

  if (recordedBy && typeof recordedBy === 'object') {
    return getUserDisplayName(recordedBy)
  }

  if (typeof recordedBy === 'string' && recordedBy.trim()) {
    return recordedBy
  }

  return payment.issuedBy || '-'
}

const isPaymentMonitored = (record = {}) => isOwnerOccupant(record.occupant_status)

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
    currency: 'PHP',
    currencyDisplay: 'symbol'
  }).format(Number(amount) || 0)

const toYmd = (dateValue) => {
  if (!dateValue) {
    return ''
  }

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const generateReceiptNo = (existingReceipts) => {
  const existing = new Set(existingReceipts.map((value) => String(value).trim()))
  let receipt = ''
  let attempts = 0

  while (attempts < 8) {
    const randomPart = Math.floor(1000 + Math.random() * 9000)
    receipt = `${Date.now().toString().slice(-4)}${randomPart}`
    if (!existing.has(receipt)) {
      return receipt
    }
    attempts += 1
  }

  return `${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 10000)}`
}

const buildPeriodRange = (startYear, startMonth, endYear, endMonth) => {
  const sYear = Number(startYear)
  const sMonth = Number(startMonth)
  const eYear = Number(endYear)
  const eMonth = Number(endMonth)

  if (
    !Number.isInteger(sYear) || sYear < 2000 || sYear > 3000 ||
    !Number.isInteger(eYear) || eYear < 2000 || eYear > 3000 ||
    !Number.isInteger(sMonth) || sMonth < 1 || sMonth > 12 ||
    !Number.isInteger(eMonth) || eMonth < 1 || eMonth > 12
  ) {
    return { periods: [], label: '' }
  }

  const startPeriod = sYear * 100 + sMonth
  const endPeriod = eYear * 100 + eMonth
  if (endPeriod < startPeriod) {
    return { periods: [], label: '' }
  }

  const periods = []
  let year = sYear
  let month = sMonth
  while (year * 100 + month <= endPeriod) {
    periods.push(year * 100 + month)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }

  return {
    periods,
    label: `${paymentPeriodToLabel(startPeriod)} - ${paymentPeriodToLabel(endPeriod)}`
  }
}

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

const formatReceiptPeriods = (periods = []) => {
  if (!Array.isArray(periods) || periods.length === 0) {
    return 'Not specified'
  }

  return periods.map(paymentPeriodToLabel).join(', ')
}

const buildReceiptElement = (receipt) => (
  <Printer type={PRINTER_TYPE} width={PRINTER_WIDTH}>
    <Text align="center" bold={true}>OneHOA</Text>
    <Text align="center">Payment Receipt</Text>
    <Br />
    <Text align="center">--------------------------------</Text>
    <Text>Receipt No: {String(receipt.receiptNo || '-')}</Text>
    <Text>Date Paid: {formatDate(receipt.datePaid)}</Text>
    <Text>Homeowner: {String(receipt.homeownerName || '-')}</Text>
    <Text>Ph-Blk-Lot: {String(receipt.unitNumber || '-')}</Text>
    <Text align="center">--------------------------------</Text>
    <Text>Periods: {formatReceiptPeriods(receipt.coveredPeriods)}</Text>
    <Text>Amount: Php {Number(receipt.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
    {receipt.issuedBy && <Text>Issued By: {String(receipt.issuedBy)}</Text>}
    {receipt.issuedAt && <Text>Issued On: {formatDate(receipt.issuedAt)}</Text>}
    <Br />
    <Text>Details: {String(receipt.details || 'Monthly Due Payments')}</Text>
    <Text align="center">--------------------------------</Text>
    <Text align="center">Thank you</Text>
    <Cut />
  </Printer>
)

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
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [records, setRecords] = useState([])
  const [homeowners, setHomeowners] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false)
  const [selectedPaymentRecord, setSelectedPaymentRecord] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [isHomeownerSuggestOpen, setIsHomeownerSuggestOpen] = useState(false)
  const [debouncedHomeownerSearch, setDebouncedHomeownerSearch] = useState('')
  const [monthlyDues, setMonthlyDues] = useState(DEFAULT_MONTHLY_DUES)
  const [monthlyDuesDraft, setMonthlyDuesDraft] = useState(String(DEFAULT_MONTHLY_DUES))
  const [currentUserRole, setCurrentUserRole] = useState('')
  const [currentUser, setCurrentUser] = useState(null)
  const [isSavingDues, setIsSavingDues] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [isPrinting, setIsPrinting] = useState(false)
  const [isSavingPayment, setIsSavingPayment] = useState(false)
  const [printerType, setPrinterType] = useState('usb')
  const [mounted, setMounted] = useState(false)

  const printerPortRef = useRef(null)
  const printerTypeRef = useRef(null)

  const monitoredHomeowners = useMemo(
    () => homeowners.filter((homeowner) => isPaymentMonitored(homeowner)),
    [homeowners]
  )

  const homeownerDirectory = useMemo(
    () =>
      monitoredHomeowners.map((homeowner) => {
        const address = homeowner.address?._id || homeowner['address._id'] || null
        const name = getHomeownerName(homeowner)
        const unitNumber = toUnitNumberFromAddress(address)

        return {
          id: String(homeowner._id),
          name,
          unitNumber,
          searchKey: `${name} ${unitNumber}`.toLowerCase()
        }
      }),
    [monitoredHomeowners]
  )

  const loadPaymentMonitoringData = async () => {
    try {
      setIsLoading(true)

      const [paymentsResponse, recordsResponse] = await Promise.all([
        apiClient.get('/payments'),
        apiClient.get('/records', {
          query: {
            page: 1,
            limit: 500,
            summary: true
          }
        })
      ])

      const rawHomeowners = Array.isArray(recordsResponse?.data) ? recordsResponse.data : []
      const homeownersById = new Map(rawHomeowners.map((entry) => [String(entry._id), entry]))

      const paymentRows = (Array.isArray(paymentsResponse?.data) ? paymentsResponse.data : [])
        .map((payment) => {
          const linkedRecord = payment.records?._id
          const linkedRecordId = linkedRecord?._id
            ? String(linkedRecord._id)
            : String(payment.records?._id || '')
          const homeownerFromRecords = homeownersById.get(linkedRecordId)
          const address = homeownerFromRecords?.address?._id || homeownerFromRecords?.['address._id'] || null
          const coveredPeriods = parseCoveredPeriods(payment)

          if (homeownerFromRecords && !isPaymentMonitored(homeownerFromRecords)) {
            return null
          }

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
            paymentMethod: String(payment.payment_method || '-'),
            paymentStatusRaw: String(payment.payment_status || '-'),
            paymentStatus: String(payment.payment_status || '').toLowerCase(),
            issuedBy: getIssuedByLabel(payment),
            issuedAt: payment.createdAt || null,
            coveredPeriods,
            createdAt: payment.createdAt || null,
            updatedAt: payment.updatedAt || null
          }
        })
        .filter(Boolean)

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
    setMounted(true)

    const now = new Date()
    const currentYear = String(now.getFullYear())
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0')
    setForm((prev) => ({
      ...prev,
      rangeStartYear: currentYear,
      rangeStartMonth: currentMonth,
      rangeEndYear: currentYear,
      rangeEndMonth: currentMonth
    }))
  }, [])


  useEffect(() => {
    let isMounted = true

    const loadDuesAndUser = async () => {
      const [duesResult, meResult] = await Promise.allSettled([
        apiClient.get('/settings/dues'),
        apiClient.get('/auth/me')
      ])

      if (!isMounted) {
        return
      }

      if (duesResult.status === 'fulfilled') {
        const nextAmount = Number(duesResult.value?.amount)
        if (!Number.isNaN(nextAmount) && nextAmount > 0) {
          setMonthlyDues(nextAmount)
          setMonthlyDuesDraft(String(nextAmount))
        }
      }

      if (meResult.status === 'fulfilled') {
        const userObj = meResult.value?.user
        setCurrentUserRole(String(userObj?.role || ''))
        setCurrentUser(userObj)
      }
    }

    loadDuesAndUser()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    setForm((prev) => {
      const periods = Array.isArray(prev.paymentPeriods) ? prev.paymentPeriods : []
      if (periods.length === 0) {
        return prev.amount ? { ...prev, amount: '' } : prev
      }

      const nextAmount = String(periods.length * monthlyDues)
      if (prev.amount === nextAmount) {
        return prev
      }

      return { ...prev, amount: nextAmount }
    })
  }, [monthlyDues])

  const rangeInfo = useMemo(
    () => buildPeriodRange(
      form.rangeStartYear,
      form.rangeStartMonth,
      form.rangeEndYear,
      form.rangeEndMonth
    ),
    [form.rangeStartMonth, form.rangeStartYear, form.rangeEndMonth, form.rangeEndYear]
  )

  useEffect(() => {
    setForm((prev) => {
      const periods = rangeInfo.periods
      const nextAmount = periods.length > 0 ? String(periods.length * monthlyDues) : ''

      if (
        prev.amount === nextAmount &&
        Array.isArray(prev.paymentPeriods) &&
        prev.paymentPeriods.length === periods.length &&
        prev.paymentPeriods.every((value, index) => value === periods[index])
      ) {
        return prev
      }

      return {
        ...prev,
        paymentPeriods: periods,
        amount: nextAmount
      }
    })
  }, [rangeInfo, monthlyDues])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedHomeownerSearch(form.homeownerSearch)
    }, 150)

    return () => window.clearTimeout(timer)
  }, [form.homeownerSearch])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchText, filterStartDate, filterEndDate])

  const filteredRecords = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    const startObj = filterStartDate ? parseLocalDate(filterStartDate) : null
    const endObj = filterEndDate ? parseLocalDate(filterEndDate) : null

    // Ensure the end date covers the full day (set to end of day)
    if (endObj) {
      endObj.setHours(23, 59, 59, 999)
    }

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
        const paidDate = parseLocalDate(record.datePaid)
        if (!paidDate || Number.isNaN(paidDate.getTime())) {
          return false
        }

        if (startObj && paidDate < startObj) {
          return false
        }

        if (endObj && paidDate > endObj) {
          return false
        }

        return true
      })
      .sort((a, b) => {
        const dateA = parseLocalDate(a.datePaid)
        const dateB = parseLocalDate(b.datePaid)
        return (dateB?.getTime() || 0) - (dateA?.getTime() || 0)
      })
  }, [records, searchText, filterStartDate, filterEndDate])

  const filteredTotalPayment = useMemo(() => {
    return filteredRecords.reduce((sum, record) => {
      // Sum all payment amounts matching the filter
      return sum + (Number(record.amount) || 0)
    }, 0)
  }, [filteredRecords])

  const totalPages = Math.max(Math.ceil(filteredRecords.length / PAGE_SIZE), 1)
  const pagedRecords = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredRecords.slice(start, start + PAGE_SIZE)
  }, [currentPage, filteredRecords])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const openRecordModal = () => {
    const receiptNo = generateReceiptNo(records.map((record) => record.receiptNo))
    const today = toYmd(new Date())
    const currentYear = new Date().getFullYear()
    const currentMonth = new Date().getMonth() + 1
    const startYear = String(currentYear)
    const startMonth = String(currentMonth).padStart(2, '0')
    const endYear = String(currentYear)
    const endMonth = String(currentMonth).padStart(2, '0')

    const range = buildPeriodRange(startYear, startMonth, endYear, endMonth)
    const periods = range.periods.length > 0 ? range.periods : [currentYear * 100 + currentMonth]
    const nextAmount = String(periods.length * monthlyDues)

    setForm({
      ...EMPTY_FORM,
      receiptNo,
      date: today,
      rangeStartYear: startYear,
      rangeStartMonth: startMonth,
      rangeEndYear: endYear,
      rangeEndMonth: endMonth,
      paymentPeriods: periods,
      amount: nextAmount
    })
    setIsRecordModalOpen(true)
  }

  const closeRecordModal = () => {
    setIsRecordModalOpen(false)
    setForm(EMPTY_FORM)
  }

  const openPaymentViewModal = (record) => {
    setSelectedPaymentRecord(record)
  }

  const closePaymentViewModal = () => {
    setSelectedPaymentRecord(null)
  }

  const handleFormChange = (field, value) => {
    setForm((prev) => {
      let nextState = { ...prev, [field]: value }

      if (['rangeStartYear', 'rangeStartMonth', 'rangeEndYear', 'rangeEndMonth'].includes(field)) {
        const sYear = Number(nextState.rangeStartYear)
        const sMonth = Number(nextState.rangeStartMonth)
        const eYear = Number(nextState.rangeEndYear)
        const eMonth = Number(nextState.rangeEndMonth)

        if (Number.isInteger(sYear) && Number.isInteger(sMonth) && Number.isInteger(eYear) && Number.isInteger(eMonth)) {
          const startPeriod = sYear * 100 + sMonth
          const endPeriod = eYear * 100 + eMonth

          if (startPeriod > endPeriod) {
            nextState.rangeEndYear = nextState.rangeStartYear
            nextState.rangeEndMonth = nextState.rangeStartMonth
          }
        }
      }

      return nextState
    })
  }

  const homeownerSuggestions = useMemo(() => {
    if (!isRecordModalOpen) {
      return []
    }

    const query = debouncedHomeownerSearch.trim().toLowerCase()

    if (!query) {
      return homeownerDirectory.slice(0, 8)
    }

    return homeownerDirectory
      .filter((homeowner) => homeowner.searchKey.includes(query))
      .slice(0, 8)
  }, [debouncedHomeownerSearch, homeownerDirectory, isRecordModalOpen])

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

  const saveMonthlyDues = async () => {
    const nextAmount = Number(String(monthlyDuesDraft || '').replace(/[^\d.]/g, ''))

    if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
      notify.error({
        title: 'Invalid Monthly Dues',
        description: 'Enter a valid amount greater than 0.'
      })
      return
    }

    try {
      setIsSavingDues(true)
      const response = await offlineApiClient.put('/settings/dues', { amount: nextAmount }, {
        metadata: {
          type: 'update-dues',
          label: `Updating monthly dues to ₱${nextAmount}`
        }
      })
      const savedAmount = Number(response?.amount)
 
      if (!Number.isNaN(savedAmount) && savedAmount > 0) {
        setMonthlyDues(savedAmount)
        setMonthlyDuesDraft(String(savedAmount))
      }
 
      notify.success({
        title: 'Monthly Dues Updated',
        description: 'The new monthly dues amount has been saved.'
      })
    } catch (error) {
      if (error.isOffline) {
        notify.info({
          title: 'Saved Offline',
          description: "Saved offline. Your changes will be submitted automatically when you're back online."
        })
      } else {
        notify.error({
          title: 'Failed to Update Dues',
          description: error.message || 'Unable to update monthly dues.'
        })
      }
    } finally {
      setIsSavingDues(false)
    }
  }


  const ensurePrinterConnection = async () => {
    if (!window.isSecureContext) {
      throw new Error('Printing requires HTTPS or localhost to access the printer.')
    }

    if (printerPortRef.current && printerTypeRef.current === printerType) {
      if (printerType === 'bluetooth' && !printerPortRef.current.device.gatt?.connected) {
        // Drop through to reconnect
      } else {
        return { device: printerPortRef.current, type: printerType }
      }
    }

    // Reset if switching types
    printerPortRef.current = null

    if (printerType === 'bluetooth') {
      if (!('bluetooth' in navigator)) {
        throw new Error('Web Bluetooth is not supported in this browser.')
      }

      let btDevice = null

      // 1. Try to get already paired/permitted devices first for instant pairing without dialog
      try {
        if (navigator.bluetooth.getDevices) {
          const pairedDevices = await navigator.bluetooth.getDevices()
          btDevice = pairedDevices.find(dev => dev.name && (dev.name.startsWith('PT-210') || dev.name.startsWith('PT-')))
        }
      } catch (e) {
        // Skip listing errors silently
      }

      // 2. If no pre-permitted device exists, request device from user
      if (!btDevice) {
        btDevice = await navigator.bluetooth.requestDevice({
          filters: [
            { namePrefix: 'PT-210' },
            { namePrefix: 'PT-' }
          ],
          optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2']
        })
      }

      const server = await btDevice.gatt.connect()

      let writeCharacteristic = null
      const knownServiceUuids = ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2']

      // 3. Fast-path: query the known service UUIDs directly (takes <500ms)
      for (const uuid of knownServiceUuids) {
        try {
          const service = await server.getPrimaryService(uuid)
          const characteristics = await service.getCharacteristics()
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              writeCharacteristic = char
              break
            }
          }
          if (writeCharacteristic) break
        } catch (e) {
          // Ignore service get errors for fallback
        }
      }

      // 4. Slow-path fallback: query all primary services (takes 5-10s)
      if (!writeCharacteristic) {
        const services = await server.getPrimaryServices()
        for (const service of services) {
          try {
            const characteristics = await service.getCharacteristics()
            for (const char of characteristics) {
              if (char.properties.write || char.properties.writeWithoutResponse) {
                writeCharacteristic = char
                break
              }
            }
            if (writeCharacteristic) break
          } catch (e) {
            // Ignore characteristics fetch failures
          }
        }
      }

      if (!writeCharacteristic) {
        throw new Error('Could not find a writable Bluetooth characteristic on this device.')
      }

      printerPortRef.current = { device: btDevice, server, writeCharacteristic }
      printerTypeRef.current = 'bluetooth'
      return { device: printerPortRef.current, type: 'bluetooth' }
    } else if (printerType === 'serial') {
      if (!('serial' in navigator)) {
        throw new Error('Web Serial is not supported in this browser.')
      }
      const ports = await navigator.serial.getPorts()
      const port = ports[0] || (await navigator.serial.requestPort())
      printerPortRef.current = port
      printerTypeRef.current = 'serial'
      return { device: port, type: 'serial' }
    } else {
      if (!('usb' in navigator)) {
        throw new Error('Web USB is not supported in this browser.')
      }
      const devices = await navigator.usb.getDevices()
      let device = devices[0]
      if (!device) {
        device = await navigator.usb.requestDevice({ filters: [] })
      }
      printerPortRef.current = device
      printerTypeRef.current = 'usb'
      return { device, type: 'usb' }
    }
  }

  const writeToPrinter = async (data) => {
    const { device, type } = await ensurePrinterConnection()

    if (type === 'serial') {
      let openedHere = false
      if (!device.readable || !device.writable) {
        await device.open({ baudRate: PRINTER_BAUD_RATE })
        openedHere = true
      }

      const writer = device.writable?.getWriter()
      if (!writer) {
        throw new Error('Printer port is not writable.')
      }

      try {
        await writer.write(data)
      } finally {
        writer.releaseLock()
        if (openedHere) {
          await device.close()
        }
      }
    } else if (type === 'bluetooth') {
      const { writeCharacteristic } = device
      if (!writeCharacteristic) throw new Error('Bluetooth connection lost.')

      const CHUNK_SIZE = 250
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE)
        if (writeCharacteristic.properties.write) {
          await writeCharacteristic.writeValueWithResponse(chunk)
        } else {
          await writeCharacteristic.writeValueWithoutResponse(chunk)
        }
        await new Promise(r => setTimeout(r, 10))
      }
    } else if (type === 'usb') {
      let openedHere = false
      if (!device.opened) {
        await device.open()
        openedHere = true
      }

      if (device.configuration === null) {
        await device.selectConfiguration(1)
      }

      let interfaceNumber = -1
      let endpointNumber = -1

      for (const iface of device.configuration.interfaces) {
        for (const alt of iface.alternates) {
          for (const ep of alt.endpoints) {
            if (ep.direction === 'out') {
              interfaceNumber = iface.interfaceNumber
              endpointNumber = ep.endpointNumber
              break
            }
          }
          if (endpointNumber !== -1) break
        }
        if (endpointNumber !== -1) break
      }

      if (interfaceNumber === -1 || endpointNumber === -1) {
        throw new Error('Could not find a valid USB interface or endpoint to write to.')
      }

      if (!device.configuration.interfaces[interfaceNumber].claimed) {
        await device.claimInterface(interfaceNumber)
      }

      await device.transferOut(endpointNumber, data)
    }
  }

  const handleGenerateReport = () => {
    const generatorName = currentUser
      ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || currentUser.username
      : 'Authorized Officer'
    const generatorRole = currentUser ? String(currentUser.role || '').toUpperCase() : 'OFFICER'

    const dateRangeLabel =
      filterStartDate && filterEndDate
        ? `Period: ${filterStartDate} to ${filterEndDate}`
        : filterStartDate
          ? `From: ${filterStartDate}`
          : filterEndDate
            ? `Until: ${filterEndDate}`
            : 'All Time'

    const rowsHtml = filteredRecords
      .map(
        (record) => `
        <tr>
          <td>${formatDate(record.datePaid)}</td>
          <td>${record.receiptNo}</td>
          <td>${record.homeownerName}</td>
          <td>${record.unitNumber}</td>
          <td>${formatReceiptPeriods(record.coveredPeriods)}</td>
          <td>${toPeso(record.amount)}</td>
        </tr>
      `
      )
      .join('')

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>Payment Collection Report</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              margin: 40px;
              color: #0f172a;
              line-height: 1.5;
              background: #ffffff;
            }
            .header {
              display: flex;
              align-items: center;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            .logo {
              height: 52px;
              width: 52px;
              object-fit: contain;
              margin-right: 14px;
            }
            .header-text {
              flex: 1;
            }
            .org-name {
              font-size: 18px;
              font-weight: 700;
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin: 0;
            }
            .org-sub {
              font-size: 12px;
              color: #475569;
              margin: 2px 0 0 0;
            }
            .report-title {
              font-size: 22px;
              font-weight: 700;
              color: #0f172a;
              margin: 0 0 20px 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 8px;
              text-align: center;
            }
            .meta-section {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 16px;
              margin-bottom: 24px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              font-size: 14px;
            }
            .meta-section p {
              margin: 4px 0;
            }
            .meta-label {
              font-weight: 600;
              color: #475569;
            }
            .meta-value {
              color: #0f172a;
              font-weight: 500;
            }
            .total-banner {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-left: 4px solid #0a68b2;
              border-radius: 6px;
              padding: 16px;
              margin-bottom: 24px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .total-title {
              font-size: 14px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #64748b;
              margin: 0;
            }
            .total-amount {
              font-size: 20px;
              font-weight: 700;
              color: #0f172a;
              margin: 0;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th {
              background: #0a68b2;
              color: #ffffff;
              font-weight: 600;
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 10px 14px;
              text-align: left;
              border-bottom: 2px solid #095b9b;
            }
            td {
              padding: 10px 14px;
              font-size: 13px;
              color: #334155;
              border-bottom: 1px solid #e2e8f0;
            }
            tr:nth-child(even) td {
              background: #f8fafc;
            }
            .footer {
              margin-top: 50px;
              padding-top: 16px;
              border-top: 1px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              font-size: 13px;
              color: #64748b;
            }
            .footer-meta div {
              margin-bottom: 4px;
            }
            .footer-note {
              font-style: italic;
              text-align: right;
            }
            @media print {
              body { margin: 20px; }
              th {
                background: #0a68b2 !important;
                color: #ffffff !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .meta-section {
                background: #f8fafc !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .total-banner {
                background-color: #f8fafc !important;
                border-left: 4px solid #0a68b2 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="/images/HOA_Logo.png" alt="FC Hanjin Village HOA Logo" class="logo" />
            <div class="header-text">
              <h2 class="org-name">FC Hanjin Village Homeowners Association</h2>
              <p class="org-sub">Brgy. Nagbunga, Castillejos, Zambales</p>
            </div>
          </div>

          <h1 class="report-title">Payment Collection Report</h1>

          <div class="meta-section">
            <div>
              <p><span class="meta-label">Generated By:</span> <span class="meta-value">${generatorName} (${generatorRole})</span></p>
              <p><span class="meta-label">Date Generated:</span> <span class="meta-value">${new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</span></p>
            </div>
            <div>
              <p><span class="meta-label">Report Range:</span> <span class="meta-value">${dateRangeLabel}</span></p>
              <p><span class="meta-label">Total Receipts:</span> <span class="meta-value">${filteredRecords.length}</span></p>
            </div>
          </div>

          <div class="total-banner">
            <h2 class="total-title">Total Amount Collected</h2>
            <p class="total-amount">${toPeso(filteredTotalPayment)}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date Paid</th>
                <th>Receipt No.</th>
                <th>Homeowner Name</th>
                <th>Unit / Phase-Blk-Lot</th>
                <th>Covered Period(s)</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml ||
      '<tr><td colspan="6" style="text-align: center; color: #6b7280;">No transactions recorded in this date range.</td></tr>'
      }
            </tbody>
          </table>

          <div class="footer">
            <div class="footer-meta">
              <div>Generated at: ${new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</div>
              <div>Generated by: ${generatorName} (${generatorRole})</div>
            </div>
            <div class="footer-note">
              This is a system-generated document.<br />
              OneHOA Portal Services
            </div>
          </div>
        </body>
      </html>
    `

    const isMobileOrTablet = () => {
      if (typeof window === 'undefined') return false
      return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        window.navigator.userAgent.toLowerCase()
      )
    }

    const printViaIframe = (contentHtml) => {
      let iframe = document.getElementById('print-iframe')
      if (!iframe) {
        iframe = document.createElement('iframe')
        iframe.id = 'print-iframe'
        iframe.style.position = 'fixed'
        iframe.style.right = '0'
        iframe.style.bottom = '0'
        iframe.style.width = '0'
        iframe.style.height = '0'
        iframe.style.border = '0'
        iframe.style.zIndex = '-9999'
        document.body.appendChild(iframe)
      }
      const doc = iframe.contentDocument || iframe.contentWindow.document
      doc.open()
      doc.write(contentHtml)
      doc.close()
      setTimeout(() => {
        iframe.contentWindow.focus()
        iframe.contentWindow.print()
      }, 500)
    }

    if (isMobileOrTablet()) {
      printViaIframe(html)
      return
    }

    const popup = window.open('', '_blank')
    if (!popup) {
      printViaIframe(html)
      return
    }

    popup.document.write(html)
    popup.document.close()

    popup.onload = () => {
      popup.focus()
      popup.onafterprint = () => {
        popup.close()
      }
      popup.print()
    }
  }

  const handlePrintReceipt = async (receiptData) => {
    if (!receiptData) {
      return
    }

    setIsPrinting(true)
    try {
      const receiptElement = buildReceiptElement({
        ...receiptData,
        printedAt: new Date()
      })
      const data = await render(receiptElement)
      await writeToPrinter(data)
      notify.success({
        title: 'Receipt Sent to Printer',
        description: 'Thermal printer received the receipt data.'
      })
    } catch (error) {
      const errorName = String(error?.name || '')
      const errorMsg = String(error?.message || '')
      let description = ''

      if (errorName === 'NotFoundError') {
        description = 'No printer was selected. Please choose a port to continue.'
      } else if (errorMsg.includes('Access denied')) {
        description = 'Windows blocked the printer. Use "Zadig" tool (zadig.akeo.ie) to install WinUSB driver for your printer, then restart Chrome.'
      } else if (errorMsg.includes('claimInterface')) {
        description = 'Another browser (e.g. Chrome) is already using the printer. Close all other browsers and tabs, then try again. Only one browser can access the USB printer at a time.'
      } else if (errorMsg.includes('Bluetooth') || errorMsg.includes('GATT') || errorMsg.includes('gatt') || errorMsg.includes('Connection')) {
        description = 'Bluetooth connection to printer failed. Make sure the printer is turned on, in pairing mode, and not already connected to another device. Try unpairing and pairing again in Windows Bluetooth settings.'
      } else {
        description = errorMsg || 'Unable to print receipt. Check your printer connection and try again.'
      }

      notify.error({
        title: 'Print Failed',
        description
      })
    } finally {
      setIsPrinting(false)
    }
  }

  const buildReceiptFromForm = (matchedHomeowner, amountPaid, numericReceiptNo, paymentForPeriods, paymentDate) => {
    const officerName = currentUser ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || currentUser.username : ''
    return {
      homeownerName: matchedHomeowner?.name || '-',
      unitNumber: matchedHomeowner?.unitNumber || '-',
      amount: amountPaid,
      datePaid: paymentDate,
      receiptNo: String(numericReceiptNo || ''),
      details: form.paymentDetails.trim() || 'Maintenance fee payment',
      coveredPeriods: paymentForPeriods,
      issuedBy: officerName || null,
      issuedAt: new Date()
    }
  }

  const buildReceiptFromRecord = (record) => {
    return {
      homeownerName: record?.homeownerName || '-',
      unitNumber: record?.unitNumber || '-',
      amount: record?.amount || 0,
      datePaid: record?.datePaid,
      receiptNo: record?.receiptNo || '-',
      details: record?.details || 'Maintenance fee payment',
      coveredPeriods: record?.coveredPeriods || [],
      issuedBy: record?.issuedBy || null,
      issuedAt: record?.issuedAt || record?.createdAt || null
    }
  }

  const savePaymentRecord = async ({ shouldPrint = false } = {}) => {
    if (isSavingPayment) return
    const amountPaid = Number(form.amount)
    const safeReceiptNo = form.receiptNo || generateReceiptNo(records.map((record) => record.receiptNo))
    const numericReceiptNo = Number(String(safeReceiptNo).replace(/\D/g, ''))
    const paymentForPeriods = Array.isArray(form.paymentPeriods) ? form.paymentPeriods : []
    const paymentDate = form.date || toYmd(new Date())

    if (!form.recordId || !amountPaid || !numericReceiptNo) {
      notify.error({
        title: 'Missing Required Details',
        description: 'Please complete homeowner and payment period range.'
      })
      return
    }

    if (paymentForPeriods.length === 0) {
      notify.error({
        title: 'Missing Payment Periods',
        description: 'Choose a valid payment period range.'
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

    const alreadyPaidPeriods = records
      .filter((record) => record.recordId === form.recordId && record.paymentStatus === 'paid')
      .flatMap((record) => record.coveredPeriods || [])
    const duplicatePeriods = paymentForPeriods.filter((period) => alreadyPaidPeriods.includes(period))

    if (duplicatePeriods.length > 0) {
      notify.error({
        title: 'Duplicate Payment Period',
        description: `Payment already recorded for ${duplicatePeriods.map(paymentPeriodToLabel).join(', ')}.`
      })
      return
    }

    try {
      setIsSavingPayment(true)
      const response = await offlineApiClient.post('/payments', {
        receipt_no: numericReceiptNo,
        amount: amountPaid,
        date: paymentDate,
        payment_details: form.paymentDetails.trim() || 'Maintenance fee payment',
        record_id: form.recordId,
        payment_for_periods: paymentForPeriods.length > 0 ? paymentForPeriods : undefined
      }, {
        metadata: {
          type: 'create-payment',
          label: `Recording payment of ₱${amountPaid} for ${matchedHomeowner.name}`
        }
      })
      notify.success({
        title: 'Payment Recorded',
        description: `${matchedHomeowner.name}'s payment has been added.`
      })
      const receiptData = buildReceiptFromForm(
        matchedHomeowner,
        amountPaid,
        numericReceiptNo,
        paymentForPeriods,
        paymentDate
      )
      if (response?.payment) {
        receiptData.issuedAt = response.payment.createdAt || receiptData.issuedAt
      }
      closeRecordModal()
      await loadPaymentMonitoringData()
 
      if (shouldPrint) {
        await handlePrintReceipt(receiptData)
      }
    } catch (error) {
      if (error.isOffline) {
        notify.info({
          title: 'Saved Offline',
          description: "Saved offline. Your changes will be submitted automatically when you're back online."
        })
        closeRecordModal()
      } else {
        notify.error({
          title: 'Failed to Record Payment',
          description: error.message || 'Unable to save payment record.'
        })
      }
    } finally {
      setIsSavingPayment(false)
    }
  }

  const stats = useMemo(() => {
    const currentPeriod = getCurrentPeriod()

    const currentMonthPaidRecords = records.filter(
      (record) => record.paymentStatus === 'paid' && record.coveredPeriods.includes(currentPeriod)
    )

    const totalCollectedCurrentMonth = currentMonthPaidRecords.reduce(
      (sum, record) => sum + (Number(record.amount) || 0),
      0
    )

    const paidHomeownerIds = new Set(currentMonthPaidRecords.map((record) => record.recordId).filter(Boolean))
    const totalHomeowners = monitoredHomeowners.length
    const collectionRate = totalHomeowners > 0 ? Math.round((paidHomeownerIds.size / totalHomeowners) * 100) : 0

    const upcomingPaymentsCount = monitoredHomeowners.filter(
      (homeowner) => !paidHomeownerIds.has(String(homeowner._id))
    ).length

    return {
      totalCollectedCurrentMonth,
      upcomingPayments: upcomingPaymentsCount,
      collectionRate
    }
  }, [monitoredHomeowners, records])

  const receiptDateLabel = formatDate(form.date)

  return (
    <>
      <div className={styles.backgroundContainer} aria-hidden="true">
        <div className={styles.gridOverlay} />
        <div className={styles.blob1} />
        <div className={styles.blob2} />
        <div className={styles.movingGradient} />
      </div>

      <div className={styles.pageContent}>
        <div className={styles.welcomeBanner}>
          <div className={styles.bannerContent}>
            <span className={styles.bannerBadge}>Fiesta Community Hanjin Village</span>
            <h1 className={styles.bannerTitle}>Payment Tracker</h1>
            <p className={styles.bannerSubtitle}>
              Track, record, and generate reports for monthly maintenance fee payments.
            </p>
          </div>
          <div className={styles.bannerVisual} aria-hidden="true">
            <div className={styles.bannerLogoBg} />
          </div>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={styles.recordButton} onClick={openRecordModal}>
            <PaymentIcon className={styles.recordButtonIcon} aria-hidden="true" />
            Add Record Payment
          </button>
        </div>

        <section className={styles.duesCard} aria-label="Monthly dues">
          <div>
            <p className={styles.duesLabel}>Monthly Dues</p>
            <p className={styles.duesValue}>{toPeso(monthlyDues)}</p>
            <p className={styles.duesHint}>Used to calculate payment totals for new records.</p>
          </div>
          {['admin', 'president'].includes(String(currentUserRole || '').toLowerCase()) ? (
            <div className={styles.duesControls}>
              <input
                type="text"
                inputMode="decimal"
                className={styles.duesInput}
                value={monthlyDuesDraft}
                onChange={(event) => setMonthlyDuesDraft(event.target.value)}
                placeholder="Enter amount"
                aria-label="Monthly dues amount"
              />
              <button
                type="button"
                className={styles.duesButton}
                onClick={saveMonthlyDues}
                disabled={isSavingDues}
              >
                {isSavingDues ? 'Saving...' : 'Save'}
              </button>
            </div>
          ) : null}
        </section>

        <section className={styles.cardGrid} aria-label="Payment monitoring stats">
          <article className={styles.statCard}>
            <div className={styles.statContent}>
              <p className={styles.statLabel}>Total Collected (for Filtered Period)</p>
              <p className={styles.statValue}>
                {mounted && (filterStartDate || filterEndDate || searchText.trim()) ? toPeso(filteredTotalPayment) : '-'}
              </p>
              <p className={styles.statSubtext}>From recorded payments</p>
            </div>
            <div className={styles.statIconWrap}>
              <CollectedIcon className={styles.statIcon} aria-hidden="true" />
            </div>
          </article>

          <article className={styles.statCard}>
            <div className={styles.statContent}>
              <p className={styles.statLabel}>Upcoming Payments (Current Month)</p>
              <p className={styles.statValue}>{mounted ? stats.upcomingPayments : '-'}</p>
              <p className={styles.statSubtext}>Outstanding balances for current month</p>
            </div>
            <div className={styles.statIconWrap}>
              <PendingIcon className={styles.statIcon} aria-hidden="true" />
            </div>
          </article>

          <article className={styles.statCard}>
            <div className={styles.statContent}>
              <p className={styles.statLabel}>Collection Rate</p>
              <p className={styles.statValue}>{mounted ? `${stats.collectionRate}%` : '-'}</p>
              <p className={styles.statSubtext}>Current month</p>
            </div>
            <div className={styles.statIconWrap}>
              <RateIcon className={styles.statIcon} aria-hidden="true" />
            </div>
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

            <div className={styles.dateFilterGroup}>
              <span className={styles.dateLabel}>From:</span>
              <input
                type="date"
                value={filterStartDate}
                onChange={(event) => setFilterStartDate(event.target.value)}
                className={styles.dateInput}
                max={filterEndDate || (mounted ? toYmd(new Date()) : '')}
                aria-label="Filter payment records start date"
              />
              <span className={styles.dateLabel}>To:</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(event) => setFilterEndDate(event.target.value)}
                className={styles.dateInput}
                min={filterStartDate}
                max={mounted ? toYmd(new Date()) : ''}
                aria-label="Filter payment records end date"
              />
              {(filterStartDate || filterEndDate) && (
                <button
                  type="button"
                  className={styles.clearFilterButton}
                  onClick={() => {
                    setFilterStartDate('')
                    setFilterEndDate('')
                  }}
                  style={{ marginLeft: '6px' }}
                >
                  Clear Filters
                </button>
              )}
              <button
                type="button"
                className={styles.generateReportButton}
                onClick={handleGenerateReport}
                style={{ marginLeft: '10px' }}
                disabled={filteredRecords.length === 0}
              >
                Generate Report
              </button>
            </div>
          </div>
        </section>

        <section className={styles.tableCard}>
          <h2 className={styles.tableTitle}>Recent Payment Records</h2>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Homeowner</th>
                  <th>Receipt No.</th>
                  <th>Amount</th>
                  <th>Date Paid</th>
                  <th>Actions</th>
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
                  pagedRecords.map((record) => (
                    <tr key={record.id}>
                      <td>{record.homeownerName}</td>
                      <td>{record.receiptNo}</td>
                      <td>{toPeso(record.amount)}</td>
                      <td>{formatDate(record.datePaid)}</td>
                      <td>
                        <button
                          type="button"
                          className={styles.viewButton}
                          onClick={() => openPaymentViewModal(record)}
                        >
                          <HiOutlineEye />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {filteredRecords.length > 0 ? (
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageButton}
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Prev
            </button>
            <span className={styles.pageInfo}>Page {currentPage} of {totalPages}</span>
            <button
              type="button"
              className={styles.pageButton}
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        ) : null}

      </div>

      {isRecordModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Record Payment</h2>
            <p className={styles.modalLead}>Enter payment details for the homeowner</p>

            <div className={styles.formGrid}>
              <div className={styles.fullSpan}>
                <label className={styles.fieldLabel}>Homeowner</label>
                <div className={styles.autocompleteWrap}>
                  <input
                    type="search"
                    className={styles.input}
                    value={form.homeownerSearch}
                    onChange={(event) => handleHomeownerSearchChange(event.target.value)}
                    onFocus={() => setIsHomeownerSuggestOpen(true)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && homeownerSuggestions.length > 0) {
                        event.preventDefault()
                        selectHomeowner(homeownerSuggestions[0])
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        setIsHomeownerSuggestOpen(false)
                      }, 120)
                    }}
                    placeholder="Search homeowner name or unit number"
                  />
                  {isHomeownerSuggestOpen && homeownerSuggestions.length > 0 ? (
                    <ul className={styles.suggestionList} onMouseDown={(event) => event.preventDefault()}>
                      {homeownerSuggestions.map((homeowner) => (
                        <li key={homeowner.id}>
                          <button
                            type="button"
                            className={styles.suggestionItem}
                            onMouseDown={(event) => {
                              event.preventDefault()
                              selectHomeowner(homeowner)
                            }}
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
                <label className={styles.fieldLabel}>Receipt Date</label>
                <input
                  type="text"
                  className={`${styles.input} ${styles.readonlyField}`}
                  value={receiptDateLabel}
                  readOnly
                />
              </div>

              <div>
                <label className={styles.fieldLabel}>Receipt No.</label>
                <input
                  type="text"
                  className={`${styles.input} ${styles.readonlyField}`}
                  value={form.receiptNo}
                  readOnly
                />
              </div>

              <div>
                <label className={styles.fieldLabel}>Amount</label>
                <input
                  type="text"
                  className={`${styles.input} ${styles.readonlyField}`}
                  value={form.amount ? toPeso(form.amount) : ''}
                  readOnly
                />
              </div>

              <div className={styles.fullSpan}>
                <label className={styles.fieldLabel}>Payment Period Range</label>
                <div className={styles.periodRangeRow}>
                  <div>
                    <label className={styles.subLabel}>From</label>
                    <div className={styles.rangeFields}>
                      <select
                        className={styles.input}
                        value={form.rangeStartMonth}
                        onChange={(event) => handleFormChange('rangeStartMonth', event.target.value)}
                      >
                        {MONTH_OPTIONS.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        inputMode="numeric"
                        className={styles.input}
                        value={form.rangeStartYear}
                        onChange={(event) => handleFormChange('rangeStartYear', event.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="Year"
                      />
                    </div>
                  </div>
                  <div>
                    <label className={styles.subLabel}>To</label>
                    <div className={styles.rangeFields}>
                      <select
                        className={styles.input}
                        value={form.rangeEndMonth}
                        onChange={(event) => handleFormChange('rangeEndMonth', event.target.value)}
                      >
                        {MONTH_OPTIONS.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        inputMode="numeric"
                        className={styles.input}
                        value={form.rangeEndYear}
                        onChange={(event) => handleFormChange('rangeEndYear', event.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="Year"
                      />
                    </div>
                  </div>
                </div>
                <div className={styles.periodTags}>
                  {rangeInfo.periods.length === 0 ? (
                    <span className={styles.periodEmpty}>Pick a valid range.</span>
                  ) : (
                    <span className={styles.periodTag}>
                      {rangeInfo.label} ({rangeInfo.periods.length} months)
                    </span>
                  )}
                </div>
                <p className={styles.periodHint}>The amount is calculated from the selected range.</p>
              </div>
            </div>

            <div className={styles.modalActions}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label className={styles.subLabel}>Printer:</label>
                <select
                  className={styles.input}
                  value={printerType}
                  onChange={(e) => setPrinterType(e.target.value)}
                  style={{ width: '120px', padding: '0.25rem' }}
                >
                  <option value="usb">USB</option>
                  <option value="serial">Serial</option>
                  <option value="bluetooth">Bluetooth</option>
                </select>
              </div>
              <button type="button" className={styles.secondaryButton} onClick={closeRecordModal} disabled={isSavingPayment}>
                Cancel
              </button>
              <button
                type="button"
                className={styles.printButton}
                onClick={() => savePaymentRecord({ shouldPrint: true })}
                disabled={isPrinting || isSavingPayment}
              >
                {isSavingPayment ? 'Saving...' : (isPrinting ? 'Printing...' : 'Add & Print Receipt')}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPaymentRecord && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} ${styles.viewModal}`}>
            <h2 className={styles.modalTitle}>Payment Record Details</h2>
            <p className={styles.modalLead}>Full details for the selected payment record</p>

            <div className={styles.formGrid}>
              <div className={styles.fullSpan}>
                <label className={styles.fieldLabel}>Homeowner</label>
                <input
                  type="text"
                  className={`${styles.input} ${styles.readonlyField}`}
                  value={selectedPaymentRecord.homeownerName}
                  readOnly
                />
              </div>

              <div>
                <label className={styles.fieldLabel}>Date</label>
                <input
                  type="text"
                  className={`${styles.input} ${styles.readonlyField}`}
                  value={formatDate(selectedPaymentRecord.datePaid)}
                  readOnly
                />
              </div>

              <div>
                <label className={styles.fieldLabel}>Receipt No.</label>
                <input
                  type="text"
                  className={`${styles.input} ${styles.readonlyField}`}
                  value={selectedPaymentRecord.receiptNo}
                  readOnly
                />
              </div>

              <div className={styles.fullSpan}>
                <label className={styles.fieldLabel}>Payment Periods</label>
                <div className={styles.periodTags}>
                  {selectedPaymentRecord.coveredPeriods.length === 0 ? (
                    <span className={styles.periodEmpty}>No periods recorded</span>
                  ) : (
                    selectedPaymentRecord.coveredPeriods.map((period) => (
                      <span key={period} className={styles.periodTag}>
                        {paymentPeriodToLabel(period)}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className={styles.fieldLabel}>Amount Paid</label>
                <input
                  type="text"
                  className={`${styles.input} ${styles.readonlyField}`}
                  value={toPeso(selectedPaymentRecord.amount)}
                  readOnly
                />
              </div>

              <div>
                <label className={styles.fieldLabel}>Unit Number</label>
                <input
                  type="text"
                  className={`${styles.input} ${styles.readonlyField}`}
                  value={selectedPaymentRecord.unitNumber}
                  readOnly
                />
              </div>

              <div>
                  <label className={styles.fieldLabel}>Issued By</label>
                  <input
                    type="text"
                    className={`${styles.input} ${styles.readonlyField}`}
                    value={selectedPaymentRecord.issuedBy}
                    readOnly
                  />
              </div>

              <div>
                <label className={styles.fieldLabel}>Issued On</label>
                <input
                  type="text"
                  className={`${styles.input} ${styles.readonlyField}`}
                  value={formatDate(selectedPaymentRecord.issuedAt)}
                  readOnly
                />
              </div>
            </div>

            <div className={styles.modalActions}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label className={styles.subLabel}>Printer:</label>
                <select
                  className={styles.input}
                  value={printerType}
                  onChange={(e) => setPrinterType(e.target.value)}
                  style={{ width: '120px', padding: '0.25rem' }}
                >
                  <option value="usb">USB</option>
                  <option value="serial">Serial</option>
                  <option value="bluetooth">Bluetooth</option>
                </select>
              </div>
              <button type="button" className={styles.secondaryButton} onClick={closePaymentViewModal}>
                Close
              </button>
              <button
                type="button"
                className={styles.printButton}
                onClick={() => handlePrintReceipt(buildReceiptFromRecord(selectedPaymentRecord))}
                disabled={isPrinting}
              >
                {isPrinting ? 'Printing...' : 'Print Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}