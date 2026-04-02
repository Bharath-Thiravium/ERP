/**
 * SAP Template Test — Full Output Version
 * Run: fetch('/template_test.js').then(r=>r.text()).then(code => eval(code))
 * For settings tests: fetch('/template_test.js?su_id=X&su_pass=Y').then(r=>r.text()).then(code => eval(code))
 */
(async () => {

  const BASE    = window.location.origin;
  const params  = new URLSearchParams(window.location.search);
  const argSuId = params.get('su_id')   || '';
  const argPass = params.get('su_pass') || '';
  const argType = params.get('su_type') || 'finance';

  /* ── collect results, print at end ── */
  const results = [];
  const R = (status, msg, detail='') => results.push({status, msg, detail});
  const ok   = (m)    => R('ok',   m);
  const fail = (m, d) => R('fail', m, d||'');
  const warn = (m)    => R('warn', m);
  const sec  = (t)    => R('sec',  t);

  const decrypt = s => { try { return atob(s); } catch { return ''; } };

  /* ════════════════════════════════════════════════════════
     1. AUTH TOKENS
  ════════════════════════════════════════════════════════ */
  sec('1. Auth Tokens');
  const rawJwt = sessionStorage.getItem('_at') || localStorage.getItem('_at');
  const jwt    = rawJwt ? decrypt(rawJwt) : null;
  let   sk     = sessionStorage.getItem('service_session_key');

  if (jwt) {
    try {
      const p   = JSON.parse(atob(jwt.split('.')[1]));
      const exp = p.exp ? new Date(p.exp * 1000) : null;
      if (exp && exp < new Date()) warn(`JWT EXPIRED at ${exp.toLocaleString()}`);
      else ok(`JWT valid — expires ${exp ? exp.toLocaleString() : '?'}, user_id=${p.user_id||p.id||'?'}`);
    } catch { warn('JWT found but could not decode'); }
  } else {
    warn('No JWT — preview tests will be skipped. Log in as company user first.');
  }

  if (sk) {
    ok(`Service session key: ${sk.slice(0,8)}...`);
  } else if (argSuId && argPass) {
    try {
      const r = await fetch(`${BASE}/api/auth/service-user/login/`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({unique_service_id:argSuId, password:argPass, service_type:argType})
      });
      const d = await r.json();
      if (r.ok && d.session_key) {
        sk = d.session_key;
        sessionStorage.setItem('service_session_key', sk);
        ok(`Service user auto-login OK — key: ${sk.slice(0,8)}...`);
      } else {
        warn(`Service user login failed: ${JSON.stringify(d).slice(0,120)}`);
      }
    } catch(e) { warn(`Service user login error: ${e.message}`); }
  } else {
    warn('No service session key — settings tests skipped. Pass ?su_id=X&su_pass=Y');
  }

  /* ════════════════════════════════════════════════════════
     2. TEMPLATE INFO (public)
  ════════════════════════════════════════════════════════ */
  sec('2. Template Info (public)');
  try {
    const r = await fetch(`${BASE}/api/company-dashboard/template-info/`);
    if (r.ok) {
      ok(`GET /template-info/ → ${r.status}`);
      const d = await r.json();
      d.success ? ok('success=true') : fail('success not true');
      for (const k of ['quotation_templates','po_templates','proforma_templates','invoice_templates']) {
        const n = (d.data?.[k]||[]).length;
        n===3 ? ok(`${k}: 3 templates`) : fail(`${k}: expected 3, got ${n}`);
      }
      const codes = (d.data?.quotation_templates||[]).map(t=>t.code);
      ['AS','BKGE','TC'].every(c=>codes.includes(c))
        ? ok('Codes AS, BKGE, TC present')
        : fail('Missing codes', codes.join(','));
    } else { fail(`GET /template-info/ → ${r.status}`); }
  } catch(e) { fail('template-info failed', e.message); }

  /* ════════════════════════════════════════════════════════
     3. SETTINGS (service user session)
  ════════════════════════════════════════════════════════ */
  sec('3. Settings Endpoints');
  if (sk) {
    const eps = [
      ['/api/company-dashboard/quotation-template-settings/', 'selected_template',          'quotation'],
      ['/api/company-dashboard/po-template-settings/',        'selected_po_template',       'po'],
      ['/api/company-dashboard/proforma-template-settings/',  'selected_proforma_template', 'proforma'],
      ['/api/company-dashboard/invoice-template-settings/',   'selected_invoice_template',  'invoice'],
    ];
    for (const [ep, field, name] of eps) {
      try {
        const r = await fetch(`${ep}?session_key=${sk}`);
        if (r.ok) {
          const d = await r.json();
          ok(`GET ${ep} → ${r.status}`);
          d.success ? ok(`  ${name}: success=true`) : fail(`  ${name}: success not true`);
          JSON.stringify(d.data||{}).includes(field)
            ? ok(`  ${name}: '${field}' present`)
            : fail(`  ${name}: '${field}' missing`, JSON.stringify(d.data).slice(0,80));
        } else { fail(`GET ${ep} → ${r.status}`); }
      } catch(e) { fail(`Settings ${name}`, e.message); }
    }
    // POST valid
    try {
      const r = await fetch(`/api/company-dashboard/quotation-template-settings/?session_key=${sk}`,
        {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({selected_template:'AS'})});
      r.ok ? ok('POST quotation settings AS → ok') : fail(`POST settings → ${r.status}`);
    } catch(e) { fail('POST settings', e.message); }
    // POST invalid
    try {
      const r = await fetch(`/api/company-dashboard/quotation-template-settings/?session_key=${sk}`,
        {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({selected_template:'INVALID'})});
      r.status===400 ? ok('POST invalid value → 400 (rejected correctly)') : fail(`POST invalid → ${r.status}`);
    } catch(e) { fail('POST invalid', e.message); }
  } else {
    warn('Skipped — no session key');
  }

  /* ════════════════════════════════════════════════════════
     4. PREVIEWS + LOGO
  ════════════════════════════════════════════════════════ */
  sec('4. Preview Endpoints + Logo');
  const logoTable = {};

  if (jwt) {
    const hdrs = {'Authorization':`Bearer ${jwt}`};

    // auth guard checks
    try {
      const r = await fetch('/api/company-dashboard/quotation-template-preview/AS/');
      [401,403].includes(r.status) ? ok(`Unauth rejected → ${r.status}`) : fail(`Unauth should be 401/403, got ${r.status}`);
    } catch(e) { fail('Unauth test', e.message); }

    try {
      const r = await fetch('/api/company-dashboard/quotation-template-preview/INVALID/', {headers:hdrs});
      r.status===400 ? ok('Invalid name → 400') : fail(`Invalid name → ${r.status}`);
    } catch(e) { fail('Invalid name test', e.message); }

    const docs = [
      ['/api/company-dashboard/quotation-template-preview/', 'quotation',      ['Quotation','QT/']],
      ['/api/company-dashboard/invoice-template-preview/',   'invoice',        ['Invoice','INV/']],
      ['/api/company-dashboard/proforma-template-preview/',  'proforma',       ['Proforma Invoice','PI/']],
      ['/api/company-dashboard/po-template-preview/',        'purchase_order', ['Purchase Order','PO/']],
    ];
    const styleInfo = {
      AS:   {css:['hdr-logo','hdr-co','accent'],    color:'1a1a2e', label:'Navy/Gold'},
      BKGE: {css:['hdr-logo','strip','hdr-doc'],    color:'0f766e', label:'Teal'},
      TC:   {css:['hdr-logo','gold-rule','meta'],   color:'c9a84c', label:'Gold/Charcoal'},
    };

    for (const [base, docType, markers] of docs) {
      logoTable[docType] = {};
      for (const style of ['AS','BKGE','TC']) {
        const url = `${base}${style}/`;
        try {
          const r = await fetch(url, {headers:hdrs});
          if (!r.ok) { fail(`${url} → ${r.status}`); logoTable[docType][style]='✗ request failed'; continue; }

          ok(`${url} → ${r.status}`);
          const ct = r.headers.get('content-type')||'';
          ct.includes('text/html') ? ok(`  [${docType}/${style}] Content-Type: text/html`) : fail(`  wrong CT: ${ct}`);

          const html = await r.text();
          const si   = styleInfo[style];

          // structure
          const missing = si.css.filter(c=>!html.includes(c));
          missing.length===0 ? ok(`  [${docType}/${style}] Structure OK`) : fail(`  [${docType}/${style}] Missing: ${missing.join(',')}`);

          // colour
          html.includes(si.color) ? ok(`  [${docType}/${style}] Colour (${si.label}) ✓`) : fail(`  [${docType}/${style}] Colour ${si.color} missing`);

          // logo panel
          html.includes('hdr-logo') ? ok(`  [${docType}/${style}] Logo panel present`) : fail(`  [${docType}/${style}] Logo panel MISSING`);

          // logo img src
          const imgM = html.match(/<img[^>]+src="([^"]+)"/);
          if (imgM) {
            const src = imgM[1];
            if (src.startsWith('https://') || src.startsWith('http://')) {
              ok(`  [${docType}/${style}] logo src = ${src} (absolute URL ✓)`);
              logoTable[docType][style] = `✓ ${src.includes('/media/') ? src.split('/media/')[1] : src}`;
              // actually load it
              try {
                const ir = await fetch(src);
                if (ir.ok) {
                  const b = await ir.blob();
                  ok(`  [${docType}/${style}] Logo loads OK — ${(b.size/1024).toFixed(0)}KB ${b.type}`);
                } else { fail(`  [${docType}/${style}] Logo file → ${ir.status}`); }
              } catch(e) { fail(`  [${docType}/${style}] Logo fetch`, e.message); }
            } else if (src.startsWith('/media/')) {
              fail(`  [${docType}/${style}] src is relative /media/ — BROKEN from blob: origin`);
              logoTable[docType][style] = '✗ relative /media/ broken';
            } else if (src.startsWith('file://')) {
              fail(`  [${docType}/${style}] src is file:// — browser BLOCKED`);
              logoTable[docType][style] = '✗ file:// blocked';
            } else {
              warn(`  [${docType}/${style}] unexpected src: ${src.slice(0,60)}`);
              logoTable[docType][style] = `? ${src.slice(0,40)}`;
            }
          } else if (html.includes('monogram')) {
            warn(`  [${docType}/${style}] No logo — monogram shown (no logo uploaded)`);
            logoTable[docType][style] = '⚠ monogram';
          } else {
            fail(`  [${docType}/${style}] No img and no monogram`);
            logoTable[docType][style] = '✗ missing';
          }

          // placeholders / artifacts
          html.includes('%%') ? fail(`  [${docType}/${style}] Unreplaced %%`) : ok(`  [${docType}/${style}] No %% placeholders`);
          (html.includes("'invoice' == 'purchase_order'") || html.includes("'quotation' =="))
            ? fail(`  [${docType}/${style}] Sed artifact found`)
            : ok(`  [${docType}/${style}] No sed artifacts`);

          // doc type marker
          markers.some(m=>html.includes(m)) ? ok(`  [${docType}/${style}] Doc marker found`) : fail(`  [${docType}/${style}] Doc marker missing`);

          // TC extras
          if (style==='TC') {
            html.includes('Tax Summary')                    ? ok(`  [TC/${docType}] HSN Tax Summary ✓`)   : fail(`  [TC/${docType}] HSN Tax Summary MISSING`);
            (html.includes('Bank Details')||html.includes('IFSC')) ? ok(`  [TC/${docType}] Bank details ✓`) : fail(`  [TC/${docType}] Bank details MISSING`);
            (html.match(/sigspace/g)||[]).length>=3         ? ok(`  [TC/${docType}] 3 signatures ✓`)      : fail(`  [TC/${docType}] <3 signatures`);
            html.includes('Declaration')                    ? ok(`  [TC/${docType}] Declaration ✓`)       : fail(`  [TC/${docType}] Declaration MISSING`);
          }
          // BKGE extras
          if (style==='BKGE') {
            (html.includes('Amount in Words')||html.includes('words')) ? ok(`  [BKGE/${docType}] Amount in Words ✓`) : fail(`  [BKGE/${docType}] Amount in Words MISSING`);
            (html.includes('Place of Supply')||html.includes('Reverse Charge')) ? ok(`  [BKGE/${docType}] Compliance fields ✓`) : fail(`  [BKGE/${docType}] Compliance fields MISSING`);
          }

        } catch(e) { fail(`${url}`, e.message); logoTable[docType][style]='✗ error'; }
      }
    }
  } else {
    warn('Skipped — no JWT');
  }

  /* ════════════════════════════════════════════════════════
     PRINT ALL RESULTS AT ONCE
  ════════════════════════════════════════════════════════ */
  const S = { ok:'color:#22c55e;font-weight:700', fail:'color:#ef4444;font-weight:700', warn:'color:#f59e0b;font-weight:700', sec:'color:#a78bfa;font-weight:700;font-size:13px' };
  let passed=0, failed=0, warned=0;

  console.log('%c\n══════════════════════════════════════════════════════\n  SAP TEMPLATE TEST RESULTS\n══════════════════════════════════════════════════════', S.sec);

  for (const {status, msg, detail} of results) {
    if (status==='sec') {
      console.log(`%c\n── ${msg} ──`, S.sec);
    } else if (status==='ok') {
      passed++;
      console.log(`%c  ✓ ${msg}`, S.ok);
    } else if (status==='fail') {
      failed++;
      console.log(`%c  ✗ ${msg}${detail ? ' → '+detail : ''}`, S.fail);
    } else {
      warned++;
      console.log(`%c  ⚠ ${msg}`, S.warn);
    }
  }

  /* logo summary table */
  if (Object.keys(logoTable).length) {
    console.log('%c\n── 5. Logo Summary ──', S.sec);
    console.table(logoTable);
  }

  /* final counts */
  console.log(`%c\n══════════════════════════════════════════════════════`, S.sec);
  console.log(`%c  ✓ Passed : ${passed}`, S.ok);
  console.log(`%c  ✗ Failed : ${failed}`, S.fail);
  console.log(`%c  ⚠ Warned : ${warned}`, S.warn);
  console.log(`%c  Total   : ${passed+failed+warned}`, S.sec);
  failed===0
    ? console.log('%c  ✓ ALL CHECKS PASSED\n', S.ok)
    : console.log(`%c  ✗ ${failed} FAILED — review above\n`, S.fail);

})();
