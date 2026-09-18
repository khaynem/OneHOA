const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// ─── Deduplicate homeowners by name + address ───
export const deduplicateHomeowners = (homeowners) => {
  const seen = new Set();
  return homeowners.filter((h) => {
    const lastName = (h.lastName || h.last_name || "").trim().toLowerCase();
    const firstName = (h.firstName || h.first_name || "").trim().toLowerCase();
    const middleName = (h.middleName || h.middle_name || "").trim().toLowerCase();
    const phase = String(h.phase || "").trim();
    const block = String(h.block || "").trim();
    const lot = String(h.lot || "").trim();

    const nameKey = `${lastName}|${firstName}|${middleName}`;
    const addrKey = `${phase}|${block}|${lot}`;
    const key = `${nameKey}@${addrKey}`;

    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

// ─── Sort homeowners by phase → block → lot (numerically) ───
export const sortHomeownersByAddress = (homeowners) => {
  return [...homeowners].sort((a, b) => {
    const phaseA = parseInt(a.phase, 10) || 0;
    const phaseB = parseInt(b.phase, 10) || 0;
    if (phaseA !== phaseB) return phaseA - phaseB;

    const blockA = parseInt(a.block, 10) || 0;
    const blockB = parseInt(b.block, 10) || 0;
    if (blockA !== blockB) return blockA - blockB;

    const lotA = parseInt(a.lot, 10) || 0;
    const lotB = parseInt(b.lot, 10) || 0;
    return lotA - lotB;
  });
};

// ─── CSV / Excel export ───
export const buildHomeownerMasterlistCsv = ({ homeowners }) => {
  const deduped = deduplicateHomeowners(homeowners);
  const sorted = sortHomeownersByAddress(deduped);

  const headers = [
    "No.",
    "Full Name",
    "Resident ID#",
    "Address (Phase Block Lot)",
    "Membership Status",
    "Phone Number",
    "Email",
    "Entry Year",
    "Job Title",
    "Work Status",
    "Household Member Count",
  ];

  const escapeCsv = (v) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = sorted.map((h, idx) => {
    const lastName   = (h.lastName   || "").trim();
    const firstName  = (h.firstName  || "").trim();
    const middleName = (h.middleName || "").trim();
    const suffix     = (h.suffix     || "").trim();

    let fullName = lastName ? `${lastName},` : "";
    if (firstName)  fullName += ` ${firstName}`;
    if (middleName) fullName += ` ${middleName}`;
    if (suffix)     fullName += ` ${suffix}`;
    fullName = fullName.trim();

    const address = `Phase ${h.phase || "-"} Blk ${h.block || "-"} Lot ${h.lot || "-"}`;

    const rawMem = Array.isArray(h.status) ? (h.status[0] || "") : String(h.status || "");
    const membership = rawMem.trim().toUpperCase() || "HANJIN WORKER";

    let entryYearLabel = "-";
    if (h.entryDate) {
      const rawYear = String(h.entryDate).trim().slice(0, 4);
      const parsedYear = parseInt(rawYear, 10);
      if (!isNaN(parsedYear) && parsedYear > 1900 && parsedYear <= 2100) {
        entryYearLabel = String(parsedYear);
      } else if (rawYear && rawYear !== "-") {
        entryYearLabel = rawYear;
      }
    }

    const householdCount = Array.isArray(h.householdMembers)
      ? h.householdMembers.length
      : (Array.isArray(h.household_members) ? h.household_members.length : 0);

    const jobTitle = (h.jobTitle && h.jobTitle !== "-")
      ? h.jobTitle
      : ((h.jobDescription && h.jobDescription !== "-")
          ? h.jobDescription
          : ((h.job_title && h.job_title !== "-") ? h.job_title : "-"));

    const workStatus = (h.workStatus && h.workStatus !== "-")
      ? h.workStatus
      : ((h.work_status && h.work_status !== "-") ? h.work_status : "-");

    // Prefix IDs and phone with ' so Excel preserves leading zeros (treats as text)
    const residentIdCsv = (h.residentId || h.displayId || "-") !== "-"
      ? `'${h.residentId || h.displayId}`
      : "-";
    const phoneCsv = h.phone && h.phone !== "-"
      ? `'${h.phone}`
      : (h.phone || "-");

    return [
      idx + 1,
      fullName || "-",
      residentIdCsv,
      address,
      membership,
      phoneCsv,
      h.email || "-",
      entryYearLabel,
      jobTitle,
      workStatus,
      householdCount,
    ].map(escapeCsv).join(",");
  });

  return [headers.map(escapeCsv).join(","), ...rows].join("\r\n");
};

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
      "hanjin-worker": "HANJIN WORKER",
      "commercial": "COMMERCIAL",
      "renter": "RENTER",
      "caretaker": "CARETAKER",
      "other": "OTHER"
    };
    filterParts.push(`Membership: ${statusLabels[filters.statusFilter] || filters.statusFilter.toUpperCase()}`);
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

  // ─── Sort and group homeowners by phase → block → lot ───
  const deduped = deduplicateHomeowners(homeowners);
  const sorted = sortHomeownersByAddress(deduped);

  const UNASSIGNED_KEY = "__unassigned__";
  const phaseGroups = {};

  sorted.forEach((h) => {
    const phase = (h.phase || "").trim();
    const key = phase || UNASSIGNED_KEY;
    if (!phaseGroups[key]) phaseGroups[key] = [];
    phaseGroups[key].push(h);
  });

  // Phase keys in sorted order (already in address order, just need key list)
  const phaseKeys = Object.keys(phaseGroups).sort((a, b) => {
    if (a === UNASSIGNED_KEY) return 1;
    if (b === UNASSIGNED_KEY) return -1;
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  });

  // Global running counter for No. column (1-indexed)
  let globalRowIndex = 1;

  // ─── Helper to render a single homeowner row ───
  const renderRow = (h) => {
    const no = globalRowIndex++;

    // Full name: Lastname, Firstname Middlename Suffix
    const lastName   = (h.lastName   || "").trim();
    const firstName  = (h.firstName  || "").trim();
    const middleName = (h.middleName || "").trim();
    const suffix     = (h.suffix     || "").trim();
    let fullName = lastName ? `${lastName},` : "";
    if (firstName)  fullName += ` ${firstName}`;
    if (middleName) fullName += ` ${middleName}`;
    if (suffix)     fullName += ` ${suffix}`;
    fullName = fullName.trim() || "-";

    const address = `Phase ${h.phase || "-"} Blk ${h.block || "-"} Lot ${h.lot || "-"}`;

    // Membership badge
    const rawMem = Array.isArray(h.status) ? (h.status[0] || "") : String(h.status || "");
    const memStatus = String(rawMem).trim().toUpperCase();
    const memLabel = memStatus || "HANJIN WORKER";
    let memBadgeClass = "badge-member";
    if (memStatus === "RENTER" || memStatus === "CARETAKER" || memStatus === "OTHER") {
      memBadgeClass = "badge-nonmember";
    } else if (memStatus === "COMMERCIAL") {
      memBadgeClass = "badge-commercial";
    }

    // Entry Year: 4-digit Year only
    let entryYearLabel = "-";
    if (h.entryDate) {
      const rawYear = String(h.entryDate).trim().slice(0, 4);
      const parsedYear = parseInt(rawYear, 10);
      if (!isNaN(parsedYear) && parsedYear > 1900 && parsedYear <= 2100) {
        entryYearLabel = String(parsedYear);
      } else if (rawYear && rawYear !== "-") {
        entryYearLabel = rawYear;
      }
    }

    const jobTitle = (h.jobTitle && h.jobTitle !== "-")
      ? h.jobTitle
      : ((h.jobDescription && h.jobDescription !== "-")
          ? h.jobDescription
          : ((h.job_title && h.job_title !== "-") ? h.job_title : "-"));

    const workStatus = (h.workStatus && h.workStatus !== "-")
      ? h.workStatus
      : ((h.work_status && h.work_status !== "-") ? h.work_status : "-");

    const householdCount = Array.isArray(h.householdMembers)
      ? h.householdMembers.length
      : (Array.isArray(h.household_members) ? h.household_members.length : 0);

    return `
      <tr>
        <td style="text-align:center; color:#64748b; font-weight:500;">${no}</td>
        <td style="font-weight:600;">${escapeHtml(fullName)}</td>
        <td style="font-family:monospace; font-weight:600; color:#0a68b2;">${escapeHtml(h.residentId || h.displayId || "-")}</td>
        <td>${escapeHtml(address)}</td>
        <td><span class="status-badge ${memBadgeClass}">${escapeHtml(memLabel)}</span></td>
        <td>${escapeHtml(h.phone || "-")}</td>
        <td style="font-size:10px;">${escapeHtml(h.email || "-")}</td>
        <td style="text-align:center; white-space:nowrap;">${escapeHtml(entryYearLabel)}</td>
        <td>${escapeHtml(jobTitle)}</td>
        <td>${escapeHtml(workStatus)}</td>
        <td style="text-align:center; font-weight:600;">${householdCount}</td>
      </tr>
    `;
  };

  // ─── Render phase sections ───
  const renderPhaseSection = (phaseKey) => {
    const group = phaseGroups[phaseKey];
    if (!group || group.length === 0) return "";

    const phaseLabel = phaseKey === UNASSIGNED_KEY ? "Unassigned" : `Phase ${phaseKey}`;
    const recordsLabel = `${group.length} Record${group.length !== 1 ? "s" : ""}`;

    return `
    <div class="phase-section">
      <div class="phase-header">
        <span class="phase-title">${phaseLabel}</span>
        <span class="phase-count">${recordsLabel}</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width:36px; text-align:center;">No.</th>
            <th>Full Name</th>
            <th>Resident ID#</th>
            <th>Address (Ph-Blk-Lot)</th>
            <th>Membership Status</th>
            <th>Phone Number</th>
            <th>Email</th>
            <th style="text-align:center;">Entry Year</th>
            <th>Job Title</th>
            <th>Work Status</th>
            <th style="text-align:center;">HH Members</th>
          </tr>
        </thead>
        <tbody>
          ${group.map(renderRow).join("")}
        </tbody>
      </table>
    </div>`;
  };

  const phaseSectionsHtml = phaseKeys.map(renderPhaseSection).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>OneHOA Masterlist Report</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 18px 26px;
      color: #0f172a;
      line-height: 1.4;
      background: #ffffff;
    }
    
    /* Branding Header */
    .header {
      display: flex;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 12px;
    }
    .logo {
      height: 48px;
      width: 48px;
      object-fit: contain;
      margin-right: 12px;
    }
    .header-text { flex: 1; }
    .org-name {
      font-size: 15px;
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
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 10px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      text-align: center;
    }
    
    /* Phase Section Headers */
    .phase-section {
      margin-bottom: 18px;
    }
    .phase-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: linear-gradient(135deg, #0a68b2, #095b9b);
      color: #ffffff;
      padding: 8px 14px;
      border-radius: 6px 6px 0 0;
      break-after: avoid;
      page-break-after: avoid;
    }
    .phase-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .phase-count {
      font-size: 11px;
      opacity: 0.85;
      font-weight: 500;
    }
    
    /* Table Styling */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 0;
    }
    thead {
      display: table-header-group;
    }
    th {
      background: #f1f5f9;
      color: #0f172a;
      font-weight: 700;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 6px 8px;
      text-align: left;
      border-bottom: 2px solid #cbd5e1;
      white-space: nowrap;
    }
    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    td {
      padding: 5px 8px;
      font-size: 10px;
      color: #334155;
      border-bottom: 1px solid #e2e8f0;
      word-break: break-word;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    
    /* Status Badges */
    .status-badge {
      display: inline-block;
      font-size: 8px;
      font-weight: 700;
      padding: 2px 5px;
      border-radius: 4px;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .badge-member   { color: #166534; background: #dcfce7; }
    .badge-commercial { color: #92400e; background: #fef3c7; }
    .badge-nonmember { color: #854d0e; background: #fef9c3; }
    .badge-na       { color: #475569; background: #f1f5f9; }
    
    /* Footer */
    .footer {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 10px;
      color: #64748b;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .footer-meta {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .footer-meta div {
      color: #334155;
    }
    .footer-meta strong {
      color: #0f172a;
      margin-right: 4px;
    }
    .footer-note { font-style: italic; text-align: right; }
    
    @media print {
      body { margin: 0; padding: 8px 12px; }
      @page { size: landscape; margin: 8mm; }
      .phase-header { background: #0a68b2 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; break-after: avoid; page-break-after: avoid; }
      thead { display: table-header-group; }
      th { background: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tr { break-inside: avoid; page-break-inside: avoid; }
      .badge-member     { background: #dcfce7 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge-commercial { background: #fef3c7 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge-nonmember  { background: #fef9c3 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .badge-na         { background: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .footer { break-inside: avoid; page-break-inside: avoid; }
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

  ${deduped.length === 0 
    ? '<div style="text-align: center; color: #64748b; padding: 40px 0; font-size: 14px;">No homeowner records found matching the current filters.</div>'
    : phaseSectionsHtml
  }

  <!-- Footer Area -->
  <div class="footer">
    <div class="footer-meta">
      <div><strong>Total Records:</strong> ${deduped.length} Homeowners</div>
      <div><strong>Applied Filters:</strong> ${escapeHtml(appliedFiltersText)}</div>
      <div><strong>Generated by:</strong> ${escapeHtml(generatedBy || 'Authorized Officer')}</div>
      <div><strong>Date Generated:</strong> ${escapeHtml(generatedLabel)}</div>
    </div>
    <div class="footer-note">
      *This masterlist is generated from OneHOA Homeowner Records.
    </div>
  </div>

</body>
</html>`;
};
