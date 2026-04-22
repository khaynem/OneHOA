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
    :root {
      --card-width: 85.60mm;
      --card-height: 53.98mm;
      --border-green: #3f9b2f;
      --accent-red: #c42020;
      --ink: #111;
      --muted: #333;
    }
    @page { size: var(--card-width) var(--card-height); margin: 0; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #eef2f7;
      font-family: Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6mm;
      padding: 6mm;
    }
    .card {
      width: var(--card-width);
      height: var(--card-height);
      border: 1.1mm solid var(--border-green);
      background: #fff;
      position: relative;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .front {
      display: grid;
      grid-template-columns: 30mm 1fr 20mm;
      gap: 1.8mm;
      padding: 2.3mm;
    }
    .logoWrap {
      display: grid;
      place-items: center;
    }
    .logo {
      width: 27mm;
      height: 27mm;
      object-fit: contain;
      border-radius: 50%;
    }
    .frontDetails {
      display: flex;
      flex-direction: column;
      gap: 1.1mm;
      min-width: 0;
      color: var(--ink);
      font-size: 2.45mm;
      line-height: 1.16;
    }
    .assoc {
      color: var(--accent-red);
      font-weight: 700;
      font-size: 2.15mm;
      text-transform: uppercase;
      letter-spacing: 0.1px;
    }
    .name {
      margin-top: 0.8mm;
      font-size: 4.8mm;
      font-weight: 800;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .address {
      margin-top: 0.1mm;
      font-size: 4.7mm;
      font-weight: 700;
      text-transform: uppercase;
      line-height: 1.05;
    }
    .id {
      margin-top: auto;
      font-size: 4.9mm;
      font-weight: 800;
      color: var(--accent-red);
    }
    .photoWrap {
      display: flex;
      align-items: flex-end;
      justify-content: flex-end;
      padding-bottom: 0.2mm;
    }
    .photo {
      width: 18.8mm;
      height: 23.5mm;
      border: 0.35mm solid #666;
      object-fit: cover;
      background: #f7f7f7;
    }
    .photoPlaceholder {
      width: 18.8mm;
      height: 23.5mm;
      border: 0.35mm solid #666;
      display: grid;
      place-items: center;
      color: var(--muted);
      font-size: 2.2mm;
      font-weight: 700;
      text-transform: uppercase;
      background: #fafafa;
    }
    .back {
      padding: 2.6mm 3.1mm 2.2mm;
      color: var(--ink);
    }
    .backInner {
      width: 100%;
      height: 100%;
      display: grid;
      grid-template-rows: auto auto auto 1fr auto;
      gap: 1.4mm;
    }
    .backTitle {
      margin: 0;
      text-align: center;
      font-size: 5.1mm;
      font-weight: 800;
      text-transform: uppercase;
    }
    .backBody {
      margin: 0;
      text-align: center;
      font-size: 4.3mm;
      line-height: 1.2;
    }
    .signatureRow {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5mm;
      align-items: end;
    }
    .line {
      border-top: 0.32mm solid #222;
      padding-top: 0.8mm;
      text-align: center;
      font-size: 4.2mm;
      font-weight: 700;
    }
    @media print {
      body {
        display: block;
        background: #fff;
        padding: 0;
        margin: 0;
      }
      .card {
        margin: 0;
        page-break-after: always;
        break-after: page;
      }
      .card:last-child {
        page-break-after: auto;
        break-after: auto;
      }
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
    <div class="photoWrap">
      ${photoUrl ? `<img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(fullName)}" class="photo" />` : '<div class="photoPlaceholder">Photo</div>'}
    </div>
  </section>

  <section class="card back">
    <div class="backInner">
      <h2 class="backTitle">Home Owners Association Officers</h2>
      <p class="backBody">This certifies that the person named on the front side is a registered member of FC-Hanjin Village Home Owners Association.</p>
      <p class="backBody">If found, please return this card to the HOA office at FC-Hanjin Village, Castillejos, Zambales.</p>
      <div></div>
      <div class="signatureRow">
        <div class="line">President</div>
        <div class="line">Card Holder</div>
      </div>
    </div>
  </section>
</body>
</html>`
}
