const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const buildNameStyle = (lastName = '', firstName = '') => {
  const maxLen = Math.max(String(lastName).trim().length, String(firstName).trim().length)
  let fontSize = 4.2

  if (maxLen > 12) {
    fontSize = 3.8
  }
  if (maxLen > 16) {
    fontSize = 3.4
  }
  if (maxLen > 20) {
    fontSize = 3.0
  }
  if (maxLen > 24) {
    fontSize = 2.6
  }

  return `font-size: ${fontSize}mm; line-height: 1.15;`
}

export const buildHomeownerIdCardHtml = (homeowner = {}, baseUrl = '') => {
  const lastName = (homeowner.lastName || '').trim()
  const firstName = (homeowner.firstName || '').trim()
  const formattedLastName = lastName ? `${lastName},` : ''
  const formattedFirstName = firstName
  
  const unitText = `Phase ${homeowner.phase || '-'}, Block ${homeowner.block || '-'}, Lot ${homeowner.lot || '-'}`
  const residentId = homeowner.displayId || homeowner.residentId || homeowner.id || '-'
  const photoUrl = homeowner.photoUrl || ''
  const normalizedBase = baseUrl ? String(baseUrl).replace(/\/$/, '') : ''
  const frontBg = `${normalizedBase}/images/FRONT_bg.png`
  const backBg = `${normalizedBase}/images/BACK-bg.png`

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ID Card - ${escapeHtml(lastName || firstName ? `${lastName}, ${firstName}` : 'HOMEOWNER')}</title>
  <style>
    :root {
      --page-width: 210mm;
      --page-height: 297mm;
      --card-width: 60mm;
      --card-height: 90mm;
      --accent-red: #d81919;
      --ink: #111;
      --muted: #333;
    }
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #fff;
      font-family: Arial, sans-serif;
      color: var(--ink);
    }
    img { max-width: 100%; }
    .page {
      width: var(--page-width);
      height: var(--page-height);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6mm;
      padding: 0;
    }
    .card {
      width: var(--card-width);
      height: var(--card-height);
      position: relative;
      overflow: hidden;
      border: 2px solid #000;
    }
    .bgImage {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: 0;
    }
    .front,
    .back {
      isolation: isolate;
    }
    .fieldId {
      position: absolute;
      left: 0;
      right: 0;
      top: 20mm;
      width: 100%;
      font-size: 3.2mm;
      font-weight: 800;
      color: var(--ink);
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      z-index: 1;
    }
    .fieldIdValue {
      color: var(--accent-red);
    }
    .fieldName {
      position: absolute;
      left: 2mm;
      right: 2mm;
      top: 53.5mm;
      font-weight: 700;
      text-align: center;
      text-transform: uppercase;
      white-space: normal;
      word-break: break-word;
      overflow: hidden;
      color: var(--ink);
      z-index: 1;
    }
    .lastName {
      font-size: 1.12em;
      font-weight: 800;
      line-height: 1.1;
    }
    .firstName {
      font-size: 0.9em;
      font-weight: 700;
      line-height: 1.1;
      margin-top: 0.5mm;
    }
    .fieldUnit {
      position: absolute;
      left: 2mm;
      right: 2mm;
      top: 67mm;
      font-size: 3.2mm;
      font-weight: 700;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #0c64b6;
      z-index: 1;
    }
    .photo,
    .photoPlaceholder {
      position: absolute;
      left: calc(50% - 13mm);
      top: 25.5mm;
      width: 26mm;
      height: 26mm;
      border: 0.35mm solid #000;
      background: #fafafa;
      z-index: 1;
    }
    .photo {
      object-fit: cover;
    }
    .photoPlaceholder {
      display: grid;
      place-items: center;
      color: var(--muted);
      font-size: 3mm;
      font-weight: 700;
      text-transform: uppercase;
    }
    @media print {
      body { margin: 0; }
      .page {
        padding: 0;
        gap: 8mm;
      }
      * {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <section class="card front">
      <img src="${escapeHtml(frontBg)}" alt="" class="bgImage" />
      <div class="fieldId">ID: <span class="fieldIdValue">${escapeHtml(residentId)}</span></div>
      <div class="fieldName" style="${buildNameStyle(lastName, firstName)}">
        <div class="lastName">${escapeHtml(formattedLastName)}</div>
        <div class="firstName">${escapeHtml(formattedFirstName)}</div>
      </div>
      <div class="fieldUnit">${escapeHtml(unitText)}</div>
      ${photoUrl ? `<img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(lastName || firstName ? `${lastName}, ${firstName}` : 'HOMEOWNER')}" class="photo" />` : '<div class="photoPlaceholder">Photo</div>'}
    </section>

    <section class="card back">
      <img src="${escapeHtml(backBg)}" alt="" class="bgImage" />
    </section>
  </div>
</body>
</html>`
}
