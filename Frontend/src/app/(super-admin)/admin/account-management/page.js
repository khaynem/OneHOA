'use client'

import { useMemo, useState } from 'react'
import { HiOutlinePencilSquare as EditIcon } from 'react-icons/hi2'
import styles from './account-management.module.css'

const INITIAL_USERS = [
  {
    id: '1',
    firstName: 'Maria',
    lastName: 'Reyes',
    email: 'maria.reyes@onehoa.com',
    role: 'President',
    status: 'Active'
  },
  {
    id: '2',
    firstName: 'Jose',
    lastName: 'Santos',
    email: 'jose.santos@onehoa.com',
    role: 'Officer',
    status: 'Inactive'
  },
  {
    id: '3',
    firstName: 'Catherine',
    lastName: 'Dela Cruz',
    email: 'catherine.delacruz@onehoa.com',
    role: 'SuperAdmin',
    status: 'Active'
  }
]

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'Officer',
  status: 'Active'
}

const ROLES = ['SuperAdmin', 'President', 'Officer']
const USER_STATUSES = ['Active', 'Inactive']

const normalizeNamePart = (value) => String(value || '').replace(/[^a-zA-Z\s]/g, '').trim()

const toTempPassword = (lastName) => {
  const cleanLastName = normalizeNamePart(lastName).replace(/\s+/g, '')

  if (!cleanLastName) {
    return ''
  }

  const currentYear = new Date().getFullYear()
  const formattedLastName = cleanLastName.charAt(0).toUpperCase() + cleanLastName.slice(1)

  return `${formattedLastName}${currentYear}!`
}

