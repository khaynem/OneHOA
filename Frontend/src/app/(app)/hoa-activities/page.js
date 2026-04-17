"use client"

import { useEffect, useMemo, useState } from 'react'
import { HiOutlineCalendarDays as ActivityIcon, HiOutlinePencilSquare as EditIcon } from 'react-icons/hi2'
import { apiClient } from '@/lib/apiClient'
import { notify } from '@/lib/notify'
import styles from './hoa-activities.module.css'

const EMPTY_FORM = {
  title: '',
  details: '',
  eventDate: '',
  imageNames: [],
  pictureId: '',
  imageUrl: ''
}

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

const mapActivity = (activity = {}) => ({
  id: String(activity._id || ''),
  title: String(activity.title || '-'),
  details: String(activity.content || ''),
  reporter: activity.users?._id?.email || '',
  location: '',
  postedDate: activity.createdAt || activity.date || null,
  eventDate: activity.date || null,
  images: activity.pictures?._id?.path ? [String(activity.pictures._id.path)] : [],
  pictureId: activity.pictures?._id?._id ? String(activity.pictures._id._id) : ''
})

export default function HOAActivitiesPage() {
  const [activities, setActivities] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [isEditingActivity, setIsEditingActivity] = useState(false)

  const [form, setForm] = useState(EMPTY_FORM)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const sortedActivities = useMemo(
    () => [...activities].sort((a, b) => new Date(b.postedDate || 0).getTime() - new Date(a.postedDate || 0).getTime()),
    [activities]
  )

  const loadActivities = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.get('/activities')
      const raw = Array.isArray(response?.data) ? response.data : []
      setActivities(raw.map(mapActivity))
    } catch (error) {
      notify.error({
        title: 'Failed to Load Activities',
        description: error.message || 'Unable to fetch HOA activities.'
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
    if (!form.title.trim() || !form.details.trim()) {
      notify.error({
        title: 'Missing Required Details',
        description: 'Please provide an activity title and details.'
      })
      return
    }

    try {
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
    }
  }

  const saveActivityEdits = async () => {
    if (!selectedActivity || !editForm.title.trim() || !editForm.details.trim()) {
      notify.error({
        title: 'Missing Required Details',
        description: 'Title and details are required before saving changes.'
      })
      return
    }

    try {
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
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.headerRow}>
        <div>
          <h1 className={styles.title}>HOA Activities</h1>
          <p className={styles.subtitle}>Post and track community activities and events</p>
        </div>

        <button type="button" className={styles.recordButton} onClick={openCreateModal}>
          <ActivityIcon className={styles.recordButtonIcon} aria-hidden="true" />
          Record New Activity
        </button>
      </section>

      <section className={styles.listModal}>
        <div className={styles.listModalHeader}>
          <h2 className={styles.listTitle}>Recent HOA Activities</h2>
          <p className={styles.listSubtitle}>Tap any activity card to view full details and edit information.</p>
        </div>

        <div className={styles.activityList}>
          {isLoading ? (
            <div className={styles.emptyState}>Loading activities...</div>
          ) : sortedActivities.length === 0 ? (
            <div className={styles.emptyState}>No activities posted yet.</div>
          ) : (
            sortedActivities.map((activity) => (
              <button
                type="button"
                key={activity.id}
                className={styles.activityMiniModal}
                onClick={() => openActivityModal(activity)}
              >
                <div className={styles.activityTopRow}>
                  <h3 className={styles.activityTitle}>{activity.title}</h3>
                </div>

                {activity.reporter || activity.location ? (
                  <p className={styles.activityMeta}>
                    {activity.reporter ? `${activity.reporter}` : ''}
                    {activity.reporter && activity.location ? ' • ' : ''}
                    {activity.location ? `${activity.location}` : ''}
                  </p>
                ) : null}

                <p className={styles.activityDetails}>{activity.details}</p>
                <p className={styles.postedDate}>Posted: {formatDate(activity.postedDate)}</p>
              </button>
            ))
          )}
        </div>
      </section>

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
              <button type="button" className={styles.secondaryButton} onClick={closeCreateModal}>
                Cancel
              </button>
              <button type="button" className={styles.primaryButton} onClick={createActivity}>
                Post Announcement
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
                  <button type="button" className={styles.secondaryButton} onClick={() => setIsEditingActivity(false)}>
                    Cancel
                  </button>
                  <button type="button" className={styles.primaryButton} onClick={saveActivityEdits}>
                    Save Changes
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
                  <button type="button" className={styles.secondaryButton} onClick={closeActivityModal}>
                    Close
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
    </main>
  )
}
