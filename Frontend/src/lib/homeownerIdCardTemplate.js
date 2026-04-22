const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

export const buildHomeownerIdCardHtml = (homeowner = {}) => {
  const fullName = `${homeowner.firstName || ''} ${homeowner.lastName || ''}`.trim() || 'HOMEOWNER'
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
    @page { size: 85.6mm 54mm; margin: 0; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #eef2f7;
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8mm;
      padding: 8mm;
    }
    .card {
      width: 85.6mm;
      height: 54mm;
      border: 1.2mm solid #3f9b2f;
      background: #fff;
      position: relative;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .front {
      display: grid;
      grid-template-columns: 34mm 1fr;
      gap: 2mm;
      padding: 2.2mm;
    }
    .logoWrap {
      display: grid;
      place-items: center;
    }
    .logo {
      width: 30mm;
      height: 30mm;
      object-fit: contain;
      border-radius: 50%;
    }
    .frontDetails {
      display: flex;
      flex-direction: column;
      gap: 1.4mm;
      color: #111;
      font-size: 2.55mm;
      line-height: 1.18;
    }
    .assoc {
      color: #c42020;
      font-weight: 700;
      font-size: 2.9mm;
      text-transform: uppercase;
    }
    .name {
      margin-top: 1.6mm;
      font-size: 4.1mm;
      font-weight: 800;
      letter-spacing: 0.2px;
      text-transform: uppercase;
    }
    .address {
      margin-top: 0.4mm;
      font-size: 3.6mm;
      font-weight: 700;
      text-transform: uppercase;
    }
    .id {
      margin-top: auto;
      font-size: 3.1mm;
      font-weight: 800;
      color: #c42020;
    }
    .photo {
      position: absolute;
      right: 2.2mm;
      bottom: 2.2mm;
      width: 20mm;
      height: 24mm;
      border: 0.35mm solid #666;
      object-fit: cover;
      background: #f7f7f7;
    }
    .photoPlaceholder {
      position: absolute;
      right: 2.2mm;
      bottom: 2.2mm;
      width: 20mm;
      height: 24mm;
      border: 0.35mm solid #666;
      display: grid;
      place-items: center;
      color: #666;
      font-size: 2.2mm;
      font-weight: 700;
      text-transform: uppercase;
      background: #fafafa;
    }
    .back {
      padding: 4mm;
      display: flex;
      flex-direction: column;
      gap: 2mm;
      color: #111;
    }
    .backTitle {
      margin: 0;
      text-align: center;
      font-size: 3.35mm;
      font-weight: 800;
      text-transform: uppercase;
    }
    .backBody {
      margin: 0;
      text-align: center;
      font-size: 2.55mm;
      line-height: 1.4;
    }
    .signatureRow {
      margin-top: auto;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4mm;
      align-items: end;
    }
    .line {
      border-top: 0.32mm solid #222;
      padding-top: 1mm;
      text-align: center;
      font-size: 2.4mm;
      font-weight: 700;
    }
    @media print {
      body { background: #fff; padding: 0; gap: 0; }
      .card + .card { margin-top: 2mm; }
    }
  </style>
</head>
<body>
  <section class="card front">
    <div class="logoWrap">
      <img src="/images/HOA Logo.png" alt="HOA Logo" class="logo" />
    </div>
    <div class="frontDetails">
      <div class="assoc">FC-HANJIN VILLAGE HOME OWNERS ASSOCIATION INC.</div>
      <div>Castillejos, Zambales</div>
      <div class="name">${escapeHtml(fullName)}</div>
      <div class="address">${escapeHtml(unitText)}</div>
      <div class="id">ID#: ${escapeHtml(residentId)}</div>
    </div>
    ${photoUrl ? `<img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(fullName)}" class="photo" />` : '<div class="photoPlaceholder">Photo</div>'}
  </section>

  <section class="card back">
    <h2 class="backTitle">Home Owners Association Officers</h2>
    <p class="backBody">This certifies that the person named on the front side is a registered member of FC-Hanjin Village Home Owners Association.</p>
    <p class="backBody">If found, please return this card to the HOA office at FC-Hanjin Village, Castillejos, Zambales.</p>
    <div class="signatureRow">
      <div class="line">President</div>
      <div class="line">Card Holder</div>
    </div>
  </section>
</body>
</html>`
}
