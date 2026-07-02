"use client"

import { useEffect, useMemo, useState } from 'react'
import { HiOutlineCalendarDays as ActivityIcon, HiOutlinePencilSquare as EditIcon } from 'react-icons/hi2'
import { apiClient } from '@/lib/apiClient'
import { notify } from '@/lib/notify'
import styles from './hoa-announcements.module.css'

const EMPTY_FORM = {
  title: '',
  details: '',
  eventDate: '',
  imageNames: [],
  pictureId: '',
  imageUrl: ''
}

const PAGE_SIZE = 10

const formatDate = (value) => {
  if (!value) {
    return '-'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat('en-PH', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(parsed)
}

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Failed to read image file.'))
    reader.readAsDataURL(file)
  })

const formatReporter = (user) => {
  if (!user) {
    return ''
  }

  const firstName = String(user.first_name || '').trim()
  const lastName = String(user.last_name || '').trim()
  const fullName = `${firstName} ${lastName}`.trim()

  if (fullName) {
    return fullName
  }

  return String(user.email || '').trim()
}

const mapActivity = (activity = {}) => ({
  id: String(activity._id || ''),
  title: String(activity.title || '-'),
  details: String(activity.content || ''),
  reporter: formatReporter(activity.users?._id),
  location: '',
  postedDate: activity.createdAt || activity.date || null,
  eventDate: activity.date || null,
  images: activity.pictures?._id?.path ? [String(activity.pictures._id.path)] : [],
  pictureId: activity.pictures?._id?._id ? String(activity.pictures._id._id) : '',
  archived: Boolean(activity.archived)
})

