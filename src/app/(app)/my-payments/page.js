"use client"

import { useEffect, useMemo, useState } from "react"
import {
  HiOutlineCreditCard,
  HiOutlineDocumentText,
  HiOutlineBanknotes,
  HiOutlineMagnifyingGlass,
  HiOutlineFunnel,
  HiOutlineCalendarDays,
  HiOutlineCheckCircle,
  HiOutlineArrowDownTray,
} from "react-icons/hi2"
import { ApiError, apiClient } from "@/lib/apiClient"
import { buildHomeownerPaymentReportHtml } from "@/lib/homeownerPaymentReportTemplate"
import styles from "./my-payments.module.css"

const isMobileOrTablet = () => {
  if (typeof window === "undefined") return false
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    window.navigator.userAgent.toLowerCase()
  )
}

const printViaIframe = (contentHtml) => {
  let iframe = document.getElementById("print-iframe")
  if (!iframe) {
    iframe = document.createElement("iframe")
    iframe.id = "print-iframe"
    iframe.style.position = "fixed"
    iframe.style.right = "0"
    iframe.style.bottom = "0"
    iframe.style.width = "0"
    iframe.style.height = "0"
    iframe.style.border = "0"
    iframe.style.zIndex = "-9999"
    document.body.appendChild(iframe)
  }
  const doc = iframe.contentDocument || iframe.contentWindow.document
  doc.open()
  doc.write(contentHtml)
  doc.close()
  setTimeout(() => {
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
  }, 500)
}

const formatPeso = (amount) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    currencyDisplay: 'symbol'
  }).format(Number(amount) || 0)

const formatDate = (dateValue) => {
  if (!dateValue) return "-"
  const parsed = new Date(dateValue)
  if (Number.isNaN(parsed.getTime())) return "-"
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(parsed)
}

