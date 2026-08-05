export function inferPaymentStatus(paymentStatus, paymentDetails, paymentMethod) {
  if (paymentStatus && ["paid", "unpaid"].includes(String(paymentStatus).toLowerCase())) {
    return String(paymentStatus).toLowerCase();
  }

  const statusText = `${paymentDetails || ""} ${paymentMethod || ""}`;
  return /unpaid/i.test(statusText) ? "unpaid" : "paid";
}

export function getBillingMonthAndYear(dateInput, billingMonthInput, billingYearInput) {
  const parsedDate = new Date(dateInput);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  const billingMonth = Number(billingMonthInput) || parsedDate.getMonth() + 1;
  const billingYear = Number(billingYearInput) || parsedDate.getFullYear();

  if (!Number.isInteger(billingMonth) || billingMonth < 1 || billingMonth > 12) {
    return null;
  }

  if (!Number.isInteger(billingYear) || billingYear < 2000 || billingYear > 3000) {
    return null;
  }

  return {
    parsedDate,
    billingMonth,
    billingYear,
    billingPeriod: billingYear * 100 + billingMonth,
  };
}

export function toPeriod(year, month) {
  const normalizedYear = Number(year);
  const normalizedMonth = Number(month);

  if (!Number.isInteger(normalizedYear) || normalizedYear < 2000 || normalizedYear > 3000) {
    return null;
  }

  if (!Number.isInteger(normalizedMonth) || normalizedMonth < 1 || normalizedMonth > 12) {
    return null;
  }

  return normalizedYear * 100 + normalizedMonth;
}

export function parsePaymentForEntry(entry) {
  if (typeof entry === "number") {
    const period = Number(entry);
    const year = Math.floor(period / 100);
    const month = period % 100;
    return toPeriod(year, month);
  }

  if (typeof entry === "string") {
    const value = entry.trim();

    if (/^\d{6}$/.test(value)) {
      const period = Number(value);
      const year = Math.floor(period / 100);
      const month = period % 100;
      return toPeriod(year, month);
    }

    const match = value.match(/^(\d{4})-(\d{1,2})$/);
    if (match) {
      return toPeriod(Number(match[1]), Number(match[2]));
    }

    return null;
  }

  if (entry && typeof entry === "object") {
    const year = entry.year ?? entry.billing_year;
    const month = entry.month ?? entry.billing_month;
    return toPeriod(year, month);
  }

  return null;
}

export function normalizePaymentForPeriods(paymentForInput, fallbackPeriod) {
  if (paymentForInput === undefined || paymentForInput === null || paymentForInput === "") {
    return [fallbackPeriod];
  }

  const inputArray = Array.isArray(paymentForInput) ? paymentForInput : [paymentForInput];
  const parsedPeriods = [];

  for (const entry of inputArray) {
    const parsedPeriod = parsePaymentForEntry(entry);
    if (!parsedPeriod) {
      return null;
    }
    parsedPeriods.push(parsedPeriod);
  }

  if (parsedPeriods.length === 0) {
    return [fallbackPeriod];
  }

  return Array.from(new Set(parsedPeriods)).sort((a, b) => a - b);
}

export function getCoveredPeriodsFromPayment(payment, startPeriod, endPeriod) {
  const coveredPeriods =
    Array.isArray(payment.payment_for_periods) && payment.payment_for_periods.length > 0
      ? payment.payment_for_periods
      : [
        Number(payment.billing_period) ||
        toPeriod(payment.billing_year, payment.billing_month) ||
        toPeriod(new Date(payment.date).getFullYear(), new Date(payment.date).getMonth() + 1),
      ];

  return coveredPeriods
    .map((period) => Number(period))
    .filter((period) => Number.isInteger(period) && period >= startPeriod && period <= endPeriod);
}

export async function generateNextReceiptNumber(PaymentModel, _dateValue) {
  // Global sequential range (10000001-99999999): the next number is always one
  // past the highest receipt across ALL billing periods, so the sequence never
  // restarts per period. Existing in-range receipts (including legacy YYMMXXXX
  // ones) simply set the high-water mark.
  const minReceipt = 10000001;
  const maxReceipt = 99999999;

  const lastInRange = await PaymentModel.findOne({
    receipt_no: { $gte: minReceipt, $lte: maxReceipt },
  })
    .sort({ receipt_no: -1 })
    .select("receipt_no")
    .lean();

  const nextNumber = lastInRange ? lastInRange.receipt_no + 1 : minReceipt;

  // The sequence never restarts or reuses numbers: once 99999999 is taken,
  // it is exhausted and no further receipts can be generated (caller returns
  // an error). Only ever strictly increasing, across all billing periods.
  return nextNumber <= maxReceipt ? nextNumber : null;
}

export function formatPeriodLabel(periods) {
  const formatSingle = (period) => {
    const periodStr = String(period || "").trim();
    if (!/^\d{6}$/.test(periodStr)) return periodStr;

    const year = periodStr.substring(0, 4);
    const monthIndex = parseInt(periodStr.substring(4, 6), 10) - 1;

    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    if (monthIndex < 0 || monthIndex > 11) return periodStr;
    return `${months[monthIndex]} ${year}`;
  };

  if (Array.isArray(periods)) {
    return periods.map(formatSingle).join(", ");
  }

  return formatSingle(periods);
}
