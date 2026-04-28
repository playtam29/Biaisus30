const SERIES = {
  FEDFUNDS: 'Fed Funds Rate',
  DGS10: 'US 10Y Yield',
  CPIAUCSL: 'US CPI',
  UNRATE: 'US Unemployment Rate',
  PAYEMS: 'US Nonfarm Payrolls',
  SAHMREALTIME: 'Sahm Rule'
};

async function getSeries(apiKey, id, limit = 3) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(id)}&api_key=${encodeURIComponent(apiKey)}&file_type=json&sort_order=desc&limit=${limit}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  const txt = await res.text();
  if (!res.ok) throw new Error(`FRED ${id}: HTTP ${res.status} ${txt}`);
  const data = JSON.parse(txt);
  return Array.isArray(data.observations) ? data.observations : [];
}

function toNum(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

exports.handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    const apiKey = (q.apiKey || '').trim();
    if (!apiKey) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'API key FRED manquante' }) };
    }

    const ids = Object.keys(SERIES);
    const entries = await Promise.all(ids.map(async id => [id, await getSeries(apiKey, id, 3)]));
    const map = Object.fromEntries(entries);

    const latest = {};
    ids.forEach(id => {
      latest[id] = map[id][0] ? { date: map[id][0].date, value: map[id][0].value } : null;
    });

    let score = 0;
    const breakdown = [];

    const fed0 = toNum(map.FEDFUNDS[0]?.value), fed1 = toNum(map.FEDFUNDS[1]?.value);
    if (fed0 !== null && fed1 !== null) {
      if (fed0 < fed1) { score += 2; breakdown.push({ indicator: 'Fed Funds', signal: 'En baisse', impact: 'Assouplissement favorable aux actions', points: '+2' }); }
      else if (fed0 > fed1) { score -= 2; breakdown.push({ indicator: 'Fed Funds', signal: 'En hausse', impact: 'Politique plus restrictive', points: '-2' }); }
      else breakdown.push({ indicator: 'Fed Funds', signal: 'Stable', impact: 'Neutre', points: '0' });
    }

    const y0 = toNum(map.DGS10[0]?.value), y1 = toNum(map.DGS10[1]?.value);
    if (y0 !== null && y1 !== null) {
      if (y0 < y1) { score += 1; breakdown.push({ indicator: 'US 10Y', signal: 'Rendement en baisse', impact: 'Support pour les actions', points: '+1' }); }
      else if (y0 > y1) { score -= 1; breakdown.push({ indicator: 'US 10Y', signal: 'Rendement en hausse', impact: 'Pression sur les valorisations', points: '-1' }); }
      else breakdown.push({ indicator: 'US 10Y', signal: 'Stable', impact: 'Neutre', points: '0' });
    }

    const c0 = toNum(map.CPIAUCSL[0]?.value), c1 = toNum(map.CPIAUCSL[1]?.value);
    if (c0 !== null && c1 !== null) {
      if (c0 < c1) { score += 1; breakdown.push({ indicator: 'Inflation CPI', signal: 'Ralentit', impact: 'Plutôt positif pour le US30', points: '+1' }); }
      else if (c0 > c1) { score -= 1; breakdown.push({ indicator: 'Inflation CPI', signal: 'Accélère', impact: 'Plutôt négatif pour le US30', points: '-1' }); }
      else breakdown.push({ indicator: 'Inflation CPI', signal: 'Stable', impact: 'Neutre', points: '0' });
    }

    const u0 = toNum(map.UNRATE[0]?.value), u1 = toNum(map.UNRATE[1]?.value);
    if (u0 !== null && u1 !== null) {
      if (u0 < u1) { score += 1; breakdown.push({ indicator: 'Chômage', signal: 'En baisse', impact: 'Conjoncture solide', points: '+1' }); }
      else if (u0 > u1) { score -= 1; breakdown.push({ indicator: 'Chômage', signal: 'En hausse', impact: 'Risque de ralentissement', points: '-1' }); }
      else breakdown.push({ indicator: 'Chômage', signal: 'Stable', impact: 'Neutre', points: '0' });
    }

    const p0 = toNum(map.PAYEMS[0]?.value), p1 = toNum(map.PAYEMS[1]?.value);
    if (p0 !== null && p1 !== null) {
      if (p0 > p1) { score += 1; breakdown.push({ indicator: 'Payrolls', signal: 'En hausse', impact: 'Activité robuste', points: '+1' }); }
      else if (p0 < p1) { score -= 1; breakdown.push({ indicator: 'Payrolls', signal: 'En baisse', impact: 'Momentum économique plus faible', points: '-1' }); }
      else breakdown.push({ indicator: 'Payrolls', signal: 'Stable', impact: 'Neutre', points: '0' });
    }

    const s0 = toNum(map.SAHMREALTIME[0]?.value), s1 = toNum(map.SAHMREALTIME[1]?.value);
    if (s0 !== null && s1 !== null) {
      if (s0 > s1) { score -= 1; breakdown.push({ indicator: 'Sahm Rule', signal: 'Monte', impact: 'Stress récessionniste', points: '-1' }); }
      else if (s0 < s1) { score += 1; breakdown.push({ indicator: 'Sahm Rule', signal: 'Baisse', impact: 'Moins de stress macro', points: '+1' }); }
      else breakdown.push({ indicator: 'Sahm Rule', signal: 'Stable', impact: 'Neutre', points: '0' });
    }

    let bias_label = 'Neutre';
    let explanation = 'Le contexte macro est équilibré pour le US30.';
    if (score >= 3) {
      bias_label = 'Haussier';
      explanation = 'Le contexte macro favorise plutôt un biais haussier sur le US30.';
    } else if (score <= -3) {
      bias_label = 'Baissier';
      explanation = 'Le contexte macro favorise plutôt un biais baissier sur le US30.';
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ ok: true, source: 'FRED', score, bias_label, explanation, latest, breakdown })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Erreur interne' })
    };
  }
};
