"use client"

import { useEffect, useState } from "react"
import {
  HiOutlineUser,
  HiOutlineIdentification,
  HiOutlineBuildingOffice,
  HiOutlineUsers,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineBriefcase,
  HiOutlineCalendar,
  HiOutlineCheckBadge,
  HiOutlineShieldCheck,
  HiOutlineSparkles,
  HiOutlinePencilSquare,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineXMark,
  HiOutlineCheck,
} from "react-icons/hi2"
import { ApiError, apiClient } from "@/lib/apiClient"
import { notify } from "@/lib/notify"
import styles from "./my-profile.module.css"

const formatDateTime = (dateValue) => {
  if (!dateValue) return "-"
  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) return "-"
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
  }).format(parsed)
}

const getInitials = (firstName, lastName) => {
  const f = (firstName || "").trim().charAt(0)
  const l = (lastName || "").trim().charAt(0)
  return (f + l).toUpperCase() || "HO"
}

export default function HomeownerProfilePage() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState("")

  const [isEditing, setIsEditing] = useState(false)
  const [formValues, setFormValues] = useState({
    phone_number: "",
    email: "",
    job_title: "",
    work_status: "",
    household_members: []
  })
  const [isSaving, setIsSaving] = useState(false)
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      try {
        setIsLoading(true)
        setErrorMsg("")
        const res = await apiClient.get("/homeowner/my-profile")
        setData(res || null)
        if (res?.record) {
          const rec = res.record;
          setFormValues({
            phone_number: rec.phone_number || "",
            email: rec.email || res.userAccount?.email || "",
            job_title: rec.job_title || "",
            work_status: rec.work_status || "",
            household_members: Array.isArray(rec.household_members)
              ? JSON.parse(JSON.stringify(rec.household_members))
              : []
          })
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setErrorMsg(err.message)
        } else {
          setErrorMsg("Failed to load homeowner profile.")
        }
      } finally {
        setIsLoading(false)
      }
    }
    loadProfile()
  }, [])

  const handleStartEdit = () => {
    if (data?.record) {
      const rec = data.record;
      setFormValues({
        phone_number: rec.phone_number || "",
        email: rec.email || data.userAccount?.email || "",
        job_title: rec.job_title || "",
        work_status: rec.work_status || "",
        household_members: Array.isArray(rec.household_members)
          ? JSON.parse(JSON.stringify(rec.household_members))
          : []
      })
    }
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    if (data?.record) {
      const rec = data.record;
      setFormValues({
        phone_number: rec.phone_number || "",
        email: rec.email || data.userAccount?.email || "",
        job_title: rec.job_title || "",
        work_status: rec.work_status || "",
        household_members: Array.isArray(rec.household_members)
          ? JSON.parse(JSON.stringify(rec.household_members))
          : []
      })
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleHouseholdChange = (index, key, value) => {
    const newList = [...formValues.household_members]
    newList[index] = {
      ...newList[index],
      [key]: value
    }
    setFormValues(prev => ({
      ...prev,
      household_members: newList
    }))
  }

  const addHouseholdMember = () => {
    const hasIncomplete = formValues.household_members.some(
      (m) => !m.name?.trim() || !m.relationship?.trim()
    )
    if (hasIncomplete) {
      notify.warning("Please fill in both name and relationship for the present row first.")
      return
    }
    setFormValues(prev => ({
      ...prev,
      household_members: [...prev.household_members, { name: "", relationship: "" }]
    }))
  }

  const removeHouseholdMember = (index) => {
    const newList = [...formValues.household_members]
    newList.splice(index, 1)
    setFormValues(prev => ({
      ...prev,
      household_members: newList
    }))
  }

  const handleSaveChanges = async (e) => {
    if (e) e.preventDefault()

    if (!formValues.email.trim()) {
      notify.error("Email address cannot be empty.")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formValues.email.trim())) {
      notify.error("Invalid email format.")
      return
    }

    const emptyMember = formValues.household_members.find(
      (m) => !m.name?.trim() || !m.relationship?.trim()
    )
    if (emptyMember) {
      notify.error("All household member rows must have both a name and a relationship.")
      return
    }

    try {
      setIsSaving(true)
      const res = await apiClient.patch("/homeowner/my-profile/update", formValues)
      if (res?.success) {
        notify.success("Profile updated successfully!")
        setIsEditing(false)

        const updated = await apiClient.get("/homeowner/my-profile")
        setData(updated || null)
        if (updated?.record) {
          const rec = updated.record;
          setFormValues({
            phone_number: rec.phone_number || "",
            email: rec.email || updated.userAccount?.email || "",
            job_title: rec.job_title || "",
            work_status: rec.work_status || "",
            household_members: Array.isArray(rec.household_members)
              ? JSON.parse(JSON.stringify(rec.household_members))
              : []
          })
        }
      } else {
        notify.error(res?.message || "Failed to update profile.")
      }
    } catch (err) {
      if (err instanceof ApiError) {
        notify.error({
          title: "Update Failed",
          description: err.message
        })
      } else {
        notify.error("An unexpected error occurred while updating profile.")
      }
    } finally {
      setIsSaving(false)
    }
  }

  const record = data?.record || {}
  const userAccount = data?.userAccount || {}
  const officers = data?.officers || []

  const fullName = `${record.first_name || userAccount.first_name || ""} ${record.middle_name ? record.middle_name + " " : ""
    }${record.last_name || userAccount.last_name || ""}${record.suffix ? " " + record.suffix : ""}`.trim() || "Homeowner"

  const addressObj = record.address?._id || record.address || {}
  const phaseText = addressObj.phase ? `Phase ${addressObj.phase}` : ""
  const blockText = addressObj.block ? `Block ${addressObj.block}` : ""
  const lotText = addressObj.lot ? `Lot ${addressObj.lot}` : ""
  const formattedAddress = [phaseText, blockText, lotText].filter(Boolean).join(", ") || "Fiesta Community Hanjin Village"

  const photoUrl =
    record.pictures?._id?.path ||
    record.pictures?.path ||
    record.photoUrl ||
    record.photo ||
    userAccount?.photoUrl ||
    null
  const initials = getInitials(record.first_name || userAccount.first_name, record.last_name || userAccount.last_name)

  const householdMembers = Array.isArray(record.household_members) ? record.household_members : []
  const isAddRowDisabled = formValues.household_members.some(
    (m) => !m.name?.trim() || !m.relationship?.trim()
  )

  return (
    <div className={styles.container}>
      {/* Background decoration */}
      <div className={styles.backgroundContainer} aria-hidden="true">
        <div className={styles.gridOverlay} />
        <div className={styles.blob1} />
        <div className={styles.blob2} />
      </div>

      <div className={styles.pageContent}>
        {isLoading && <p className={styles.stateText}>Loading homeowner profile and officer records...</p>}
        {!isLoading && errorMsg && <p className={styles.errorText}>{errorMsg}</p>}

        {!isLoading && (
          <>
            {/* Section 1: Homeowner's Own Full Details */}
            <section className={styles.sectionBlock}>
              <div className={styles.sectionHeadingRow}>
                <div className={styles.headingLeft}>
                  <div className={styles.headingIconBox}>
                    {photoUrl && !imgError ? (
                      <img
                        src={photoUrl}
                        alt={fullName || "Homeowner Profile"}
                        className={styles.headingAvatarImg}
                        onError={() => setImgError(true)}
                      />
                    ) : (
                      <HiOutlineUser className={styles.headingIcon} />
                    )}
                  </div>
                  <div>
                    <h2 className={styles.sectionTitle}>My Homeowner Registration Record</h2>
                    <p className={styles.sectionSub}>Full details submitted during registration and stored in official HOA records.</p>
                  </div>
                </div>

                <div className={styles.editActions}>
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className={styles.cancelBtn}
                      >
                        <HiOutlineXMark className={styles.btnIcon} /> Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveChanges}
                        disabled={isSaving}
                        className={styles.saveBtn}
                      >
                        <HiOutlineCheck className={styles.btnIcon} /> {isSaving ? "Saving..." : "Save Changes"}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className={styles.editBtn}
                    >
                      <HiOutlinePencilSquare className={styles.btnIcon} /> Edit Profile
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.detailsGrid}>
                {/* Personal Info Card */}
                <article className={styles.detailCard}>
                  <h3 className={styles.cardSubTitle}>
                    <HiOutlineUser className={styles.cardHeaderIcon} />
                    Personal Information
                  </h3>
                  <ul className={styles.infoList}>
                    <li>
                      <span className={styles.infoLabel}>First Name</span>
                      <span className={styles.infoVal}>{record.first_name || userAccount.first_name || "-"}</span>
                    </li>
                    <li>
                      <span className={styles.infoLabel}>Middle Name</span>
                      <span className={styles.infoVal}>{record.middle_name || "-"}</span>
                    </li>
                    <li>
                      <span className={styles.infoLabel}>Last Name</span>
                      <span className={styles.infoVal}>{record.last_name || userAccount.last_name || "-"}</span>
                    </li>
                    {record.suffix ? (
                      <li>
                        <span className={styles.infoLabel}>Suffix</span>
                        <span className={styles.infoVal}>{record.suffix}</span>
                      </li>
                    ) : null}
                    <li>
                      <span className={styles.infoLabel}>Email Address</span>
                      <span className={styles.infoVal}>
                        <HiOutlineEnvelope className={styles.smallIcon} />
                        {record.email || userAccount.email || "-"}
                      </span>

                    </li>
                    <li>
                      <span className={styles.infoLabel}>Phone / Mobile Number</span>
                      {isEditing ? (
                        <input
                          type="text"
                          name="phone_number"
                          value={formValues.phone_number}
                          onChange={handleInputChange}
                          className={styles.editInput}
                          placeholder="Phone / Mobile Number"
                          disabled={isSaving}
                        />
                      ) : (
                        <span className={styles.infoVal}>
                          <HiOutlinePhone className={styles.smallIcon} />
                          {record.phone_number || "Not provided"}
                        </span>
                      )}
                    </li>
                    <li>
                      <span className={styles.infoLabel}>Job Title</span>
                      {isEditing ? (
                        <input
                          type="text"
                          name="job_title"
                          value={formValues.job_title}
                          onChange={handleInputChange}
                          className={styles.editInput}
                          placeholder="Job Title"
                          disabled={isSaving}
                        />
                      ) : (
                        <span className={styles.infoVal}>
                          <HiOutlineBriefcase className={styles.smallIcon} />
                          {record.job_title || "N/A"}
                        </span>
                      )}
                    </li>
                    <li>
                      <span className={styles.infoLabel}>Work Status</span>
                      {isEditing ? (
                        <select
                          name="work_status"
                          value={formValues.work_status}
                          onChange={handleInputChange}
                          className={styles.editSelect}
                          disabled={isSaving}
                        >
                          <option value="">Select Work Status</option>
                          {["Contractual", "Regular", "Self-Employed", "Freelance", "Unemployed", "Other"].map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={styles.infoVal}>{record.work_status || "N/A"}</span>
                      )}
                    </li>
                  </ul>
                </article>

                {/* Residence & HOA Info Card */}
                <article className={styles.detailCard}>
                  <h3 className={styles.cardSubTitle}>
                    <HiOutlineBuildingOffice className={styles.cardHeaderIcon} />
                    Residence & HOA Record Details
                  </h3>
                  <ul className={styles.infoList}>
                    <li>
                      <span className={styles.infoLabel}>Property Phase</span>
                      <span className={styles.infoVal}>{addressObj.phase ? `Phase ${addressObj.phase}` : "-"}</span>
                    </li>
                    <li>
                      <span className={styles.infoLabel}>Block</span>
                      <span className={styles.infoVal}>
                        {addressObj.block ? `Block ${addressObj.block}` : "-"}
                      </span>
                    </li>
                    <li>
                      <span className={styles.infoLabel}>Lot Number</span>
                      <span className={styles.infoVal}>{`Lot ${addressObj.lot}` || "N/A"}</span>
                    </li>
                    <li>
                      <span className={styles.infoLabel}>System Generated ID</span>
                      <span className={styles.infoVal}>{record.generated_id ? `#${record.generated_id}` : "-"}</span>
                    </li>
                    <li>
                      <span className={styles.infoLabel}>Registration Date</span>
                      <span className={styles.infoVal}>
                        <HiOutlineCalendar className={styles.smallIcon} />
                        {formatDateTime(record.entry_date || record.createdAt)}
                      </span>
                    </li>
                  </ul>
                </article>
              </div>

              {/* Household Members Sub-section */}
              <div className={styles.householdBox}>
                <h3 className={styles.cardSubTitle}>
                  <HiOutlineUsers className={styles.cardHeaderIcon} />
                  Registered Household Members ({isEditing ? formValues.household_members.length : householdMembers.length})
                </h3>

                {isEditing ? (
                  <div className={styles.householdEditContainer}>
                    <div className={styles.spreadsheetWrap}>
                      <table className={styles.spreadsheetTable}>
                        <thead>
                          <tr>
                            <th className={styles.colIndex}>#</th>
                            <th className={styles.colName}>Full Name *</th>
                            <th className={styles.colRel}>Relationship *</th>
                            <th className={styles.colAction}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {formValues.household_members.map((member, idx) => (
                            <tr key={idx}>
                              <td className={styles.rowNumberCell}>{idx + 1}</td>
                              <td className={styles.cellInputTd}>
                                <input
                                  type="text"
                                  value={member.name || ""}
                                  onChange={(e) => handleHouseholdChange(idx, "name", e.target.value)}
                                  className={styles.sheetInput}
                                  placeholder="Enter member's full name"
                                  required
                                  disabled={isSaving}
                                />
                              </td>
                              <td className={styles.cellInputTd}>
                                <input
                                  type="text"
                                  value={member.relationship || ""}
                                  onChange={(e) => handleHouseholdChange(idx, "relationship", e.target.value)}
                                  className={styles.sheetInput}
                                  placeholder="e.g., Spouse, Child, Parent"
                                  required
                                  disabled={isSaving}
                                />
                              </td>
                              <td className={styles.actionCell}>
                                <button
                                  type="button"
                                  onClick={() => removeHouseholdMember(idx)}
                                  className={styles.sheetDeleteBtn}
                                  title="Delete row"
                                  disabled={isSaving}
                                >
                                  <HiOutlineTrash /> Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                          {formValues.household_members.length === 0 && (
                            <tr>
                              <td colSpan={4} className={styles.emptySheetCell}>
                                No household members added yet. Click &ldquo;+ Add Row&rdquo; below to insert a member.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className={styles.tableFooterRow}>
                      <button
                        type="button"
                        onClick={addHouseholdMember}
                        className={styles.addMemberBtn}
                        disabled={isSaving || isAddRowDisabled}
                        title={
                          isAddRowDisabled
                            ? "Please fill in the current row before adding another."
                            : "Add new member row"
                        }
                      >
                        <HiOutlinePlus /> Add Row
                      </button>
                      {isAddRowDisabled && (
                        <span className={styles.incompleteWarning}>
                          Please fill in both Name and Relationship of the present row before adding a new row.
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  householdMembers.length === 0 ? (
                    <p className={styles.emptySubText}>No additional household members listed in record.</p>
                  ) : (
                    <div className={styles.spreadsheetWrap}>
                      <table className={styles.spreadsheetTable}>
                        <thead>
                          <tr>
                            <th className={styles.colIndex}>#</th>
                            <th className={styles.colName}>Full Name</th>
                            <th className={styles.colRel}>Relationship</th>
                          </tr>
                        </thead>
                        <tbody>
                          {householdMembers.map((member, idx) => (
                            <tr key={idx}>
                              <td className={styles.rowNumberCell}>{idx + 1}</td>
                              <td className={styles.viewNameCell}>{member.name || "-"}</td>
                              <td className={styles.viewRelCell}>
                                <span className={styles.relBadge}>{member.relationship || "Member"}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
