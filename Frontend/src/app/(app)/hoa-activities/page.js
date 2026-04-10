"use client"

import { useMemo, useState } from 'react'
import { HiOutlineCalendarDays as ActivityIcon, HiOutlinePencilSquare as EditIcon } from 'react-icons/hi2'
import { notify } from '@/lib/notify'
import styles from './hoa-activities.module.css'

const INITIAL_ACTIVITIES = [
  {
    id: 101,
    title: 'Water Leak - Unit 101',
    reporter: 'Juan Dela Cruz',
    location: 'Unit 101 Bathroom',
    details: 'Reported a persistent water leak under the sink. Technician inspection requested.',
    postedDate: '2026-04-08',
    eventDate: '2026-04-08',
    images: []
  },
  {
    id: 102,
    title: 'Noise Complaint - Unit 203',
    reporter: 'Maria Reyes',
    location: 'Unit 203 Living Room',
    details: 'Loud music reported after 11pm. Requested reminder to follow quiet hours.',
    postedDate: '2026-04-07',
    eventDate: '2026-04-07',
    images: []
  },
  {
    id: 103,
    title: 'Broken Streetlight - Block B2',
    reporter: 'Security Patrol',
    location: 'B2 Road - near Lot 8',
    details: 'Streetlight not working; reported to maintenance for replacement.',
    postedDate: '2026-04-06',
    eventDate: '2026-04-06',
    images: []
  },
  {
    id: 104,
    title: 'Lost Pet - Unit 112',
    reporter: 'Anna Lopez',
    location: 'Near Clubhouse',
    details: 'Small brown dog lost. Last seen near the playground. Owner contacted security.',
    postedDate: '2026-04-05',
    eventDate: '2026-04-05',
    images: []
  },
]

const EMPTY_FORM = {
  title: '',
  details: '',
  eventDate: '',
  imageNames: []
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

export default function HOAActivitiesPage() {
  const [activities, setActivities] = useState(INITIAL_ACTIVITIES)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [isEditingActivity, setIsEditingActivity] = useState(false)

  const [form, setForm] = useState(EMPTY_FORM)
  const [editForm, setEditForm] = useState(EMPTY_FORM)

  const sortedActivities = useMemo(
    () => [...activities].sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()),
    [activities]
  )

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
      eventDate: activity.eventDate,
      imageNames: activity.images || []
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

  const createActivity = () => {
    if (!form.title.trim() || !form.details.trim()) {
      notify.error({
        title: 'Missing Required Details',
        description: 'Please provide an activity title and details.'
      })
      return
    }

    const newActivity = {
      id: Date.now(),
      title: form.title.trim(),
      details: form.details.trim(),
      postedDate: new Date().toISOString(),
      eventDate: form.eventDate,
      images: form.imageNames
    }

    setActivities((prev) => [newActivity, ...prev])
    notify.success({
      title: 'Activity Posted',
      description: 'The new HOA activity has been added successfully.'
    })
    closeCreateModal()
  }

  const saveActivityEdits = () => {
    if (!selectedActivity || !editForm.title.trim() || !editForm.details.trim()) {
      notify.error({
        title: 'Missing Required Details',
        description: 'Title and details are required before saving changes.'
      })
      return
    }

    const updated = {
      ...selectedActivity,
      title: editForm.title.trim(),
      details: editForm.details.trim(),
      eventDate: editForm.eventDate,
      images: selectedActivity.images
    }

    setActivities((prev) => prev.map((activity) => (activity.id === updated.id ? updated : activity)))
    setSelectedActivity(updated)
    setIsEditingActivity(false)
    notify.success({
      title: 'Activity Updated',
      description: 'Activity details were saved successfully.'
    })
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
          {sortedActivities.length === 0 ? (
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
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files || []).map((file) => file.name)
                  handleFormChange('imageNames', files)
                }}
                accept="image/*"
              />
              <span className={styles.uploadPlus}>+</span>
              <span>Add Photos</span>
              {form.imageNames.length > 0 && (
                <span className={styles.fileName}>{`${form.imageNames.length} image(s) selected`}</span>
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
