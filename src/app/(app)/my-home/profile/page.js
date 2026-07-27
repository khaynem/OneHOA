"use client"

import { useEffect, useMemo, useState } from 'react'
import { HiOutlineUser } from 'react-icons/hi2'
import { apiClient } from '@/lib/apiClient'
import { notify } from '@/lib/notify'
import styles from './profile.module.css'

export default function MyProfilePage() {
  const [profile, setProfile] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        setErrorMessage('')

        const [userRes, profileRes] = await Promise.allSettled([
          apiClient.get('/auth/me'),
          apiClient.get('/homeowner/my-profile'),
        ])

        if (userRes.status === 'fulfilled' && userRes.value?.user) {
          setCurrentUser(userRes.value.user)
        }

        if (profileRes.status === 'fulfilled' && profileRes.value?.success) {
          setProfile(profileRes.value.data)
        } else {
          const err = profileRes.reason || profileRes.value
          setErrorMessage(err?.message || 'Failed to load your profile.')
        }
      } catch (error) {
        setErrorMessage(error.message || 'Failed to load profile.')
        notify.error({
          title: 'Load Error',
          description: error.message || 'Unable to load your profile.',
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const addressString = useMemo(() => {
    if (!profile) return ''
    const addr = profile['address._id']
    if (!addr) return ''
    const parts = []
    if (addr.phase) parts.push('Phase ' + addr.phase)
    if (addr.block) parts.push('Block ' + addr.block)
    if (addr.lot) parts.push('Lot ' + addr.lot)
    return parts.join(', ') || ''
  }, [profile])

  const fullName = useMemo(() => {
    if (!profile) return ''
    const parts = [profile.first_name || '', profile.middle_name || '', profile.last_name || '']
    return parts.filter(Boolean).join(' ')
  }, [profile])

  const initials = useMemo(() => {
    const parts = (fullName || '').split(/\s+/).filter(Boolean)
    if (parts.length === 0) return 'H'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }, [fullName])

  const occupantLabel = useMemo(() => {
    if (!profile?.occupant_status) return ''
    const val = String(profile.occupant_status).trim()
    return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase()
  }, [profile])

  const householdMembers = useMemo(() => {
    if (!Array.isArray(profile?.household_members)) return []
    return profile.household_members
  }, [profile])

  return (
    <>
      <div className={styles.backgroundContainer} aria-hidden="true">
        <div className={styles.gridOverlay} />
        <div className={styles.blob1} />
        <div className={styles.blob2} />
        <div className={styles.movingGradient} />
      </div>

      <div className={styles.pageContent}>
        {isLoading && <p className={styles.stateText}>Loading your profile...</p>}
        {!isLoading && errorMessage && <p className={styles.errorText}>{errorMessage}</p>}

        {!isLoading && !errorMessage && profile && (
          <section className={styles.profileCard}>
            <h2 className={styles.cardTitle}>
              <HiOutlineUser className={styles.cardIcon} />
              My Profile
            </h2>

            <div className={styles.profileHeader}>
              {profile['pictures._id']?.path ? (
                <img
                  src={profile['pictures._id'].path}
                  alt={fullName}
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>{initials}</div>
              )}
              <div>
                <h3 className={styles.profileName}>{fullName}</h3>
                <span className={styles.profileStatus}>{occupantLabel || 'Homeowner'}</span>
                {profile.generated_id && (
                  <p className={styles.profileId}><strong>ID:</strong> {profile.generated_id}</p>
                )}
              </div>
            </div>

            <div className={styles.detailsGrid}>
              <div className={styles.detailCard}>
                <span className={styles.detailLabel}>First Name</span>
                <span className={styles.detailValue}>{profile.first_name || '-'}</span>
              </div>
              <div className={styles.detailCard}>
                <span className={styles.detailLabel}>Middle Name</span>
                <span className={styles.detailValue}>{profile.middle_name || '-'}</span>
              </div>
              <div className={styles.detailCard}>
                <span className={styles.detailLabel}>Last Name</span>
                <span className={styles.detailValue}>{profile.last_name || '-'}</span>
              </div>
              <div className={styles.detailCard}>
                <span className={styles.detailLabel}>Email Address</span>
                <span className={styles.detailValue}>{profile.email || '-'}</span>
              </div>
              <div className={styles.detailCard}>
                <span className={styles.detailLabel}>Phone Number</span>
                <span className={styles.detailValue}>{profile.phone_number || '-'}</span>
              </div>
              <div className={styles.detailCard}>
                <span className={styles.detailLabel}>Home Address</span>
                <span className={styles.detailValue}>{addressString || '-'}</span>
              </div>
              <div className={styles.detailCard}>
                <span className={styles.detailLabel}>Occupant Status</span>
                <span className={styles.detailValue}>{occupantLabel || '-'}</span>
              </div>
              <div className={styles.detailCard}>
                <span className={styles.detailLabel}>Entry Year</span>
                <span className={styles.detailValue}>
                  {profile.entry_date ? new Date(profile.entry_date).getFullYear() : '-'}
                </span>
              </div>
              <div className={styles.detailCard}>
                <span className={styles.detailLabel}>Work Status</span>
                <span className={styles.detailValue}>{profile.work_status || '-'}</span>
              </div>
              <div className={styles.detailCard}>
                <span className={styles.detailLabel}>Job Title</span>
                <span className={styles.detailValue}>{profile.job_title || '-'}</span>
              </div>
              <div className={styles.detailCard}>
                <span className={styles.detailLabel}>Status</span>
                <span className={styles.detailValue}>
                  {Array.isArray(profile.status) ? profile.status.join(', ') || '-' : profile.status || '-'}
                </span>
              </div>
              <div className={styles.detailCard}>
                <span className={styles.detailLabel}>Homeowner ID</span>
                <span className={styles.detailValue}>{profile.generated_id || '-'}</span>
              </div>

              {householdMembers.length > 0 && (
                <div className={styles.detailCard + ' ' + styles.householdSection}>
                  <span className={styles.detailLabel}>Household Members</span>
                  <ul className={styles.householdList}>
                    {householdMembers.map((member, index) => (
                      <li key={index} className={styles.householdItem}>
                        <span className={styles.householdName}>{member.name || 'Unknown'}</span>
                        <span className={styles.householdRelation}>{member.relationship || 'Unspecified'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {!isLoading && !errorMessage && !profile && (
          <div className={sty
