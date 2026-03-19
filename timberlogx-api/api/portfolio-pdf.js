const fetch = require('node-fetch');

const PDFSHIFT_API_KEY = 'sk_f19726b04cd0d9adeb6c49a7b87c26d4848a4cc1';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { clientName, preparedBy, coverLetter, properties, generatedDate } = req.body;

    if (!properties || properties.length === 0) {
      return res.status(400).json({ error: 'No properties provided' });
    }

    const fCur = (n) => '$' + Math.round(n || 0).toLocaleString('en-US');
    const fNum = (n) => Math.round(n || 0).toLocaleString('en-US');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${clientName} — Portfolio Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #3a3a3b; background: white; font-size: 13px; }
  :root { --charcoal: #3a3a3b; --cream: #e4e3dc; --tan: #B85B2D; --border: #d1d0c9; --light: #f7f6f3; }

  .page { page-break-after: always; padding: 48px; min-height: 100vh; position: relative; }
  .page:last-child { page-break-after: avoid; }

  /* Cover */
  .cover { background: #3a3a3b; color: white; display: flex; flex-direction: column; justify-content: space-between; }
  .cover-accent-bar { height: 4px; background: #B85B2D; margin: -48px -48px 48px -48px; }
  .cover-label { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: #B85B2D; margin-bottom: 16px; margin-top: 56px; }
  .cover-title { font-size: 48px; font-weight: 800; color: white; line-height: 1.05; margin-bottom: 10px; letter-spacing: -0.5px; }
  .cover-subtitle { font-size: 15px; color: rgba(255,255,255,0.45); margin-bottom: 0; letter-spacing: 0.05em; }
  .cover-divider { height: 1px; background: linear-gradient(to right, #B85B2D, rgba(255,255,255,0.1)); margin: 36px 0; }
  .cover-stats { display: flex; gap: 0; }
  .cover-stat { flex: 1; border-left: 2px solid #B85B2D; padding: 0 0 0 20px; margin-right: 24px; }
  .cover-stat:first-child { border-left: none; padding-left: 0; }
  .cover-stat-label { font-size: 8px; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(255,255,255,0.35); margin-bottom: 8px; }
  .cover-stat-value { font-size: 28px; font-weight: 800; color: white; letter-spacing: -0.5px; }
  .cover-stat-sub { font-size: 10px; color: rgba(255,255,255,0.3); margin-top: 4px; }
  .cover-footer { border-top: 1px solid rgba(255,255,255,0.12); padding-top: 18px; margin-top: 40px; display: flex; justify-content: space-between; font-size: 10px; color: rgba(255,255,255,0.3); }

  /* Logo */
  .logo-area { margin-bottom: 0; }
  .logo-text { font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(255,255,255,0.35); margin-top: 8px; }

  /* Section pages */
  .section-label { font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase; color: #B85B2D; margin-bottom: 6px; }
  .section-title { font-size: 26px; font-weight: 700; color: #3a3a3b; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 2px solid #d1d0c9; }

  /* Cover letter */
  .letter-greeting { font-size: 14px; font-weight: 600; margin-bottom: 16px; }
  .letter-body { font-size: 12px; line-height: 1.8; color: #555; white-space: pre-wrap; }
  .letter-sign { margin-top: 28px; font-size: 13px; font-weight: 600; }
  .letter-sign-sub { font-size: 11px; color: #888; }

  /* Stats grid */
  .stats-grid { display: flex; gap: 12px; margin-bottom: 28px; }
  .stat-box { flex: 1; background: #f7f6f3; border-radius: 6px; padding: 14px; }
  .stat-box-label { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #888; margin-bottom: 4px; }
  .stat-box-value { font-size: 20px; font-weight: 700; color: #3a3a3b; }
  .stat-box-sub { font-size: 10px; color: #888; margin-top: 2px; }

  /* Table */
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #888; padding: 8px 6px; border-bottom: 2px solid #d1d0c9; }
  th.r { text-align: right; }
  td { padding: 10px 6px; border-bottom: 1px solid #e8e7e0; vertical-align: middle; }
  td.r { text-align: right; }
  td.val { text-align: right; font-weight: 600; color: #B85B2D; }
  .total-row td { font-weight: 700; font-size: 13px; border-top: 2px solid #B85B2D; border-bottom: none; padding-top: 12px; }
  .total-row td.val { color: #B85B2D; }
  .badge { display: inline-block; font-size: 8px; background: rgba(184,91,45,0.12); color: #B85B2D; padding: 1px 5px; border-radius: 8px; margin-left: 4px; font-weight: 600; }

  /* Property page */
  .prop-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 2px solid #d1d0c9; }
  .prop-name { font-size: 24px; font-weight: 700; }
  .prop-meta { font-size: 11px; color: #888; margin-top: 3px; }
  .prop-val-box { background: #3a3a3b; color: white; padding: 14px 20px; border-radius: 6px; text-align: right; min-width: 160px; }
  .prop-val-label { font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 3px; }
  .prop-val-amount { font-size: 22px; font-weight: 700; }
  .prop-val-per { font-size: 10px; color: rgba(255,255,255,0.4); margin-top: 2px; }
  .prop-val-frac { font-size: 9px; color: #B85B2D; margin-top: 3px; }

  .tiles { display: flex; gap: 10px; margin-bottom: 20px; }
  .tile { flex: 1; background: #f7f6f3; border-radius: 5px; padding: 10px; }
  .tile-label { font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase; color: #888; margin-bottom: 3px; }
  .tile-value { font-size: 14px; font-weight: 700; }

  .stand-table th { background: #B85B2D; color: white; font-size: 9px; }
  .stand-table td { font-size: 10px; padding: 7px 6px; }
  .s-merch { background: rgba(58,58,59,0.08); color: #3a3a3b; font-size: 8px; padding: 1px 6px; border-radius: 8px; font-weight: 600; }
  .s-pre { background: rgba(184,91,45,0.1); color: #B85B2D; font-size: 8px; padding: 1px 6px; border-radius: 8px; font-weight: 600; }
  .s-non { background: rgba(0,0,0,0.05); color: #888; font-size: 8px; padding: 1px 6px; border-radius: 8px; font-weight: 600; }

  .assumptions { background: #f7f6f3; border-radius: 5px; padding: 10px 14px; margin-top: 14px; display: flex; gap: 20px; }
  .assumption-label { font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase; color: #888; }
  .assumption-value { font-size: 12px; font-weight: 600; }

  .disclaimer { font-size: 8px; color: #bbb; line-height: 1.5; margin-top: 20px; padding-top: 12px; border-top: 1px solid #e8e7e0; }
  .page-footer { position: absolute; bottom: 20px; left: 48px; right: 48px; display: flex; justify-content: space-between; font-size: 8px; color: #ccc; border-top: 1px solid #e8e7e0; padding-top: 6px; }

  /* Disclaimer page */
  .disc-section { margin-bottom: 16px; }
  .disc-title { font-weight: 700; color: #3a3a3b; margin-bottom: 4px; }
  .disc-body { font-size: 11px; line-height: 1.8; color: #555; }
  .final-footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #B85B2D; display: flex; justify-content: space-between; align-items: center; }
</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="page cover">
  <div class="cover-accent-bar"></div>
  <div class="logo-area">
    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA20AAAMcCAMAAAD0Ur2cAAABAGlDQ1BpY2MAABiVY2BgPMEABCwGDAy5eSVFQe5OChGRUQrsDxgYgRAMEpOLCxhwA6Cqb9cgai/r4lGHC3CmpBYnA+kPQKxSBLQcaKQIkC2SDmFrgNhJELYNiF1eUlACZAeA2EUhQc5AdgqQrZGOxE5CYicXFIHU9wDZNrk5pckIdzPwpOaFBgNpDiCWYShmCGJwZ3AC+R+iJH8RA4PFVwYG5gkIsaSZDAzbWxkYJG4hxFQWMDDwtzAwbDuPEEOESUFiUSJYiAWImdLSGBg+LWdg4I1kYBC+wMDAFQ0LCBxuUwC7zZ0hHwjTGXIYUoEingx5DMkMekCWEYMBgyGDGQCm1j8/yRb+6wAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAABBVBMVEUAAAD////+/v74+Pj5+fn6+vr8+/z9/f319fX39/cBAQH29vb////////////////////////////////////////////////////////////+/v7+/v7+/v7+/v79/f3+/v79/f39/f38+/z+/v78+/z8+/z8+/z6+vr8+/z9/f38+/z9/f36+vr8+/z9/f38+/z29vb29vb+/v78+/z8+/z+/v7+/v78+/z6+vr8+/z8+/z9/f39/f39/f3+/v7+/v76+vr5+fn5+fn6+vr8+/z9/f39/f3+/v79/f3+/v79/f3+/v79/f39/f3+/v7////////+/v79/f38+/z5+fn6+vpURdreAAAAUXRSTlMAAAAAAAAAAAAAAAAgQDBQgLDA0GCQcPDgoBAQkEDgEPCQwDDQcGDwENCgkNBQEPDAMBCgUCCwYIAw4KBQYCDAgLBQkNBAsHBw4FAwMECAIMyIBwhQAAAAAWJLR0QB/wIt3gAAAAd0SU1FB+oBDw4wMO0JgPcAAExxSURBVHja7Z15u+y4cd7FI829iUJ2c22yKY9mJMW2rDgaJ3IsJVIsZXEcL0l85o79/T9KTndzAUigqgAuYJ/7/v6Y55l7miSWerEUCsD3vgd2JZog/Z30uaXpUYmTntPm6QBgfQYz7YyY/V0ItcXnNMtfdYo8LU/bpQOA9emttLpZcE6orXolKLZT2+mS1fYP52kCtYFnoe/Z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" style="height:44px;width:auto;filter:brightness(0) invert(1);" alt="Made Out West Land Co.">
    <div style="display:flex;align-items:center;gap:12px;margin-top:8px;">
      <div class="logo-text">Made Out West Land Co.</div>
      <div style="font-size:8px;letter-spacing:0.2em;color:rgba(255,255,255,0.2);">|</div>
      <div style="font-size:9px;letter-spacing:0.12em;text-transform:uppercase;color:rgba(255,255,255,0.35);font-weight:700;">TIMBERLOG<span style="font-family:monospace;">[X]</span></div>
    </div>
  </div>

  <div>
    <div class="cover-label">Portfolio Valuation Report</div>
    <div class="cover-title">${clientName}</div>
    <div class="cover-subtitle">Oregon Timberland Portfolio</div>
    <div class="cover-divider"></div>
    <div class="cover-stats">
      <div class="cover-stat">
        <div class="cover-stat-label">Properties</div>
        <div class="cover-stat-value">${properties.length}</div>
        <div class="cover-stat-sub">${[...new Set(properties.map(p => p.county).filter(Boolean))].length} counties</div>
      </div>
      <div class="cover-stat">
        <div class="cover-stat-label">Total Acres</div>
        <div class="cover-stat-value">${fNum(properties.reduce((s, p) => s + (p.acres || 0), 0))}</div>
        <div class="cover-stat-sub">total land area</div>
      </div>
      <div class="cover-stat">
        <div class="cover-stat-label">Portfolio Value</div>
        <div class="cover-stat-value">${fCur(properties.reduce((s, p) => s + ((p.total_value || 0) * ((p.ownership_interest || 100) / 100)), 0))}</div>
        <div class="cover-stat-sub">estimated net present value</div>
      </div>
    </div>
  </div>

  <div style="text-align:center;margin-bottom:20px;">
    <span style="font-size:13px;font-weight:800;letter-spacing:0.25em;color:rgba(255,255,255,0.35);text-transform:uppercase;border:1.5px solid rgba(255,255,255,0.2);padding:4px 18px;border-radius:3px;">CONFIDENTIAL</span>
  </div>
  <div class="cover-footer">
    <div>Prepared by: ${preparedBy || 'Made Out West Land Co.'}<br>madeoutwestlandco.com</div>
    <div style="text-align:right">${generatedDate || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}<br>Screening estimate only — not a formal appraisal</div>
  </div>
</div>

${coverLetter ? `
<!-- COVER LETTER -->
<div class="page">
  <div class="section-label">Letter of Transmittal</div>
  <div class="section-title">From Made Out West Land Co.</div>
  <div class="letter-greeting">Dear ${clientName},</div>
  <div class="letter-body">${coverLetter}</div>
  <div class="letter-sign">${preparedBy || 'Made Out West Land Co.'}<br><span class="letter-sign-sub">Made Out West Land Co. • madeoutwestlandco.com</span></div>
  <div class="page-footer"><span>${clientName} — Portfolio Report</span><span style="font-weight:600;letter-spacing:0.1em;opacity:0.5;">CONFIDENTIAL</span><span>Made Out West Land Co.</span></div>
</div>
` : ''}

<!-- PORTFOLIO SUMMARY -->
<div class="page">
  <div class="section-label">Portfolio Overview</div>
  <div class="section-title">Properties by Value</div>

  ${(() => {
    const totalAcres = properties.reduce((s, p) => s + (p.acres || 0), 0);
    const totalValue = properties.reduce((s, p) => s + ((p.total_value || 0) * ((p.ownership_interest || 100) / 100)), 0);
    const totalTimber = properties.reduce((s, p) => s + ((p.timber_value || 0) * ((p.ownership_interest || 100) / 100)), 0);
    const totalMBF = properties.reduce((s, p) => s + (p.total_mbf || 0), 0);
    const avgPerAcre = totalAcres > 0 ? Math.round(totalValue / totalAcres) : 0;
    const timberPct = totalValue > 0 ? Math.round((totalTimber / totalValue) * 100) : 0;
    const counties = [...new Set(properties.map(p => p.county).filter(Boolean))];

    return `
    <div class="stats-grid">
      <div class="stat-box"><div class="stat-box-label">Total Acres</div><div class="stat-box-value">${fNum(totalAcres)}</div><div class="stat-box-sub">${properties.length} properties</div></div>
      <div class="stat-box"><div class="stat-box-label">Portfolio Value</div><div class="stat-box-value">${fCur(totalValue)}</div><div class="stat-box-sub">${fCur(avgPerAcre)}/acre avg</div></div>
      <div class="stat-box"><div class="stat-box-label">Standing Timber</div><div class="stat-box-value">${fNum(totalMBF)} MBF</div><div class="stat-box-sub">${timberPct}% of value</div></div>
      <div class="stat-box"><div class="stat-box-label">Counties</div><div class="stat-box-value">${counties.length}</div><div class="stat-box-sub">${counties.join(', ')}</div></div>
    </div>

    <table>
      <thead><tr>
        <th>Property</th><th>County</th><th class="r">Acres</th><th class="r">MBF</th><th class="r">$/Acre</th><th class="r">Value</th>
      </tr></thead>
      <tbody>
        ${[...properties].sort((a,b) => ((b.total_value||0)*((b.ownership_interest||100)/100)) - ((a.total_value||0)*((a.ownership_interest||100)/100))).map(p => {
          const oi = (p.ownership_interest || 100) / 100;
          const adjVal = (p.total_value || 0) * oi;
          const perAc = p.acres > 0 ? Math.round(adjVal / p.acres) : 0;
          const isFrac = (p.ownership_interest || 100) < 100;
          return `<tr>
            <td>${p.name || 'Untitled'}${isFrac ? `<span class="badge">${p.ownership_interest}%</span>` : ''}</td>
            <td>${p.county || '—'}</td>
            <td class="r">${p.acres ? fNum(p.acres) : '—'}</td>
            <td class="r">${p.total_mbf ? fNum(p.total_mbf) : '—'}</td>
            <td class="r">${fCur(perAc)}</td>
            <td class="val">${fCur(adjVal)}</td>
          </tr>`;
        }).join('')}
      </tbody>
      <tfoot><tr class="total-row">
        <td>TOTAL</td><td>${counties.length} counties</td>
        <td class="r">${fNum(totalAcres)}</td>
        <td class="r">${fNum(totalMBF)}</td>
        <td class="r">${fCur(avgPerAcre)}</td>
        <td class="val">${fCur(totalValue)}</td>
      </tr></tfoot>
    </table>`;
  })()}
  <div class="page-footer"><span>${clientName} — Portfolio Report</span><span style="font-weight:600;letter-spacing:0.1em;opacity:0.5;">CONFIDENTIAL</span><span>Made Out West Land Co.</span></div>
</div>

${properties.sort((a,b) => ((b.total_value||0)*((b.ownership_interest||100)/100)) - ((a.total_value||0)*((a.ownership_interest||100)/100))).map(p => {
  const oi = (p.ownership_interest || 100) / 100;
  const adjVal = (p.total_value || 0) * oi;
  const adjTimber = (p.timber_value || 0) * oi;
  const adjLand = (p.land_value || 0) * oi;
  const perAc = p.acres > 0 ? Math.round(adjVal / p.acres) : 0;
  const isFrac = (p.ownership_interest || 100) < 100;
  const stands = p.app_state?.stands || [];
  const assumptions = p.app_state?.assumptions || {};
  const imageUrls = p.app_state?.imageUrls || [];
  const mapImage = imageUrls.length > 0 ? imageUrls[0].url : null;
  const extraImages = imageUrls.slice(1);

  const standRows = stands.map((s, i) => {
    const speciesMap = {
      'douglas-fir': 'Douglas-fir', 'grand-fir': 'Grand Fir', 'hemlock': 'Hemlock',
      'spruce': 'Sitka Spruce', 'cedar': 'Western Red Cedar', 'pine': 'Ponderosa Pine',
      'white-fir': 'White Fir', 'larch': 'Western Larch', 'red-alder': 'Red Alder',
      'big-leaf-maple': 'Big Leaf Maple', 'hardwood': 'Other Hardwood', 'mixed': 'Mixed Species',
      'brush': 'Non-Stocked / Brush', 'rma': 'RMA/Riparian', 'powerline': 'Powerline/Utility',
      'road': 'Roads/Landings', 'hay-pasture': 'Hay / Pasture', 'xmas-trees': 'Christmas Trees',
      'vineyard': 'Vineyard / Orchard', 'nursery': 'Nursery'
    };
    const speciesName = speciesMap[s.species] || (s.species || '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const age = s.standAge || 0;
    const nonProductiveSpecies = ['brush', 'rma', 'powerline', 'road'];
    const landUseSpecies = ['hay-pasture', 'xmas-trees', 'vineyard', 'nursery'];
    let status, cls;
    if (nonProductiveSpecies.includes(s.species) || landUseSpecies.includes(s.species)) {
      status = 'Non-Productive'; cls = 's-non';
    } else if (age >= 50) { status = 'Merchantable'; cls = 's-merch'; }
    else if (age >= 26) { status = 'Pre-Merchantable'; cls = 's-pre'; }
    else if (age > 0) { status = 'Established'; cls = 's-non'; }
    else { status = 'Non-Productive'; cls = 's-non'; }
    const mbf = s.cruiseMBF ? fNum(s.cruiseMBF) : '—';
    return `<tr>
      <td>Unit ${i+1}</td>
      <td>${speciesName || '—'}</td>
      <td class="r">${s.acres ? fNum(s.acres) : '—'}</td>
      <td class="r">${age ? age + ' yrs' : '—'}</td>
      <td class="r"><span class="${cls}">${status}</span></td>
      <td class="r">${mbf}</td>
      <td class="r">—</td>
    </tr>`;
  }).join('');

  return `
<div class="page">
  <div class="prop-header">
    <div>
      <div class="prop-name">${p.name || 'Untitled'}</div>
      <div class="prop-meta">${p.county ? p.county + ' County, Oregon' : 'Oregon'} • ${p.acres ? fNum(p.acres) + ' acres' : ''} ${p.total_mbf ? '• ' + fNum(p.total_mbf) + ' MBF' : ''}</div>
      ${p.address ? `<div class="prop-meta">${p.address}</div>` : ''}
    </div>
    <div class="prop-val-box">
      <div class="prop-val-label">Estimated Value</div>
      <div class="prop-val-amount">${fCur(adjVal)}</div>
      <div class="prop-val-per">${fCur(perAc)}/acre</div>
      ${isFrac ? `<div class="prop-val-frac">${p.ownership_interest}% interest · full: ${fCur(p.total_value)}</div>` : ''}
    </div>
  </div>

  <div class="tiles">
    <div class="tile"><div class="tile-label">Total Acres</div><div class="tile-value">${fNum(p.acres)}</div></div>
    <div class="tile"><div class="tile-label">Timber Value</div><div class="tile-value">${fCur(adjTimber)}</div></div>
    <div class="tile"><div class="tile-label">Land Value</div><div class="tile-value">${fCur(adjLand)}</div></div>
    <div class="tile"><div class="tile-label">Standing Volume</div><div class="tile-value">${p.total_mbf ? fNum(p.total_mbf) + ' MBF' : '—'}</div></div>
  </div>

  ${stands.length > 0 ? `
  <table class="stand-table">
    <thead><tr><th>Unit</th><th>Species</th><th class="r">Acres</th><th class="r">Age</th><th class="r">Status</th><th class="r">MBF</th><th class="r">Value</th></tr></thead>
    <tbody>${standRows}</tbody>
  </table>` : ''}

  ${assumptions.logPrice ? `
  <div class="assumptions">
    <div><div class="assumption-label">Log Price</div><div class="assumption-value">${fCur(assumptions.logPrice)}/MBF</div></div>
    <div><div class="assumption-label">Logging Cost</div><div class="assumption-value">${fCur(assumptions.loggingCost)}/MBF</div></div>
    <div><div class="assumption-label">Harvest Tax</div><div class="assumption-value">$6/MBF</div></div>
    <div><div class="assumption-label">Discount Rate</div><div class="assumption-value">${((assumptions.discountRate||0.05)*100).toFixed(1)}%</div></div>
    <div><div class="assumption-label">Net Stumpage</div><div class="assumption-value">${fCur((assumptions.logPrice||0)-(assumptions.loggingCost||0)-6)}/MBF</div></div>
  </div>` : ''}

  ${mapImage ? `
  <div style="margin-top:16px;">
    <img src="${mapImage}" style="width:100%;max-height:240px;object-fit:cover;border-radius:6px;border:1px solid #e8e7e0;" alt="Property Map">
    ${extraImages.length > 0 ? `<div style="display:flex;gap:8px;margin-top:8px;">${extraImages.map(img => `<img src="${img.url}" style="flex:1;max-height:140px;object-fit:cover;border-radius:4px;border:1px solid #e8e7e0;" alt="${img.label||''}">`).join('')}</div>` : ''}
  </div>` : ''}

  <div class="disclaimer">Screening-level estimate only. Not a certified appraisal. Professional timber cruise and site inspection recommended prior to any transaction.</div>
  <div class="page-footer"><span>${p.name || 'Property'} — ${p.county || ''} County</span><span style="font-weight:600;letter-spacing:0.1em;opacity:0.5;">CONFIDENTIAL</span><span>Made Out West Land Co.</span></div>
</div>`;
}).join('')}

<!-- DISCLAIMER PAGE -->
<div class="page">
  <div class="section-label">Important Disclosures</div>
  <div class="section-title">Terms & Limitations</div>
  <div class="disc-section"><div class="disc-title">Nature of This Report</div><div class="disc-body">This portfolio valuation report has been prepared by Made Out West Land Co. as a screening-level estimate only. It is not a certified appraisal, a formal opinion of value, or an offer to purchase or sell any property.</div></div>
  <div class="disc-section"><div class="disc-title">Timber Values</div><div class="disc-body">Timber valuations assume average #2 sawlog quality, fully stocked stands at entered site conditions, and yield table projections based on species and stand age. A professional timber cruise is strongly recommended prior to any harvest or sale decision.</div></div>
  <div class="disc-section"><div class="disc-title">Market Assumptions</div><div class="disc-body">Log prices, logging costs, and discount rates are estimates based on current market conditions and are subject to change. Values shown are gross estimates before income taxes.</div></div>
  <div class="disc-section"><div class="disc-title">Land Values</div><div class="disc-body">Bare land values are estimated based on county-level market data and comparable sales. Actual values may differ based on access, zoning, water rights, and other property-specific factors.</div></div>
  <div class="disc-section"><div class="disc-title">Fractional Interests</div><div class="disc-body">Where ownership interests of less than 100% are noted, values shown reflect the indicated ownership share only. Fractional interest holdings may be subject to additional discounts not reflected in these estimates.</div></div>
  <div class="final-footer">
    <div><div style="font-weight:700;font-size:13px;">Made Out West Land Co.</div><div style="font-size:10px;color:#888;">Powered by TIMBERLOG[X] • madeoutwestlandco.com</div></div>
    <div style="font-size:10px;color:#888;">${generatedDate || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
  </div>
  <div class="page-footer"><span>${clientName} — Portfolio Report</span><span style="font-weight:600;letter-spacing:0.1em;opacity:0.5;">CONFIDENTIAL</span><span>Made Out West Land Co.</span></div>
</div>

</body>
</html>`;

    // Call PDFShift API
    const response = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from('api:' + PDFSHIFT_API_KEY).toString('base64'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: html,
        landscape: false,
        use_print: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error('PDFShift error: ' + errText);
    }

    const pdfBuffer = await response.buffer();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${(clientName||'Portfolio').replace(/[^a-zA-Z0-9]/g,'_')}_Portfolio_Report.pdf"`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('Portfolio PDF error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate PDF' });
  }
};
