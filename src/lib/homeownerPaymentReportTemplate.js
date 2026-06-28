const formatPeso = (amount) => {
  const value = Number(amount) || 0;
  return `PHP ${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const buildHomeownerPaymentReportHtml = ({ homeowner, monthlyDues, generatedAt, generatedBy }) => {
  const name = `${homeowner.firstName || ""} ${homeowner.lastName || ""}`.trim() || "Homeowner";
  
  const address = homeowner.phase || homeowner.block || homeowner.lot
    ? `Phase ${homeowner.phase || '-'}, Block ${homeowner.block || '-'}, Lot ${homeowner.lot || '-'}, Hanjin Village, Brgy. Nagbunga, Castillejos, Zambales`
    : (homeowner.unitNumber || '-');

  const totalPaid = formatPeso(homeowner.totalPaid || 0);
  const duesAmount = formatPeso(monthlyDues || 0);
  const paidRows = Array.isArray(homeowner.paymentHistory) ? homeowner.paymentHistory : [];
  const unpaidPeriods = Array.isArray(homeowner.unpaidPeriods) ? homeowner.unpaidPeriods : [];
  const generatedLabel = generatedAt
    ? new Date(generatedAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Payment Report - ${escapeHtml(name)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 40px;
      color: #0f172a;
      line-height: 1.5;
      background: #ffffff;
    }
    
    /* Branding Header */
    .header {
      display: flex;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .logo {
      height: 52px;
      width: 52px;
      object-fit: contain;
      margin-right: 14px;
    }
    .header-text {
      flex: 1;
    }
    .org-name {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0;
    }
    .org-sub {
      font-size: 12px;
      color: #475569;
      margin: 2px 0 0 0;
    }
    
    /* Report Title */
    .report-title {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin: 0 0 20px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
      text-align: center;
    }
    
    /* Homeowner Profile */
    .profile-section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .profile-row {
      display: flex;
      font-size: 14px;
      margin-bottom: 8px;
    }
    .profile-row:last-child {
      margin-bottom: 0;
    }
    .profile-label {
      font-weight: 600;
      color: #475569;
      width: 160px;
      flex-shrink: 0;
    }
    .profile-value {
      color: #0f172a;
      font-weight: 500;
    }
    
    /* Summary Cards */
    .summary-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .summary-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 16px;
      background: #ffffff;
    }
    .summary-card.paid {
      border-left: 4px solid #0f766e; /* Teal accent */
    }
    .summary-card.dues {
      border-left: 4px solid #2563eb; /* Blue accent */
    }
    .summary-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      display: block;
    }
    .summary-value {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 6px;
      display: block;
    }
    
    /* Unpaid Months Section */
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 28px 0 10px 0;
      display: block;
    }
    .unpaid-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 24px;
    }
    .unpaid-pill {
      background: #fee2e2;
      color: #991b1b;
      font-size: 12px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 4px;
      border: 1px solid #fca5a5;
    }
    .no-unpaid {
      color: #166534;
      font-size: 13px;
      font-weight: 600;
      background: #dcfce7;
      padding: 10px 14px;
      border-radius: 6px;
      border: 1px solid #bbf7d0;
      margin-bottom: 24px;
    }
    
    /* Table Styling */
    .table-container {
      margin-bottom: 30px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    th {
      background: #0a68b2;
      color: #ffffff;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 10px 14px;
      text-align: left;
      border-bottom: 2px solid #095b9b;
    }
    td {
      padding: 10px 14px;
      font-size: 13px;
      color: #334155;
      border-bottom: 1px solid #e2e8f0;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .text-right {
      text-align: right;
    }
    .status-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
    }
    .status-paid {
      color: #166534;
      background: #dcfce7;
    }
    .status-pending {
      color: #854d0e;
      background: #fef9c3;
    }
    .total-row td {
      background: #e5e7eb !important;
      font-weight: 700;
      font-size: 13px;
      color: #0f172a;
      border-top: 2px solid #cbd5e1;
      border-bottom: 2px solid #cbd5e1;
    }
    
    /* Footer */
    .footer {
      margin-top: 50px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 13px;
      color: #64748b;
    }
    .footer-meta div {
      margin-bottom: 4px;
    }
    .footer-note {
      font-style: italic;
      text-align: right;
    }
    
    @media print {
      body { margin: 20px; }
      th { background: #0a68b2 !important; color: #ffffff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .profile-section { background: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .summary-card { background: #ffffff !important; }
      .no-unpaid { background: #dcfce7 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .unpaid-pill { background: #fee2e2 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .total-row td { background: #e5e7eb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
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

  <h1 class="report-title">Homeowner Payment Report</h1>

  <!-- Homeowner Profile -->
  <div class="profile-section">
    <div class="profile-row">
      <div class="profile-label">Homeowner Name:</div>
      <div class="profile-value">${escapeHtml(name)}</div>
    </div>
    <div class="profile-row">
      <div class="profile-label">Homeowner Address:</div>
      <div class="profile-value">${escapeHtml(address)}</div>
    </div>
  </div>

  <!-- Summary Cards -->
  <div class="summary-section">
    <div class="summary-card paid">
      <span class="summary-label">Total Amount Paid</span>
      <span class="summary-value">${escapeHtml(totalPaid)}</span>
    </div>
    <div class="summary-card dues">
      <span class="summary-label">Monthly Dues Rate</span>
      <span class="summary-value">${escapeHtml(duesAmount)}</span>
    </div>
  </div>

  <!-- Unpaid Months -->
  <span class="section-title">Unpaid Months (since January 2026)</span>
  ${unpaidPeriods.length === 0 
    ? '<div class="no-unpaid">Account is fully paid. No outstanding unpaid dues in the tracked period.</div>' 
    : `<div class="unpaid-list">${unpaidPeriods.map((period) => `<span class="unpaid-pill">${escapeHtml(period)}</span>`).join("")}</div>`
  }

  <!-- Payment History Table -->
  <span class="section-title">Payment History</span>
  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>Month</th>
          <th>Date of Payment</th>
          <th class="text-right">Amount Paid</th>
          <th>Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${paidRows.length === 0 
          ? '<tr><td colspan="4" style="text-align: center; color: #64748b;">No recorded payments found.</td></tr>' 
          : paidRows.map((payment) => {
              const statusClass = String(payment.status || '').toLowerCase() === 'paid' ? 'status-paid' : 'status-pending';
              return `
                <tr>
                  <td>${escapeHtml(payment.month)}</td>
                  <td>${escapeHtml(payment.paidOn)}</td>
                  <td class="text-right">${escapeHtml(formatPeso(payment.amountPaid))}</td>
                  <td><span class="status-badge ${statusClass}">${escapeHtml(payment.status)}</span></td>
                </tr>
              `;
            }).join("")
        }
        ${paidRows.length > 0 ? `
          <tr class="total-row">
            <td colspan="2" class="text-right">Total Paid:</td>
            <td class="text-right">${escapeHtml(totalPaid)}</td>
            <td></td>
          </tr>
        ` : ''}
      </tbody>
    </table>
  </div>

  <!-- Footer Area -->
  <div class="footer">
    <div class="footer-meta">
      <div><strong>Date and Time Generated:</strong> ${escapeHtml(generatedLabel)}</div>
      <div><strong>Generated by:</strong> ${escapeHtml(generatedBy || 'Authorized Officer')}</div>
    </div>
    <div class="footer-note">
      *This report is generated from OneHOA Payment Records.
    </div>
  </div>

</body>
</html>`;
};
