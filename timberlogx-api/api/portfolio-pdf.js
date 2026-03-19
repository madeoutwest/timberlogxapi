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
  .cover-label { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: #B85B2D; margin-bottom: 12px; margin-top: 48px; }
  .cover-title { font-size: 44px; font-weight: 700; color: white; line-height: 1.1; margin-bottom: 6px; }
  .cover-subtitle { font-size: 16px; color: rgba(255,255,255,0.5); margin-bottom: 40px; }
  .cover-stats { display: flex; gap: 32px; margin-top: 40px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 32px; }
  .cover-stat { flex: 1; border-top: 2px solid #B85B2D; padding-top: 12px; }
  .cover-stat-label { font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 6px; }
  .cover-stat-value { font-size: 26px; font-weight: 700; color: white; }
  .cover-stat-sub { font-size: 10px; color: rgba(255,255,255,0.3); margin-top: 3px; }
  .cover-footer { border-top: 1px solid rgba(255,255,255,0.15); padding-top: 20px; margin-top: 48px; display: flex; justify-content: space-between; font-size: 11px; color: rgba(255,255,255,0.35); }

  /* Logo */
  .logo-area { margin-bottom: 0; }
  .logo-text { font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-top: 6px; }

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
  <div class="logo-area">
    <svg width="64" height="44" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 60 L30 20 L50 50 L60 30 L70 50 L90 20 L110 60" stroke="white" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="60" cy="18" r="6" fill="white"/>
    </svg>
    <div class="logo-text">Made Out West Land Co.</div>
  </div>

  <div>
    <div class="cover-label">Portfolio Valuation Report</div>
    <div class="cover-title">${clientName}</div>
    <div class="cover-subtitle">Oregon Timberland Portfolio</div>

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
  <div class="page-footer"><span>${clientName} — Portfolio Report</span><span>Made Out West Land Co.</span></div>
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
  <div class="page-footer"><span>${clientName} — Portfolio Report</span><span>Made Out West Land Co.</span></div>
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

  const standRows = stands.map((s, i) => {
    const speciesName = (s.species || '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const age = s.standAge || 0;
    const status = age >= 50 ? 'Merchantable' : age >= 26 ? 'Pre-Merchantable' : age > 0 ? 'Young' : 'Non-Productive';
    const cls = status === 'Merchantable' ? 's-merch' : status === 'Pre-Merchantable' ? 's-pre' : 's-non';
    return `<tr>
      <td>Unit ${i+1}</td>
      <td>${speciesName || '—'}</td>
      <td class="r">${s.acres ? fNum(s.acres) : '—'}</td>
      <td class="r">${age ? age + ' yrs' : '—'}</td>
      <td class="r"><span class="${cls}">${status}</span></td>
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
    <thead><tr><th>Unit</th><th>Species</th><th class="r">Acres</th><th class="r">Age</th><th class="r">Status</th></tr></thead>
    <tbody>${standRows}</tbody>
  </table>` : ''}

  ${assumptions.logPrice ? `
  <div class="assumptions">
    <div><div class="assumption-label">Log Price</div><div class="assumption-value">${fCur(assumptions.logPrice)}/MBF</div></div>
    <div><div class="assumption-label">Logging Cost</div><div class="assumption-value">${fCur(assumptions.loggingCost)}/MBF</div></div>
    <div><div class="assumption-label">Discount Rate</div><div class="assumption-value">${((assumptions.discountRate||0.05)*100).toFixed(1)}%</div></div>
    <div><div class="assumption-label">Net Stumpage</div><div class="assumption-value">${fCur((assumptions.logPrice||0)-(assumptions.loggingCost||0)-6)}/MBF</div></div>
  </div>` : ''}

  <div class="disclaimer">Screening-level estimate only. Not a certified appraisal. Professional timber cruise and site inspection recommended prior to any transaction.</div>
  <div class="page-footer"><span>${p.name || 'Property'} — ${p.county || ''} County</span><span>Made Out West Land Co.</span></div>
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
  <div class="page-footer"><span>${clientName} — Portfolio Report</span><span>Made Out West Land Co.</span></div>
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
