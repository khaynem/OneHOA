'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { HiOutlineIdentification, HiOutlineArchiveBox, HiOutlineArrowUturnLeft, HiOutlineTrash, HiOutlineEye, HiOutlineUsers } from 'react-icons/hi2'
import { apiClient } from '@/lib/apiClient'
import { notify } from '@/lib/notify'
import { buildHomeownerIdCardHtml } from '@/lib/homeownerIdCardTemplate'
import { buildHomeownerPaymentReportHtml } from '@/lib/homeownerPaymentReportTemplate'
import JobTitleField from '@/components/job-title-field/job-title-field'
import styles from './homeowner-management.module.css'

const DEFAULT_STATUS_OPTIONS = ['HO, not HVNA member', 'HO, HVNA member', 'N/A']

const WORK_STATUS_OPTIONS = [
  'Contractual',
  'Regular',
  'Self-Employed',
  'Freelance',
  'Unemployed',
  'Other'
]

const getWorkStatusOptions = (fields = []) => {
  const workStatusField = Array.isArray(fields)
    ? fields.find((field) => field?.key === 'work_status' && Array.isArray(field.options))
    : null

  if (!workStatusField || workStatusField.options.length === 0) {
    return WORK_STATUS_OPTIONS
  }

  return workStatusField.options
    .map((option) => String(option || '').trim())
    .filter(Boolean)
}

const toSelectOptions = (options, currentValue) => {
  const normalized = String(currentValue || '').trim()
  if (normalized && !options.includes(normalized)) {
    return [...options, normalized]
  }

  return options
}

const OCCUPANT_STATUS_OPTIONS = ['Owner', 'Relative', 'Renter', 'Caretaker']

const STATUS_ALIASES = new Map([
  ['homeowner (ho), not hvna member', 'HO, not HVNA member'],
  ['homeowner (ho), hvna member', 'HO, HVNA member'],
  ['homeowner', 'HO, not HVNA member'],
  ['hvna member', 'HO, HVNA member'],
  ['renter', 'N/A'],
  ['caretaker', 'N/A']
])

const NON_OWNER_STATUS = 'N/A'
const DEFAULT_MONTHLY_DUES = 100
const TRACKER_START = { year: 2026, month: 1 }
const PAGE_SIZE = 10

const EMPTY_FORM = {
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phone: '',
  jobDescription: '',
  workStatus: '',
  phase: '',
  block: '',
  lot: '',
  entryDate: '',
  occupantStatus: '',
  householdMembers: [],
  status: DEFAULT_STATUS_OPTIONS[0],
  imageName: '',
  pictureId: '',
  imageUrl: ''
}

const VALID_PHASES = ['1', '2', '3']

const toEntryYear = (dateValue) => {
  if (!dateValue) {
    return ''
  }

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return String(date.getFullYear())
}

const toEntryDateValue = (yearValue) => {
  const year = digitsOnly(yearValue).slice(0, 4)
  if (year.length !== 4) {
    return ''
  }

  return `${year}-01-01`
}

const normalizeStatusList = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry || '').trim()).filter(Boolean)
  }

  if (value === undefined || value === null) {
    return []
  }

  const normalized = String(value || '').trim()
  return normalized ? [normalized] : []
}

const normalizeOccupantStatus = (value) => String(value || '').trim()

const isOwnerOccupant = (value) => normalizeOccupantStatus(value).toLowerCase() === 'owner'

const getStatusForOccupant = (statusValue, occupantStatus) =>
  isOwnerOccupant(occupantStatus) ? statusValue : NON_OWNER_STATUS

const statusListToSingleOption = (statuses) => {
  const list = normalizeStatusList(statuses)
    .map((entry) => {
      const normalized = String(entry || '').trim()
      const alias = STATUS_ALIASES.get(normalized.toLowerCase())
      return alias || normalized
    })
    .filter(Boolean)
  if (list.length === 0) {
    return DEFAULT_STATUS_OPTIONS[0]
  }

  const joined = list.join(', ').toLowerCase()
  const matching = DEFAULT_STATUS_OPTIONS.find((option) => option.toLowerCase() === joined)
  if (matching) {
    return matching
  }

  const first = list[0]
  const fallback = DEFAULT_STATUS_OPTIONS.find((option) => option.toLowerCase() === first.toLowerCase())
  return fallback || DEFAULT_STATUS_OPTIONS[0]
}

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All membership statuses', type: 'all' },
  { value: 'ho-non-hvna', label: 'HO, not HVNA member', type: 'status', match: 'HO, not HVNA member' },
  { value: 'ho-hvna', label: 'HO, HVNA member', type: 'status', match: 'HO, HVNA member' },
  { value: 'na', label: 'N/A', type: 'status', match: 'N/A' }
]

const PAYMENT_FILTER_OPTIONS = [
  { value: 'all', label: 'All payment statuses' },
  { value: 'current-due', label: 'Monthly due this month (unpaid)' },
  { value: 'past-due', label: 'Past monthly dues unpaid' }
]

const OCCUPANT_FILTER_OPTIONS = [
  { value: 'all', label: 'All occupants' },
  { value: 'owner', label: 'Owner occupants only' }
]

const normalizeName = (value) => String(value || '').replace(/\d/g, '')

const toInputDate = (dateValue) => {
  if (!dateValue) {
    return ''
  }

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString().slice(0, 10)
}

const getAddressFields = (record = {}) => {
  const fromNested = record.address?._id
  const fromDotNotation = record['address._id']
  const address = fromNested && typeof fromNested === 'object' ? fromNested : fromDotNotation

  return {
    phase: address?.phase !== undefined ? String(address.phase) : '',
    block: address?.block !== undefined ? String(address.block) : '',
    lot: address?.lot !== undefined ? String(address.lot) : ''
  }
}

const digitsOnly = (value) => String(value || '').replace(/\D/g, '')

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read image file.'))
    reader.readAsDataURL(file)
  })

const getPictureFields = (record = {}) => {
  const fromNested = record.pictures?._id
  const fromDotNotation = record['pictures._id']
  const picture = fromNested && typeof fromNested === 'object' ? fromNested : fromDotNotation

  return {
    pictureId: picture?._id ? String(picture._id) : '',
    photoUrl: String(picture?.path || '')
  }
}

const mapRecordToHomeowner = (record = {}, paymentSummary = null) => {
  const address = getAddressFields(record)
  const picture = getPictureFields(record)
  const firstName = String(record.first_name || '').trim()
  const middleName = String(record.middle_name || '').trim()
  const lastName = String(record.last_name || '').trim()
  const generatedId = String(record.generated_id || '').trim()
  const householdMembersValue = Array.isArray(record.household_members) ? record.household_members : []
  const householdFallback =
    record.household_no !== undefined && record.household_no !== null ? String(record.household_no) : ''

  return {
    id: String(record._id || ''),
    displayId: generatedId || '-',
    firstName,
    middleName,
    lastName,
    archived: Boolean(record.archived),
    archivedAt: record.archived_at ? String(record.archived_at) : '',
    unitNumber: `${address.phase}-${address.block}-${address.lot}`,
    email: String(record.email || ''),
    phone: String(record.phone_number || ''),
    status: normalizeStatusList(record.status),
    phase: address.phase,
    block: address.block,
    lot: address.lot,
    entryDate: toEntryYear(record.entry_date),
    occupantStatus: String(record.occupant_status || '-'),
    householdMembers: householdMembersValue.length > 0 ? householdMembersValue : (householdFallback ? [{ name: householdFallback, relationship: 'Legacy Data' }] : []),
    residentId: generatedId || '-',
    workStatus: String(record.work_status || '-'),
    jobDescription: String(record.job_title || '-'),
    pictureId: picture.pictureId,
    photoUrl: picture.photoUrl,
    paymentSummary,
    paymentHistory: [],
    unpaidPeriods: [],
    totalPaid: 0,
    upcomingPayment: { month: '-' },
    createdAt: record.createdAt || record.updatedAt || null
  }
}

const toPeso = (amount) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP'
  }).format(amount)

const formatPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11)

  if (!digits) {
    return '-'
  }

  if (digits.length <= 4) {
    return digits
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 4)} ${digits.slice(4)}`
  }

  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 11)}`
}

const formatDisplayName = (firstName, middleName, lastName, { middleInitialOnly = false } = {}) => {
  const first = String(firstName || '').trim()
  const middle = String(middleName || '').trim()
  const last = String(lastName || '').trim()

  if (middleInitialOnly) {
    const initial = middle ? `${middle.charAt(0).toUpperCase()}.` : ''
    return [first, initial, last].filter(Boolean).join(' ').trim()
  }

  return [first, middle, last].filter(Boolean).join(' ').trim()
}

const buildAddressKey = (homeowner) => {
  if (!homeowner) {
    return ''
  }

  const phase = String(homeowner.phase || '').trim()
  const block = String(homeowner.block || '').trim()
  const lot = String(homeowner.lot || '').trim()

  if (!phase || !block || !lot) {
    return ''
  }

  return `${phase}-${block}-${lot}`
}

const periodToLabel = (period) => {
  const numeric = Number(period)
  if (!Number.isInteger(numeric)) {
    return '-'
  }

  const year = Math.floor(numeric / 100)
  const month = numeric % 100
  const date = new Date(year, month - 1, 1)

  if (Number.isNaN(date.getTime()) || month < 1 || month > 12) {
    return '-'
  }

  return new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    year: 'numeric'
  }).format(date)
}

