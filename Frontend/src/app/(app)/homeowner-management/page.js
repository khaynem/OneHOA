'use client'

import { useMemo, useState } from 'react'
import { notify } from '@/lib/notify'
import styles from './homeowner-management.module.css'

const HOMEOWNERS = [
  {
    id: 1,
    firstName: 'Juan Dela Cruz',
    lastName: 'Santos',
    unitNumber: 'Unit 101',
    phone: '09176111222',
    status: 'active',
    phase: 'Phase 1',
    block: 'B1',
    lot: 'L12',
    entryDate: '2024-01-10',
    occupantStatus: 'Owner',
    householdCount: '4',
    loanAvailed: 'None',
    residentId: 'R-1001',
    workAddress: 'Makati City',
    workStatus: 'Employed',
    jobDescription: 'Operations Manager',
    paymentHistory: [
      { month: 'January 2026', paidOn: '2026-01-14', amountPaid: 2500, status: 'Paid' },
      { month: 'February 2026', paidOn: '2026-02-13', amountPaid: 2500, status: 'Paid' },
      { month: 'March 2026', paidOn: '-', amountPaid: 0, status: 'Missed' }
    ],
    upcomingPayment: { month: 'April 2026' }
  },
  {
    id: 2,
    firstName: 'Maria Luisa',
    lastName: 'Reyes',
    unitNumber: 'Unit 102',
    phone: '09282233445',
    status: 'active',
    phase: 'Phase 1',
    block: 'B1',
    lot: 'L14',
    entryDate: '2023-11-08',
    occupantStatus: 'Owner',
    householdCount: '3',
    loanAvailed: 'Home Improvement',
    residentId: 'R-1002',
    workAddress: 'Taguig City',
    workStatus: 'Employed',
    jobDescription: 'Accountant',
    paymentHistory: [
      { month: 'January 2026', paidOn: '2026-01-15', amountPaid: 2500, status: 'Paid' },
      { month: 'February 2026', paidOn: '2026-02-14', amountPaid: 2500, status: 'Paid' },
      { month: 'March 2026', paidOn: '-', amountPaid: 0, status: 'Missed' }
    ],
    upcomingPayment: { month: 'April 2026' }
  },
  {
    id: 3,
    firstName: 'Carlo Miguel',
    lastName: 'Lim',
    unitNumber: 'Unit 203',
    phone: '09456678901',
    status: 'inactive',
    phase: 'Phase 2',
    block: 'B3',
    lot: 'L05',
    entryDate: '2022-06-16',
    occupantStatus: 'Tenant',
    householdCount: '2',
    loanAvailed: 'None',
    residentId: 'R-1003',
    workAddress: 'Pasig City',
    workStatus: 'Self-employed',
    jobDescription: 'Online Seller',
    paymentHistory: [
      { month: 'January 2026', paidOn: '2026-01-17', amountPaid: 2500, status: 'Paid' },
      { month: 'February 2026', paidOn: '2026-03-02', amountPaid: 2500, status: 'Late Paid' },
      { month: 'March 2026', paidOn: '-', amountPaid: 0, status: 'Missed' },
      { month: 'April 2026', paidOn: '-', amountPaid: 0, status: 'Missed' },
      { month: 'May 2026', paidOn: '-', amountPaid: 0, status: 'Missed' }
    ],
    upcomingPayment: { month: 'June 2026' }
  },
  {
    id: 4,
    firstName: 'Angela',
    lastName: 'Navarro',
    unitNumber: 'Unit 305',
    phone: '09331010101',
    status: 'active',
    phase: 'Phase 3',
    block: 'B5',
    lot: 'L09',
    entryDate: '2025-02-01',
    occupantStatus: 'Owner',
    householdCount: '5',
    loanAvailed: 'None',
    residentId: 'R-1004',
    workAddress: 'Quezon City',
    workStatus: 'Employed',
    jobDescription: 'Teacher',
    paymentHistory: [
      { month: 'January 2026', paidOn: '2026-01-11', amountPaid: 2500, status: 'Paid' },
      { month: 'February 2026', paidOn: '2026-02-15', amountPaid: 2500, status: 'Paid' },
      { month: 'March 2026', paidOn: '-', amountPaid: 0, status: 'Missed' }
    ],
    upcomingPayment: { month: 'April 2026' }
  }
]

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
  imageName: ''
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

