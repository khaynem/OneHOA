'use client'

import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '@/lib/apiClient'
import { notify } from '@/lib/notify'
import styles from './homeowner-management.module.css'

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  phone: '',
  jobDescription: '',
  workAddress: '',
  workStatus: '',
  phase: '',
  block: '',
  lot: '',
  entryDate: '',
  occupantStatus: '',
  householdCount: '',
  loanAvailed: '',
  residentId: '',
  imageName: '',
  pictureId: '',
  imageUrl: ''
}

const VALID_PHASES = ['1', '2', '3']

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

const mapRecordToHomeowner = (record = {}) => {
  const address = getAddressFields(record)
  const picture = getPictureFields(record)
  const firstName = String(record.first_name || '').trim()
  const lastName = String(record.last_name || '').trim()

  return {
    id: String(record._id || ''),
    firstName,
    lastName,
    unitNumber: `${address.phase}-${address.block}-${address.lot}`,
    phone: String(record.phone_number || ''),
    status: String(record.status || 'Active').toLowerCase() === 'inactive' ? 'inactive' : 'active',
    phase: address.phase,
    block: address.block,
    lot: address.lot,
    entryDate: toInputDate(record.entry_date),
    occupantStatus: String(record.occupant_status || '-'),
    householdCount: record.household_no !== undefined && record.household_no !== null ? String(record.household_no) : '0',
    loanAvailed: String(record.loan_availed || '-'),
    residentId: firstName || lastName ? `${firstName} ${lastName}`.trim() : String(record._id || '-'),
    workAddress: String(record.work_address || '-'),
    workStatus: String(record.work_status || '-'),
    jobDescription: String(record.job_description || '-'),
    pictureId: picture.pictureId,
    photoUrl: picture.photoUrl,
    paymentHistory: [],
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

export default function HomeownerManagementPage() {
  const [searchText, setSearchText] = useState('')
  const [tableFilter, setTableFilter] = useState('recent')
  const [homeowners, setHomeowners] = useState([])
  const [isLoading, setIsLoading] = useState(true)

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

  const fetchHomeowners = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.get('/records', {
        query: {
          page: 1,
          limit: 200
        }
      })

      const records = Array.isArray(response?.data) ? response.data : []
      setHomeowners(records.map(mapRecordToHomeowner))
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

  const isStepOneValid =
    addForm.firstName.trim() &&
    addForm.lastName.trim() &&
    addForm.phone.trim() &&
    addForm.jobDescription.trim()

  const isStepTwoValid =
    VALID_PHASES.includes(addForm.phase.trim()) &&
    /^\d+$/.test(addForm.block.trim()) &&
    /^\d+$/.test(addForm.lot.trim()) &&
    addForm.entryDate.trim() &&
    addForm.occupantStatus.trim() &&
    /^\d+$/.test(addForm.householdCount.trim()) &&
    addForm.loanAvailed.trim()

  const filteredHomeowners = useMemo(() => {
    const q = searchText.trim().toLowerCase()

    let results = homeowners

    if (q) {
      results = results.filter((homeowner) => {
        const fullName = `${homeowner.firstName} ${homeowner.lastName}`.toLowerCase()
        return fullName.includes(q) || homeowner.unitNumber.toLowerCase().includes(q)
      })
    }

    if (tableFilter === 'active') {
      return results.filter((homeowner) => homeowner.status === 'active')
    }

    if (tableFilter === 'inactive') {
      return results.filter((homeowner) => homeowner.status === 'inactive')
    }

    if (tableFilter === 'oldest') {
      return [...results].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
    }

    return [...results].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
  }, [homeowners, searchText, tableFilter])

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
    handleFormChange(field, digitsOnly(value))
  }

  const handleHouseholdCountChange = (value) => {
    handleFormChange('householdCount', digitsOnly(value))
  }

  const registerHomeowner = async () => {
    if (!isStepTwoValid) {
      notify.error({
        title: 'Invalid Address Details',
        description: 'Phase must be 1-3 and block, lot, and household count must be numeric.'
      })
      return
    }

    try {
      const payload = {
        first_name: addForm.firstName.trim(),
        last_name: addForm.lastName.trim(),
        phone_number: addForm.phone.trim(),
        job_description: addForm.jobDescription.trim(),
        work_address: addForm.workAddress.trim(),
        work_status: addForm.workStatus.trim(),
        entry_date: addForm.entryDate,
        occupant_status: addForm.occupantStatus.trim(),
        household_no: Number(addForm.householdCount),
        loan_availed: addForm.loanAvailed.trim(),
        address: {
          phase: Number(addForm.phase),
          block: Number(addForm.block),
          lot: Number(addForm.lot)
        },
        status: 'Active'
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

  const openViewModal = (homeowner) => {
    setSelectedHomeowner(homeowner)
    setActiveViewTab('info')
    setIsEditingHomeowner(false)
    setEditForm({
      unitNumber: homeowner.unitNumber,
      phone: homeowner.phone,
      phase: homeowner.phase,
      block: homeowner.block,
      lot: homeowner.lot,
      entryDate: homeowner.entryDate,
      occupantStatus: homeowner.occupantStatus,
      householdCount: homeowner.householdCount,
      residentId: homeowner.residentId,
      jobDescription: homeowner.jobDescription,
      workAddress: homeowner.workAddress,
      workStatus: homeowner.workStatus,
      pictureId: homeowner.pictureId,
      photoUrl: homeowner.photoUrl,
      imageName: ''
    })

    fetchHomeownerPayments(homeowner.id)
  }

  const closeViewModal = () => {
    setSelectedHomeowner(null)
    setActiveViewTab('info')
    setIsEditingHomeowner(false)
    setEditForm(null)
  }

  const toggleStatus = async (homeownerId) => {
    const target = homeowners.find((homeowner) => homeowner.id === homeownerId)
    if (!target) {
      return
    }

    try {
      const response = await apiClient.put(`/records/${homeownerId}`, {
        status: target.status === 'active' ? 'Inactive' : 'Active'
      })
      const updated = mapRecordToHomeowner(response?.data)

      setHomeowners((prev) => prev.map((homeowner) => (homeowner.id === homeownerId ? updated : homeowner)))
      setSelectedHomeowner((prev) => (prev && prev.id === homeownerId ? updated : prev))
    } catch (error) {
      notify.error({
        title: 'Status Update Failed',
        description: error.message || 'Unable to update homeowner status.'
      })
    }
  }

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const fetchHomeownerPayments = async (homeownerId) => {
    if (!homeownerId) {
      return
    }

    setIsLoadingHomeownerPayments(true)

    try {
      const response = await apiClient.get('/payments', {
        query: {
          record_id: homeownerId
        }
      })

      const payments = Array.isArray(response?.data) ? response.data : []
      const paymentHistory = payments
        .map((payment) => ({
          id: String(payment._id || `${payment.receipt_no || ''}-${payment.date || ''}`),
          month: getCoveredPeriods(payment).map(periodToLabel).join(', ') || '-',
          paidOn: payment.date ? toInputDate(payment.date) : '-',
          amountPaid: Number(payment.amount) || 0,
          status: String(payment.payment_status || payment.payment_details || 'Recorded')
        }))
        .sort((a, b) => new Date(b.paidOn || 0).getTime() - new Date(a.paidOn || 0).getTime())

      setSelectedHomeowner((prev) => {
        if (!prev || prev.id !== homeownerId) {
          return prev
        }

        return {
          ...prev,
          paymentHistory,
          upcomingPayment: { month: getUpcomingPeriodLabel(payments) }
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
    if (!selectedHomeowner || !editForm) {
      return
    }

    const normalizedPhase = String(editForm.phase || '').trim()
    const normalizedBlock = digitsOnly(editForm.block)
    const normalizedLot = digitsOnly(editForm.lot)
    const normalizedHousehold = digitsOnly(editForm.householdCount)

    if (!VALID_PHASES.includes(normalizedPhase) || !normalizedBlock || !normalizedLot || !normalizedHousehold) {
      notify.error({
        title: 'Invalid Edit Values',
        description: 'Phase must be 1-3 and block, lot, and household count must be numeric.'
      })
      return
    }

    try {
      const payload = {
        phone_number: String(editForm.phone || '').replace(/\D/g, '').slice(0, 11),
        entry_date: editForm.entryDate,
        occupant_status: editForm.occupantStatus,
        household_no: Number(normalizedHousehold),
        job_description: editForm.jobDescription,
        work_address: editForm.workAddress,
        work_status: editForm.workStatus,
        address: {
          phase: Number(normalizedPhase),
          block: Number(normalizedBlock),
          lot: Number(normalizedLot)
        }
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
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Homeowner Management</h1>
          <p className={styles.subtitle}>Register and manage homeowner records</p>
        </div>

        <button type="button" className={styles.addButton} onClick={openAddModal}>
          <span className={styles.addIcon}>+</span>
          Add Homeowner
        </button>
      </section>

      <section className={styles.searchWrap}>
        <div className={styles.searchRow}>
          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className={styles.searchInput}
            placeholder="Search homeowners by name or unit number"
            aria-label="Search homeowners"
          />
          <select
            className={styles.filterSelect}
            value={tableFilter}
            onChange={(event) => setTableFilter(event.target.value)}
            aria-label="Filter homeowners"
          >
            <option value="recent">Recently Added</option>
            <option value="oldest">Oldest</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Unit Number</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className={styles.emptyRow}>
                    Loading homeowners...
                  </td>
                </tr>
              ) : filteredHomeowners.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyRow}>
                    No homeowners found for your search.
                  </td>
                </tr>
              ) : (
                filteredHomeowners.map((homeowner) => (
                  <tr key={homeowner.id}>
                    <td>
                      <div className={styles.nameCell}>
                        {homeowner.photoUrl ? (
                          <img
                            src={homeowner.photoUrl}
                            alt={`${homeowner.firstName} ${homeowner.lastName}`}
                            className={styles.rowAvatar}
                          />
                        ) : (
                          <span className={styles.rowAvatarPlaceholder}>No Photo</span>
                        )}
                        <span>{`${homeowner.firstName} ${homeowner.lastName}`}</span>
                      </div>
                    </td>
                    <td>{homeowner.unitNumber}</td>
                    <td>{formatPhone(homeowner.phone)}</td>
                    <td>
                      <span
                        className={`${styles.statusPill} ${
                          homeowner.status === 'active' ? styles.statusActive : styles.statusInactive
                        }`}
                      >
                        {homeowner.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button type="button" className={styles.viewButton} onClick={() => openViewModal(homeowner)}>
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

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
                      <img src={addForm.imageUrl} alt="Homeowner preview" className={styles.photoPreview} />
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
                      onChange={(event) => handleFormChange('firstName', event.target.value)}
                    />

                    <label className={styles.fieldLabel}>
                      Last Name <span className={styles.requiredMark}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.input}
                      value={addForm.lastName}
                      onChange={(event) => handleFormChange('lastName', event.target.value)}
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
                  placeholder="XXXX XXX XXXX"
                />

                <div className={styles.threeColGrid}>
                  <div>
                    <label className={styles.fieldLabel}>
                      Job Description <span className={styles.requiredMark}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.input}
                      value={addForm.jobDescription}
                      onChange={(event) => handleFormChange('jobDescription', event.target.value)}
                    />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>Work Address</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={addForm.workAddress}
                      onChange={(event) => handleFormChange('workAddress', event.target.value)}
                    />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>Work Status</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={addForm.workStatus}
                      onChange={(event) => handleFormChange('workStatus', event.target.value)}
                    />
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
                      type="date"
                      className={styles.input}
                      value={addForm.entryDate}
                      onChange={(event) => handleFormChange('entryDate', event.target.value)}
                    />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>
                      Occupant Status <span className={styles.requiredMark}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.input}
                      value={addForm.occupantStatus}
                      onChange={(event) => handleFormChange('occupantStatus', event.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.twoColGrid}>
                  <div>
                    <label className={styles.fieldLabel}>
                      No. of People in Household <span className={styles.requiredMark}>*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      className={styles.input}
                      value={addForm.householdCount}
                      onChange={(event) => handleHouseholdCountChange(event.target.value)}
                    />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>
                      Loan Availed <span className={styles.requiredMark}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.input}
                      value={addForm.loanAvailed}
                      onChange={(event) => handleFormChange('loanAvailed', event.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className={styles.fieldLabel}>Resident ID #</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={addForm.residentId}
                    onChange={(event) => handleFormChange('residentId', event.target.value)}
                    placeholder="Optional"
                  />
                </div>

                <div className={styles.modalActions}>
                  <button type="button" className={styles.secondaryButton} onClick={() => setAddStep(1)}>
                    Back
                  </button>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={registerHomeowner}
                    disabled={!isStepTwoValid}
                  >
                    Register Homeowner
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
                    <img
                      src={isEditingHomeowner ? editForm?.photoUrl : selectedHomeowner.photoUrl}
                      alt={`${selectedHomeowner.firstName} ${selectedHomeowner.lastName}`}
                      className={styles.modalAvatar}
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
                  <h2 className={styles.modalTitle}>{`${selectedHomeowner.firstName} ${selectedHomeowner.lastName}`}</h2>
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
              <button
                type="button"
                className={`${styles.tabButton} ${activeViewTab === 'info' ? styles.tabActive : ''}`}
                onClick={() => setActiveViewTab('info')}
              >
                Homeowner Info
              </button>
              <button
                type="button"
                className={`${styles.tabButton} ${activeViewTab === 'payments' ? styles.tabActive : ''}`}
                onClick={() => setActiveViewTab('payments')}
              >
                Payments
              </button>
            </div>

            {activeViewTab === 'info' ? (
              <div className={styles.detailsGrid}>
                <div>
                  <p className={styles.detailLabel}>Unit Number</p>
                  {isEditingHomeowner ? (
                    <p className={styles.detailValue}>{`${editForm?.phase || '-'}-${editForm?.block || '-'}-${editForm?.lot || '-'}`}</p>
                  ) : (
                    <p className={styles.detailValue}>{selectedHomeowner.unitNumber}</p>
                  )}
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
                  <p className={styles.detailLabel}>Phase / Block / Lot</p>
                  {isEditingHomeowner ? (
                    <div className={styles.compactGridThree}>
                      <select
                        className={styles.input}
                        value={editForm?.phase || ''}
                        onChange={(event) => handleEditChange('phase', event.target.value)}
                      >
                        <option value="">Phase</option>
                        <option value="1">Phase 1</option>
                        <option value="2">Phase 2</option>
                        <option value="3">Phase 3</option>
                      </select>
                      <input
                        type="text"
                        inputMode="numeric"
                        className={styles.input}
                        value={editForm?.block || ''}
                        onChange={(event) => handleEditChange('block', digitsOnly(event.target.value))}
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        className={styles.input}
                        value={editForm?.lot || ''}
                        onChange={(event) => handleEditChange('lot', digitsOnly(event.target.value))}
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
                      type="date"
                      className={styles.input}
                      value={editForm?.entryDate || ''}
                      onChange={(event) => handleEditChange('entryDate', event.target.value)}
                    />
                  ) : (
                    <p className={styles.detailValue}>{selectedHomeowner.entryDate}</p>
                  )}
                </div>
                <div>
                  <p className={styles.detailLabel}>Occupant Status</p>
                  {isEditingHomeowner ? (
                    <input
                      type="text"
                      className={styles.input}
                      value={editForm?.occupantStatus || ''}
                      onChange={(event) => handleEditChange('occupantStatus', event.target.value)}
                    />
                  ) : (
                    <p className={styles.detailValue}>{selectedHomeowner.occupantStatus}</p>
                  )}
                </div>
                <div>
                  <p className={styles.detailLabel}>Household Count</p>
                  {isEditingHomeowner ? (
                    <input
                      type="number"
                      min="0"
                      className={styles.input}
                      value={editForm?.householdCount || ''}
                      onChange={(event) => handleEditChange('householdCount', digitsOnly(event.target.value))}
                    />
                  ) : (
                    <p className={styles.detailValue}>{selectedHomeowner.householdCount}</p>
                  )}
                </div>
                <div>
                  <p className={styles.detailLabel}>Resident ID #</p>
                  {isEditingHomeowner ? (
                    <input
                      type="text"
                      className={styles.input}
                      value={editForm?.residentId || ''}
                      onChange={(event) => handleEditChange('residentId', event.target.value)}
                    />
                  ) : (
                    <p className={styles.detailValue}>{selectedHomeowner.residentId}</p>
                  )}
                </div>
                <div>
                  <p className={styles.detailLabel}>Job Description</p>
                  {isEditingHomeowner ? (
                    <input
                      type="text"
                      className={styles.input}
                      value={editForm?.jobDescription || ''}
                      onChange={(event) => handleEditChange('jobDescription', event.target.value)}
                    />
                  ) : (
                    <p className={styles.detailValue}>{selectedHomeowner.jobDescription}</p>
                  )}
                </div>
                <div>
                  <p className={styles.detailLabel}>Work Address</p>
                  {isEditingHomeowner ? (
                    <input
                      type="text"
                      className={styles.input}
                      value={editForm?.workAddress || ''}
                      onChange={(event) => handleEditChange('workAddress', event.target.value)}
                    />
                  ) : (
                    <p className={styles.detailValue}>{selectedHomeowner.workAddress}</p>
                  )}
                </div>
                <div>
                  <p className={styles.detailLabel}>Work Status</p>
                  {isEditingHomeowner ? (
                    <input
                      type="text"
                      className={styles.input}
                      value={editForm?.workStatus || ''}
                      onChange={(event) => handleEditChange('workStatus', event.target.value)}
                    />
                  ) : (
                    <p className={styles.detailValue}>{selectedHomeowner.workStatus}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.paymentSection}>
                <h3 className={styles.paymentsTitle}>Past Monthly Payments</h3>
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

                <div className={styles.upcomingCard}>
                  <p className={styles.detailLabel}>Upcoming Monthly Payment</p>
                  <p className={styles.detailValue}>{selectedHomeowner.upcomingPayment.month}</p>
                </div>
              </div>
            )}

            <div className={`${styles.modalActions} ${styles.viewActions}`}>
              <button
                type="button"
                className={`${styles.statusToggleButton} ${
                  selectedHomeowner.status === 'active' ? styles.statusDangerButton : styles.statusSafeButton
                }`}
                onClick={() => toggleStatus(selectedHomeowner.id)}
              >
                {selectedHomeowner.status === 'active' ? 'Set as Inactive' : 'Set as Active'}
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={isUpdatingPhoto}
                onClick={() => {
                  if (isEditingHomeowner) {
                    saveHomeownerEdits()
                    return
                  }

                  setIsEditingHomeowner(true)
                }}
              >
                {isEditingHomeowner ? 'Save Changes' : 'Edit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
