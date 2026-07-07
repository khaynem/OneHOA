const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const buildHomeownerMasterlistHtml = ({ homeowners, filters, generatedAt, generatedBy }) => {
  const generatedLabel = generatedAt
    ? new Date(generatedAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
    : "";

  // Compile active filters label
  const filterParts = [];
  if (filters.phaseFilter && filters.phaseFilter !== "all") {
    filterParts.push(`Phase: ${filters.phaseFilter}`);
  } else {
    filterParts.push("Phases: All");
  }

  if (filters.statusFilter && filters.statusFilter !== "all") {
    const statusLabels = {
      "ho-non-hvna": "HO, not HVNA member",
      "ho-hvna": "HO, HVNA member",
      "na": "N/A"
    };
    filterParts.push(`Membership: ${statusLabels[filters.statusFilter] || filters.statusFilter}`);
  }

  if (filters.occupantFilter && filters.occupantFilter !== "all") {
    filterParts.push(`Occupant: Owners Only`);
  }

  if (filters.paymentFilter && filters.paymentFilter !== "all") {
    const paymentLabels = {
      "current-due": "Monthly due this month (unpaid)",
      "past-due": "Past monthly dues unpaid"
    };
    filterParts.push(`Payment Status: ${paymentLabels[filters.paymentFilter] || filters.paymentFilter}`);
  }

  if (filters.searchText && filters.searchText.trim()) {
    filterParts.push(`Search: "${filters.searchText.trim()}"`);
  }

  const appliedFiltersText = filterParts.join(" | ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>OneHOA Masterlist Report</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 30px;
      color: #0f172a;
      line-height: 1.4;
      background: #ffffff;
    }
    
    /* Branding Header */
    .header {
      display: flex;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .logo {
      height: 48px;
      width: 48px;
      object-fit: contain;
      margin-right: 12px;
    }
    .header-text {
      flex: 1;
    }
    .org-name {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0;
    }
    .org-sub {
      font-size: 11px;
      color: #475569;
      margin: 2px 0 0 0;
    }
    
    /* Report Title */
    .report-title {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 16px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      text-align: center;
    }
    
    /* Filter Info Section */
    .filter-section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 20px;
      font-size: 13px;
    }
    .filter-row {
      display: flex;
      margin-bottom: 6px;
    }
    .filter-row:last-child {
      margin-bottom: 0;
    }
    .filter-label {
      font-weight: 600;
      color: #475569;
      width: 140px;
      flex-shrink: 0;
    }
    .filter-value {
      color: #0f172a;
      font-weight: 500;
    }
    
    /* Table Styling */
    .table-container {
      margin-bottom: 24px;
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
    }
    th {
      background: #0a68b2;
      color: #ffffff;
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 10px;
      text-align: left;
      border-bottom: 2px solid #095b9b;
      white-space: nowrap;
    }
    td {
      padding: 8px 10px;
      font-size: 11px;
      color: #334155;
      border-bottom: 1px solid #e2e8f0;
      word-break: break-word;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    
    /* Status Badges */
    .status-badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 700;
      padding: 2px 5px;
      border-radius: 4px;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .badge-member {
      color: #166534;
      background: #dcfce7;
    }
    .badge-nonmember {
      color: #854d0e;
      background: #fef9c3;
    }
    .badge-na {
      color: #475569;
      background: #f1f5f9;
    }
    
    .badge-owner {
      color: #1e3a8a;
      background: #dbeafe;
    }
    .badge-relative {
      color: #581c87;
      background: #f3e8ff;
    }
    .badge-renter {
      color: #0369a1;
      background: #e0f2fe;
    }
    .badge-caretaker {
      color: #701a75;
      background: #fdf2f8;
    }
    
    /* Footer */
    .footer {
      margin-top: 40px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 11px;
      color: #64748b;
    }
    .footer-meta div {
      margin-bottom: 2px;
    }
    .footer-note {
      font-style: italic;
      text-align: right;
    }
    
    @media print {
      body { margin: 10px; }
      @page {
        size: landscape;
        margin: 10mm;
      }
      th { background: #0a68b2 !important; color: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .filter-section { background: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge-member { background: #dcfce7 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge-nonmember { background: #fef9c3 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge-na { background: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge-owner { background: #dbeafe !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge-relative { background: #f3e8ff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge-renter { background: #e0f2fe !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge-caretaker { background: #fdf2f8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  
  <!-- Header with HOA Logo -->
  <div class="header">
    <img src="/images/HOA_Logo.png" alt="FC Hanjin Village HOA Logo" class="logo" />
    <div class="header-text">
      <h2 class="org-name">FC Hanjin Village Homeowners Association</h2>
      <p class="org-sub">Brgy. Nagbunga, Castillejos, Zambales</p>
    </div>
  </div>

  <h1 class="report-title">Homeowner Masterlist Report</h1>

  <!-- Filters / Report Summary -->
  <div class="filter-section">
    <div class="filter-row">
      <div class="filter-label">Total Records:</div>
      <div class="filter-value">${homeowners.length} Homeowners</div>
    </div>
    <div class="filter-row">
      <div class="filter-label">Applied Filters:</div>
      <div class="filter-value">${escapeHtml(appliedFiltersText)}</div>
    </div>
  </div>

  <!-- Masterlist Table -->
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>Resident ID</th>
          <th>Name</th>
          <th>Address (Ph-Blk-Lot)</th>
          <th>Contact Info</th>
          <th>Occupant Status</th>
          <th>Membership</th>
          <th>Entry Year</th>
          <th>Occupation</th>
        </tr>
      </thead>
      <tbody>
        ${homeowners.length === 0 
          ? '<tr><td colspan="8" style="text-align: center; color: #64748b;">No homeowner records found matching the current filters.</td></tr>' 
          : homeowners.map((h) => {
              const fullName = `${h.firstName || ""} ${h.middleName ? h.middleName + " " : ""}${h.lastName || ""}`.trim() || "-";
              const address = `Phase ${h.phase || "-"}, Blk ${h.block || "-"}, Lot ${h.lot || "-"}`;
              const contactInfo = [h.phone, h.email].filter(Boolean).join(" / ") || "-";
              
              // Membership badge classes
              const memStatus = String(h.status || "ho, not hvna member").toLowerCase();
              let memBadgeClass = "badge-nonmember";
              let memLabel = "HO, not HVNA member";
              if (memStatus.includes("hvna member")) {
                memBadgeClass = "badge-member";
                memLabel = "HO, HVNA member";
              } else if (memStatus.includes("n/a")) {
                memBadgeClass = "badge-na";
                memLabel = "N/A";
              }

              // Occupant status badge classes
              const occStatus = String(h.occupantStatus || "owner").toLowerCase();
              let occBadgeClass = "badge-owner";
              let occLabel = h.occupantStatus || "Owner";
              if (occStatus.includes("relative")) {
                occBadgeClass = "badge-relative";
              } else if (occStatus.includes("renter")) {
                occBadgeClass = "badge-renter";
              } else if (occStatus.includes("caretaker")) {
                occBadgeClass = "badge-caretaker";
              }

              const jobLabel = [h.jobDescription, h.workStatus].filter(Boolean).join(" (${h.workStatus || ''})") || "-";
              const displayJob = h.jobDescription 
                ? `${escapeHtml(h.jobDescription)}${h.workStatus ? ` <span style="color: #64748b; font-size: 10px;">(${escapeHtml(h.workStatus)})</span>` : ""}`
                : (h.workStatus ? escapeHtml(h.workStatus) : "-");

              return `
                <tr>
                  <td style="font-weight: 600; font-family: monospace;">${escapeHtml(h.displayId || h.residentId || "-")}</td>
                  <td style="font-weight: 500;">${escapeHtml(fullName)}</td>
                  <td>${escapeHtml(address)}</td>
                  <td>${escapeHtml(contactInfo)}</td>
                  <td><span class="status-badge ${occBadgeClass}">${escapeHtml(occLabel)}</span></td>
                  <td><span class="status-badge ${memBadgeClass}">${escapeHtml(memLabel)}</span></td>
                  <td>${escapeHtml(h.entryDate ? h.entryDate.slice(0, 4) : "-")}</td>
                  <td>${displayJob}</td>
                </tr>
              `;
            }).join("")
        }
      </tbody>
    </table>
  </div>

  <!-- Footer Area -->
  <div class="footer">
    <div class="footer-meta">
      <div><strong>Date Generated:</strong> ${escapeHtml(generatedLabel)}</div>
      <div><strong>Generated by:</strong> ${escapeHtml(generatedBy || 'Authorized Officer')}</div>
    </div>
    <div class="footer-note">
      *This masterlist is generated from OneHOA Homeowner Records.
    </div>
  </div>

</body>
</html>`;
};
