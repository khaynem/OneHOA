"use client"
import { useEffect, useState } from 'react'
import {
  FaSearch,
  FaCheck,
  FaTimes,
  FaEye,
  FaIdCard,
  FaSpinner,
  FaExclamationCircle
} from 'react-icons/fa'
import { apiClient } from '@/lib/apiClient'
import { notify } from '@/lib/notify'
import styles from './pending-registrations.module.css'

export default function PendingRegistrationsPage() {
  const [registrations, setRegistrations] = useState([])
  const [isLoadingRegs, setIsLoadingRegs] = useState(true)
  const [selectedReg, setSelectedReg] = useState(null)

  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('pending')

  const [declineReason, setDeclineReason] = useState('')
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [isProcessingAction, setIsProcessingAction] = useState(false)
  const [activeLightboxImage, setActiveLightboxImage] = useState(null)

  const fetchRegistrations = async () => {
    try {
      setIsLoadingRegs(true)
      const response = await apiClient.get('/pending-registrations')
      if (response?.success && Array.isArray(response?.data)) {
        setRegistrations(response.data)
      }
    } catch (error) {
      notify.error({
        title: 'Failed to Load Registrations',
        description: error.message || 'Unable to retrieve pending registrations.'
      })
    } finally {
      setIsLoadingRegs(false)
    }
  }

  useEffect(() => {
    fetchRegistrations()
  }, [])

  const filteredRegs = registrations.filter((reg) => {
    const q = searchText.trim().toLowerCase()
    const fullName = `${reg.first_name || ''} ${reg.middle_name || ''} ${reg.last_name || ''}`.toLowerCase()
    const phaseBlockLot = `phase ${reg.phase || ''} block ${reg.block || ''} lot ${reg.lot || ''}`.toLowerCase()

    const matchesSearch = fullName.includes(q) || phaseBlockLot.includes(q)
    const matchesStatus = statusFilter === 'all' ? true : reg.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleApprove = async () => {
    if (!selectedReg || isProcessingAction) return
    setIsProcessingAction(true)

    try {
      const response = await apiClient.patch(`/pending-registrations/${selectedReg._id}`, {
        action: 'approve'
      })

      if (response?.success) {
        notify.success({
          title: 'Registration Approved',
          description: `Successfully approved homeowner record for ${selectedReg.first_name} ${selectedReg.last_name}.`
        })
        fetchRegistrations()
        setSelectedReg(null)
        setShowApproveModal(false)
      }
    } catch (error) {
      notify.error({
        title: 'Approval Failed',
        description: error.message || 'Unable to approve homeowner registration.'
      })
    } finally {
      setIsProcessingAction(false)
    }
  }

  const handleDecline = async () => {
    if (!selectedReg || isProcessingAction) return
    if (!declineReason.trim()) {
      notify.error({
        title: 'Reason Required',
        description: 'Please provide a clear reason for declining this registration request.'
      })
      return
    }

    setIsProcessingAction(true)

    try {
      const response = await apiClient.patch(`/pending-registrations/${selectedReg._id}`, {
        action: 'decline',
        decline_reason: declineReason.trim()
      })

      if (response?.success) {
        notify.success({
          title: 'Registration Declined',
          description: `Declined registration request for ${selectedReg.first_name} ${selectedReg.last_name}.`
        })
        fetchRegistrations()
        setSelectedReg(null)
        setShowDeclineModal(false)
        setDeclineReason('')
      }
    } catch (error) {
      notify.error({
        title: 'Operation Failed',
        description: error.message || 'Unable to decline registration request.'
      })
    } finally {
      setIsProcessingAction(false)
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
            <h1 className={styles.bannerTitle}>Pending Registrations</h1>
            <p className={styles.bannerSubtitle}>
              Review residency credentials, verify Valid IDs, and approve homeowners.
            </p>
          </div>
          <div className={styles.bannerVisual} aria-hidden="true">
            <div className={styles.bannerLogoBg} />
          </div>
        </div>

        <div className={styles.dashboardContainer}>
          <div className={styles.listSection}>
            <div className={styles.controlsWrap}>
              <div className={styles.searchBox}>
                <FaSearch className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search by name, phase, block..."
                  className={styles.searchInput}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>

              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="pending">Show Pending Verification</option>
                <option value="approved">Show Approved</option>
                <option value="declined">Show Declined</option>
                <option value="all">Show All Requests</option>
              </select>
            </div>

            <div className={styles.tableWrap}>
              {isLoadingRegs ? (
                <div className={styles.loadingSpinner}>
                  <FaSpinner className={styles.spinner} />
                  <p>Retrieving registration requests...</p>
                </div>
              ) : filteredRegs.length === 0 ? (
                <div className={styles.emptyWrap}>
                  <p>No homeowner registration requests matching your filters.</p>
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Registrant</th>
                      <th>Address</th>
                      <th>Occupant Status</th>
                      <th>Submission Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRegs.map((reg) => {
                      const fullName = `${reg.first_name} ${reg.last_name}`
                      const addressStr = reg.phase ? `P${reg.phase} B${reg.block} L${reg.lot}` : '-'
                      const dateStr = new Date(reg.createdAt).toLocaleDateString('en-PH', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })

                      return (
                        <tr
                          key={reg._id}
                          className={`${styles.row} ${selectedReg?._id === reg._id ? styles.rowSelected : ''}`}
                          onClick={() => setSelectedReg(reg)}
                        >
                          <td>
                            <div className={styles.userCell}>
                              {reg.picture_id?.path ? (
                                <img src={reg.picture_id.path} alt="Avatar" className={styles.rowAvatar} />
                              ) : (
                                <div className={styles.rowAvatarPlaceholder}>
                                  {fullName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className={styles.rowName}>{fullName}</div>
                                <div className={styles.rowPhone}>{reg.phone_number || 'No Phone'}</div>
                              </div>
                            </div>
                          </td>
                          <td>{addressStr}</td>
                          <td>{reg.occupant_status || 'Owner'}</td>
                          <td>{dateStr}</td>
                          <td>
                            <span
                              className={`${styles.statusPill} ${reg.status === 'approved'
                                  ? styles.statusApproved
                                  : reg.status === 'declined'
                                    ? styles.statusDeclined
                                    : styles.statusPending
                                }`}
                            >
                              {reg.status}
                            </span>
                          </td>
                          <td>
                            <button className={styles.viewBtn}>
                              <FaEye /> View details
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className={`${styles.detailsSection} ${selectedReg ? styles.detailsActive : ''}`}>
            {selectedReg ? (
              <div className={styles.detailsCard}>
                <div className={styles.detailsHeader}>
                  <div className={styles.detailsAvatarWrap}>
                    {selectedReg.picture_id?.path ? (
                      <img src={selectedReg.picture_id.path} alt="Avatar" className={styles.detailAvatar} />
                    ) : (
                      <div className={styles.detailAvatarPlaceholder}>
                        {selectedReg.first_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h2 className={styles.detailName}>
                        {selectedReg.first_name} {selectedReg.middle_name ? `${selectedReg.middle_name} ` : ''}{selectedReg.last_name}
                      </h2>
                      <span className={styles.detailRole}>Registrant Applicant</span>
                    </div>
                  </div>

                  <div className={styles.detailsHeaderRight}>
                    <span
                      className={`${styles.statusBadge} ${selectedReg.status === 'approved'
                          ? styles.statusApproved
                          : selectedReg.status === 'declined'
                            ? styles.statusDeclined
                            : styles.statusPending
                        }`}
                    >
                      {selectedReg.status.toUpperCase()}
                    </span>
                    <button
                      type="button"
                      className={styles.closeDetailsBtn}
                      onClick={() => setSelectedReg(null)}
                      aria-label="Close details"
                    >
                      &times;
                    </button>
                  </div>
                </div>

                <div className={styles.detailsBody}>
                  {selectedReg.status === 'declined' && (
                    <div className={styles.declineBanner}>
                      <FaExclamationCircle />
                      <div>
                        <strong>Decline Reason:</strong> {selectedReg.decline_reason}
                      </div>
                    </div>
                  )}

                  <div className={styles.infoSectionTitle}>Residency Details</div>
                  <div className={styles.detailsGrid}>
                    <div>
                      <span className={styles.detailLabel}>Address</span>
                      <span className={styles.detailValue}>
                        {selectedReg.phase ? `Phase ${selectedReg.phase}, Block ${selectedReg.block}, Lot ${selectedReg.lot}` : '-'}
                      </span>
                    </div>
                    <div>
                      <span className={styles.detailLabel}>Occupant Status</span>
                      <span className={styles.detailValue}>{selectedReg.occupant_status || '-'}</span>
                    </div>
                    <div>
                      <span className={styles.detailLabel}>Entry Year</span>
                      <span className={styles.detailValue}>
                        {selectedReg.entry_date ? new Date(selectedReg.entry_date).getFullYear() : '-'}
                      </span>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span className={styles.detailLabel}>Household Members</span>
                      <div className={styles.detailValue}>
                        {Array.isArray(selectedReg.household_members) ? (
                          selectedReg.household_members.length > 0 ? (
                            <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                              {selectedReg.household_members.map((member, i) => (
                                <li key={i}>
                                  <strong>{member.name || 'Unknown'}</strong> ({member.relationship || 'Unspecified'})
                                </li>
                              ))}
                            </ul>
                          ) : (
                            'None listed'
                          )
                        ) : (
                          selectedReg.household_members || 'None listed'
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={styles.infoSectionTitle}>Contact & Work</div>
                  <div className={styles.detailsGrid}>
                    <div>
                      <span className={styles.detailLabel}>Phone Number</span>
                      <span className={styles.detailValue}>{selectedReg.phone_number || '-'}</span>
                    </div>
                    <div>
                      <span className={styles.detailLabel}>Email Address</span>
                      <span className={styles.detailValue}>{selectedReg.email || '-'}</span>
                    </div>
                    <div>
                      <span className={styles.detailLabel}>Work Status</span>
                      <span className={styles.detailValue}>{selectedReg.work_status || '-'}</span>
                    </div>
                    <div>
                      <span className={styles.detailLabel}>Job Title</span>
                      <span className={styles.detailValue}>{selectedReg.job_title || '-'}</span>
                    </div>
                  </div>

                  <div className={styles.infoSectionTitle}>Uploaded Government ID Reference</div>
                  <div className={styles.idContainer} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    {Array.isArray(selectedReg.valid_id_picture_ids) && selectedReg.valid_id_picture_ids.length > 0 ? (
                      selectedReg.valid_id_picture_ids.map((pic, index) => (
                        <div
                          key={index}
                          className={styles.idWrapper}
                          onClick={() => setActiveLightboxImage(pic.path)}
                        >
                          <img
                            src={pic.path}
                            alt={`Government Valid ID ${index + 1}`}
                            className={styles.idImage}
                          />
                          <div className={styles.idOverlay}>
                            <FaEye /> Click to expand ID
                          </div>
                        </div>
                      ))
                    ) : (
                      selectedReg.valid_id_picture_id?.path ? (
                        <div
                          className={styles.idWrapper}
                          onClick={() => setActiveLightboxImage(selectedReg.valid_id_picture_id.path)}
                        >
                          <img
                            src={selectedReg.valid_id_picture_id.path}
                            alt="Government Valid ID"
                            className={styles.idImage}
                          />
                          <div className={styles.idOverlay}>
                            <FaEye /> Click to expand ID
                          </div>
                        </div>
                      ) : (
                        <div className={styles.noIdBox}>
                          <FaIdCard />
                          <p>No Valid ID uploaded or reference missing.</p>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {selectedReg.status === 'pending' && (
                  <div className={styles.detailsActions}>
                    <button
                      className={`${styles.actionBtn} ${styles.declineBtn}`}
                      onClick={() => setShowDeclineModal(true)}
                    >
                      <FaTimes /> Decline Request
                    </button>
                    <button
                      className={`${styles.actionBtn} ${styles.approveBtn}`}
                      onClick={() => setShowApproveModal(true)}
                    >
                      <FaCheck /> Approve & Add Homeowner
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.emptyDetails}>
                <FaIdCard className={styles.emptyDetailsIcon} />
                <h3>Select a request from the list to review credentials.</h3>
                <p>Verify provided identity documents and address credentials before adding them to the HOA Masterlist.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {activeLightboxImage && (
        <div className={styles.lightbox} onClick={() => setActiveLightboxImage(null)}>
          <div className={styles.lightboxContent}>
            <button className={styles.lightboxClose} onClick={() => setActiveLightboxImage(null)}>
              &times;
            </button>
            <img src={activeLightboxImage} alt="Expanded ID Document" className={styles.lightboxImage} />
          </div>
        </div>
      )}

      {showDeclineModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Decline Registration Request</h3>
            <p className={styles.modalText}>
              Are you sure you want to decline the homeowner registration for{' '}
              <strong>
                {selectedReg?.first_name} {selectedReg?.last_name}
              </strong>
              ? This will reject their application.
            </p>

            <label className={styles.modalLabel}>
              Provide Reason for Declining <span className={styles.requiredMark}>*</span>
            </label>
            <textarea
              className={styles.modalTextarea}
              placeholder="e.g. Invalid/unclear government ID uploaded, mismatch in address block/lot records, etc..."
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />

            <div className={styles.modalActions}>
              <button
                className={styles.modalCancel}
                onClick={() => {
                  setShowDeclineModal(false)
                  setDeclineReason('')
                }}
                disabled={isProcessingAction}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmDecline}
                onClick={handleDecline}
                disabled={isProcessingAction}
              >
                {isProcessingAction ? <FaSpinner className={styles.spinner} /> : 'Decline Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showApproveModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Approve Homeowner Registration</h3>
            <p className={styles.modalText}>
              Are you sure you want to approve the homeowner registration for{' '}
              <strong>
                {selectedReg?.first_name} {selectedReg?.last_name}
              </strong>
              ?
            </p>
            <p className={styles.modalSubtext}>
              On approval, they will be registered as a homeowner in the system database and dynamically listed in the Homeowner Masterlist.
            </p>

            <div className={styles.modalActions}>
              <button
                className={styles.modalCancel}
                onClick={() => setShowApproveModal(false)}
                disabled={isProcessingAction}
              >
                Cancel
              </button>
              <button
                className={styles.modalConfirmApprove}
                onClick={handleApprove}
                disabled={isProcessingAction}
              >
                {isProcessingAction ? <FaSpinner className={styles.spinner} /> : 'Approve & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