export default function HomeownerManagementPage() {
  const [searchText, setSearchText] = useState('')
  const [tableFilter, setTableFilter] = useState('recent')
  const [homeowners, setHomeowners] = useState(HOMEOWNERS)

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [addStep, setAddStep] = useState(1)
  const [addForm, setAddForm] = useState(EMPTY_FORM)

  const [selectedHomeowner, setSelectedHomeowner] = useState(null)
  const [activeViewTab, setActiveViewTab] = useState('info')
  const [isEditingHomeowner, setIsEditingHomeowner] = useState(false)
  const [editForm, setEditForm] = useState(null)

  const isStepOneValid =
    addForm.firstName.trim() &&
    addForm.lastName.trim() &&
    addForm.phone.trim() &&
    addForm.jobDescription.trim()

  const isStepTwoValid =
    addForm.phase.trim() &&
    addForm.block.trim() &&
    addForm.lot.trim() &&
    addForm.entryDate.trim() &&
    addForm.occupantStatus.trim() &&
    addForm.householdCount.trim() &&
    addForm.loanAvailed.trim() &&
    addForm.residentId.trim()

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
      return [...results].sort((a, b) => a.id - b.id)
    }

    return [...results].sort((a, b) => b.id - a.id)
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
    const digitsOnly = value.replace(/\D/g, '').slice(0, 11)
    handleFormChange('phone', digitsOnly)
  }

  const handleHouseholdCountChange = (value) => {
    if (!value) {
      handleFormChange('householdCount', '')
      return
    }

    const number = Number(value)
    if (Number.isNaN(number) || number < 0) {
      return
    }

    handleFormChange('householdCount', String(number))
  }

  const registerHomeowner = () => {
    if (!isStepTwoValid) {
      return
    }

    const newHomeowner = {
      id: Date.now(),
      firstName: addForm.firstName.trim(),
      lastName: addForm.lastName.trim(),
      unitNumber: `${addForm.phase.trim()}-${addForm.block.trim()}-${addForm.lot.trim()}`,
      phone: addForm.phone.trim(),
      status: 'active',
      phase: addForm.phase.trim(),
      block: addForm.block.trim(),
      lot: addForm.lot.trim(),
      entryDate: addForm.entryDate,
      occupantStatus: addForm.occupantStatus.trim(),
      householdCount: addForm.householdCount.trim(),
      loanAvailed: addForm.loanAvailed.trim(),
      residentId: addForm.residentId.trim(),
      workAddress: addForm.workAddress.trim() || '-',
      workStatus: addForm.workStatus.trim() || '-',
      jobDescription: addForm.jobDescription.trim(),
      paymentHistory: [
        { month: 'January 2026', paidOn: '2026-01-20', amountPaid: 2500, status: 'Paid' },
        { month: 'February 2026', paidOn: '-', amountPaid: 0, status: 'Missed' }
      ],
      upcomingPayment: { month: 'March 2026' }
    }

    setHomeowners((prev) => [newHomeowner, ...prev])
    notify.success({
      title: 'Homeowner Registered',
      description: `${newHomeowner.firstName} ${newHomeowner.lastName} has been added successfully.`
    })
    closeAddModal()
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
      workStatus: homeowner.workStatus
    })
  }

  const closeViewModal = () => {
    setSelectedHomeowner(null)
    setActiveViewTab('info')
    setIsEditingHomeowner(false)
    setEditForm(null)
  }

  const toggleStatus = (homeownerId) => {
    setHomeowners((prev) =>
      prev.map((homeowner) => {
        if (homeowner.id !== homeownerId) {
          return homeowner
        }

        return {
          ...homeowner,
          status: homeowner.status === 'active' ? 'inactive' : 'active'
        }
      })
    )
    setSelectedHomeowner((prev) => {
      if (!prev || prev.id !== homeownerId) {
        return prev
      }

      return {
        ...prev,
        status: prev.status === 'active' ? 'inactive' : 'active'
      }
    })
  }

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const saveHomeownerEdits = () => {
    if (!selectedHomeowner || !editForm) {
      return
    }

    const updatedHomeowner = {
      ...selectedHomeowner,
      ...editForm,
      phone: String(editForm.phone || '').replace(/\D/g, '').slice(0, 11),
      householdCount: String(Math.max(0, Number(editForm.householdCount || 0)))
    }

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
      description: `${selectedHomeowner.firstName} ${selectedHomeowner.lastName} has been updated.`
    })
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
              {filteredHomeowners.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyRow}>
                    No homeowners found for your search.
                  </td>
                </tr>
              ) : (
                filteredHomeowners.map((homeowner) => (
                  <tr key={homeowner.id}>
                    <td>{`${homeowner.firstName} ${homeowner.lastName}`}</td>
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
                      onChange={(event) => {
                        const fileName = event.target.files?.[0]?.name || ''
                        handleFormChange('imageName', fileName)
                      }}
                    />
                    <span className={styles.photoPlus}>+</span>
                    <span>{addForm.imageName ? 'Image Selected' : 'Insert Photo'}</span>
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
                    disabled={!isStepOneValid}
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
                    <input
                      type="text"
                      className={styles.input}
                      value={addForm.phase}
                      onChange={(event) => handleFormChange('phase', event.target.value)}
                    />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>
                      Block <span className={styles.requiredMark}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.input}
                      value={addForm.block}
                      onChange={(event) => handleFormChange('block', event.target.value)}
                    />
                  </div>
                  <div>
                    <label className={styles.fieldLabel}>
                      Lot <span className={styles.requiredMark}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.input}
                      value={addForm.lot}
                      onChange={(event) => handleFormChange('lot', event.target.value)}
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
                  <label className={styles.fieldLabel}>
                    Resident ID # <span className={styles.requiredMark}>*</span>
                  </label>
                  <input
                    type="text"
                    className={styles.input}
                    value={addForm.residentId}
                    onChange={(event) => handleFormChange('residentId', event.target.value)}
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
              <div>
                <h2 className={styles.modalTitle}>{`${selectedHomeowner.firstName} ${selectedHomeowner.lastName}`}</h2>
                <p className={styles.modalLead}>Homeowner details</p>
              </div>

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
                    <input
                      type="text"
                      className={styles.input}
                      value={editForm?.unitNumber || ''}
                      onChange={(event) => handleEditChange('unitNumber', event.target.value)}
                    />
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
                      <input
                        type="text"
                        className={styles.input}
                        value={editForm?.phase || ''}
                        onChange={(event) => handleEditChange('phase', event.target.value)}
                      />
                      <input
                        type="text"
                        className={styles.input}
                        value={editForm?.block || ''}
                        onChange={(event) => handleEditChange('block', event.target.value)}
                      />
                      <input
                        type="text"
                        className={styles.input}
                        value={editForm?.lot || ''}
                        onChange={(event) => handleEditChange('lot', event.target.value)}
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
                      onChange={(event) => handleEditChange('householdCount', event.target.value)}
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
                    {selectedHomeowner.paymentHistory.map((payment) => (
                      <li key={`${payment.month}-${payment.status}`} className={styles.paymentRow}>
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