export default function AccountManagementPage() {
  const [users, setUsers] = useState(INITIAL_USERS)
  const [searchText, setSearchText] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditingUser, setIsEditingUser] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState(null)

  const temporaryPassword = useMemo(() => toTempPassword(form.lastName), [form.lastName])

  const filteredUsers = useMemo(() => {
    const query = searchText.trim().toLowerCase()

    return users.filter((user) => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase()
      const matchesQuery = !query || fullName.includes(query) || user.email.toLowerCase().includes(query)
      const matchesRole = roleFilter === 'all' || user.role === roleFilter

      return matchesQuery && matchesRole
    })
  }, [users, searchText, roleFilter])

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) || null,
    [users, selectedUserId]
  )

  const closeModal = () => {
    setIsAddModalOpen(false)
    setForm(EMPTY_FORM)
  }

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const canSubmit =
    normalizeNamePart(form.firstName) &&
    normalizeNamePart(form.lastName) &&
    /^\S+@\S+\.\S+$/.test(form.email.trim()) &&
    ROLES.includes(form.role) &&
    temporaryPassword

  const canSaveEdit =
    normalizeNamePart(editForm?.firstName) &&
    normalizeNamePart(editForm?.lastName) &&
    /^\S+@\S+\.\S+$/.test(String(editForm?.email || '').trim()) &&
    ROLES.includes(editForm?.role) &&
    USER_STATUSES.includes(editForm?.status)

  const addUser = () => {
    if (!canSubmit) {
      return
    }

    const newUser = {
      id: String(Date.now()),
      firstName: normalizeNamePart(form.firstName),
      lastName: normalizeNamePart(form.lastName),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      status: 'Active'
    }

    setUsers((prev) => [newUser, ...prev])
    closeModal()
  }

  const openViewModal = (user) => {
    setSelectedUserId(user.id)
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      status: user.status
    })
    setIsEditingUser(false)
    setIsViewModalOpen(true)
  }

  const closeViewModal = () => {
    setSelectedUserId(null)
    setEditForm(null)
    setIsEditingUser(false)
    setIsViewModalOpen(false)
  }

  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const saveUserEdits = () => {
    if (!selectedUser || !canSaveEdit) {
      return
    }

    setUsers((prev) =>
      prev.map((user) => {
        if (user.id !== selectedUser.id) {
          return user
        }

        return {
          ...user,
          firstName: normalizeNamePart(editForm.firstName),
          lastName: normalizeNamePart(editForm.lastName),
          email: editForm.email.trim().toLowerCase(),
          role: editForm.role,
          status: editForm.status
        }
      })
    )
    setIsEditingUser(false)
  }

  const promptDeleteUser = () => {
    if (!selectedUser) {
      return
    }

    setPendingDeleteUserId(selectedUser.id)
  }

  const closeDeleteConfirmModal = () => {
    setPendingDeleteUserId(null)
  }

  const confirmDeleteUser = () => {
    if (!pendingDeleteUserId) {
      return
    }

    setUsers((prev) => prev.filter((user) => user.id !== pendingDeleteUserId))

    if (selectedUserId === pendingDeleteUserId) {
      closeViewModal()
    }

    setPendingDeleteUserId(null)
  }

  const pendingDeleteUser = users.find((user) => user.id === pendingDeleteUserId)

  return (
    <main className={styles.page}>
      <section className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>Account Management</h1>
          <p className={styles.subtitle}>Create and view user accounts for the HOA system</p>
        </div>

        <button type="button" className={styles.addButton} onClick={() => setIsAddModalOpen(true)}>
          <span className={styles.addIcon}>+</span>
          Add User
        </button>
      </section>

      <section className={styles.searchWrap}>
        <div className={styles.searchRow}>
          <input
            type="search"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className={styles.searchInput}
            placeholder="Search users by name or email"
            aria-label="Search users"
          />
          <select
            className={styles.filterSelect}
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            aria-label="Filter by role"
          >
            <option value="all">All Roles</option>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className={styles.emptyRow}>
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{`${user.firstName} ${user.lastName}`}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      <span
                        className={`${styles.statusPill} ${
                          user.status === 'Active' ? styles.statusActive : styles.statusInactive
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td>
                      <button type="button" className={styles.viewButton} onClick={() => openViewModal(user)}>
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
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Add user">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Add New User</h2>
              <button type="button" className={styles.closeButton} onClick={closeModal} aria-label="Close">
                x
              </button>
            </div>

            <div className={styles.formGrid}>
              <div>
                <label className={styles.fieldLabel} htmlFor="firstName">
                  Firstname <span className={styles.requiredMark}>*</span>
                </label>
                <input
                  id="firstName"
                  className={styles.input}
                  type="text"
                  value={form.firstName}
                  onChange={(event) => handleFormChange('firstName', event.target.value)}
                  placeholder="Enter first name"
                />
              </div>

              <div>
                <label className={styles.fieldLabel} htmlFor="lastName">
                  Lastname <span className={styles.requiredMark}>*</span>
                </label>
                <input
                  id="lastName"
                  className={styles.input}
                  type="text"
                  value={form.lastName}
                  onChange={(event) => handleFormChange('lastName', event.target.value)}
                  placeholder="Enter last name"
                />
              </div>

              <div>
                <label className={styles.fieldLabel} htmlFor="email">
                  Email <span className={styles.requiredMark}>*</span>
                </label>
                <input
                  id="email"
                  className={styles.input}
                  type="email"
                  value={form.email}
                  onChange={(event) => handleFormChange('email', event.target.value)}
                  placeholder="Enter email"
                />
              </div>

              <div>
                <label className={styles.fieldLabel} htmlFor="tempPassword">
                  Generated Temporary Password
                </label>
                <input
                  id="tempPassword"
                  className={styles.input}
                  type="text"
                  value={temporaryPassword}
                  placeholder="LastnameYYYY!"
                  readOnly
                />
              </div>

              <div>
                <label className={styles.fieldLabel} htmlFor="role">
                  Role <span className={styles.requiredMark}>*</span>
                </label>
                <select
                  id="role"
                  className={styles.input}
                  value={form.role}
                  onChange={(event) => handleFormChange('role', event.target.value)}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelButton} onClick={closeModal}>
                Cancel
              </button>
              <button type="button" className={styles.confirmButton} onClick={addUser} disabled={!canSubmit}>
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      {isViewModalOpen && selectedUser && editForm && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="View user details">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>User Details</h2>
              <button type="button" className={styles.closeButton} onClick={closeViewModal} aria-label="Close">
                x
              </button>
            </div>

            <div className={styles.formGrid}>
              <div>
                <label className={styles.fieldLabel}>Firstname</label>
                {isEditingUser ? (
                  <input
                    className={styles.input}
                    type="text"
                    value={editForm.firstName}
                    onChange={(event) => handleEditFormChange('firstName', event.target.value)}
                  />
                ) : (
                  <p className={styles.detailValue}>{selectedUser.firstName}</p>
                )}
              </div>

              <div>
                <label className={styles.fieldLabel}>Lastname</label>
                {isEditingUser ? (
                  <input
                    className={styles.input}
                    type="text"
                    value={editForm.lastName}
                    onChange={(event) => handleEditFormChange('lastName', event.target.value)}
                  />
                ) : (
                  <p className={styles.detailValue}>{selectedUser.lastName}</p>
                )}
              </div>

              <div>
                <label className={styles.fieldLabel}>Email</label>
                {isEditingUser ? (
                  <input
                    className={styles.input}
                    type="email"
                    value={editForm.email}
                    onChange={(event) => handleEditFormChange('email', event.target.value)}
                  />
                ) : (
                  <p className={styles.detailValue}>{selectedUser.email}</p>
                )}
              </div>

              <div>
                <label className={styles.fieldLabel}>Role</label>
                {isEditingUser ? (
                  <select
                    className={styles.input}
                    value={editForm.role}
                    onChange={(event) => handleEditFormChange('role', event.target.value)}
                  >
                    {ROLES.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className={styles.detailValue}>{selectedUser.role}</p>
                )}
              </div>

              <div>
                <label className={styles.fieldLabel}>Status</label>
                {isEditingUser ? (
                  <select
                    className={styles.input}
                    value={editForm.status}
                    onChange={(event) => handleEditFormChange('status', event.target.value)}
                  >
                    {USER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className={styles.detailValue}>{selectedUser.status}</p>
                )}
              </div>
            </div>

            <div className={`${styles.modalActions} ${styles.viewActions}`}>
              <button
                type="button"
                className={styles.confirmButton}
                onClick={() => {
                  if (isEditingUser) {
                    saveUserEdits()
                    return
                  }

                  setIsEditingUser(true)
                }}
                disabled={isEditingUser && !canSaveEdit}
              >
                <EditIcon className={styles.editIcon} aria-hidden="true" />
                {isEditingUser ? 'Save Changes' : 'Edit'}
              </button>
              <button type="button" className={styles.viewDeleteButton} onClick={promptDeleteUser}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteUser && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Delete confirmation">
          <div className={`${styles.modal} ${styles.confirmModal}`}>
            <h3 className={styles.modalTitle}>Delete User</h3>
            <p className={styles.confirmMessage}>
              Are you sure you want to delete {pendingDeleteUser.firstName} {pendingDeleteUser.lastName}?
            </p>

            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelButton} onClick={closeDeleteConfirmModal}>
                Cancel
              </button>
              <button type="button" className={styles.deleteButton} onClick={confirmDeleteUser}>
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
