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
import styles from "./my-payments.module.css"

const formatPeso = (amount) => {
  const num = Number(amount) || 0
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(num)
}

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

  const handlePrintTable = () => {
    window.print()
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

          <button type="button" onClick={handlePrintTable} className={styles.printBtn}>
            <HiOutlineArrowDownTray className={styles.btnIcon} />
            Print / Save Report
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