export default function HOAActivitiesPage() {
  const [activities, setActivities] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [isEditingActivity, setIsEditingActivity] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [archivedPage, setArchivedPage] = useState(1)

  const [form, setForm] = useState(EMPTY_FORM)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const sortedActivities = useMemo(
    () =>
      [...activities]
        .filter((activity) => !activity.archived)
        .sort((a, b) => new Date(b.postedDate || 0).getTime() - new Date(a.postedDate || 0).getTime()),
    [activities]
  )

  const archivedActivities = useMemo(
    () =>
      [...activities]
        .filter((activity) => activity.archived)
        .sort((a, b) => new Date(b.postedDate || 0).getTime() - new Date(a.postedDate || 0).getTime()),
    [activities]
  )

  const totalPages = Math.max(Math.ceil(sortedActivities.length / PAGE_SIZE), 1)
  const pagedActivities = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return sortedActivities.slice(start, start + PAGE_SIZE)
  }, [currentPage, sortedActivities])

  const archivedTotalPages = Math.max(Math.ceil(archivedActivities.length / PAGE_SIZE), 1)
  const pagedArchivedActivities = useMemo(() => {
    const start = (archivedPage - 1) * PAGE_SIZE
    return archivedActivities.slice(start, start + PAGE_SIZE)
  }, [archivedActivities, archivedPage])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    if (archivedPage > archivedTotalPages) {
      setArchivedPage(archivedTotalPages)
    }
  }, [archivedPage, archivedTotalPages])

  const loadActivities = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.get('/activities')
      const raw = Array.isArray(response?.data) ? response.data : []
      setActivities(raw.map(mapActivity))
    } catch (error) {
      notify.error({
        title: 'Failed to Load Activities',
        description: error.message || 'Unable to fetch HOA Announcements.'
      })
      setActivities([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadActivities()
  }, [])

  const openCreateModal = () => {
    setForm(EMPTY_FORM)
    setIsCreateModalOpen(true)
  }

  const closeCreateModal = () => {
    setIsCreateModalOpen(false)
    setForm(EMPTY_FORM)
  }

  const openArchivedModal = () => {
    setIsArchivedModalOpen(true)
  }

  const closeArchivedModal = () => {
    setIsArchivedModalOpen(false)
  }

  const openActivityModal = (activity) => {
    setSelectedActivity(activity)
    setEditForm({
      title: activity.title,
      details: activity.details,
      eventDate: activity.eventDate ? String(activity.eventDate).slice(0, 10) : '',
      imageNames: [],
      pictureId: activity.pictureId || '',
      imageUrl: activity.images?.[0] || ''
    })
    setIsEditingActivity(false)
  }

  const closeActivityModal = () => {
    setSelectedActivity(null)
    setIsEditingActivity(false)
    setEditForm(EMPTY_FORM)
  }

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const uploadActivityImage = async (file, target = 'create') => {
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

    setIsUploadingImage(true)

    try {
      const dataUrl = await readFileAsDataUrl(file)
      const response = await apiClient.post('/activities/upload-photo', {
        imageDataUrl: dataUrl,
        fileName: file.name,
        mimeType: file.type
      })

      const uploaded = response?.data
      const nextValues = {
        imageNames: [String(uploaded?.filename || file.name || 'Uploaded image')],
        pictureId: String(uploaded?._id || ''),
        imageUrl: String(uploaded?.path || '')
      }

      if (target === 'create') {
        setForm((prev) => ({ ...prev, ...nextValues }))
      } else {
        setEditForm((prev) => ({ ...prev, ...nextValues }))
      }

      notify.success({
        title: 'Image Uploaded',
        description: 'Activity image uploaded successfully.'
      })
    } catch (error) {
      notify.error({
        title: 'Image Upload Failed',
        description: error.message || 'Unable to upload activity image.'
      })
    } finally {
      setIsUploadingImage(false)
    }
  }

  const createActivity = async () => {
    if (isSaving) return
    if (!form.title.trim() || !form.details.trim()) {
      notify.error({
        title: 'Missing Required Details',
        description: 'Please provide an activity title and details.'
      })
      return
    }

    try {
      setIsSaving(true)
      const payload = {
        title: form.title.trim(),
        content: form.details.trim(),
        date: form.eventDate || undefined
      }

      if (form.pictureId) {
        payload['pictures._id'] = form.pictureId
      }

      const response = await apiClient.post('/activities', payload)
      const created = mapActivity(response?.data)
      setActivities((prev) => [created, ...prev])

      notify.success({
        title: 'Activity Posted',
        description: 'The new HOA activity has been added successfully.'
      })
      closeCreateModal()
    } catch (error) {
      notify.error({
        title: 'Post Failed',
        description: error.message || 'Unable to post activity.'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const saveActivityEdits = async () => {
    if (isSaving) return
    if (!selectedActivity || !editForm.title.trim() || !editForm.details.trim()) {
      notify.error({
        title: 'Missing Required Details',
        description: 'Title and details are required before saving changes.'
      })
      return
    }

    try {
      setIsSaving(true)
      const payload = {
        title: editForm.title.trim(),
        content: editForm.details.trim(),
        date: editForm.eventDate || null,
        'pictures._id': editForm.pictureId || null
      }

      const response = await apiClient.put(`/activities/${selectedActivity.id}`, payload)
      const updated = mapActivity(response?.data)

      setActivities((prev) => prev.map((activity) => (activity.id === updated.id ? updated : activity)))
      setSelectedActivity(updated)
      setIsEditingActivity(false)

      notify.success({
        title: 'Activity Updated',
        description: 'Activity details were saved successfully.'
      })
    } catch (error) {
      notify.error({
        title: 'Update Failed',
        description: error.message || 'Unable to save activity changes.'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const promptArchiveActivity = (activity) => {
    setConfirmAction({ type: 'archive', activity })
  }

  const promptUnarchiveActivity = (activity) => {
    setConfirmAction({ type: 'unarchive', activity })
  }

  const closeConfirmAction = () => {
    setConfirmAction(null)
  }

  const runArchiveAction = async () => {
    if (isSaving) return
    if (!confirmAction?.activity?.id) {
      return
    }

    const shouldArchive = confirmAction.type === 'archive'

    try {
      setIsSaving(true)
      const response = await apiClient.put(`/activities/${confirmAction.activity.id}`, {
        archived: shouldArchive
      })

      const updated = mapActivity(response?.data)
      setActivities((prev) => prev.map((activity) => (activity.id === updated.id ? updated : activity)))

      if (shouldArchive) {
        setSelectedActivity(null)
      }

      notify.success({
        title: shouldArchive ? 'Activity Archived' : 'Activity Restored',
        description: shouldArchive
          ? 'The activity has been moved to archived records.'
          : 'The activity has been restored to recent activities.'
      })

      closeConfirmAction()
    } catch (error) {
      notify.error({
        title: shouldArchive ? 'Archive Failed' : 'Restore Failed',
        description: error.message || 'Unable to update activity archive status.'
      })
    } finally {
      setIsSaving(false)
    }
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
            <h1 className={styles.bannerTitle}>HOA Announcements</h1>
            <p className={styles.bannerSubtitle}>
              Post, track, and manage community activities and events.
            </p>
          </div>
          <div className={styles.bannerVisual} aria-hidden="true">
            <div className={styles.bannerLogoBg} />
          </div>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={styles.recordButton} onClick={openCreateModal}>
            <ActivityIcon className={styles.recordButtonIcon} aria-hidden="true" />
            Record New Activity
          </button>

          <button type="button" className={styles.archivedButton} onClick={openArchivedModal}>
            Archived
          </button>
        </div>

        <section className={styles.listModal}>
          <div className={styles.listModalHeader}>
            <h2 className={styles.listTitle}>Recent HOA Announcements</h2>
            <p className={styles.listSubtitle}>Tap any activity card to view full details and edit information.</p>
          </div>

          <div className={styles.activityList}>
            {isLoading ? (
              <div className={styles.emptyState}>Loading activities...</div>
            ) : sortedActivities.length === 0 ? (
              <div className={styles.emptyState}>No activities posted yet.</div>
            ) : (
              pagedActivities.map((activity) => (
                <button
                  type="button"
                  key={activity.id}
                  className={styles.activityMiniModal}
                  onClick={() => openActivityModal(activity)}
                >
                  <div className={styles.activityTopRow}>
                    <h3 className={styles.activityTitle}>{activity.title}</h3>
                  </div>

                  <p className={styles.activityDetails}>{activity.details}</p>
                  <p className={styles.activityMetaLine}>
                    <span className={styles.metaLabel}>Date Posted:</span> {formatDate(activity.postedDate)}
                  </p>
                  <p className={styles.activityMetaLine}>
                    <span className={styles.metaLabel}>Posted By:</span> {activity.reporter || '-'}
                  </p>
                </button>
              ))
            )}
          </div>

          {sortedActivities.length > 0 ? (
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
        </section>

      </div>

      {isCreateModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Log New Activity</h2>
            <p className={styles.modalLead}>Track recent HOA activity</p>

            <label className={styles.fieldLabel}>Activity Title</label>
            <input
              type="text"
              className={styles.input}
              value={form.title}
              onChange={(event) => handleFormChange('title', event.target.value)}
              placeholder="Enter activity title"
            />

            <label className={styles.fieldLabel}>Details</label>
            <textarea
              className={styles.textarea}
              value={form.details}
              onChange={(event) => handleFormChange('details', event.target.value)}
              placeholder="Write the activity details"
            />

            <div className={styles.formGrid}>
              <div>
                <label className={styles.fieldLabel}>Event Date</label>
                <input
                  type="date"
                  className={styles.input}
                  value={form.eventDate}
                  onChange={(event) => handleFormChange('eventDate', event.target.value)}
                />
              </div>
            </div>

            <label className={styles.fieldLabel}>Upload Images</label>
            <label className={styles.uploadBox}>
              <input
                type="file"
                className={styles.hiddenInput}
                onChange={(event) => uploadActivityImage(event.target.files?.[0], 'create')}
                accept="image/*"
              />
              <span className={styles.uploadPlus}>+</span>
              <span>{isUploadingImage ? 'Uploading...' : 'Add Photo'}</span>
              {form.imageNames.length > 0 && (
                <span className={styles.fileName}>{`${form.imageNames[0]}`}</span>
              )}
            </label>

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={closeCreateModal} disabled={isSaving}>
                Cancel
              </button>
              <button type="button" className={styles.primaryButton} onClick={createActivity} disabled={isSaving}>
                {isSaving ? 'Posting...' : 'Post Activity'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedActivity && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>{isEditingActivity ? 'Edit Activity' : selectedActivity.title}</h2>
                <p className={styles.modalLead}>Posted: {formatDate(selectedActivity.postedDate)}</p>
              </div>

              <button type="button" className={styles.closeButton} onClick={closeActivityModal} aria-label="Close">
                x
              </button>
            </div>

            {isEditingActivity ? (
              <>
                <label className={styles.fieldLabel}>Activity Title</label>
                <input
                  type="text"
                  className={styles.input}
                  value={editForm.title}
                  onChange={(event) => handleEditFormChange('title', event.target.value)}
                />

                <label className={styles.fieldLabel}>Details</label>
                <textarea
                  className={styles.textarea}
                  value={editForm.details}
                  onChange={(event) => handleEditFormChange('details', event.target.value)}
                />

                <div className={styles.formGrid}>
                  <div>
                    <label className={styles.fieldLabel}>Event Date</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={editForm.eventDate}
                      onChange={(event) => handleEditFormChange('eventDate', event.target.value)}
                    />
                  </div>
                </div>

                <label className={styles.fieldLabel}>Update Image</label>
                <label className={styles.uploadBox}>
                  <input
                    type="file"
                    className={styles.hiddenInput}
                    onChange={(event) => uploadActivityImage(event.target.files?.[0], 'edit')}
                    accept="image/*"
                  />
                  <span className={styles.uploadPlus}>+</span>
                  <span>{isUploadingImage ? 'Uploading...' : 'Change Photo'}</span>
                  {editForm.imageNames.length > 0 && <span className={styles.fileName}>{editForm.imageNames[0]}</span>}
                </label>

                <div className={styles.modalActions}>
                  <button type="button" className={styles.secondaryButton} onClick={() => setIsEditingActivity(false)} disabled={isSaving}>
                    Cancel
                  </button>
                  <button type="button" className={styles.primaryButton} onClick={saveActivityEdits} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={styles.detailsCard}>
                  <p className={styles.detailsText}>{selectedActivity.details}</p>
                  <p className={styles.metaText}>Event Date: {formatDate(selectedActivity.eventDate)}</p>
                  {selectedActivity.images.length > 0 ? (
                    <img src={selectedActivity.images[0]} alt={selectedActivity.title} className={styles.previewImage} />
                  ) : null}
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => promptArchiveActivity(selectedActivity)}
                  >
                    Archive
                  </button>
                  <button type="button" className={styles.primaryButton} onClick={() => setIsEditingActivity(true)}>
                    <EditIcon className={styles.editIcon} aria-hidden="true" />
                    Edit Activity
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isArchivedModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>Archived Activities</h2>
                <p className={styles.modalLead}>Review archived activities and restore when needed</p>
              </div>

              <button type="button" className={styles.closeButton} onClick={closeArchivedModal} aria-label="Close">
                x
              </button>
            </div>

            <div className={styles.archivedList}>
              {archivedActivities.length === 0 ? (
                <div className={styles.emptyState}>No archived activities found.</div>
              ) : (
                pagedArchivedActivities.map((activity) => (
                  <div key={activity.id} className={styles.archivedItem}>
                    <div>
                      <h3 className={styles.activityTitle}>{activity.title}</h3>
                      <p className={styles.activityDetails}>{activity.details}</p>
                      <p className={styles.activityMetaLine}>
                        <span className={styles.metaLabel}>Date Posted:</span> {formatDate(activity.postedDate)}
                      </p>
                      <p className={styles.activityMetaLine}>
                        <span className={styles.metaLabel}>Posted By:</span> {activity.reporter || '-'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() => promptUnarchiveActivity(activity)}
                    >
                      Unarchive
                    </button>
                  </div>
                ))
              )}
            </div>

            {archivedActivities.length > 0 ? (
              <div className={styles.pagination}>
                <button
                  type="button"
                  className={styles.pageButton}
                  onClick={() => setArchivedPage((prev) => Math.max(prev - 1, 1))}
                  disabled={archivedPage === 1}
                >
                  Prev
                </button>
                <span className={styles.pageInfo}>Page {archivedPage} of {archivedTotalPages}</span>
                <button
                  type="button"
                  className={styles.pageButton}
                  onClick={() => setArchivedPage((prev) => Math.min(prev + 1, archivedTotalPages))}
                  disabled={archivedPage === archivedTotalPages}
                >
                  Next
                </button>
              </div>
            ) : null}

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={closeArchivedModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} ${styles.confirmModal}`}>
            <h2 className={styles.confirmTitle}>
              {confirmAction.type === 'archive' ? 'Archive Activity' : 'Unarchive Activity'}
            </h2>
            <p className={styles.modalLead}>
              {confirmAction.type === 'archive'
                ? `Are you sure you want to archive "${confirmAction.activity.title}"?`
                : `Are you sure you want to unarchive "${confirmAction.activity.title}"?`}
            </p>

            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={closeConfirmAction} disabled={isSaving}>
                Cancel
              </button>
              <button type="button" className={styles.primaryButton} onClick={runArchiveAction} disabled={isSaving}>
                {isSaving ? 'Confirming...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
