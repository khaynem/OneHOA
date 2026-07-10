'use client'

import { useEffect, useMemo, useState } from 'react'
import { HiOutlinePencilSquare as EditIcon } from 'react-icons/hi2'
import { apiClient, offlineApiClient } from '@/lib/apiClient'
import { notify } from '@/lib/notify'
import styles from './account-management.module.css'

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'officer',
  status: 'active'
}

const ROLE_OPTIONS = [
  { label: 'Admin', value: 'admin' },
  { label: 'President', value: 'president' },
  { label: 'Officer', value: 'officer' }
]

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' }
]

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

const mapApiUserToUi = (user = {}) => ({
  id: String(user.id || user._id || ''),
  firstName: String(user.first_name || ''),
  lastName: String(user.last_name || ''),
  email: String(user.email || ''),
  role: String(user.role || 'officer').toLowerCase(),
  status: String(user.status || 'active').toLowerCase(),
})

const roleLabel = (value) => ROLE_OPTIONS.find((item) => item.value === value)?.label || value
const statusLabel = (value) => STATUS_OPTIONS.find((item) => item.value === value)?.label || value

export default function AccountManagementClient() {
  const [users, setUsers] = useState([])
  const [searchText, setSearchText] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditingUser, setIsEditingUser] = useState(false)
  const [editForm, setEditForm] = useState(null)
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const temporaryPassword = useMemo(() => toTempPassword(form.lastName), [form.lastName])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.get('/users')
      const records = Array.isArray(response?.data) ? response.data : []
      setUsers(records.map(mapApiUserToUi))
    } catch (error) {
      notify.error(error.message || 'Unable to load user accounts.')
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

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
    ROLE_OPTIONS.some((role) => role.value === form.role) &&
    temporaryPassword

  const canSaveEdit =
    normalizeNamePart(editForm?.firstName) &&
    normalizeNamePart(editForm?.lastName) &&
    /^\S+@\S+\.\S+$/.test(String(editForm?.email || '').trim()) &&
    ROLE_OPTIONS.some((role) => role.value === editForm?.role) &&
    STATUS_OPTIONS.some((status) => status.value === editForm?.status)

  const addUser = async () => {
    if (isSaving) return
    if (!canSubmit) {
      return
    }

    try {
      setIsSaving(true)
      const response = await offlineApiClient.post('/users', {
        first_name: normalizeNamePart(form.firstName),
        last_name: normalizeNamePart(form.lastName),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        status: form.status,
        password: temporaryPassword,
      }, {
        metadata: {
          type: 'create-user',
          label: `Creating user: ${form.firstName} ${form.lastName} (${form.role})`
        }
      })

      const createdUser = mapApiUserToUi(response?.data)
      setUsers((prev) => [createdUser, ...prev])
      notify.success('User account created successfully.')
      closeModal()
    } catch (error) {
      if (error.isOffline) {
        notify.info({
          title: 'Saved Offline',
          description: "Saved offline. Your changes will be submitted automatically when you're back online."
        })
        closeModal()
      } else {
        notify.error(error.message || 'Unable to create user account.')
      }
    } finally {
      setIsSaving(false)
    }
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

  const saveUserEdits = async () => {
    if (isSaving) return
    if (!selectedUser || !canSaveEdit) {
      return
    }

    try {
      setIsSaving(true)
      const response = await offlineApiClient.put(`/users/${selectedUser.id}`, {
        first_name: normalizeNamePart(editForm.firstName),
        last_name: normalizeNamePart(editForm.lastName),
        email: editForm.email.trim().toLowerCase(),
        role: editForm.role,
        status: editForm.status
      }, {
        metadata: {
          type: 'update-user',
          label: `Updating user: ${editForm.firstName} ${editForm.lastName}`
        }
      })

      const updatedUser = mapApiUserToUi(response?.data)

      setUsers((prev) =>
        prev.map((user) => {
          if (user.id !== selectedUser.id) {
            return user
          }

          return updatedUser
        })
      )

      setIsEditingUser(false)
      setSelectedUserId(updatedUser.id)
      notify.success('User account updated successfully.')
    } catch (error) {
      if (error.isOffline) {
        notify.info({
          title: 'Saved Offline',
          description: "Saved offline. Your changes will be submitted automatically when you're back online."
        })
        setIsEditingUser(false)
      } else {
        notify.error(error.message || 'Unable to update user account.')
      }
    } finally {
      setIsSaving(false)
    }
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

  const confirmDeleteUser = async () => {
    if (isSaving) return
    if (!pendingDeleteUserId) {
      return
    }

    const pendingDeleteUser = users.find((user) => user.id === pendingDeleteUserId)

    try {
      setIsSaving(true)
      await offlineApiClient.delete(`/users/${pendingDeleteUserId}`, {
        metadata: {
          type: 'delete-user',
          label: `Deleting user: ${pendingDeleteUser?.firstName || 'User'} ${pendingDeleteUser?.lastName || ''}`
        }
      })
      setUsers((prev) => prev.filter((user) => user.id !== pendingDeleteUserId))

      if (selectedUserId === pendingDeleteUserId) {
        closeViewModal()
      }

      setPendingDeleteUserId(null)
      notify.success('User account deleted successfully.')
    } catch (error) {
      if (error.isOffline) {
        notify.info({
          title: 'Saved Offline',
          description: "Saved offline. Your changes will be submitted automatically when you're back online."
        })
        setPendingDeleteUserId(null)
        if (selectedUserId === pendingDeleteUserId) {
          closeViewModal()
        }
      } else {
        notify.error(error.message || 'Unable to delete user account.')
      }
    } finally {
      setIsSaving(false)
    }
  }

  const pendingDeleteUser = users.find((user) => user.id === pendingDeleteUserId)

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
            <h1 className={styles.bannerTitle}>Account Management</h1>
            <p className={styles.bannerSubtitle}>
              Create, edit, and manage user accounts for the HOA system officers and administrators.
            </p>
          </div>
          <div className={styles.bannerVisual} aria-hidden="true">
            <div className={styles.bannerLogoBg} />
          </div>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={styles.addButton} onClick={() => setIsAddModalOpen(true)}>
            <span className={styles.addIcon}>+</span>
            Add User
          </button>
        </div>

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
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
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
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className={styles.emptyRow}>
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
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
                      <td>{roleLabel(user.role)}</td>
                      <td>
                        <span
                          className={`${styles.statusPill} ${user.status === 'active' ? styles.statusActive : styles.statusInactive
                            }`}
                        >
                          {statusLabel(user.status)}
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

      </div>

      {isAddModalOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Add user">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Add New User</h2>
              <button type="button" className={styles.closeButton} onClick={closeModal} aria-label="Close">
                ✕
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
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelButton} onClick={closeModal} disabled={isSaving}>
                Cancel
              </button>
              <button type="button" className={styles.confirmButton} onClick={addUser} disabled={!canSubmit || isSaving}>
                {isSaving ? 'Adding...' : 'Add User'}
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
                ✕
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
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className={styles.detailValue}>{roleLabel(selectedUser.role)}</p>
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
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className={styles.detailValue}>{statusLabel(selectedUser.status)}</p>
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
                disabled={(isEditingUser && !canSaveEdit) || isSaving}
              >
                <EditIcon className={styles.editIcon} aria-hidden="true" />
                {isEditingUser ? (isSaving ? 'Saving...' : 'Save Changes') : 'Edit'}
              </button>
              <button type="button" className={styles.viewDeleteButton} onClick={promptDeleteUser} disabled={isSaving}>
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
              <button type="button" className={styles.cancelButton} onClick={closeDeleteConfirmModal} disabled={isSaving}>
                Cancel
              </button>
              <button type="button" className={styles.deleteButton} onClick={confirmDeleteUser} disabled={isSaving}>
                {isSaving ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
