const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const buildNameStyle = (value) => {
  const length = String(value || '').trim().length
  let fontSize = 3.2

  if (length > 26) {
    fontSize = 2.8
  }
  if (length > 32) {
    fontSize = 2.5
  }
  if (length > 40) {
    fontSize = 2.2
  }
  if (length > 48) {
    fontSize = 2.0
  }

  return `font-size: ${fontSize}mm; line-height: 1.1;`
}

export const buildHomeownerIdCardHtml = (homeowner = {}) => {
  const fullName = `${homeowner.lastName || ''}, ${homeowner.firstName || ''}`.replace(/^,\s*/, '').trim() || 'HOMEOWNER'
  const unitText = `PHASE ${homeowner.phase || '-'}, BLOCK ${homeowner.block || '-'}, LOT ${homeowner.lot || '-'}`
  const residentId = homeowner.displayId || homeowner.residentId || homeowner.id || '-'
  const photoUrl = homeowner.photoUrl || ''

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ID Card - ${escapeHtml(fullName)}</title>
  <style>
    :root {
      --page-width: 210mm;
      --page-height: 297mm;
      --card-width: 90mm;
      --card-height: 60mm;
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
      border: 3px solid #000;
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
      right: 9mm;
      top: 13.6mm;
      font-size: 3mm;
      font-weight: 800;
      color: var(--accent-red);
      text-transform: uppercase;
      letter-spacing: 0.2px;
      z-index: 1;
    }
    .fieldName {
      position: absolute;
      left: 52mm;
      top: 39.6mm;
      width: 33mm;
      font-weight: 700;
      text-align: center;
      text-transform: uppercase;
      white-space: normal;
      word-break: break-word;
      overflow: hidden;
      z-index: 1;
    }
    .fieldUnit {
      position: absolute;
      left: 50mm;
      top: 47mm;
      width: 36mm;
      font-size: 2.4mm;
      font-weight: 700;
      text-align: center;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--muted);
      z-index: 1;
    }
    .photo,
    .photoPlaceholder {
      position: absolute;
      right: 12.5mm;
      top: 19.2mm;
      width: 18mm;
      height: 18mm;
      border: 0.35mm solid #666;
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
      <img src="/images/FRONT_bg.png" alt="" class="bgImage" />
      <div class="fieldId">ID#: ${escapeHtml(residentId)}</div>
      <div class="fieldName" style="${buildNameStyle(fullName)}">${escapeHtml(fullName)}</div>
      <div class="fieldUnit">${escapeHtml(unitText)}</div>
      ${photoUrl ? `<img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(fullName)}" class="photo" />` : '<div class="photoPlaceholder">Photo</div>'}
    </section>

    <section class="card back">
      <img src="/images/BACK-bg.png" alt="" class="bgImage" />
    </section>
  </div>
</body>
</html>`
}
