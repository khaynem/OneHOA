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
  const unitNumber = homeowner.unitNumber || "-";
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
  <title>Homeowner Payment Report</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: "Poppins", "Segoe UI", sans-serif; margin: 32px; color: #111827; }
    h1 { font-size: 24px; margin: 0 0 6px; }
    h2 { font-size: 18px; margin: 24px 0 10px; }
    p { margin: 0 0 6px; }
    .meta { color: #6b7280; font-size: 13px; }
    .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 18px; }
    .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; background: #f8fafc; }
    .card-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; }
    .card-value { font-size: 18px; font-weight: 700; margin-top: 6px; }
    .pill { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #fee2e2; color: #991b1b; font-size: 12px; font-weight: 600; margin: 4px 6px 0 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 10px; font-size: 13px; text-align: left; }
    th { background: #eff6ff; }
    .footer { margin-top: 28px; font-size: 12px; color: #6b7280; }
    @media print { body { margin: 16px; } }
  </style>
</head>
<body>
  <h1>Homeowner Payment Report</h1>
  <p><strong>${escapeHtml(name)}</strong> &mdash; Unit ${escapeHtml(unitNumber)}</p>
  <p class="meta">Generated ${escapeHtml(generatedLabel)}${generatedBy ? ` by ${escapeHtml(generatedBy)}` : ""}</p>

  <div class="summary">
    <div class="card">
      <div class="card-label">Total Amount Paid</div>
      <div class="card-value">${escapeHtml(totalPaid)}</div>
    </div>
    <div class="card">
      <div class="card-label">Monthly Dues</div>
      <div class="card-value">${escapeHtml(duesAmount)}</div>
    </div>
  </div>

  <h2>Unpaid Months (since January 2026)</h2>
  ${unpaidPeriods.length === 0 ? '<p class="meta">No unpaid dues in the tracked period.</p>' : unpaidPeriods.map((period) => `<span class="pill">${escapeHtml(period)}</span>`).join("")}

  <h2>Payment History</h2>
  <table>
    <thead>
      <tr>
        <th>Month</th>
        <th>Date of Payment</th>
        <th>Amount Paid</th>
        <th>Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${paidRows.length === 0 ? '<tr><td colspan="4">No recorded payments.</td></tr>' : paidRows.map((payment) => `
        <tr>
          <td>${escapeHtml(payment.month)}</td>
          <td>${escapeHtml(payment.paidOn)}</td>
          <td>${escapeHtml(formatPeso(payment.amountPaid))}</td>
          <td>${escapeHtml(payment.status)}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <p class="footer">This report is generated from OneHOA payment records.</p>
</body>
</html>`;
};
