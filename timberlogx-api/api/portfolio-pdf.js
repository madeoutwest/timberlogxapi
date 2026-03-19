const chromium = require('chrome-aws-lambda');
const puppeteer = chromium.puppeteer;

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let browser;
  try {
    const { clientName, preparedBy, coverLetter, properties, generatedDate } = req.body;

    if (!properties || properties.length === 0) {
      return res.status(400).json({ error: 'No properties provided' });
    }

    const fCur = (n) => '$' + Math.round(n || 0).toLocaleString('en-US');
    const fNum = (n) => Math.round(n || 0).toLocaleString('en-US');

    // Build HTML for the portfolio report
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${clientName} — Portfolio Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #3a3a3b; background: white; }
  
  /* Colors */
  :root {
    --charcoal: #3a3a3b;
    --cream: #e4e3dc;
    --tan: #B85B2D;
    --border: #d1d0c9;
    --light: #f7f6f3;
  }

  /* Page breaks */
  .page { page-break-after: always; padding: 48px; min-height: 100vh; position: relative; }
  .page:last-child { page-break-after: avoid; }

  /* Cover page */
  .cover { background: var(--charcoal); color: white; display: flex; flex-direction: column; justify-content: space-between; }
  .cover-logo { margin-bottom: 48px; }
  .cover-logo-text { font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-top: 8px; }
  .cover-main { flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .cover-label { font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--tan); margin-bottom: 16px; }
  .cover-title { font-size: 48px; font-weight: 700; color: white; line-height: 1.1; margin-bottom: 8px; }
  .cover-subtitle { font-size: 18px; color: rgba(255,255,255,0.6); margin-bottom: 48px; }
  .cover-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 48px; }
  .cover-stat { border-top: 2px solid var(--tan); padding-top: 16px; }
  .cover-stat-label { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-bottom: 8px; }
  .cover-stat-value { font-size: 28px; font-weight: 700; color: white; }
  .cover-stat-sub { font-size: 12px; color: rgba(255,255,255,0.4); margin-top: 4px; }
  .cover-footer { border-top: 1px solid rgba(255,255,255,0.15); padding-top: 24px; display: flex; justify-content: space-between; align-items: center; }
  .cover-footer-left { font-size: 12px; color: rgba(255,255,255,0.4); }
  .cover-footer-right { font-size: 12px; color: rgba(255,255,255,0.4); text-align: right; }

  /* MOW Logo SVG placeholder */
  .mow-logo { width: 60px; height: 40px; }

  /* Section pages */
  .section-header { margin-bottom: 32px; padding-bottom: 16px; border-bottom: 2px solid var(--border); }
  .section-label { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: var(--tan); margin-bottom: 8px; }
  .section-title { font-size: 28px; font-weight: 700; color: var(--charcoal); }

  /* Cover letter */
  .cover-letter-body { font-size: 13px; line-height: 1.8; color: #555; white-space: pre-wrap; }
  .cover-letter-greeting { font-size: 15px; font-weight: 600; color: var(--charcoal); margin-bottom: 20px; }
  .cover-letter-sign { margin-top: 32px; }
  .cover-letter-sign-name { font-size: 14px; font-weight: 600; color: var(--charcoal); }
  .cover-letter-sign-title { font-size: 12px; color: #888; }

  /* Portfolio summary table */
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #888; padding: 10px 8px; border-bottom: 2px solid var(--border); }
  th.right { text-align: right; }
  td { padding: 12px 8px; border-bottom: 1px solid var(--border); font-size: 13px; vertical-align: middle; }
  td.right { text-align: right; }
  td.value { text-align: right; font-weight: 600; color: var(--tan); }
  tr:last-child td { border-bottom: none; }
  .total-row td { font-weight: 700; font-size: 14px; border-top: 2px solid var(--tan); border-bottom: none; padding-top: 14px; }
  .total-row td.value { color: var(--tan); }
  .frac-badge { display: inline-block; font-size: 9px; background: rgba(184,91,45,0.12); color: var(--tan); padding: 2px 6px; border-radius: 10px; margin-left: 6px; font-weight: 600; }

  /* Summary stats row */
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
  .stat-box { background: var(--light); border-radius: 8px; padding: 16px; }
  .stat-box-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #888; margin-bottom: 6px; }
  .stat-box-value { font-size: 22px; font-weight: 700; color: var(--charcoal); }
  .stat-box-sub { font-size: 11px; color: #888; margin-top: 3px; }

  /* Property detail page */
  .prop-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid var(--border); }
  .prop-name { font-size: 26px; font-weight: 700; color: var(--charcoal); }
  .prop-meta { font-size: 12px; color: #888; margin-top: 4px; }
  .prop-value-box { background: var(--charcoal); color: white; padding: 16px 24px; border-radius: 8px; text-align: right; min-width: 180px; }
  .prop-value-label { font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.5); margin-bottom: 4px; }
  .prop-value-amount { font-size: 26px; font-weight: 700; color: white; }
  .prop-value-per { font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 2px; }
  .prop-frac-note { font-size: 10px; color: var(--tan); margin-top: 4px; }

  /* Value breakdown tiles */
  .value-tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .value-tile { background: var(--light); border-radius: 6px; padding: 12px; }
  .value-tile-label { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #888; margin-bottom: 4px; }
  .value-tile-value { font-size: 16px; font-weight: 700; color: var(--charcoal); }

  /* Stand table */
  .stand-table th { background: var(--tan); color: white; }
  .stand-table th { border-bottom: none; }
  .stand-table td { font-size: 11px; padding: 8px; }
  .stand-table td.value { color: var(--tan); }
  .status-badge { display: inline-block; font-size: 9px; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
  .status-merch { background: rgba(58,58,59,0.1); color: var(--charcoal); }
  .status-pre { background: rgba(184,91,45,0.12); color: var(--tan); }
  .status-non { background: rgba(0,0,0,0.06); color: #888; }

  /* Maturity bar */
  .maturity-section { margin-top: 20px; }
  .maturity-label { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #888; margin-bottom: 8px; }
  .maturity-bar { height: 12px; border-radius: 6px; overflow: hidden; display: flex; margin-bottom: 8px; background: #eee; }
  .maturity-merch { background: var(--charcoal); height: 100%; }
  .maturity-pre { background: var(--tan); height: 100%; }
  .maturity-young { background: rgba(184,91,45,0.3); height: 100%; }
  .maturity-legend { display: flex; gap: 16px; }
  .legend-item { display: flex; align-items: center; gap: 6px; font-size: 10px; color: #888; }
  .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

  /* Assumptions box */
  .assumptions-box { background: var(--light); border-radius: 6px; padding: 12px 16px; margin-top: 16px; display: flex; gap: 24px; }
  .assumption { }
  .assumption-label { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: #888; }
  .assumption-value { font-size: 13px; font-weight: 600; color: var(--charcoal); }

  /* Disclaimer */
  .disclaimer { font-size: 9px; color: #aaa; line-height: 1.5; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border); }

  /* Footer on each page */
  .page-footer { position: absolute; bottom: 24px; left: 48px; right: 48px; display: flex; justify-content: space-between; font-size: 9px; color: #bbb; border-top: 1px solid var(--border); padding-top: 8px; }
</style>
</head>
<body>

<!-- ============================================================ -->
<!-- COVER PAGE -->
<!-- ============================================================ -->
<div class="page cover">
  <div class="cover-logo">
    <svg class="mow-logo" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 60 L30 20 L50 50 L60 30 L70 50 L90 20 L110 60" stroke="white" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="60" cy="18" r="6" fill="white"/>
    </svg>
    <div class="cover-logo-text">Made Out West Land Co.</div>
  </div>

  <div class="cover-main">
    <div class="cover-label">Portfolio Valuation Report</div>
    <div class="cover-title">${clientName}</div>
    <div class="cover-subtitle">Oregon Timberland Portfolio</div>
    
    <div class="cover-stats">
      <div class="cover-stat">
        <div class="cover-stat-label">Total Properties</div>
        <div class="cover-stat-value">${properties.length}</div>
        <div class="cover-stat-sub">across ${[...new Set(properties.map(p => p.county).filter(Boolean))].length} counties</div>
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

  <div class="cover-footer">
    <div class="cover-footer-left">
      Prepared by: ${preparedBy || 'Made Out West Land Co.'}<br>
      madeoutwestlandco.com
    </div>
    <div class="cover-footer-right">
      Report Date: ${generatedDate || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}<br>
      Screening estimate only — not a formal appraisal
    </div>
  </div>
</div>

<!-- ============================================================ -->
<!-- COVER LETTER PAGE (if provided) -->
<!-- ============================================================ -->
${coverLetter ? `
<div class="page">
  <div class="section-header">
    <div class="section-label">Letter of Transmittal</div>
    <div class="section-title">From Made Out West Land Co.</div>
  </div>
  <div class="cover-letter-greeting">Dear ${clientName},</div>
  <div class="cover-letter-body">${coverLetter}</div>
  <div class="cover-letter-sign">
    <br><br>
    <div class="cover-letter-sign-name">${preparedBy || 'Made Out West Land Co.'}</div>
    <div class="cover-letter-sign-title">Made Out West Land Co. • madeoutwestlandco.com</div>
  </div>
  <div class="page-footer">
    <span>${clientName} — Portfolio Report</span>
    <span>Made Out West Land Co. • madeoutwestlandco.com</span>
  </div>
</div>
` : ''}

<!-- ============================================================ -->
<!-- PORTFOLIO SUMMARY PAGE -->
<!-- ============================================================ -->
<div class="page">
  <div class="section-header">
    <div class="section-label">Portfolio Overview</div>
    <div class="section-title">Properties by Value</div>
  </div>

  ${(() => {
    const totalAcres = properties.reduce((s, p) => s + (p.acres || 0), 0);
    const totalValue = properties.reduce((s, p) => s + ((p.total_value || 0) * ((p.ownership_interest || 100) / 100)), 0);
    const totalTimber = properties.reduce((s, p) => s + ((p.timber_value || 0) * ((p.ownership_interest || 100) / 100)), 0);
    const totalMBF = properties.reduce((s, p) => s + (p.total_mbf || 0), 0);
    const avgPerAcre = totalAcres > 0 ? Math.round(totalValue / totalAcres) : 0;
    const timberPct = totalValue > 0 ? Math.round((totalTimber / totalValue) * 100) : 0;

    return `
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-box-label">Total Acres</div>
        <div class="stat-box-value">${fNum(totalAcres)}</div>
        <div class="stat-box-sub">${properties.length} properties</div>
      </div>
      <div class="stat-box">
        <div class="stat-box-label">Portfolio Value</div>
        <div class="stat-box-value">${fCur(totalValue)}</div>
        <div class="stat-box-sub">${fCur(avgPerAcre)}/acre avg</div>
      </div>
      <div class="stat-box">
        <div class="stat-box-label">Standing Timber</div>
        <div class="stat-box-value">${fNum(totalMBF)} MBF</div>
        <div class="stat-box-sub">${timberPct}% of portfolio value</div>
      </div>
      <div class="stat-box">
        <div class="stat-box-label">Counties</div>
        <div class="stat-box-value">${[...new Set(properties.map(p => p.county).filter(Boolean))].length}</div>
        <div class="stat-box-sub">${[...new Set(properties.map(p => p.county).filter(Boolean))].join(', ')}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Property</th>
          <th>County</th>
          <th class="right">Acres</th>
          <th class="right">MBF</th>
          <th class="right">$/Acre</th>
          <th class="right">Value</th>
        </tr>
      </thead>
      <tbody>
        ${[...properties].sort((a, b) => ((b.total_value || 0) * ((b.ownership_interest || 100) / 100)) - ((a.total_value || 0) * ((a.ownership_interest || 100) / 100))).map(p => {
          const oi = (p.ownership_interest || 100) / 100;
          const adjVal = (p.total_value || 0) * oi;
          const perAc = p.acres > 0 ? Math.round(adjVal / p.acres) : 0;
          const isFrac = (p.ownership_interest || 100) < 100;
          return `<tr>
            <td>${p.name || 'Untitled'}${isFrac ? `<span class="frac-badge">${p.ownership_interest}%</span>` : ''}</td>
            <td>${p.county || '—'}</td>
            <td class="right">${p.acres ? fNum(p.acres) : '—'}</td>
            <td class="right">${p.total_mbf ? fNum(p.total_mbf) : '—'}</td>
            <td class="right">${fCur(perAc)}</td>
            <td class="value">${fCur(adjVal)}</td>
          </tr>`;
        }).join('')}
      </tbody>
      <tfoot>
        <tr class="total-row">
          <td>TOTAL</td>
          <td>${[...new Set(properties.map(p => p.county).filter(Boolean))].length} counties</td>
          <td class="right">${fNum(totalAcres)}</td>
          <td class="right">${fNum(totalMBF)}</td>
          <td class="right">${fCur(avgPerAcre)}</td>
          <td class="value">${fCur(totalValue)}</td>
        </tr>
      </tfoot>
    </table>`;
  })()}

  <div class="page-footer">
    <span>${clientName} — Portfolio Report</span>
    <span>Made Out West Land Co. • madeoutwestlandco.com</span>
  </div>
</div>

<!-- ============================================================ -->
<!-- PROPERTY DETAIL PAGES (one per property) -->
<!-- ============================================================ -->
${properties.sort((a, b) => ((b.total_value || 0) * ((b.ownership_interest || 100) / 100)) - ((a.total_value || 0) * ((a.ownership_interest || 100) / 100))).map(p => {
  const oi = (p.ownership_interest || 100) / 100;
  const adjVal = (p.total_value || 0) * oi;
  const adjTimber = (p.timber_value || 0) * oi;
  const adjLand = (p.land_value || 0) * oi;
  const perAc = p.acres > 0 ? Math.round(adjVal / p.acres) : 0;
  const isFrac = (p.ownership_interest || 100) < 100;
  const appState = p.app_state || {};
  const stands = appState.stands || [];
  const assumptions = appState.assumptions || {};

  // Build stand rows from app_state if available
  const standRows = stands.map((s, i) => {
    const speciesName = s.species ? s.species.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '—';
    const status = s.standAge >= 50 ? 'Merchantable' : s.standAge >= 26 ? 'Pre-Merchantable' : s.standAge > 0 ? 'Young' : 'Non-Productive';
    const statusClass = status === 'Merchantable' ? 'status-merch' : status === 'Pre-Merchantable' ? 'status-pre' : 'status-non';
    return `<tr>
      <td>Unit ${i + 1}</td>
      <td>${speciesName}</td>
      <td class="right">${s.acres ? fNum(s.acres) : '—'}</td>
      <td class="right">${s.standAge ? s.standAge + ' yrs' : '—'}</td>
      <td class="right"><span class="status-badge ${statusClass}">${status}</span></td>
      <td class="right">—</td>
    </tr>`;
  }).join('');

  return `
<div class="page">
  <div class="prop-header">
    <div>
      <div class="prop-name">${p.name || 'Untitled Property'}</div>
      <div class="prop-meta">${p.county ? p.county + ' County, Oregon' : 'Oregon'} • ${p.acres ? fNum(p.acres) + ' acres' : ''} ${p.total_mbf ? '• ' + fNum(p.total_mbf) + ' MBF' : ''}</div>
      ${p.address ? `<div class="prop-meta" style="margin-top:2px;">${p.address}</div>` : ''}
    </div>
    <div class="prop-value-box">
      <div class="prop-value-label">Estimated Value</div>
      <div class="prop-value-amount">${fCur(adjVal)}</div>
      <div class="prop-value-per">${fCur(perAc)}/acre</div>
      ${isFrac ? `<div class="prop-frac-note">${p.ownership_interest}% interest · full: ${fCur(p.total_value)}</div>` : ''}
    </div>
  </div>

  <div class="value-tiles">
    <div class="value-tile">
      <div class="value-tile-label">Total Acres</div>
      <div class="value-tile-value">${fNum(p.acres)}</div>
    </div>
    <div class="value-tile">
      <div class="value-tile-label">Timber Value</div>
      <div class="value-tile-value">${fCur(adjTimber)}</div>
    </div>
    <div class="value-tile">
      <div class="value-tile-label">Land Value</div>
      <div class="value-tile-value">${fCur(adjLand)}</div>
    </div>
    <div class="value-tile">
      <div class="value-tile-label">Standing Volume</div>
      <div class="value-tile-value">${p.total_mbf ? fNum(p.total_mbf) + ' MBF' : '—'}</div>
    </div>
  </div>

  ${stands.length > 0 ? `
  <table class="stand-table">
    <thead>
      <tr>
        <th>Unit</th>
        <th>Species</th>
        <th class="right">Acres</th>
        <th class="right">Age</th>
        <th class="right">Status</th>
        <th class="right">Value</th>
      </tr>
    </thead>
    <tbody>${standRows}</tbody>
  </table>
  ` : ''}

  ${assumptions.logPrice ? `
  <div class="assumptions-box">
    <div class="assumption">
      <div class="assumption-label">Log Price</div>
      <div class="assumption-value">${fCur(assumptions.logPrice)}/MBF</div>
    </div>
    <div class="assumption">
      <div class="assumption-label">Logging Cost</div>
      <div class="assumption-value">${fCur(assumptions.loggingCost)}/MBF</div>
    </div>
    <div class="assumption">
      <div class="assumption-label">Discount Rate</div>
      <div class="assumption-value">${((assumptions.discountRate || 0.05) * 100).toFixed(1)}%</div>
    </div>
    <div class="assumption">
      <div class="assumption-label">Net Stumpage</div>
      <div class="assumption-value">${fCur((assumptions.logPrice || 0) - (assumptions.loggingCost || 0) - 6)}/MBF</div>
    </div>
  </div>
  ` : ''}

  <div class="disclaimer">
    This estimate is a screening-level valuation only and is not a certified appraisal. Values are modeled from entered stand data and market assumptions. 
    Actual timber volumes, quality, operability, and market conditions may vary. Professional timber cruise and site inspection recommended prior to any transaction.
  </div>

  <div class="page-footer">
    <span>${p.name || 'Property'} — ${p.county || ''} County</span>
    <span>Made Out West Land Co. • madeoutwestlandco.com</span>
  </div>
</div>`;
}).join('')}

<!-- ============================================================ -->
<!-- FINAL DISCLAIMER PAGE -->
<!-- ============================================================ -->
<div class="page">
  <div class="section-header">
    <div class="section-label">Important Disclosures</div>
    <div class="section-title">Terms & Limitations</div>
  </div>
  <div style="font-size: 12px; line-height: 1.9; color: #555; space-y: 16px;">
    <p style="margin-bottom:16px;"><strong style="color:var(--charcoal);">Nature of This Report.</strong> This portfolio valuation report has been prepared by Made Out West Land Co. as a screening-level estimate only. It is not a certified appraisal, a formal opinion of value, or an offer to purchase or sell any property. The values presented are estimates based on modeled assumptions and should be used for informational and planning purposes only.</p>
    <p style="margin-bottom:16px;"><strong style="color:var(--charcoal);">Timber Values.</strong> Timber valuations assume average #2 sawlog quality, fully stocked stands at the entered site conditions, and yield table projections based on species and stand age. Actual volumes will vary based on individual tree quality, stocking levels, species mix, and site conditions. A professional timber cruise is strongly recommended prior to any harvest or sale decision.</p>
    <p style="margin-bottom:16px;"><strong style="color:var(--charcoal);">Market Assumptions.</strong> Log prices, logging costs, and discount rates are estimates based on current market conditions and are subject to change. Actual stumpage values will vary based on log quality, haul distance to mill, market timing, and buyer demand. Values shown are gross estimates before income taxes.</p>
    <p style="margin-bottom:16px;"><strong style="color:var(--charcoal);">Land Values.</strong> Bare land values are estimated based on county-level market data and comparable sales. Actual land values may differ based on access, zoning, water rights, encumbrances, and other property-specific factors.</p>
    <p style="margin-bottom:16px;"><strong style="color:var(--charcoal);">Fractional Interests.</strong> Where ownership interests of less than 100% are noted, values shown reflect the indicated ownership share only. Full property values are shown for reference. Fractional interest holdings may be subject to additional discounts for lack of control and marketability not reflected in these estimates.</p>
    <p><strong style="color:var(--charcoal);">Recommendation.</strong> Consult a licensed appraiser for formal valuations, a qualified forestry professional before making harvest decisions, and legal counsel regarding ownership structure and title matters.</p>
  </div>
  <div style="margin-top: 48px; padding-top: 24px; border-top: 2px solid var(--tan); display: flex; justify-content: space-between; align-items: center;">
    <div>
      <div style="font-size: 13px; font-weight: 700; color: var(--charcoal);">Made Out West Land Co.</div>
      <div style="font-size: 11px; color: #888;">Powered by TIMBERLOG[X] • madeoutwestlandco.com</div>
    </div>
    <div style="text-align: right; font-size: 11px; color: #888;">
      ${generatedDate || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
    </div>
  </div>
  <div class="page-footer">
    <span>${clientName} — Portfolio Report</span>
    <span>Made Out West Land Co. • madeoutwestlandco.com</span>
  </div>
</div>

</body>
</html>`;

  browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${clientName.replace(/[^a-zA-Z0-9]/g, '_')}_Portfolio_Report.pdf"`);
    res.send(pdf);

  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error('Portfolio PDF error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate PDF' });
  }
};