const getCoveredPeriods = (payment = {}) => {
  if (Array.isArray(payment.payment_for_periods) && payment.payment_for_periods.length > 0) {
    return payment.payment_for_periods.map(Number).filter((value) => Number.isInteger(value))
  }

  if (Number.isInteger(Number(payment.billing_period))) {
    return [Number(payment.billing_period)]
  }

  const paidDate = new Date(payment.date)
  if (!Number.isNaN(paidDate.getTime())) {
    return [paidDate.getFullYear() * 100 + (paidDate.getMonth() + 1)]
  }

  return []
}

const getUpcomingPeriodLabel = (payments = []) => {
  const allPeriods = payments.flatMap((payment) => getCoveredPeriods(payment))
  if (allPeriods.length === 0) {
    return '-'
  }

  const latest = Math.max(...allPeriods)
  const latestYear = Math.floor(latest / 100)
  const latestMonth = latest % 100
  const nextDate = new Date(latestYear, latestMonth, 1)

  return new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    year: 'numeric'
  }).format(nextDate)
}

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

function HomeownerManagementInner() {
  const searchParams = useSearchParams()
  const [searchText, setSearchText] = useState('')
  const [viewMode, setViewMode] = useState('active')
  const [tableFilter, setTableFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [occupantFilter, setOccupantFilter] = useState('all')
  const [phaseFilter, setPhaseFilter] = useState('all')
  const [entryMonthFilter, setEntryMonthFilter] = useState('all')
  const [entryYearFilter, setEntryYearFilter] = useState('all')
  const [homeowners, setHomeowners] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [addStep, setAddStep] = useState(1)
  const [addForm, setAddForm] = useState(EMPTY_FORM)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  const [selectedHomeowner, setSelectedHomeowner] = useState(null)
  const [activeViewTab, setActiveViewTab] = useState('info')
  const [isEditingHomeowner, setIsEditingHomeowner] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false)
  const [isLoadingHomeownerPayments, setIsLoadingHomeownerPayments] = useState(false)
  const [statusDraft, setStatusDraft] = useState(DEFAULT_STATUS_OPTIONS[0])
  const [workStatusOptions, setWorkStatusOptions] = useState(WORK_STATUS_OPTIONS)
  const [monthlyDues, setMonthlyDues] = useState(DEFAULT_MONTHLY_DUES)
  const [isSaving, setIsSaving] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false)
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [archiveNext, setArchiveNext] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const ownerByAddress = useMemo(() => {
    const map = new Map()

    homeowners.forEach((homeowner) => {
      if (!isOwnerOccupant(homeowner.occupantStatus)) {
        return
      }

      const key = buildAddressKey(homeowner)
      if (key) {
        map.set(key, homeowner)
      }
    })

    return map
  }, [homeowners])

  const occupantsByAddress = useMemo(() => {
    const map = new Map()

    homeowners.forEach((homeowner) => {
      const key = buildAddressKey(homeowner)
      if (!key) {
        return
      }

      if (!map.has(key)) {
        map.set(key, [])
      }

      map.get(key).push(homeowner)
    })

    return map
  }, [homeowners])

  const fetchHomeowners = async () => {
    try {
      setIsLoading(true)
      const now = new Date()
      const monthsSinceStart =
        (now.getFullYear() - TRACKER_START.year) * 12 +
        (now.getMonth() + 1 - TRACKER_START.month) +
        1
      const trackerMonths = Math.max(monthsSinceStart, 1)

      const [recordsResponse, trackerResponse] = await Promise.all([
        apiClient.get('/records', {
          query: {
            page: 1,
            limit: 200,
            summary: true
          }
        }),
        apiClient.get('/payments/tracker', {
          query: {
            months: trackerMonths
          }
        })
      ])

      const records = Array.isArray(recordsResponse?.data) ? recordsResponse.data : []
      const trackerHomeowners = trackerResponse?.data?.homeowners || []
      const trackerMap = new Map(
        trackerHomeowners.map((entry) => [String(entry.id || ''), entry.summary || null])
      )

      setHomeowners(
        records.map((record) => mapRecordToHomeowner(record, trackerMap.get(String(record._id || ''))))
      )
    } catch (error) {
      notify.error({
        title: 'Failed to Load Homeowners',
        description: error.message || 'Unable to fetch homeowner records from the server.'
      })
      setHomeowners([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchHomeowners()
  }, [])

  useEffect(() => {
    const loadWorkStatusOptions = async () => {
      try {
        const response = await apiClient.get('/settings/registration-fields', {
          forceRefresh: true
        })

        if (response?.success && Array.isArray(response.fields)) {
          setWorkStatusOptions(getWorkStatusOptions(response.fields))
          return
        }
      } catch (error) {
        setWorkStatusOptions(WORK_STATUS_OPTIONS)
      }

      setWorkStatusOptions(WORK_STATUS_OPTIONS)
    }

    loadWorkStatusOptions()
  }, [])

  useEffect(() => {
    setEditForm((prev) => {
      if (!prev) {
        return prev
      }

      if (!prev.workStatus || workStatusOptions.includes(prev.workStatus)) {
        return prev
      }

      return {
        ...prev,
        workStatus: ''
      }
    })
  }, [workStatusOptions])

  useEffect(() => {
    const paymentParam = searchParams.get('paymentFilter')
    const occupantParam = searchParams.get('occupantFilter')
    const sortParam = searchParams.get('sort')

    if (PAYMENT_FILTER_OPTIONS.some((option) => option.value === paymentParam)) {
      setPaymentFilter(paymentParam)
    }

    if (OCCUPANT_FILTER_OPTIONS.some((option) => option.value === occupantParam)) {
      setOccupantFilter(occupantParam)
    }

    if (sortParam === 'active' || sortParam === 'archived') {
      setViewMode(sortParam)
    } else if (STATUS_FILTER_OPTIONS.some((option) => option.value === sortParam)) {
      setTableFilter(sortParam)
    }
  }, [searchParams])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchText, viewMode, tableFilter, paymentFilter, occupantFilter, phaseFilter, entryMonthFilter, entryYearFilter])

  useEffect(() => {
    let isMounted = true

    const loadMonthlyDues = async () => {
      try {
        const response = await apiClient.get('/settings/dues')
        const nextAmount = Number(response?.amount)
        if (isMounted && !Number.isNaN(nextAmount) && nextAmount > 0) {
          setMonthlyDues(nextAmount)
        }
      } catch {
        if (isMounted) {
          setMonthlyDues(DEFAULT_MONTHLY_DUES)
        }
      }
    }

    loadMonthlyDues()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const loadCurrentUser = async () => {
      try {
        const response = await apiClient.get('/auth/me')
        if (isMounted && response?.user) {
          setCurrentUser(response.user)
        }
      } catch {
        // Ignore auth fetch errors
      }
    }
    loadCurrentUser()
    return () => {
      isMounted = false
    }
  }, [])


  const isStepOneValid =
    addForm.firstName.trim() &&
    addForm.lastName.trim() &&
    !/\d/.test(addForm.firstName) &&
    !/\d/.test(addForm.lastName) &&
    /^\d{11}$/.test(addForm.phone.trim()) &&
    addForm.jobDescription.trim()

  const currentYear = new Date().getFullYear()
  const isOfficer = String(currentUser?.role || '').trim().toLowerCase() === 'officer'
  const isStepTwoValid =
    VALID_PHASES.includes(addForm.phase.trim()) &&
    /^\d{1,3}$/.test(addForm.block.trim()) &&
    /^\d{1,3}$/.test(addForm.lot.trim()) &&
    /^\d{4}$/.test(addForm.entryDate.trim()) &&
    Number(addForm.entryDate.trim()) <= currentYear &&
    addForm.occupantStatus.trim()

  const filteredHomeowners = useMemo(() => {
    const q = searchText.trim().toLowerCase()

    let results = homeowners

    if (q) {
      results = results.filter((homeowner) => {
        const fullName = formatDisplayName(
          homeowner.firstName,
          homeowner.middleName,
          homeowner.lastName,
          { middleInitialOnly: false }
        ).toLowerCase()
        return fullName.includes(q) || homeowner.unitNumber.toLowerCase().includes(q)
      })
    }

    if (phaseFilter !== 'all') {
      results = results.filter((homeowner) => String(homeowner.phase) === phaseFilter)
    }

    if (occupantFilter === 'owner') {
      results = results.filter((homeowner) => isOwnerOccupant(homeowner.occupantStatus))
    }

    if (paymentFilter === 'current-due') {
      results = results.filter(
        (homeowner) =>
          isOwnerOccupant(homeowner.occupantStatus) &&
          homeowner.paymentSummary?.currentMonthStatus === 'unpaid'
      )
    }

    if (paymentFilter === 'past-due') {
      results = results.filter(
        (homeowner) =>
          isOwnerOccupant(homeowner.occupantStatus) &&
          Number(homeowner.paymentSummary?.pastDueMonths || 0) > 0
      )
    }

    if (viewMode === 'archived') {
      results = results.filter((homeowner) => homeowner.archived)
    } else {
      results = results.filter((homeowner) => !homeowner.archived)
    }

    if (entryMonthFilter !== 'all' || entryYearFilter !== 'all') {
      results = results.filter((homeowner) => {
        const raw = String(homeowner.entryDate || '')
        const year = raw.slice(0, 4)
        if (entryYearFilter !== 'all' && year !== entryYearFilter) return false
        if (entryMonthFilter !== 'all') {
          // entryDate is stored as a year only (YYYY), so month filter only applies when a full date is stored
          // If entryDate has month info (YYYY-MM or ISO), extract it; otherwise skip month filter
          const isoMatch = raw.match(/^(\d{4})-(\d{2})/)
          if (isoMatch) {
            const month = parseInt(isoMatch[2], 10)
            if (String(month) !== entryMonthFilter) return false
          }
        }
        return true
      })
    }

    const filterOption = STATUS_FILTER_OPTIONS.find((option) => option.value === tableFilter)

    if (filterOption?.type === 'status') {
      const matchValue = String(filterOption.match || '').toLowerCase()
      results = results.filter((homeowner) =>
        normalizeStatusList(homeowner.status).some((status) => status.toLowerCase() === matchValue)
      )
    }

    return [...results].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
  }, [homeowners, searchText, viewMode, tableFilter, paymentFilter, occupantFilter, phaseFilter, entryMonthFilter, entryYearFilter])

  const totalPages = Math.max(Math.ceil(filteredHomeowners.length / PAGE_SIZE), 1)
  const pagedHomeowners = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredHomeowners.slice(start, start + PAGE_SIZE)
  }, [currentPage, filteredHomeowners])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const closeAddModal = () => {
    setIsAddModalOpen(false)
    setAddStep(1)
    setAddForm(EMPTY_FORM)
  }

  const openAddModal = () => {
    setIsAddModalOpen(true)
    setAddStep(1)
    setAddForm(EMPTY_FORM)
  }

  const handleFormChange = (field, value) => {
    setAddForm((prev) => ({ ...prev, [field]: value }))
  }

  const handlePhoneChange = (value) => {
    const normalized = digitsOnly(value).slice(0, 11)
    handleFormChange('phone', normalized)
  }

  const handlePhaseChange = (value) => {
    if (!value || VALID_PHASES.includes(value)) {
      handleFormChange('phase', value)
    }
  }

  const handleBlockLotChange = (field, value) => {
    handleFormChange(field, digitsOnly(value).slice(0, 3))
  }

  const handleAddHouseholdMember = () => {
    setAddForm(prev => ({
      ...prev,
      householdMembers: [...prev.householdMembers, { name: '', relationship: '' }]
    }))
  }

  const handleHouseholdMemberChange = (index, key, value) => {
    const newList = [...addForm.householdMembers]
    newList[index][key] = value
    setAddForm(prev => ({ ...prev, householdMembers: newList }))
  }

  const handleRemoveHouseholdMember = (index) => {
    const newList = [...addForm.householdMembers]
    newList.splice(index, 1)
    setAddForm(prev => ({ ...prev, householdMembers: newList }))
  }

  const handleAddEditHouseholdMember = () => {
    setEditForm(prev => ({
      ...prev,
      householdMembers: [...(prev.householdMembers || []), { name: '', relationship: '' }]
    }))
  }

  const handleEditHouseholdMemberChange = (index, key, value) => {
    const newList = [...(editForm.householdMembers || [])]
    newList[index][key] = value
    setEditForm(prev => ({ ...prev, householdMembers: newList }))
  }

  const handleRemoveEditHouseholdMember = (index) => {
    const newList = [...(editForm.householdMembers || [])]
    newList.splice(index, 1)
    setEditForm(prev => ({ ...prev, householdMembers: newList }))
  }

  const handleEntryYearChange = (value) => {
    handleFormChange('entryDate', digitsOnly(value).slice(0, 4))
  }

  const handleOccupantStatusChange = (value) => {
    handleFormChange('occupantStatus', value)

    if (!isOwnerOccupant(value)) {
      handleFormChange('status', NON_OWNER_STATUS)
      return
    }

    if (addForm.status === NON_OWNER_STATUS) {
      handleFormChange('status', DEFAULT_STATUS_OPTIONS[0])
    }
  }

  const getStatusPillClass = (statusValue) => {
    const status = String(statusValue || '').trim().toLowerCase()

    if (status.includes('renter')) {
      return styles.statusInactive
    }

    if (status.includes('caretaker')) {
      return styles.statusInactive
    }

    if (status.includes('hvna') || status.includes('ho')) {
      return styles.statusActive
    }

    return styles.statusDefault
  }

  const registerHomeowner = async () => {
    if (isSaving) return
    const currentYear = new Date().getFullYear()
    if (!isStepTwoValid || Number(addForm.entryDate.trim()) > currentYear) {
      notify.error({
        title: 'Invalid Address/Entry Details',
        description: `Phase must be 1-3, block and lot must be 1 to 3 digits, and entry year must be 4 digits and not exceed ${currentYear}.`
      })
      return
    }

    try {
      setIsSaving(true)
      const payload = {
        first_name: normalizeName(addForm.firstName).trim(),
        middle_name: normalizeName(addForm.middleName).trim(),
        last_name: normalizeName(addForm.lastName).trim(),
        email: addForm.email.trim(),
        phone_number: addForm.phone.trim(),
        household_members: addForm.householdMembers,
        job_title: addForm.jobDescription.trim(),
        work_status: addForm.workStatus.trim(),
        entry_date: toEntryDateValue(addForm.entryDate),
        occupant_status: addForm.occupantStatus.trim(),
        address: {
          phase: Number(addForm.phase),
          block: Number(addForm.block),
          lot: Number(addForm.lot)
        },
        status: normalizeStatusList(getStatusForOccupant(addForm.status, addForm.occupantStatus))
      }

      if (addForm.pictureId) {
        payload['pictures._id'] = addForm.pictureId
      }

      const response = await apiClient.post('/records', payload)
      const created = mapRecordToHomeowner(response?.data)
      setHomeowners((prev) => [created, ...prev])
      notify.success({
        title: 'Homeowner Registered',
        description: `${created.firstName} ${created.lastName} has been added successfully.`
      })
      closeAddModal()
    } catch (error) {
      notify.error({
        title: 'Registration Failed',
        description: error.message || 'Unable to register homeowner.'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handlePhotoUpload = async (file) => {
    if (!file) {
      handleFormChange('imageName', '')
      handleFormChange('pictureId', '')
      handleFormChange('imageUrl', '')
      return
    }

    if (!file.type.startsWith('image/')) {
      notify.error({
        title: 'Invalid File Type',
        description: 'Please upload an image file only.'
      })
      return
    }

    setIsUploadingPhoto(true)

    try {
      const dataUrl = await readFileAsDataUrl(file)
      const response = await apiClient.post('/records/upload-photo', {
        imageDataUrl: dataUrl,
        fileName: file.name,
        mimeType: file.type
      })

      const uploaded = response?.data

      handleFormChange('imageName', String(uploaded?.filename || file.name || 'Uploaded image'))
      handleFormChange('pictureId', String(uploaded?._id || ''))
      handleFormChange('imageUrl', String(uploaded?.path || ''))

      notify.success({
        title: 'Photo Uploaded',
        description: 'Homeowner photo uploaded successfully.'
      })
    } catch (error) {
      notify.error({
        title: 'Photo Upload Failed',
        description: error.message || 'Unable to upload homeowner photo.'
      })
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  const loadHomeownerDetails = async (homeownerId, paymentSummary = null) => {
    if (!homeownerId) {
      return null
    }

    const response = await apiClient.get(`/records/${homeownerId}`, {
      forceRefresh: true
    })

    const fullRecord = response?.data
    if (!fullRecord) {
      return null
    }

    return mapRecordToHomeowner(fullRecord, paymentSummary)
  }

  const openViewModal = async (homeowner) => {
    const isOwner = isOwnerOccupant(homeowner.occupantStatus)
    const normalizedWorkStatus = workStatusOptions.includes(homeowner.workStatus) ? homeowner.workStatus : ''

    setSelectedHomeowner({
      ...homeowner,
      paymentHistory: isOwner ? homeowner.paymentHistory : [],
      unpaidPeriods: isOwner ? homeowner.unpaidPeriods : [],
      totalPaid: isOwner ? homeowner.totalPaid : 0,
      upcomingPayment: isOwner ? homeowner.upcomingPayment : { month: '-' }
    })
    setActiveViewTab('info')
    setIsEditingHomeowner(false)
    setStatusDraft(isOwnerOccupant(homeowner.occupantStatus) ? statusListToSingleOption(homeowner.status) : NON_OWNER_STATUS)
    setEditForm({
      firstName: homeowner.firstName,
      middleName: homeowner.middleName,
      lastName: homeowner.lastName,
      unitNumber: homeowner.unitNumber,
      phone: homeowner.phone,
      email: homeowner.email,
      phase: homeowner.phase,
      block: homeowner.block,
      lot: homeowner.lot,
      entryDate: homeowner.entryDate,
      occupantStatus: homeowner.occupantStatus,
      householdMembers: homeowner.householdMembers,
      jobDescription: homeowner.jobDescription,
      workStatus: normalizedWorkStatus,
      pictureId: homeowner.pictureId,
      photoUrl: homeowner.photoUrl,
      imageName: ''
    })

    if (isOwner) {
      void fetchHomeownerPayments(homeowner.id)
    }

    try {
      const fullHomeowner = await loadHomeownerDetails(homeowner.id, homeowner.paymentSummary)
      if (fullHomeowner) {
        setSelectedHomeowner((prev) => {
          if (!prev || prev.id !== homeowner.id) {
            return prev
          }

          return {
            ...fullHomeowner,
            paymentHistory: prev.paymentHistory,
            unpaidPeriods: prev.unpaidPeriods,
            totalPaid: prev.totalPaid,
            upcomingPayment: prev.upcomingPayment,
          }
        })

        if (!isEditingHomeowner) {
          setEditForm({
            firstName: fullHomeowner.firstName,
            middleName: fullHomeowner.middleName,
            lastName: fullHomeowner.lastName,
            unitNumber: fullHomeowner.unitNumber,
            phone: fullHomeowner.phone,
            email: fullHomeowner.email,
            phase: fullHomeowner.phase,
            block: fullHomeowner.block,
            lot: fullHomeowner.lot,
            entryDate: fullHomeowner.entryDate,
            occupantStatus: fullHomeowner.occupantStatus,
            householdMembers: fullHomeowner.householdMembers,
            jobDescription: fullHomeowner.jobDescription,
            workStatus: fullHomeowner.workStatus,
            pictureId: fullHomeowner.pictureId,
            photoUrl: fullHomeowner.photoUrl,
            imageName: ''
          })
        }
      }
    } catch (error) {
      notify.error({
        title: 'Failed to Load Homeowner Details',
        description: error.message || 'Unable to fetch full homeowner details.'
      })
    }
  }

  const closeViewModal = () => {
    setSelectedHomeowner(null)
    setActiveViewTab('info')
    setIsEditingHomeowner(false)
    setEditForm(null)
    setStatusDraft(DEFAULT_STATUS_OPTIONS[0])
  }


  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleEditOccupantStatusChange = (value) => {
    handleEditChange('occupantStatus', value)

    if (!isOwnerOccupant(value)) {
      setStatusDraft(NON_OWNER_STATUS)
      return
    }

    if (statusDraft === NON_OWNER_STATUS) {
      setStatusDraft(DEFAULT_STATUS_OPTIONS[0])
    }
  }

  const fetchHomeownerPayments = async (homeownerId) => {
    if (!homeownerId) {
      return
    }

    setIsLoadingHomeownerPayments(true)

    try {
      const now = new Date()
      const monthsSinceStart =
        (now.getFullYear() - TRACKER_START.year) * 12 +
        (now.getMonth() + 1 - TRACKER_START.month) +
        1
      const trackerMonths = Math.max(monthsSinceStart, 1)

      const [paymentsResponse, trackerResponse] = await Promise.all([
        apiClient.get('/payments', {
          query: {
            record_id: homeownerId
          }
        }),
        apiClient.get('/payments/tracker', {
          query: {
            months: trackerMonths
          }
        })
      ])

      const payments = Array.isArray(paymentsResponse?.data) ? paymentsResponse.data : []
      const paymentHistory = payments
        .map((payment) => ({
          id: String(payment._id || `${payment.receipt_no || ''}-${payment.date || ''}`),
          month: getCoveredPeriods(payment).map(periodToLabel).join(', ') || '-',
          paidOn: payment.date ? toInputDate(payment.date) : '-',
          amountPaid: Number(payment.amount) || 0,
          status: String(payment.payment_status || payment.payment_details || 'Recorded')
        }))
        .sort((a, b) => new Date(b.paidOn || 0).getTime() - new Date(a.paidOn || 0).getTime())

      const totalPaid = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0)
      const trackerHomeowners = trackerResponse?.data?.homeowners || []
      const trackerEntry = trackerHomeowners.find((entry) => String(entry.id) === String(homeownerId))
      const unpaidPeriods = Array.isArray(trackerEntry?.monthly_status)
        ? trackerEntry.monthly_status.filter((entry) => entry.status === 'unpaid')
        : []

      const unpaidLabels = unpaidPeriods.map((entry) => entry.label)

      setSelectedHomeowner((prev) => {
        if (!prev || prev.id !== homeownerId) {
          return prev
        }

        return {
          ...prev,
          paymentHistory,
          upcomingPayment: { month: getUpcomingPeriodLabel(payments) },
          totalPaid,
          unpaidPeriods: unpaidLabels
        }
      })
    } catch (error) {
      notify.error({
        title: 'Failed to Load Payments',
        description: error.message || 'Unable to fetch payments for this homeowner.'
      })
    } finally {
      setIsLoadingHomeownerPayments(false)
    }
  }

  const handleEditPhotoSelect = async (file) => {
    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      notify.error({
        title: 'Invalid File Type',
        description: 'Please upload an image file only.'
      })
      return
    }

    setIsUpdatingPhoto(true)

    try {
      const dataUrl = await readFileAsDataUrl(file)
      const response = await apiClient.post('/records/upload-photo', {
        imageDataUrl: dataUrl,
        fileName: file.name,
        mimeType: file.type
      })
      const uploaded = response?.data

      setEditForm((prev) => {
        if (!prev) {
          return prev
        }

        return {
          ...prev,
          pictureId: String(uploaded?._id || ''),
          photoUrl: String(uploaded?.path || ''),
          imageName: String(uploaded?.filename || file.name || 'Uploaded image')
        }
      })

      notify.success({
        title: 'Photo Ready',
        description: 'Photo will be applied when you click Save Changes.'
      })
    } catch (error) {
      notify.error({
        title: 'Photo Update Failed',
        description: error.message || 'Unable to update homeowner photo.'
      })
    } finally {
      setIsUpdatingPhoto(false)
    }
  }

  const saveHomeownerEdits = async () => {
    if (isSaving) return
    if (!selectedHomeowner || !editForm) {
      return
    }

    const normalizedFirstName = normalizeName(editForm.firstName).trim()
    const normalizedLastName = normalizeName(editForm.lastName).trim()
    const normalizedPhase = String(editForm.phase || '').trim()
    const normalizedBlock = digitsOnly(editForm.block).slice(0, 3)
    const normalizedLot = digitsOnly(editForm.lot).slice(0, 3)
    const normalizedEntryYear = digitsOnly(editForm.entryDate).slice(0, 4)
    const currentYear = new Date().getFullYear()

    if (
      !normalizedFirstName ||
      !normalizedLastName ||
      /\d/.test(normalizedFirstName) ||
      /\d/.test(normalizedLastName) ||
      !VALID_PHASES.includes(normalizedPhase) ||
      !/^\d{1,3}$/.test(normalizedBlock) ||
      !/^\d{1,3}$/.test(normalizedLot) ||
      !/^\d{4}$/.test(normalizedEntryYear) ||
      Number(normalizedEntryYear) > currentYear
    ) {
      notify.error({
        title: 'Invalid Edit Values',
        description: `Phase must be 1-3, block and lot must be 1 to 3 digits, and entry year must be 4 digits and not exceed ${currentYear}.`
      })
      return
    }

    try {
      setIsSaving(true)
      const payload = {
        email: editForm.email,
        phone_number: String(editForm.phone || '').replace(/\D/g, '').slice(0, 11),
        entry_date: toEntryDateValue(normalizedEntryYear),
        occupant_status: editForm.occupantStatus,
        household_members: editForm.householdMembers,
        job_title: editForm.jobDescription,
        work_status: editForm.workStatus,
        status: normalizeStatusList(getStatusForOccupant(statusDraft, editForm.occupantStatus)),
        address: {
          phase: Number(normalizedPhase),
          block: Number(normalizedBlock),
          lot: Number(normalizedLot)
        }
      }

      if (!isOfficer) {
        payload.first_name = normalizedFirstName
        payload.middle_name = normalizeName(editForm.middleName).trim()
        payload.last_name = normalizedLastName
      }

      if (editForm.pictureId) {
        payload['pictures._id'] = editForm.pictureId
      }

      const response = await apiClient.put(`/records/${selectedHomeowner.id}`, payload)
      const updatedHomeowner = mapRecordToHomeowner(response?.data)

      setHomeowners((prev) =>
        prev.map((homeowner) => {
          if (homeowner.id !== selectedHomeowner.id) {
            return homeowner
          }

          return updatedHomeowner
        })
      )

      setSelectedHomeowner(updatedHomeowner)
      setStatusDraft(
        isOwnerOccupant(updatedHomeowner.occupantStatus)
          ? statusListToSingleOption(updatedHomeowner.status)
          : NON_OWNER_STATUS
      )
      setIsEditingHomeowner(false)
      notify.success({
        title: 'Homeowner Updated',
        description: `${updatedHomeowner.firstName} ${updatedHomeowner.lastName} has been updated.`
      })
    } catch (error) {
      notify.error({
        title: 'Update Failed',
        description: error.message || 'Unable to save homeowner changes.'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const displayHomeownerName = selectedHomeowner
    ? isEditingHomeowner
      ?
      formatDisplayName(
        editForm?.firstName,
        editForm?.middleName,
        editForm?.lastName
      ) || formatDisplayName(selectedHomeowner.firstName, selectedHomeowner.middleName, selectedHomeowner.lastName)
      : formatDisplayName(selectedHomeowner.firstName, selectedHomeowner.middleName, selectedHomeowner.lastName)
    : ''

  const generateAndPrintIdCard = (homeowner) => {
    if (!homeowner || !isOwnerOccupant(homeowner.occupantStatus)) {
      return
    }

    const html = buildHomeownerIdCardHtml(homeowner, window.location.origin)

    if (isMobileOrTablet()) {
      printViaIframe(html)
      return
    }

    const popup = window.open('', '_blank', 'width=1100,height=760')
    if (!popup) {
      printViaIframe(html)
      return
    }

    popup.document.open()
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

  const generatePaymentReport = (homeowner) => {
    if (!homeowner) {
      return
    }

    const generatorName = currentUser
      ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || currentUser.username
      : 'Authorized Officer'
    const generatorRole = currentUser ? String(currentUser.role || '').toUpperCase() : 'OFFICER'
    const generatedBy = `${generatorName} (${generatorRole})`

    const html = buildHomeownerPaymentReportHtml({
      homeowner,
      monthlyDues,
      generatedAt: new Date(),
      generatedBy
    })

    if (isMobileOrTablet()) {
      printViaIframe(html)
      return
    }

    const popup = window.open('', '_blank', 'width=1100,height=760')
    if (!popup) {
      printViaIframe(html)
      return
    }

    popup.document.open()
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

  const handleArchiveToggle = async (target, nextArchived) => {
    if (!target || isArchiving) {
      return
    }

    if (isOfficer) {
      notify.error({
        title: 'Action Restricted',
        description: 'Officers are not authorized to archive or restore records.'
      })
      return
    }

    setIsArchiving(true)
    try {
      const addressPayload = target.phase && target.block && target.lot
        ? {
          address: {
            phase: Number(target.phase),
            block: Number(target.block),
            lot: Number(target.lot)
          }
        }
        : {}

      const response = await apiClient.put(`/records/${target.id}`, {
        archived: nextArchived,
        archived_at: nextArchived ? new Date().toISOString() : null,
        ...addressPayload
      })

      const updatedHomeowner = mapRecordToHomeowner(response?.data)
      setHomeowners((prev) =>
        prev.map((homeowner) => (homeowner.id === target.id ? updatedHomeowner : homeowner))
      )
      if (selectedHomeowner?.id === target.id) {
        setSelectedHomeowner(updatedHomeowner)
        setIsEditingHomeowner(false)
      }

      notify.success({
        title: nextArchived ? 'Homeowner Archived' : 'Homeowner Restored',
        description: `${updatedHomeowner.firstName} ${updatedHomeowner.lastName} has been ${nextArchived ? 'archived' : 'restored'}.`
      })
    } catch (error) {
      notify.error({
        title: 'Archive Failed',
        description: error.message || 'Unable to update archive status.'
      })
    } finally {
      setIsArchiving(false)
      setIsArchiveConfirmOpen(false)
      setArchiveTarget(null)
    }
  }

  const handleDeleteRecord = async (target) => {
    if (!target || isDeleting) {
      return
    }

    if (isOfficer) {
      notify.error({
        title: 'Action Restricted',
        description: 'Officers are not authorized to delete records.'
      })
      return
    }

    if (!target.archived) {
      notify.error({
        title: 'Archive Required',
        description: 'Please archive the record before deleting it.'
      })
      return
    }

    setIsDeleting(true)
    try {
      await apiClient.delete(`/records/${target.id}`)
      setHomeowners((prev) => prev.filter((homeowner) => homeowner.id !== target.id))
      if (selectedHomeowner?.id === target.id) {
        setSelectedHomeowner(null)
        setEditForm(null)
        setIsEditingHomeowner(false)
        setIsConfirmSaveOpen(false)
      }

      notify.success({
        title: 'Record Deleted',
        description: 'The homeowner record has been permanently deleted.'
      })
    } catch (error) {
      notify.error({
        title: 'Delete Failed',
        description: error.message || 'Unable to delete homeowner record.'
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteConfirmOpen(false)
      setDeleteTarget(null)
    }
  }

  const exportToCsv = () => {
    if (filteredHomeowners.length === 0) {
      notify.error({
        title: 'No Data to Export',
        description: 'There are no homeowners matching the current filters to export.'
      })
      return
    }

    const headers = [
      'Resident ID',
      'First Name',
      'Middle Name',
      'Last Name',
      'Phase',
      'Block',
      'Lot',
      'Phone Number',
      'Email Address',
      'Occupant Status',
      'Membership Status',
      'Entry Year',
      'Household Members',
      'Work Status',
      'Job Title'
    ]

    const rows = filteredHomeowners.map((homeowner) => {
      const householdMembersStr = Array.isArray(homeowner.householdMembers)
        ? homeowner.householdMembers
          .map((member) => `${member.name || 'Unknown'} (${member.relationship || 'Unspecified'})`)
          .join('; ')
        : ''

      return [
        homeowner.displayId || homeowner.residentId || '-',
        homeowner.firstName || '',
        homeowner.middleName || '',
        homeowner.lastName || '',
        homeowner.phase || '',
        homeowner.block || '',
        homeowner.lot || '',
        homeowner.phone || '',
        homeowner.email || '',
        homeowner.occupantStatus || '',
        statusListToSingleOption(homeowner.status),
        homeowner.entryDate || '',
        householdMembersStr || '',
        homeowner.workStatus || '',
        homeowner.jobDescription || ''
      ]
    })

    const escapeCsvValue = (val) => {
      const stringVal = String(val === null || val === undefined ? '' : val).trim()
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal.replace(/"/g, '""')}"`
      }
      return stringVal
    }

    const csvContent = [
      headers.map(escapeCsvValue).join(','),
      ...rows.map((row) => row.map(escapeCsvValue).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url

    const phaseLabel = phaseFilter === 'all' ? 'AllPhases' : `Phase_${phaseFilter}`
    const dateStr = new Date().toISOString().slice(0, 10)
    link.setAttribute('download', `OneHOA_Masterlist_${phaseLabel}_${dateStr}.csv`)

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    notify.success({
      title: 'Export Successful',
      description: `Exported ${filteredHomeowners.length} homeowner records to CSV.`
    })
  }

  const hasActiveFilters =
    phaseFilter !== 'all' ||
    paymentFilter !== 'all' ||
    occupantFilter !== 'all' ||
    tableFilter !== 'all' ||
    entryMonthFilter !== 'all' ||
    entryYearFilter !== 'all'

  const clearAllFilters = () => {
    setPhaseFilter('all')
    setPaymentFilter('all')
    setOccupantFilter('all')
    setTableFilter('all')
    setEntryMonthFilter('all')
    setEntryYearFilter('all')
  }

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
            <h1 className={styles.bannerTitle}>Masterlist Record</h1>
            <p className={styles.bannerSubtitle}>
              Register, search, filter, and manage homeowner records and membership statuses.
            </p>
          </div>
          <div className={styles.bannerVisual} aria-hidden="true">
            <div className={styles.bannerLogoBg} />
          </div>
        </div>

        <div className={styles.controlsRow}>
          <div className={styles.tabsContainer}>
            <button
              type="button"
              className={`${styles.tabButton} ${viewMode === 'active' ? styles.activeTab : ''}`}
              onClick={() => setViewMode('active')}
            >
              <HiOutlineUsers className={styles.tabIcon} />
              <span>Active Records</span>
            </button>
            <button
              type="button"
              className={`${styles.tabButton} ${viewMode === 'archived' ? styles.activeTab : ''}`}
              onClick={() => setViewMode('archived')}
            >
              <HiOutlineArchiveBox className={styles.tabIcon} />
              <span>Archived Records</span>
            </button>
          </div>

          <div className={styles.headerActions}>
            <button type="button" className={styles.exportButton} onClick={exportToCsv}>
              Export Masterlist (CSV)
            </button>
            <button type="button" className={styles.addButton} onClick={openAddModal}>
              <span className={styles.addIcon}>+</span>
              Add Homeowner
            </button>
          </div>
        </div>

        <section className={styles.searchWrap}>
          <div className={styles.searchBarRow}>
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className={styles.searchInput}
              placeholder="Search homeowners by name or unit number"
              aria-label="Search homeowners"
            />
          </div>

          <div className={styles.filtersRow}>
            <select
              className={styles.filterSelect}
              value={phaseFilter}
              onChange={(event) => setPhaseFilter(event.target.value)}
              aria-label="Filter by phase"
            >
              <option value="all">All Phases</option>
              <option value="1">Phase 1</option>
              <option value="2">Phase 2</option>
              <option value="3">Phase 3</option>
            </select>
            <select
              className={styles.filterSelect}
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value)}
              aria-label="Filter by payment status"
            >
              {PAYMENT_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className={styles.filterSelect}
              value={occupantFilter}
              onChange={(event) => setOccupantFilter(event.target.value)}
              aria-label="Filter by occupant status"
            >
              {OCCUPANT_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className={styles.filterSelect}
              value={tableFilter}
              onChange={(event) => setTableFilter(event.target.value)}
              aria-label="Filter homeowners"
            >
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className={styles.filterSelect}
              value={entryMonthFilter}
              onChange={(event) => setEntryMonthFilter(event.target.value)}
              aria-label="Filter by entry month"
            >
              <option value="all">All Months</option>
              <option value="1">January</option>
              <option value="2">February</option>
              <option value="3">March</option>
              <option value="4">April</option>
              <option value="5">May</option>
              <option value="6">June</option>
              <option value="7">July</option>
              <option value="8">August</option>
              <option value="9">September</option>
              <option value="10">October</option>
              <option value="11">November</option>
              <option value="12">December</option>
            </select>
            <select
              className={styles.filterSelect}
              value={entryYearFilter}
              onChange={(event) => setEntryYearFilter(event.target.value)}
              aria-label="Filter by entry year"
            >
              <option value="all">All Years</option>
              {Array.from({ length: new Date().getFullYear() - 2000 + 1 }, (_, i) => 2000 + i)
                .reverse()
                .map((year) => (
                  <option key={year} value={String(year)}>{year}</option>
                ))}
            </select>
            {hasActiveFilters && (
              <button
                type="button"
                className={styles.clearFiltersBtn}
                onClick={clearAllFilters}
                aria-label="Clear all filters"
              >
                ✕ Clear Filters
              </button>
            )}
          </div>
        </section>

        <section className={styles.tableCard}>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>User ID</th>
                  <th>Unit Number</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className={styles.emptyRow}>
                      Loading homeowners...
                    </td>
                  </tr>
                ) : filteredHomeowners.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={styles.emptyRow}>
                      No homeowners found for your search.
                    </td>
                  </tr>
                ) : (
                  pagedHomeowners.map((homeowner) => (
                    <tr key={homeowner.id}>
                      <td className={styles.clickableCell} onClick={() => openViewModal(homeowner)}>
                        <div className={styles.nameCell}>
                          {homeowner.photoUrl ? (
                            <Image
                              src={homeowner.photoUrl}
                              alt={`${homeowner.firstName} ${homeowner.lastName}`}
                              className={styles.rowAvatar}
                              width={34}
                              height={34}
                            />
                          ) : (
                            <Image
                              src="/images/Default_pfp.jpg"
                              alt={`${homeowner.firstName} ${homeowner.lastName}`}
                              className={styles.rowAvatar}
                              width={34}
                              height={34}
                            />
                          )}
                          <span>
                            {formatDisplayName(homeowner.firstName, homeowner.middleName, homeowner.lastName, {
                              middleInitialOnly: true
                            })}
                          </span>
                        </div>
                      </td>
                      <td className={styles.clickableCell} onClick={() => openViewModal(homeowner)}>{homeowner.displayId || '-'}</td>
                      <td className={styles.clickableCell} onClick={() => openViewModal(homeowner)}>{homeowner.unitNumber}</td>
                      <td className={styles.clickableCell} onClick={() => openViewModal(homeowner)}>{formatPhone(homeowner.phone)}</td>
                      <td className={styles.clickableCell} onClick={() => openViewModal(homeowner)}>
                        <span
                          className={`${styles.statusPill} ${getStatusPillClass(statusListToSingleOption(homeowner.status))}`}
                        >
                          {statusListToSingleOption(homeowner.status)}
                        </span>
                      </td>
                      <td>
                        {isOfficer ? (
                          <div className={styles.actionGroup}>
                            <button
                              type="button"
                              className={styles.viewIconButton}
                              onClick={() => openViewModal(homeowner)}
                              title="View details"
                            >
                              <HiOutlineEye className={styles.actionIcon} aria-hidden="true" />
                            </button>
                          </div>
                        ) : homeowner.archived ? (
                          <div className={styles.actionGroup}>
                            <button
                              type="button"
                              className={styles.restoreButton}
                              onClick={() => {
                                setArchiveTarget(homeowner)
                                setArchiveNext(false)
                                setIsArchiveConfirmOpen(true)
                              }}
                            >
                              <HiOutlineArrowUturnLeft className={styles.actionIcon} aria-hidden="true" />
                              Restore
                            </button>
                            <button
                              type="button"
                              className={styles.deleteButton}
                              onClick={() => {
                                setDeleteTarget(homeowner)
                                setIsDeleteConfirmOpen(true)
                              }}
                            >
                              <HiOutlineTrash className={styles.actionIcon} aria-hidden="true" />
                              Delete
                            </button>
                          </div>
                        ) : (
                          <div className={styles.actionGroup}>
                            <button
                              type="button"
                              className={styles.viewIconButton}
                              onClick={() => openViewModal(homeowner)}
                              title="View details"
                            >
                              <HiOutlineEye className={styles.actionIcon} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={styles.archiveIconButton}
                              onClick={() => {
                                setArchiveTarget(homeowner)
                                setArchiveNext(true)
                                setIsArchiveConfirmOpen(true)
                              }}
                              title="Archive record"
                            >
                              <HiOutlineArchiveBox className={styles.actionIcon} aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {filteredHomeowners.length > 0 ? (
          <div className={styles.pagination}>
            <span className={styles.pageRange}>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredHomeowners.length)} out of {filteredHomeowners.length}
            </span>
            <div className={styles.pageControls}>
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
          </div>
        ) : null}

      </div>

      {isAddModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Register New Homeowner</h2>
            <p className={styles.modalLead}>Enter homeowner information to register them in the system</p>

            {addStep === 1 ? (
              <>
                <h3 className={styles.stepTitle}>Personal Information</h3>

                <div className={styles.personalGrid}>
                  <label className={styles.photoUpload} htmlFor="homeowner-photo-input">
                    <input
                      id="homeowner-photo-input"
                      className={styles.hiddenInput}
                      type="file"
                      accept="image/*"
                      onChange={(event) => handlePhotoUpload(event.target.files?.[0])}
                    />
                    {addForm.imageUrl ? (
                      <Image
                        src={addForm.imageUrl}
                        alt="Homeowner preview"
                        className={styles.photoPreview}
                        width={72}
                        height={72}
                      />
                    ) : (
                      <span className={styles.photoPlus}>+</span>
                    )}
                    <span>
                      {isUploadingPhoto
                        ? 'Uploading...'
                        : addForm.imageName
                          ? 'Photo Selected'
                          : 'Capture or Upload Photo'}
                    </span>
                    {addForm.imageName ? <small className={styles.fileName}>{addForm.imageName}</small> : null}
                  </label>

                  <div className={styles.formCol}>
                    <label className={styles.fieldLabel}>
                      First Name <span className={styles.requiredMark}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.input}
                      value={addForm.firstName}
                      onChange={(event) => handleFormChange('firstName', normalizeName(event.target.value))}
                    />

                    <label className={styles.fieldLabel}>Middle Name</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={addForm.middleName}
                      onChange={(event) => handleFormChange('middleName', normalizeName(event.target.value))}
                    />

                    <label className={styles.fieldLabel}>
                      Last Name <span className={styles.requiredMark}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.input}
                      value={addForm.lastName}
                      onChange={(event) => handleFormChange('lastName', normalizeName(event.target.value))}
                    />
                  </div>
                </div>

                <label className={styles.fieldLabel}>
                  Phone Number <span className={styles.requiredMark}>*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className={styles.input}
                  value={addForm.phone}
                  onChange={(event) => handlePhoneChange(event.target.value)}
                  placeholder="09xxxxxxxxx"
                />

                <label className={styles.fieldLabel}>Email Address</label>
                <input
                  type="email"
                  className={styles.input}
                  value={addForm.email}
                  onChange={(event) => handleFormChange('email', event.target.value)}
                  placeholder="example@gmail.com"
                />

                <div className={styles.twoColGrid}>
                  <div>
                    <JobTitleField
                      label="Job Title"
                      value={addForm.jobDescription}
                      onChange={(value) => handleFormChange('jobDescription', value)}
                      required
                      inputClassName={styles.input}
                      labelClassName={styles.fieldLabel}
                      selectClassName={styles.input}
                      requiredClassName={styles.requiredMark}
                      placeholder="Enter job title"
                    />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>Work Status</label>
                    <select
                      className={styles.input}
                      value={addForm.workStatus}
                      onChange={(event) => handleFormChange('workStatus', event.target.value)}
                    >
                      <option value="" disabled>
                        Select work status
                      </option>
                      {workStatusOptions.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {statusOption}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.modalActions}>
                  <button type="button" className={styles.secondaryButton} onClick={closeAddModal}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => setAddStep(2)}
                    disabled={!isStepOneValid || isUploadingPhoto}
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className={styles.stepTitle}>Residency &amp; Household Details</h3>

                <div className={styles.threeColGrid}>
                  <div>
                    <label className={styles.fieldLabel}>
                      Phase <span className={styles.requiredMark}>*</span>
                    </label>
                    <select
                      className={styles.input}
                      value={addForm.phase}
                      onChange={(event) => handlePhaseChange(event.target.value)}
                    >
                      <option value="">Select Phase</option>
                      <option value="1">Phase 1</option>
                      <option value="2">Phase 2</option>
                      <option value="3">Phase 3</option>
                    </select>
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>
                      Block <span className={styles.requiredMark}>*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className={styles.input}
                      value={addForm.block}
                      maxLength={3}
                      onChange={(event) => handleBlockLotChange('block', event.target.value)}
                    />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>
                      Lot <span className={styles.requiredMark}>*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      className={styles.input}
                      value={addForm.lot}
                      maxLength={3}
                      onChange={(event) => handleBlockLotChange('lot', event.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.twoColGrid}>
                  <div>
                    <label className={styles.fieldLabel}>
                      Entry Date <span className={styles.requiredMark}>*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      className={styles.input}
                      value={addForm.entryDate}
                      onChange={(event) => handleEntryYearChange(event.target.value)}
                      placeholder="YYYY"
                    />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>
                      Occupant Status <span className={styles.requiredMark}>*</span>
                    </label>
                    <select
                      className={styles.input}
                      value={addForm.occupantStatus}
                      onChange={(event) => handleOccupantStatusChange(event.target.value)}
                    >
                      <option value="" disabled>
                        Select occupant status
                      </option>
                      {OCCUPANT_STATUS_OPTIONS.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {statusOption}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                  <label className={styles.fieldLabel}>Household Members</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
                    {addForm.householdMembers.map((member, index) => (
                      <div key={index} style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-end', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div style={{ flex: 1 }}>
                          <label className={styles.fieldLabel}>Name <span className={styles.requiredMark}>*</span></label>
                          <input type="text" className={styles.input} value={member.name} onChange={(e) => handleHouseholdMemberChange(index, 'name', e.target.value)} required />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label className={styles.fieldLabel}>Relationship <span className={styles.requiredMark}>*</span></label>
                          <input type="text" className={styles.input} value={member.relationship} onChange={(e) => handleHouseholdMemberChange(index, 'relationship', e.target.value)} required />
                        </div>
                        <button type="button" onClick={() => handleRemoveHouseholdMember(index)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Remove Member">
                          ✕
                        </button>
                      </div>
                    ))}
                    <button type="button" onClick={handleAddHouseholdMember} style={{ background: '#e0f2fe', color: '#0284c7', border: '1px dashed #7dd3fc', borderRadius: '8px', padding: '0.75rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      + Add Member
                    </button>
                  </div>
                </div>

                <div className={styles.twoColGrid}>
                  <div>
                    <label className={styles.fieldLabel}>Status</label>
                    <select
                      className={styles.input}
                      value={getStatusForOccupant(addForm.status, addForm.occupantStatus)}
                      onChange={(event) => handleFormChange('status', event.target.value)}
                      disabled={!isOwnerOccupant(addForm.occupantStatus)}
                    >
                      {DEFAULT_STATUS_OPTIONS.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {statusOption}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.jitNotice}>
                  <p>
                    <strong>Data Privacy Notice:</strong> The collected personal data is stored securely and processed solely for record management purposes in compliance with the <strong>Data Privacy Act of 2012 (DPA 2012)</strong>.{' '}
                    <Link href="/privacy-policy" className={styles.jitLink} target="_blank">
                      Read our Privacy Policy
                    </Link>.
                  </p>
                </div>

                <div className={styles.modalActions}>
                  <button type="button" className={styles.secondaryButton} onClick={() => setAddStep(1)}>
                    Back
                  </button>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={registerHomeowner}
                    disabled={!isStepTwoValid || isSaving}
                  >
                    {isSaving ? 'Registering...' : 'Register Homeowner'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {selectedHomeowner && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} ${styles.viewModal}`}>
            <div className={styles.modalHeader}>
              <div className={styles.viewHeaderContent}>
                {(isEditingHomeowner ? editForm?.photoUrl : selectedHomeowner.photoUrl) ? (
                  <button
                    type="button"
                    className={`${styles.avatarButton} ${isEditingHomeowner ? styles.avatarEditable : ''}`}
                    disabled={!isEditingHomeowner || isUpdatingPhoto}
                    onClick={() => {
                      const input = document.getElementById('edit-homeowner-photo-input')
                      if (input) {
                        input.click()
                      }
                    }}
                    aria-label={isEditingHomeowner ? 'Update homeowner photo' : 'Homeowner photo'}
                  >
                    <Image
                      src={isEditingHomeowner ? editForm?.photoUrl : selectedHomeowner.photoUrl}
                      alt={`${selectedHomeowner.firstName} ${selectedHomeowner.lastName}`}
                      className={styles.modalAvatar}
                      width={72}
                      height={72}
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`${styles.avatarButton} ${isEditingHomeowner ? styles.avatarEditable : ''}`}
                    disabled={!isEditingHomeowner || isUpdatingPhoto}
                    onClick={() => {
                      const input = document.getElementById('edit-homeowner-photo-input')
                      if (input) {
                        input.click()
                      }
                    }}
                    aria-label={isEditingHomeowner ? 'Upload homeowner photo' : 'Homeowner photo'}
                  >
                    <div className={styles.modalAvatarPlaceholder}>No Photo</div>
                  </button>
                )}
                <div>
                  <h2 className={styles.modalTitle}>{displayHomeownerName}</h2>
                  <p className={styles.modalLead}>Homeowner details</p>
                  {isEditingHomeowner ? <small className={styles.photoHint}>{isUpdatingPhoto ? 'Uploading photo...' : 'Click photo to change'}</small> : null}
                </div>
              </div>

              <input
                id="edit-homeowner-photo-input"
                className={styles.hiddenInput}
                type="file"
                accept="image/*"
                disabled={!isEditingHomeowner || isUpdatingPhoto}
                onChange={(event) => {
                  handleEditPhotoSelect(event.target.files?.[0])
                  event.target.value = ''
                }}
              />

              <button type="button" className={styles.closeIconButton} onClick={closeViewModal} aria-label="Close">
                x
              </button>
            </div>

            <div className={styles.tabRow}>
              <div className={styles.tabGroup}>
                <button
                  type="button"
                  className={`${styles.modalTabButton} ${activeViewTab === 'info' ? styles.modalTabActive : ''}`}
                  onClick={() => setActiveViewTab('info')}
                >
                  Homeowner Info
                </button>
                <button
                  type="button"
                  className={`${styles.modalTabButton} ${activeViewTab === 'payments' ? styles.modalTabActive : ''}`}
                  onClick={() => setActiveViewTab('payments')}
                >
                  Payments
                </button>
              </div>
              <button
                type="button"
                className={`${styles.idCardButton} ${styles.tabActionButton}`}
                onClick={() => generateAndPrintIdCard(selectedHomeowner)}
                disabled={!isOwnerOccupant(selectedHomeowner.occupantStatus)}
                title={
                  isOwnerOccupant(selectedHomeowner.occupantStatus)
                    ? 'Generate homeowner ID card'
                    : 'ID card is available for Owner occupants only.'
                }
              >
                <HiOutlineIdentification className={styles.idCardIcon} aria-hidden="true" />
                Generate ID Card
              </button>
            </div>

            {activeViewTab === 'info' ? (
              <div className={styles.detailsGrid}>
                <div className={styles.nameRow}>
                  <div>
                    <p className={styles.detailLabel}>First Name</p>
                    {isEditingHomeowner ? (
                      <input
                        type="text"
                        className={styles.input}
                        value={editForm?.firstName || ''}
                        onChange={(event) => handleEditChange('firstName', normalizeName(event.target.value))}
                        placeholder="First name"
                        readOnly={isOfficer}
                        disabled={isOfficer}
                        style={isOfficer ? { backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed' } : undefined}
                      />
                    ) : (
                      <p className={styles.detailValue}>{selectedHomeowner.firstName || '-'}</p>
                    )}
                  </div>
                  <div>
                    <p className={styles.detailLabel}>Middle Name</p>
                    {isEditingHomeowner ? (
                      <input
                        type="text"
                        className={styles.input}
                        value={editForm?.middleName || ''}
                        onChange={(event) => handleEditChange('middleName', normalizeName(event.target.value))}
                        placeholder="Middle name"
                        readOnly={isOfficer}
                        disabled={isOfficer}
                        style={isOfficer ? { backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed' } : undefined}
                      />
                    ) : (
                      <p className={styles.detailValue}>{selectedHomeowner.middleName || '-'}</p>
                    )}
                  </div>
                  <div>
                    <p className={styles.detailLabel}>Last Name</p>
                    {isEditingHomeowner ? (
                      <input
                        type="text"
                        className={styles.input}
                        value={editForm?.lastName || ''}
                        onChange={(event) => handleEditChange('lastName', normalizeName(event.target.value))}
                        placeholder="Last name"
                        readOnly={isOfficer}
                        disabled={isOfficer}
                        style={isOfficer ? { backgroundColor: '#f3f4f6', color: '#6b7280', cursor: 'not-allowed' } : undefined}
                      />
                    ) : (
                      <p className={styles.detailValue}>{selectedHomeowner.lastName || '-'}</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className={styles.detailLabel}>Resident ID #</p>
                  <p className={styles.detailValue}>{selectedHomeowner.residentId}</p>
                </div>
                <div>
                  <p className={styles.detailLabel}>Record Status</p>
                  <p className={styles.detailValue}>{selectedHomeowner.archived ? 'Archived' : 'Active'}</p>
                </div>
                <div>
                  <p className={styles.detailLabel}>Phone Number</p>
                  {isEditingHomeowner ? (
                    <input
                      type="text"
                      inputMode="numeric"
                      className={styles.input}
                      value={editForm?.phone || ''}
                      onChange={(event) => handleEditChange('phone', event.target.value.replace(/\D/g, '').slice(0, 11))}
                    />
                  ) : (
                    <p className={styles.detailValue}>{formatPhone(selectedHomeowner.phone)}</p>
                  )}
                </div>
                <div>
                  <p className={styles.detailLabel}>Email Address</p>
                  {isEditingHomeowner ? (
                    <input
                      type="email"
                      className={styles.input}
                      value={editForm?.email || ''}
                      onChange={(event) => handleEditChange('email', event.target.value)}
                      placeholder="example@gmail.com"
                    />
                  ) : (
                    <p className={styles.detailValue}>{selectedHomeowner.email || '-'}</p>
                  )}
                </div>
                <div>
                  <p className={styles.detailLabel}>Phase / Block / Lot</p>
                  {isEditingHomeowner ? (
                    <div className={styles.compactGridThree}>
                      <select
                        className={styles.input}
                        value={editForm?.phase || ''}
                        onChange={(event) => handleEditChange('phase', event.target.value)}
                      >
                        <option value="">Phase</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                      </select>
                      <input
                        type="text"
                        inputMode="numeric"
                        className={styles.input}
                        value={editForm?.block || ''}
                        maxLength={3}
                        onChange={(event) => handleEditChange('block', digitsOnly(event.target.value).slice(0, 3))}
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        className={styles.input}
                        value={editForm?.lot || ''}
                        maxLength={3}
                        onChange={(event) => handleEditChange('lot', digitsOnly(event.target.value).slice(0, 3))}
                      />
                    </div>
                  ) : (
                    <p className={styles.detailValue}>{`${selectedHomeowner.phase} / ${selectedHomeowner.block} / ${selectedHomeowner.lot}`}</p>
                  )}
                </div>
                <div>
                  <p className={styles.detailLabel}>Entry Date</p>
                  {isEditingHomeowner ? (
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      className={styles.input}
                      value={editForm?.entryDate || ''}
                      onChange={(event) => handleEditChange('entryDate', digitsOnly(event.target.value).slice(0, 4))}
                      placeholder="YYYY"
                    />
                  ) : (
                    <p className={styles.detailValue}>{selectedHomeowner.entryDate}</p>
                  )}
                </div>
                <div>
                  <p className={styles.detailLabel}>Occupant Status</p>
                  {isEditingHomeowner ? (
                    <select
                      className={styles.input}
                      value={editForm?.occupantStatus || ''}
                      onChange={(event) => handleEditOccupantStatusChange(event.target.value)}
                      disabled
                    >
                      <option value="" disabled>
                        Select occupant status
                      </option>
                      {toSelectOptions(OCCUPANT_STATUS_OPTIONS, editForm?.occupantStatus).map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {statusOption}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className={styles.detailValue}>{selectedHomeowner.occupantStatus}</p>
                  )}
                </div>
                <div>
                  <p className={styles.detailLabel}>Job Title</p>
                  {isEditingHomeowner ? (
                    <JobTitleField
                      label="Job Title"
                      value={editForm?.jobDescription || ''}
                      onChange={(value) => handleEditChange('jobDescription', value)}
                      required={false}
                      inputClassName={styles.input}
                      labelClassName={styles.detailLabel}
                      selectClassName={styles.input}
                      requiredClassName={styles.requiredMark}
                      placeholder="Enter job title"
                    />
                  ) : (
                    <p className={styles.detailValue}>{selectedHomeowner.jobDescription}</p>
                  )}
                </div>
                <div>
                  <p className={styles.detailLabel}>Work Status</p>
                  {isEditingHomeowner ? (
                    <select
                      className={styles.input}
                      value={editForm?.workStatus || ''}
                      onChange={(event) => handleEditChange('workStatus', event.target.value)}
                    >
                      <option value="" disabled>
                        Select work status
                      </option>
                      {workStatusOptions.map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {statusOption}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className={styles.detailValue}>{selectedHomeowner.workStatus}</p>
                  )}
                </div>
                <div className={styles.householdColumn}>
                  <p className={styles.detailLabel}>Household Members</p>
                  {isEditingHomeowner ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
                      {(editForm?.householdMembers || []).map((member, index) => (
                        <div key={index} style={{ display: 'flex', gap: '0.8rem', alignItems: 'flex-end', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <div style={{ flex: 1 }}>
                            <label className={styles.fieldLabel}>Full Name <span className={styles.requiredMark}>*</span></label>
                            <input type="text" className={styles.input} value={member.name} onChange={(e) => handleEditHouseholdMemberChange(index, 'name', e.target.value)} required />
                          </div>
                          <div style={{ flex: 1 }}>
                            <label className={styles.fieldLabel}>Relationship <span className={styles.requiredMark}>*</span></label>
                            <input type="text" className={styles.input} value={member.relationship} onChange={(e) => handleEditHouseholdMemberChange(index, 'relationship', e.target.value)} required />
                          </div>
                          <button type="button" onClick={() => handleRemoveEditHouseholdMember(index)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} title="Remove Member">
                            X
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={handleAddEditHouseholdMember} style={{ background: '#e0f2fe', color: '#0284c7', border: '1px dashed #7dd3fc', borderRadius: '8px', padding: '0.75rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        + Add Member
                      </button>
                    </div>
                  ) : (
                    <div className={styles.relatedScroll}>
                      {Array.isArray(selectedHomeowner.householdMembers) && selectedHomeowner.householdMembers.length > 0 ? (
                        <ul className={styles.relatedList}>
                          {selectedHomeowner.householdMembers.map((member, i) => (
                            <li key={i} className={styles.relatedItem}>
                              <span className={styles.relatedName}>{member.name || 'Unknown'}</span>
                              <span className={styles.relatedMeta}>{member.relationship || 'Unspecified'}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className={styles.detailValue}>No household members listed.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.paymentSection}>
                <div className={styles.paymentHeaderRow}>
                  <h3 className={styles.paymentsTitle}>Past Monthly Payments</h3>
                </div>

                {!isOwnerOccupant(selectedHomeowner.occupantStatus) ? (
                  <div className={styles.unpaidSection}>
                    <p className={styles.detailLabel}>Payment Tracking Disabled</p>
                    <p className={styles.detailValue}>Payment tracking is available for Owner occupants only.</p>
                  </div>
                ) : (
                  <>

                    <div className={styles.paymentSummaryGrid}>
                      <div className={styles.summaryCard}>
                        <p className={styles.detailLabel}>Total Amount Paid</p>
                        <p className={styles.detailValue}>
                          {selectedHomeowner.totalPaid > 0 ? toPeso(selectedHomeowner.totalPaid) : '-'}
                        </p>
                      </div>
                      <div className={styles.summaryCard}>
                        <p className={styles.detailLabel}>Unpaid Dues</p>
                        <p className={styles.detailValue}>
                          {selectedHomeowner.unpaidPeriods.length}
                          {selectedHomeowner.unpaidPeriods.length === 1 ? ' month' : ' months'}
                        </p>
                      </div>
                      <div className={styles.summaryCard}>
                        <p className={styles.detailLabel}>Monthly Dues</p>
                        <p className={styles.detailValue}>{toPeso(monthlyDues)}</p>
                      </div>
                    </div>
                    <div className={styles.paymentScroll}>
                      <ul className={styles.paymentList}>
                        <li className={`${styles.paymentRow} ${styles.paymentHeader}`}>
                          <span>Month</span>
                          <span>Date of Payment</span>
                          <span>Amount Paid</span>
                          <span>Remarks</span>
                        </li>
                        {isLoadingHomeownerPayments ? (
                          <li className={styles.paymentRow}>
                            <span>Loading...</span>
                            <span>-</span>
                            <span>-</span>
                            <span>-</span>
                          </li>
                        ) : selectedHomeowner.paymentHistory.length === 0 ? (
                          <li className={styles.paymentRow}>
                            <span>No recorded payments</span>
                            <span>-</span>
                            <span>-</span>
                            <span>-</span>
                          </li>
                        ) : selectedHomeowner.paymentHistory.map((payment) => (
                          <li key={payment.id} className={styles.paymentRow}>
                            <span>{payment.month}</span>
                            <span>{payment.paidOn}</span>
                            <span>{payment.amountPaid > 0 ? toPeso(payment.amountPaid) : '-'}</span>
                            <span>{payment.status}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className={styles.unpaidSection}>
                      <p className={styles.detailLabel}>Unpaid Months</p>
                      {selectedHomeowner.unpaidPeriods.length === 0 ? (
                        <p className={styles.detailValue}>No unpaid dues in the tracked period.</p>
                      ) : (
                        <ul className={styles.unpaidList}>
                          {selectedHomeowner.unpaidPeriods.map((period) => (
                            <li key={period} className={styles.unpaidItem}>
                              {period}
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className={styles.summarySubtext}>Tracking unpaid months since January 2026.</p>
                    </div>
                    <div className={styles.paymentActions}>
                      <button
                        type="button"
                        className={styles.reportButton}
                        onClick={() => generatePaymentReport(selectedHomeowner)}
                      >
                        Generate Payment Report
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeViewTab === 'info' ? (
              <div className={`${styles.modalActions} ${styles.viewActions}`}>
                <div className={styles.statusFieldRow}>
                  <span className={styles.statusLabel}>Status:</span>
                  <select
                    className={`${styles.input} ${styles.statusSelect}`}
                    value={getStatusForOccupant(statusDraft, editForm?.occupantStatus)}
                    onChange={(event) => setStatusDraft(event.target.value)}
                    disabled={!isEditingHomeowner || !isOwnerOccupant(editForm?.occupantStatus)}
                  >
                    {DEFAULT_STATUS_OPTIONS.map((statusOption) => (
                      <option key={statusOption} value={statusOption}>
                        {statusOption}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className={styles.primaryButton}
                  disabled={isOfficer || isUpdatingPhoto || isSaving || isArchiving || isDeleting}
                  onClick={() => {
                    if (isEditingHomeowner) {
                      setIsConfirmSaveOpen(true)
                      return
                    }

                    setIsEditingHomeowner(true)
                  }}
                  title={isOfficer ? 'Officers are not authorized to edit records.' : undefined}
                >
                  {isEditingHomeowner ? (isSaving ? 'Saving...' : 'Save Changes') : 'Edit'}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {isConfirmSaveOpen && (
        <div className={styles.modalOverlay} style={{ zIndex: 1100 }}>
          <div className={styles.modal} style={{ maxWidth: '400px' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Confirm Changes</h2>
            </div>
            <div className={styles.modalBody} style={{ padding: '20px 0', color: '#4b5563' }}>
              <p>Are you sure you want to save the changes made to this homeowner&apos;s record?</p>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setIsConfirmSaveOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => {
                  setIsConfirmSaveOpen(false)
                  saveHomeownerEdits()
                }}
              >
                Yes, Save
              </button>
            </div>
          </div>
        </div>
      )}

      {isArchiveConfirmOpen && archiveTarget && (
        <div className={styles.modalOverlay} style={{ zIndex: 1100 }}>
          <div className={styles.modal} style={{ maxWidth: '420px' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {archiveNext ? 'Archive Homeowner Record' : 'Restore Homeowner Record'}
              </h2>
            </div>
            <div className={styles.modalBody} style={{ padding: '20px 0', color: '#4b5563' }}>
              <p>
                {archiveNext
                  ? 'Archiving will hide this homeowner from active workflows. You can restore later.'
                  : 'Restoring will make this homeowner active again.'}
              </p>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setIsArchiveConfirmOpen(false)
                  setArchiveTarget(null)
                  setArchiveNext(false)
                }}
                disabled={isArchiving}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => handleArchiveToggle(archiveTarget, archiveNext)}
                disabled={isArchiving}
              >
                {isArchiving ? (archiveNext ? 'Archiving...' : 'Restoring...') : archiveNext ? 'Archive Record' : 'Restore Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteConfirmOpen && deleteTarget && (
        <div className={styles.modalOverlay} style={{ zIndex: 1100 }}>
          <div className={styles.modal} style={{ maxWidth: '420px' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Delete Homeowner Record</h2>
            </div>
            <div className={styles.modalBody} style={{ padding: '20px 0', color: '#4b5563' }}>
              <p>
                This will permanently delete the record for {deleteTarget.firstName} {deleteTarget.lastName}.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => {
                  setIsDeleteConfirmOpen(false)
                  setDeleteTarget(null)
                }}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => handleDeleteRecord(deleteTarget)}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Record'}
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}

export default function HomeownerManagementPage() {
  return (
    <Suspense fallback={<p className={styles.stateText}>Loading homeowner management...</p>}>
      <HomeownerManagementInner />
    </Suspense>
  )
}
