"use client"
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import { FaArrowLeft, FaCheckCircle, FaCloudUploadAlt, FaIdCard, FaCamera, FaSpinner, FaUserAlt, FaBriefcase, FaHome, FaUsers, FaPlus, FaTrash } from 'react-icons/fa'
import { apiClient } from '@/lib/apiClient'
import { notify } from '@/lib/notify'
import styles from './register-homeowner.module.css'

const CATEGORY_MAP = {
  "Personal Details": ["first_name", "middle_name", "last_name", "suffix", "email", "phone_number"],
  "Source of Income": ["job_title", "work_status"],
  "Residency Details": ["phase", "block", "lot", "entry_date", "occupant_status"],
  "Household Members": ["household_members"]
}

const CATEGORY_ICONS = {
  "Personal Details": <FaUserAlt />,
  "Source of Income": <FaBriefcase />,
  "Residency Details": <FaHome />,
  "Household Members": <FaUsers />
}

export default function RegisterHomeownerPage() {
  const [fields, setFields] = useState([])
  const [isLoadingFields, setIsLoadingFields] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    suffix: '',
    email: '',
    phone_number: '',
    job_title: '',
    work_status: '',
    phase: '',
    block: '',
    lot: '',
    entry_date: '',
    occupant_status: '',
    household_members: [],
  })

  // File states
  const [validIdFiles, setValidIdFiles] = useState([])
  const [validIdPreviews, setValidIdPreviews] = useState([])
  const [isValidIdUploading, setIsValidIdUploading] = useState(false)
  const [validIdPictureIds, setValidIdPictureIds] = useState([])

  const [profileFile, setProfileFile] = useState(null)
  const [profilePreview, setProfilePreview] = useState('')
  const [isProfileUploading, setIsProfileUploading] = useState(false)
  const [pictureId, setPictureId] = useState('')

  const validIdInputRef = useRef(null)
  const profileInputRef = useRef(null)

  useEffect(() => {
    async function loadFields() {
      try {
        const response = await apiClient.get('/settings/registration-fields')
        let loadedFields = []
        if (response?.success && Array.isArray(response?.fields)) {
          loadedFields = response.fields.filter(f => f.isActive)
        }

        // Ensure suffix field is always available in Personal Details
        const suffixExists = loadedFields.some(f => f.key === 'suffix')
        if (!suffixExists) {
          loadedFields.splice(
            loadedFields.findIndex(f => f.key === 'last_name') + 1,
            0,
            {
              key: 'suffix',
              label: 'Suffix',
              type: 'text',
              required: false,
              isActive: true
            }
          )
        }

        setFields(loadedFields)
      } catch (error) {
        console.error('Failed to load fields:', error)
        notify.error({
          title: 'Initialization Error',
          description: 'Failed to load form layout. Using default fields.'
        })
      } finally {
        setIsLoadingFields(false)
      }
    }
    loadFields()
  }, [])

  const handleInputChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const handleHouseholdChange = (index, key, value) => {
    const newList = [...formData.household_members]
    newList[index][key] = value
    setFormData(prev => ({ ...prev, household_members: newList }))
  }

  const addHouseholdMember = () => {
    setFormData(prev => ({
      ...prev,
      household_members: [...prev.household_members, { name: '', relationship: '' }]
    }))
  }

  const removeHouseholdMember = (index) => {
    const newList = [...formData.household_members]
    newList.splice(index, 1)
    setFormData(prev => ({ ...prev, household_members: newList }))
  }

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('Failed to read image file.'))
      reader.readAsDataURL(file)
    })

  const uploadPhotoPublicly = async (file) => {
    const dataUrl = await readFileAsDataUrl(file)
    const response = await fetch('/api/records/upload-public', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageDataUrl: dataUrl,
        fileName: file.name,
        mimeType: file.type
      })
    })
    const result = await response.json()
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Upload failed')
    }
    return result.data?._id
  }

  const handleValidIdChange = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const remainingSlots = 4 - validIdPictureIds.length
    if (files.length > remainingSlots) {
      notify.error({
        title: 'Limit Exceeded',
        description: `You can only upload a maximum of 4 valid IDs. You can upload ${remainingSlots} more.`
      })
      e.target.value = null
      return
    }

    const validFiles = []
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        notify.error({
          title: 'Invalid File',
          description: `"${file.name}" is not an image file (PNG, JPG, JPEG).`
        })
      } else {
        validFiles.push(file)
      }
    }

    if (validFiles.length === 0) {
      e.target.value = null
      return
    }

    setIsValidIdUploading(true)

    const newFiles = [...validIdFiles]
    const newPreviews = [...validIdPreviews]
    const newIds = [...validIdPictureIds]

    try {
      for (const file of validFiles) {
        newFiles.push(file)
        newPreviews.push(URL.createObjectURL(file))
        const picId = await uploadPhotoPublicly(file)
        newIds.push(picId)
      }
      setValidIdFiles(newFiles)
      setValidIdPreviews(newPreviews)
      setValidIdPictureIds(newIds)
      notify.success({
        title: 'IDs Uploaded',
        description: 'Valid ID images uploaded successfully.'
      })
    } catch (err) {
      console.error(err)
      notify.error({
        title: 'Upload Failed',
        description: 'Failed to process some ID images. Please try again.'
      })
    } finally {
      setIsValidIdUploading(false)
      if (validIdInputRef.current) validIdInputRef.current.value = null
    }
  }

  const handleRemoveValidId = (index) => {
    const newFiles = [...validIdFiles]
    const newPreviews = [...validIdPreviews]
    const newIds = [...validIdPictureIds]

    newFiles.splice(index, 1)
    newPreviews.splice(index, 1)
    newIds.splice(index, 1)

    setValidIdFiles(newFiles)
    setValidIdPreviews(newPreviews)
    setValidIdPictureIds(newIds)
  }

  const handleProfileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      notify.error({
        title: 'Invalid File',
        description: 'Please upload an image file (PNG, JPG, JPEG) for your profile photo.'
      })
      return
    }

    setProfileFile(file)
    setProfilePreview(URL.createObjectURL(file))
    setIsProfileUploading(true)

    try {
      const picId = await uploadPhotoPublicly(file)
      setPictureId(picId)
      notify.success({
        title: 'Photo Uploaded',
        description: 'Profile photo uploaded successfully.'
      })
    } catch (err) {
      console.error(err)
      notify.error({
        title: 'Upload Failed',
        description: 'Failed to process profile photo. Please try again.'
      })
      setProfileFile(null)
      setProfilePreview('')
    } finally {
      setIsProfileUploading(false)
    }
  }

  const areRequiredFieldsFilled = () => {
    // 1. Verify profile picture and valid IDs are uploaded
    if (!pictureId || validIdPictureIds.length === 0) {
      return false
    }

    // 2. Verify all active required fields are filled
    for (const field of fields) {
      if (field.required) {
        const val = formData[field.key]
        let isPresent = false
        if (field.type === 'household_list') {
          isPresent = Array.isArray(val) && val.length > 0
        } else {
          isPresent = val !== undefined && val !== null && String(val).trim() !== ''
        }
        if (!isPresent) {
          return false
        }
      }
    }

    // 3. Verify user agreed to terms
    if (!agreedToTerms) {
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return

    // 1. Verify files are uploaded
    if (validIdPictureIds.length === 0) {
      notify.error({
        title: 'Valid ID Required',
        description: 'Please upload at least one clear copy of a valid government ID for reference.'
      })
      return
    }

    if (!pictureId) {
      notify.error({
        title: 'Profile Photo Required',
        description: 'Please upload a profile photo.'
      })
      return
    }

    // 2. Client-side field validations
    for (const field of fields) {
      const val = formData[field.key]
      let isPresent = false;
      if (field.type === 'household_list') {
        isPresent = Array.isArray(val) && val.length > 0;
      } else {
        isPresent = val !== undefined && val !== null && String(val).trim() !== '';
      }

      if (field.required && !isPresent) {
        notify.error({
          title: 'Required Field',
          description: `"${field.label}" is required. If household members are required, please add at least one member or specify yourself/none.`
        })
        return
      }

      if (isPresent && field.type !== 'household_list') {
        const stringVal = String(val).trim()
        if (field.key === 'phone_number') {
          const digits = stringVal.replace(/\D/g, '')
          if (digits.length !== 11) {
            notify.error({
              title: 'Invalid Phone Number',
              description: 'Phone number must be exactly 11 digits (e.g. 09171234567).'
            })
            return
          }
        }

        if (field.key === 'phase' || field.key === 'block' || field.key === 'lot') {
          const num = Number(stringVal)
          if (Number.isNaN(num) || num <= 0) {
            notify.error({
              title: 'Invalid Address Field',
              description: `"${field.label}" must be a valid positive number.`
            })
            return
          }
        }

        if (field.key === 'entry_date') {
          const year = Number(stringVal)
          const currentYear = new Date().getFullYear()
          if (Number.isNaN(year) || year < 1900 || year > currentYear) {
            notify.error({
              title: 'Invalid Entry Year',
              description: `Entry year must be between 1900 and ${currentYear}.`
            })
            return
          }
        }
      }
    }

    if (!agreedToTerms) {
      notify.error({
        title: 'Agreement Required',
        description: 'You must read and agree to the Privacy Policy and Terms & Conditions.'
      })
      return
    }

    setShowConfirmModal(true)
  }

  const confirmSubmit = async () => {
    setShowConfirmModal(false)
    setIsSubmitting(true)

    try {
      const payload = {
        ...formData,
        phase: Number(formData.phase),
        block: Number(formData.block),
        lot: Number(formData.lot),
        valid_id_picture_ids: validIdPictureIds,
        picture_id: pictureId
      }

      const response = await fetch('/api/pending-registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const result = await response.json()
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Submission failed')
      }

      setIsSubmitted(true)
      notify.success({
        title: 'Registration Submitted',
        description: 'Your registration request is now pending verification.'
      })
    } catch (err) {
      console.error(err)
      notify.error({
        title: 'Submission Failed',
        description: err.message || 'Failed to submit registration request. Please try again.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderFieldInput = (field) => {
    const isRequired = field.required
    const key = field.key

    if (field.type === 'household_list') {
      return (
        <div className={styles.householdList}>
          {formData.household_members.map((member, index) => (
            <div key={index} className={styles.householdRow}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Name <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  className={styles.input}
                  value={member.name}
                  onChange={(e) => handleHouseholdChange(index, 'name', e.target.value)}
                  placeholder="e.g. Juan Dela Cruz"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Relationship <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  className={styles.input}
                  value={member.relationship}
                  onChange={(e) => handleHouseholdChange(index, 'relationship', e.target.value)}
                  required
                />
              </div>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => removeHouseholdMember(index)}
                title="Remove Member"
              >
                <FaTrash />
              </button>
            </div>
          ))}
          {formData.household_members.length === 0 && (
            <div className={styles.emptyHousehold}>
              No household members added yet.
            </div>
          )}
          <button type="button" className={styles.addBtn} onClick={addHouseholdMember}>
            <FaPlus /> Add Member
          </button>
        </div>
      )
    }

    if (field.type === 'select') {
      return (
        <select
          className={styles.select}
          value={formData[key]}
          onChange={(e) => handleInputChange(key, e.target.value)}
          required={isRequired}
        >
          <option value="">Select {field.label}</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )
    }

    if (field.type === 'textarea') {
      return (
        <textarea
          className={styles.textarea}
          rows={3}
          value={formData[key]}
          placeholder={`Enter ${field.label.toLowerCase()} details...`}
          onChange={(e) => handleInputChange(key, e.target.value)}
          required={isRequired}
        />
      )
    }

    return (
      <input
        type={field.type === 'number' || field.type === 'tel' ? 'text' : field.type}
        className={styles.input}
        value={formData[key]}
        placeholder={
          key === 'first_name'
            ? 'e.g. Juan'
            : key === 'middle_name'
              ? 'e.g. Carlos'
              : key === 'last_name'
                ? 'e.g. Dela Cruz'
                : key === 'suffix'
                  ? 'e.g. Jr.'
                  : key === 'email'
                    ? 'example@gmail.com'
                    : key === 'phone_number'
                      ? 'e.g. 09171234567'
                      : key === 'entry_date'
                        ? 'e.g. 2026'
                        : `Enter ${field.label.toLowerCase()}`
        }
        onChange={(e) => {
          const val = e.target.value
          if (field.type === 'number') {
            handleInputChange(key, val.replace(/\D/g, ''))
          } else if (field.type === 'tel') {
            handleInputChange(key, val.replace(/\D/g, '').slice(0, 11))
          } else {
            handleInputChange(key, val)
          }
        }}
        required={isRequired}
      />
    )
  }

  if (isLoadingFields) {
    return (
      <div className={styles.loadingContainer}>
        <FaSpinner className={styles.spinner} />
        <p>Loading homeowner registration form...</p>
      </div>
    )
  }

  if (isSubmitted) {
    return (
      <div className={styles.page}>
        <div className={styles.bgDots} aria-hidden="true" />
        <div className={styles.glowYellow} aria-hidden="true" />
        <div className={styles.glowBlue} aria-hidden="true" />
        <div className={styles.square1} aria-hidden="true" />
        <div className={styles.square2} aria-hidden="true" />
        <div className={styles.square3} aria-hidden="true" />
        <div className={styles.successCard}>
          <FaCheckCircle className={styles.successIcon} />
          <h2 className={styles.successTitle}>Registration Submitted!</h2>
          <p className={styles.successText}>
            Thank you for registering. Your details and Valid ID have been securely submitted to the <strong>Fiesta Community Hanjin Village Association (FVHOA)</strong>.
          </p>
          <div className={styles.successInfo}>
            <p><strong>What happens next?</strong></p>
            <p>1. The HOA President or Admin will verify your residency details and uploaded ID.</p>
            <p>2. Once verified and approved, you will be added to the homeowner masterlist record database.</p>
            <p>3. You can then request official community documents (ID cards, clearances) from the officers.</p>
          </div>
          <Link href="/" className={styles.homeBtn}>
            Return to Landing Page
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.bgDots} aria-hidden="true" />
      <div className={styles.glowYellow} aria-hidden="true" />
      <div className={styles.glowBlue} aria-hidden="true" />
      <div className={styles.square1} aria-hidden="true" />
      <div className={styles.square2} aria-hidden="true" />
      <div className={styles.square3} aria-hidden="true" />
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.backLink}>
            <FaArrowLeft /> Back to Home
          </Link>
          <div className={styles.brand}>
            <Image
              src="/images/HOA_Logo.png"
              alt="OneHOA Logo"
              width={40}
              height={40}
              className={styles.logo}
              priority
            />
            <span className={styles.brandText}>OneHOA</span>
          </div>

        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.formContainer}>
          <div className={styles.formInner}>
            <div className={styles.formHeader}>
              <h1 className={styles.title}>Homeowner Registration</h1>
              <p className={styles.subtitle}>
                Please fill out the form below to register as a homeowner in Fiesta Community Hanjin Village. Your submission will be reviewed.
              </p>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formSection}>
                <h3 className={styles.sectionTitle}>
                  <FaCamera /> Identification Photos
                </h3>
                <div className={styles.photoSection}>
                  <div className={styles.photoUploadGroup}>
                    <label className={styles.label}>Profile Photo <span className={styles.required}>*</span></label>
                    <div
                      className={styles.profileUploadZone}
                      onClick={() => profileInputRef.current?.click()}
                    >
                      {profilePreview ? (
                        <img src={profilePreview} alt="Profile preview" className={styles.profilePreviewImg} />
                      ) : (
                        <div className={styles.uploadPlaceholder}>
                          <FaCamera className={styles.photoIcon} />
                          <span>Upload Photo</span>
                        </div>
                      )}
                      {isProfileUploading && (
                        <div className={styles.uploadOverlay}>
                          <FaSpinner className={styles.spinner} />
                        </div>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={profileInputRef}
                      onChange={handleProfileChange}
                      accept="image/*"
                      className={styles.hiddenInput}
                    />
                  </div>

                  <div className={styles.photoUploadGroup} style={{ flexGrow: 1 }}>
                    <label className={styles.label}>
                      Documents for Validation <span className={styles.required}>*</span>
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                        {validIdPreviews.map((preview, index) => (
                          <div key={index} style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                            <img src={preview} alt={`Valid ID ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleRemoveValidId(index); }}
                              style={{ position: 'absolute', top: '4px', right: '4px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Remove image"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        {validIdPreviews.length < 4 && (
                          <div
                            className={styles.idUploadZone}
                            style={{ width: validIdPreviews.length > 0 ? '120px' : '100%', height: validIdPreviews.length > 0 ? '120px' : 'auto', margin: 0 }}
                            onClick={() => validIdInputRef.current?.click()}
                          >
                            <div className={styles.uploadPlaceholder} style={{ padding: validIdPreviews.length > 0 ? '0.5rem' : '2rem' }}>
                              <FaIdCard className={styles.idIcon} style={{ fontSize: validIdPreviews.length > 0 ? '1.5rem' : '2rem' }} />
                              {validIdPreviews.length === 0 && (
                                <>
                                  <span>Click or Drag to Upload Valid IDs</span>
                                  <p className={styles.hintText}>Upload up to 4 images (Passport, Driver&apos;s License, etc.)</p>
                                </>
                              )}
                              {validIdPreviews.length > 0 && <span style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Add More</span>}
                            </div>
                            {isValidIdUploading && (
                              <div className={styles.uploadOverlay}>
                                <FaSpinner className={styles.spinner} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <input
                      type="file"
                      ref={validIdInputRef}
                      onChange={handleValidIdChange}
                      accept="image/*"
                      multiple
                      className={styles.hiddenInput}
                    />
                  </div>
                </div>
              </div>

              {Object.entries(CATEGORY_MAP).map(([categoryName, categoryKeys]) => {
                const categoryFields = fields.filter(f => categoryKeys.includes(f.key))
                if (categoryFields.length === 0) return null

                return (
                  <div key={categoryName} className={styles.formSection}>
                    <h3 className={styles.sectionTitle}>
                      {CATEGORY_ICONS[categoryName] || null} {categoryName}
                    </h3>
                    <div className={categoryFields.some(f => f.type === 'household_list' || f.type === 'textarea') ? '' : styles.fieldsGrid}>
                      {categoryFields.map((field) => (
                        <div
                          key={field.key}
                          className={`${styles.formGroup} ${field.type === 'textarea' || field.type === 'household_list' ? styles.fullWidth : ''
                            }`}
                          style={field.type === 'household_list' ? { marginBottom: '1rem' } : {}}
                        >
                          <label className={styles.label}>
                            {field.label} {field.required && <span className={styles.required}>*</span>}
                          </label>
                          {renderFieldInput(field)}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              <div className={styles.formSection} style={{ border: 'none', padding: '0', background: 'transparent', boxShadow: 'none' }}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span>
                    I have read and agree to the <Link href="/privacy-policy" target="_blank" className={styles.link}>Privacy Policy</Link> and <Link href="/terms-and-conditions" target="_blank" className={styles.link}>Terms & Conditions</Link>. <span className={styles.required}>*</span>
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={isSubmitting || isValidIdUploading || isProfileUploading || !areRequiredFieldsFilled()}
              >
                {isSubmitting ? (
                  <>
                    <FaSpinner className={styles.spinner} /> Submitting Registration...
                  </>
                ) : (
                  'Submit Registration Request'
                )}
              </button>
            </form>
          </div>
        </div>

        {showConfirmModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <h2 className={styles.modalTitle}>Confirm Your Details</h2>
              <p className={styles.modalText}>Please review your information before submitting:</p>

              <div className={styles.modalDetails}>
                <div className={styles.modalDetailRow}><strong>First Name:</strong> {formData.first_name}</div>
                <div className={styles.modalDetailRow}><strong>Middle Name:</strong> {formData.middle_name || ''}</div>
                <div className={styles.modalDetailRow}><strong>Last Name:</strong> {formData.last_name}</div>
                {formData.suffix && <div className={styles.modalDetailRow}><strong>Suffix:</strong> {formData.suffix}</div>}
                <div className={styles.modalDetailRow}><strong>Email:</strong> {formData.email}</div>
                <div className={styles.modalDetailRow}><strong>Phone:</strong> {formData.phone_number}</div>
                <div className={styles.modalDetailRow}><strong>Address:</strong> Phase {formData.phase}, Block {formData.block}, Lot {formData.lot}</div>
                <div className={styles.modalDetailRow}><strong>Occupant Status:</strong> {formData.occupant_status}</div>
                <div className={styles.modalDetailRow}><strong>Valid IDs Attached:</strong> {validIdFiles.length}</div>
              </div>

              <div className={styles.modalActions}>
                <button
                  className={`${styles.btn} ${styles.btnGhostModal}`}
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSubmitting}
                >
                  Edit Details
                </button>
                <button
                  className={`${styles.btn} ${styles.btnPrimaryModal}`}
                  onClick={confirmSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
