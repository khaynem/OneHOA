"use client"

import { useEffect, useMemo, useState } from 'react'
import { HiOutlineCalendarDays as AnnouncementIcon, HiOutlinePencilSquare as EditIcon } from 'react-icons/hi2'
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

const mapAnnouncement = (announcement = {}) => ({
  id: String(announcement._id || ''),
  title: String(announcement.title || '-'),
  details: String(announcement.content || ''),
  reporter: formatReporter(announcement.users?._id),
  location: '',
  postedDate: announcement.createdAt || announcement.date || null,
  eventDate: announcement.date || null,
  images: announcement.pictures?._id?.path ? [String(announcement.pictures._id.path)] : [],
  pictureId: announcement.pictures?._id?._id ? String(announcement.pictures._id._id) : '',
  archived: Boolean(announcement.archived)
})

export default function HOAAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isArchivedModalOpen, setIsArchivedModalOpen] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null)
  const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [archivedPage, setArchivedPage] = useState(1)

  const [form, setForm] = useState(EMPTY_FORM)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const sortedAnnouncements = useMemo(
    () =>
      [...announcements]
        .filter((announcement) => !announcement.archived)
        .sort((a, b) => new Date(b.postedDate || 0).getTime() - new Date(a.postedDate || 0).getTime()),
    [announcements]
  )

  const archivedAnnouncements = useMemo(
    () =>
      [...announcements]
        .filter((announcement) => announcement.archived)
        .sort((a, b) => new Date(b.postedDate || 0).getTime() - new Date(a.postedDate || 0).getTime()),
    [announcements]
  )

  const totalPages = Math.max(Math.ceil(sortedAnnouncements.length / PAGE_SIZE), 1)
  const pagedAnnouncements = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return sortedAnnouncements.slice(start, start + PAGE_SIZE)
  }, [currentPage, sortedAnnouncements])

  const archivedTotalPages = Math.max(Math.ceil(archivedAnnouncements.length / PAGE_SIZE), 1)
  const pagedArchivedAnnouncements = useMemo(() => {
    const start = (archivedPage - 1) * PAGE_SIZE
    return archivedAnnouncements.slice(start, start + PAGE_SIZE)
  }, [archivedAnnouncements, archivedPage])

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

  const loadAnnouncements = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.get('/activities')
      const raw = Array.isArray(response?.data) ? response.data : []
      setAnnouncements(raw.map(mapAnnouncement))
    } catch (error) {
      notify.error({
        title: 'Failed to Load Announcements',
        description: error.message || 'Unable to fetch HOA Announcements.'
      })
      setAnnouncements([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAnnouncements()
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

  const openAnnouncementModal = (announcement) => {
    setSelectedAnnouncement(announcement)
    setEditForm({
      title: announcement.title,
      details: announcement.details,
      eventDate: announcement.eventDate ? String(announcement.eventDate).slice(0, 10) : '',
      imageNames: [],
      pictureId: announcement.pictureId || '',
      imageUrl: announcement.images?.[0] || ''
    })
    setIsEditingAnnouncement(false)
  }

  const closeAnnouncementModal = () => {
    setSelectedAnnouncement(null)
    setIsEditingAnnouncement(false)
    setEditForm(EMPTY_FORM)
  }

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleEditFormChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  const uploadAnnouncementImage = async (file, target = 'create') => {
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
        description: 'Announcement image uploaded successfully.'
      })
    } catch (error) {
      notify.error({
        title: 'Image Upload Failed',
        description: error.message || 'Unable to upload announcement image.'
      })
    } finally {
      setIsUploadingImage(false)
    }
  }

  const createAnnouncement = async () => {
    if (isSaving) return
    if (!form.title.trim() || !form.details.trim()) {
      notify.error({
        title: 'Missing Required Details',
        description: 'Please provide an announcement title and details.'
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
      const created = mapAnnouncement(response?.data)
      setAnnouncements((prev) => [created, ...prev])

      notify.success({
        title: 'Announcement Posted',
        description: 'The new HOA announcement has been added successfully.'
      })
      closeCreateModal()
    } catch (error) {
      notify.error({
        title: 'Post Failed',
        description: error.message || 'Unable to post announcement.'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const saveAnnouncementEdits = async () => {
    if (isSaving) return
    if (!selectedAnnouncement || !editForm.title.trim() || !editForm.details.trim()) {
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

      const response = await apiClient.put(`/activities/${selectedAnnouncement.id}`, payload)
      const updated = mapAnnouncement(response?.data)

      setAnnouncements((prev) => prev.map((announcement) => (announcement.id === updated.id ? updated : announcement)))
      setSelectedAnnouncement(updated)
      setIsEditingAnnouncement(false)

      notify.success({
        title: 'Announcement Updated',
        description: 'Announcement details were saved successfully.'
      })
    } catch (error) {
      notify.error({
        title: 'Update Failed',
        description: error.message || 'Unable to save announcement changes.'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const promptArchiveAnnouncement = (announcement) => {
    setConfirmAction({ type: 'archive', announcement })
  }

  const promptUnarchiveAnnouncement = (announcement) => {
    setConfirmAction({ type: 'unarchive', announcement })
  }

  const closeConfirmAction = () => {
    setConfirmAction(null)
  }

  const runArchiveAction = async () => {
    if (isSaving) return
    if (!confirmAction?.announcement?.id) {
      return
    }

    const shouldArchive = confirmAction.type === 'archive'

    try {
      setIsSaving(true)
      const response = await apiClient.put(`/activities/${confirmAction.announcement.id}`, {
        archived: shouldArchive
      })

      const updated = mapAnnouncement(response?.data)
      setAnnouncements((prev) => prev.map((announcement) => (announcement.id === updated.id ? updated : announcement)))

      if (shouldArchive) {
        setSelectedAnnouncement(null)
      }

      notify.success({
        title: shouldArchive ? 'Announcement Archived' : 'Announcement Restored',
        description: shouldArchive
          ? 'The announcement has been moved to archived records.'
          : 'The announcement has been restored to recent announcements.'
      })

      closeConfirmAction()
    } catch (error) {
      notify.error({
        title: shouldArchive ? 'Archive Failed' : 'Restore Failed',
        description: error.message || 'Unable to update announcement archive status.'
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
              Post, track, and manage community announcements and events.
            </p>
          </div>
          <div className={styles.bannerVisual} aria-hidden="true">
            <div className={styles.bannerLogoBg} />
          </div>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={styles.recordButton} onClick={openCreateModal}>
            <AnnouncementIcon className={styles.recordButtonIcon} aria-hidden="true" />
            Post New Announcement
          </button>

          <button type="button" className={styles.archivedButton} onClick={openArchivedModal}>
            Archived
          </button>
        </div>

        <section className={styles.listModal}>
          <div className={styles.listModalHeader}>
            <h2 className={styles.listTitle}>Recent HOA Announcements</h2>
            <p className={styles.listSubtitle}>Tap any announcement card to view full details and edit information.</p>
          </div>

          <div className={styles.activityList}>
            {isLoading ? (
              <div className={styles.emptyState}>Loading announcements...</div>
            ) : sortedAnnouncements.length === 0 ? (
              <div className={styles.emptyState}>No announcements posted yet.</div>
            ) : (
              pagedAnnouncements.map((announcement) => (
                <button
                  type="button"
                  key={announcement.id}
                  className={styles.activityMiniModal}
                  onClick={() => openAnnouncementModal(announcement)}
                >
                  <div className={styles.activityTopRow}>
                    <h3 className={styles.activityTitle}>{announcement.title}</h3>
                  </div>

                  <p className={styles.activityDetails}>{announcement.details}</p>
                  <p className={styles.activityMetaLine}>
                    <span className={styles.metaLabel}>Date Posted:</span> {formatDate(announcement.postedDate)}
                  </p>
                  <p className={styles.activityMetaLine}>
                    <span className={styles.metaLabel}>Posted By:</span> {announcement.reporter || '-'}
                  </p>
                </button>
              ))
            )}
          </div>

          {sortedAnnouncements.length > 0 ? (
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
            <h2 className={styles.modalTitle}>Log New Announcement</h2>
            <p className={styles.modalLead}>Track recent HOA announcement</p>

            <label className={styles.fieldLabel}>Announcement Title</label>
            <input
              type="text"
              className={styles.input}
              value={form.title}
              onChange={(event) => handleFormChange('title', event.target.value)}
              placeholder="Enter announcement title"
            />

            <label className={styles.fieldLabel}>Details</label>
            <textarea
              className={styles.textarea}
              value={form.details}
              onChange={(event) => handleFormChange('details', event.target.value)}
              placeholder="Write the announcement details"
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
                onChange={(event) => uploadAnnouncementImage(event.target.files?.[0], 'create')}
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
              <button type="button" className={styles.primaryButton} onClick={createAnnouncement} disabled={isSaving}>
                {isSaving ? 'Posting...' : 'Post Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedAnnouncement && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h2 className={styles.modalTitle}>{isEditingAnnouncement ? 'Edit Announcement' : selectedAnnouncement.title}</h2>
                <p className={styles.modalLead}>Posted: {formatDate(selectedAnnouncement.postedDate)}</p>
              </div>

              <button type="button" className={styles.closeButton} onClick={closeAnnouncementModal} aria-label="Close">
                x
              </button>
            </div>

            {isEditingAnnouncement ? (
              <>
                <label className={styles.fieldLabel}>Announcement Title</label>
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
                    onChange={(event) => uploadAnnouncementImage(event.target.files?.[0], 'edit')}
                    accept="image/*"
                  />
                  <span className={styles.uploadPlus}>+</span>
                  <span>{isUploadingImage ? 'Uploading...' : 'Change Photo'}</span>
                  {editForm.imageNames.length > 0 && <span className={styles.fileName}>{editForm.imageNames[0]}</span>}
                </label>

                <div className={styles.modalActions}>
                  <button type="button" className={styles.secondaryButton} onClick={() => setIsEditingAnnouncement(false)} disabled={isSaving}>
                    Cancel
                  </button>
                  <button type="button" className={styles.primaryButton} onClick={saveAnnouncementEdits} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={styles.detailsCard}>
                  <p className={styles.detailsText}>{selectedAnnouncement.details}</p>
                  <p className={styles.metaText}>Event Date: {formatDate(selectedAnnouncement.eventDate)}</p>
                  {selectedAnnouncement.images.length > 0 ? (
                    <img
                      src={selectedAnnouncement.images[0]}
                      alt={selectedAnnouncement.title}
                      className={styles.previewImage}
                    />
                  ) : null}
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => promptArchiveAnnouncement(selectedAnnouncement)}
                  >
                    Archive
                  </button>
                  <button type="button" className={styles.primaryButton} onClick={() => setIsEditingAnnouncement(true)}>
                    <EditIcon className={styles.editIcon} aria-hidden="true" />
                    Edit Announcement
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
                <h2 className={styles.modalTitle}>Archived Announcements</h2>
                <p className={styles.modalLead}>Review archived announcements and restore when needed</p>
              </div>

              <button type="button" className={styles.closeButton} onClick={closeArchivedModal} aria-label="Close">
                x
              </button>
            </div>

            <div className={styles.archivedList}>
              {archivedAnnouncements.length === 0 ? (
                <div className={styles.emptyState}>No archived announcements found.</div>
              ) : (
                pagedArchivedAnnouncements.map((announcement) => (
                  <div key={announcement.id} className={styles.archivedItem}>
                    <div>
                      <h3 className={styles.activityTitle}>{announcement.title}</h3>
                      <p className={styles.activityDetails}>{announcement.details}</p>
                      <p className={styles.activityMetaLine}>
                        <span className={styles.metaLabel}>Date Posted:</span> {formatDate(announcement.postedDate)}
                      </p>
                      <p className={styles.activityMetaLine}>
                        <span className={styles.metaLabel}>Posted By:</span> {announcement.reporter || '-'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() => promptUnarchiveAnnouncement(announcement)}
                    >
                      Unarchive
                    </button>
                  </div>
                ))
              )}
            </div>

            {archivedAnnouncements.length > 0 ? (
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
              {confirmAction.type === 'archive' ? 'Archive Announcement' : 'Unarchive Announcement'}
            </h2>
            <p className={styles.modalLead}>
              {confirmAction.type === 'archive'
                ? `Are you sure you want to archive "${confirmAction.announcement.title}"?`
                : `Are you sure you want to unarchive "${confirmAction.announcement.title}"?`}
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