export default function HomeownerPaymentsPage() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedYear, setSelectedYear] = useState("all")

  useEffect(() => {
    async function loadPayments() {
      try {
        setIsLoading(true)
        setErrorMsg("")
        const res = await apiClient.get("/homeowner/my-payments")
        setData(res || null)
      } catch (err) {
        if (err instanceof ApiError) {
          setErrorMsg(err.message)
        } else {
          setErrorMsg("Failed to load your payment records.")
        }
      } finally {
        setIsLoading(false)
      }
    }
    loadPayments()
  }, [])

  const payments = data?.payments || []
  const record = data?.record || {}
  const stats = data?.stats || {}

  // Available billing years for filter dropdown
  const availableYears = useMemo(() => {
    const yearsSet = new Set()
    payments.forEach((p) => {
      if (p.billing_year) yearsSet.add(p.billing_year)
      if (p.date) {
        const d = new Date(p.date)
        if (!Number.isNaN(d.getTime())) yearsSet.add(d.getFullYear())
      }
    })
    return Array.from(yearsSet).sort((a, b) => b - a)
  }, [payments])

  const filteredPayments = useMemo(() => {
    return payments.filter((item) => {
      // Search filter
      const q = searchTerm.toLowerCase().trim()
      let matchesSearch = true
      if (q) {
        const receiptStr = String(item.receipt_no || "")
        const methodStr = (item.payment_method || "").toLowerCase()
        const detailsStr = (item.payment_details || "").toLowerCase()
        const periodStr = (item.periodsLabel || "").toLowerCase()

        matchesSearch =
          receiptStr.includes(q) ||
          methodStr.includes(q) ||
          detailsStr.includes(q) ||
          periodStr.includes(q)
      }

      // Year filter
      let matchesYear = true
      if (selectedYear !== "all") {
        const yr = Number(selectedYear)
        const paymentYear = item.billing_year || (item.date ? new Date(item.date).getFullYear() : null)
        matchesYear = paymentYear === yr
      }

      return matchesSearch && matchesYear
    })
  }, [payments, searchTerm, selectedYear])

  const handlePrintReport = async () => {
    if (isGeneratingReport) return
    try {
      setIsGeneratingReport(true)

      const TRACKER_START = { year: 2026, month: 1 }
      const now = new Date()
      const monthsSinceStart =
        (now.getFullYear() - TRACKER_START.year) * 12 +
        (now.getMonth() + 1 - TRACKER_START.month) +
        1
      const trackerMonths = Math.max(monthsSinceStart, 1)

      const [duesRes, trackerRes, userRes] = await Promise.allSettled([
        apiClient.get("/settings/dues"),
        apiClient.get("/payments/tracker", { query: { months: trackerMonths } }),
        apiClient.get("/auth/me"),
      ])

      const monthlyDues = duesRes.status === "fulfilled" && duesRes.value?.amount ? Number(duesRes.value.amount) : 500

      const trackerData = trackerRes.status === "fulfilled" ? (trackerRes.value?.data || trackerRes.value) : null
      const trackerHomeowners = Array.isArray(trackerData?.homeowners) ? trackerData.homeowners : []
      const trackerEntry = trackerHomeowners.find((entry) => String(entry.id) === String(record?.id))
      const unpaidPeriodsList = Array.isArray(trackerEntry?.monthly_status)
        ? trackerEntry.monthly_status.filter((entry) => entry.status === "unpaid").map((entry) => entry.label)
        : []

      const currentUser = userRes.status === "fulfilled" ? (userRes.value?.user || userRes.value) : null
      const generatorName = currentUser
        ? `${currentUser.first_name || ""} ${currentUser.last_name || ""}`.trim() || currentUser.username || `${record?.first_name || ""} ${record?.last_name || ""}`.trim()
        : `${record?.first_name || ""} ${record?.last_name || ""}`.trim() || "Homeowner Account"
      const generatorRole = currentUser ? String(currentUser.role || "HOMEOWNER").toUpperCase() : "HOMEOWNER"
      const generatedBy = `${generatorName} (${generatorRole})`

      const homeownerObj = {
        firstName: record?.first_name || "",
        lastName: record?.last_name || "",
        phase: record?.phase,
        block: record?.block,
        lot: record?.lot,
        unitNumber: record?.unit_number,
        totalPaid: stats?.totalAmountPaid || 0,
        paymentHistory: (payments || []).map((p) => ({
          id: p.id,
          month: p.periodsLabel || "-",
          paidOn: formatDate(p.date),
          amountPaid: Number(p.amount) || 0,
          status: p.payment_status ? (p.payment_status.charAt(0).toUpperCase() + p.payment_status.slice(1)) : "Paid",
        })),
        unpaidPeriods: unpaidPeriodsList,
      }

      const html = buildHomeownerPaymentReportHtml({
        homeowner: homeownerObj,
        monthlyDues,
        generatedAt: new Date(),
        generatedBy,
      })

      if (isMobileOrTablet()) {
        printViaIframe(html)
        return
      }

      const popup = window.open("", "_blank", "width=1100,height=760")
      if (!popup) {
        printViaIframe(html)
        return
      }

      popup.document.open()
      popup.document.write(html)
      popup.document.close()

      popup.onload = () => {
        popup.focus()
        popup.onafterprint = () => {
          popup.close()
        }
        popup.print()
      }
    } catch (err) {
      console.error("Error generating report HTML:", err)
      window.print()
    } finally {
      setIsGeneratingReport(false)
    }
  }

  return (
    <div className={styles.container}>
      {/* Background overlay */}
      <div className={styles.backgroundContainer} aria-hidden="true">
        <div className={styles.gridOverlay} />
        <div className={styles.blob1} />
        <div className={styles.blob2} />
      </div>

      <div className={styles.pageContent}>
        {/* Top Header */}
        <div className={styles.pageHeader}>
          <div>
            <span className={styles.headerBadge}>
              <HiOutlineCreditCard className={styles.inlineIcon} />
              Homeowner Payment Ledger
            </span>
            <h1 className={styles.headerTitle}>My Payment Records</h1>
            <p className={styles.headerSubtitle}>
              Tabular view of official receipts and monthly dues payments recorded under your account.
            </p>
          </div>

          <button
            type="button"
            onClick={handlePrintReport}
            disabled={isGeneratingReport || isLoading}
            className={styles.printBtn}
          >
            <HiOutlineArrowDownTray className={styles.btnIcon} />
            {isGeneratingReport ? "Preparing Report..." : "Print / Save Report"}
          </button>
        </div>

        {isLoading && <p className={styles.stateText}>Loading your payment records...</p>}
        {!isLoading && errorMsg && <p className={styles.errorText}>{errorMsg}</p>}

        {!isLoading && (
          <>
            {/* Top Stat Summary Bar */}
            <section className={styles.statsBar}>
              <div className={`${styles.statTile} ${styles.statTilePrimary}`}>
                <div className={styles.tileIconBox}>
                  <HiOutlineBanknotes className={styles.tileIcon} />
                </div>
                <div>
                  <p className={styles.tileLabel}>Total Amount Paid</p>
                  <h2 className={styles.tileValue}>{formatPeso(stats.totalAmountPaid)}</h2>
                  <p className={styles.tileSub}>Cumulative settled HOA dues</p>
                </div>
              </div>

              <div className={`${styles.statTile} ${styles.statTileTeal}`}>
                <div className={styles.tileIconBox}>
                  <HiOutlineDocumentText className={styles.tileIcon} />
                </div>
                <div>
                  <p className={styles.tileLabel}>Total Official Receipts</p>
                  <h2 className={styles.tileValue}>{stats.totalReceipts || 0} Receipts</h2>
                  <p className={styles.tileSub}>Recorded payments in database</p>
                </div>
              </div>

              <div className={`${styles.statTile} ${styles.statTileBlue}`}>
                <div className={styles.tileIconBox}>
                  <HiOutlineCalendarDays className={styles.tileIcon} />
                </div>
                <div>
                  <p className={styles.tileLabel}>Homeowner Record</p>
                  <h2 className={styles.tileValueName}>
                    {record.first_name ? `${record.first_name} ${record.last_name}` : "Homeowner Account"}
                  </h2>
                  <p className={styles.tileSub}>ID: #{record.generated_id || "RECORD-ACTIVE"}</p>
                </div>
              </div>
            </section>

            {/* Filter and Search Bar */}
            <div className={styles.filterCard}>
              <div className={styles.searchWrap}>
                <HiOutlineMagnifyingGlass className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search receipt #, period, method..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={styles.searchInput}
                />
              </div>

              <div className={styles.filterRight}>
                <div className={styles.selectWrap}>
                  <HiOutlineFunnel className={styles.selectIcon} />
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                    className={styles.selectInput}
                  >
                    <option value="all">All Billing Years</option>
                    {availableYears.map((yr) => (
                      <option key={yr} value={yr}>
                        Year {yr}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Payment Records Table */}
            <div className={styles.tableCard}>
              <div className={styles.tableHeaderRow}>
                <h2 className={styles.tableTitle}>Official Payment History ({filteredPayments.length})</h2>
                <span className={styles.tableSubtitle}>Showing only your personal records</span>
              </div>

              {filteredPayments.length === 0 ? (
                <div className={styles.emptyTableState}>
                  <HiOutlineDocumentText className={styles.emptyIcon} />
                  <h3>No payment records found</h3>
                  <p>No matching payment records found for your current search or year filters.</p>
                </div>
              ) : (
                <div className={styles.tableResponsive}>
                  <table className={styles.paymentsTable}>
                    <thead>
                      <tr>
                        <th>Receipt No.</th>
                        <th>Date Paid</th>
                        <th>Billing Period(s)</th>
                        <th>Amount Paid</th>
                        <th>Method</th>
                        <th>Details / Remarks</th>
                        <th>Recorded By</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPayments.map((payment) => (
                        <tr key={payment.id}>
                          <td className={styles.receiptCell}>
                            <span className={styles.receiptBadge}>#{payment.receipt_no}</span>
                          </td>
                          <td className={styles.dateCell}>{formatDate(payment.date)}</td>
                          <td className={styles.periodCell}>
                            <span className={styles.periodPill}>{payment.periodsLabel || "-"}</span>
                          </td>
                          <td className={styles.amountCell}>{formatPeso(payment.amount)}</td>
                          <td>
                            <span className={styles.methodTag}>{payment.payment_method}</span>
                          </td>
                          <td className={styles.detailsCell}>{payment.payment_details || "-"}</td>
                          <td className={styles.recordedCell}>{payment.recorded_by}</td>
                          <td>
                            <span className={styles.statusPaidBadge}>
                              <HiOutlineCheckCircle className={styles.smallCheck} />
                              Paid
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
