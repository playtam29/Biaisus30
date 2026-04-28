const COMMON_SERIES = {
  FEDFUNDS: 'Fed Funds Rate',
  DGS10: 'US 10Y Yield',
  CPIAUCSL: 'US CPI',
  UNRATE: 'US Unemployment Rate',
  PAYEMS: 'US Nonfarm Payrolls',
  SAHMREALTIME: 'Sahm Rule',
  DEXUSEU: 'EURUSD spot proxy'
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

function pushRule(breakdown, indicator, signal, impact, points) {
  breakdown.push({ indicator, signal, impact, points: points > 0 ? `+${points}` : String(points) });
}

function scoreUS30(map) {
  let score = 0; const breakdown = [];
  const fed0 = toNum(map.FEDFUNDS[0]?.value), fed1 = toNum(map.FEDFUNDS[1]?.value);
  if (fed0 !== null && fed1 !== null) fed0 < fed1 ? (score += 2, pushRule(breakdown,'Fed Funds','En baisse','Assouplissement favorable aux actions',2)) : fed0 > fed1 ? (score -= 2, pushRule(breakdown,'Fed Funds','En hausse','Politique plus restrictive',-2)) : pushRule(breakdown,'Fed Funds','Stable','Neutre',0);
  const y0 = toNum(map.DGS10[0]?.value), y1 = toNum(map.DGS10[1]?.value);
  if (y0 !== null && y1 !== null) y0 < y1 ? (score += 1, pushRule(breakdown,'US 10Y','Rendement en baisse','Support pour les actions',1)) : y0 > y1 ? (score -= 1, pushRule(breakdown,'US 10Y','Rendement en hausse','Pression sur les valorisations',-1)) : pushRule(breakdown,'US 10Y','Stable','Neutre',0);
  const c0 = toNum(map.CPIAUCSL[0]?.value), c1 = toNum(map.CPIAUCSL[1]?.value);
  if (c0 !== null && c1 !== null) c0 < c1 ? (score += 1, pushRule(breakdown,'Inflation CPI','Ralentit','Plutôt positif pour le US30',1)) : c0 > c1 ? (score -= 1, pushRule(breakdown,'Inflation CPI','Accélère','Plutôt négatif pour le US30',-1)) : pushRule(breakdown,'Inflation CPI','Stable','Neutre',0);
  const u0 = toNum(map.UNRATE[0]?.value), u1 = toNum(map.UNRATE[1]?.value);
  if (u0 !== null && u1 !== null) u0 < u1 ? (score += 1, pushRule(breakdown,'Chômage','En baisse','Conjoncture solide',1)) : u0 > u1 ? (score -= 1, pushRule(breakdown,'Chômage','En hausse','Risque de ralentissement',-1)) : pushRule(breakdown,'Chômage','Stable','Neutre',0);
  const p0 = toNum(map.PAYEMS[0]?.value), p1 = toNum(map.PAYEMS[1]?.value);
  if (p0 !== null && p1 !== null) p0 > p1 ? (score += 1, pushRule(breakdown,'Payrolls','En hausse','Activité robuste',1)) : p0 < p1 ? (score -= 1, pushRule(breakdown,'Payrolls','En baisse','Momentum économique plus faible',-1)) : pushRule(breakdown,'Payrolls','Stable','Neutre',0);
  const s0 = toNum(map.SAHMREALTIME[0]?.value), s1 = toNum(map.SAHMREALTIME[1]?.value);
  if (s0 !== null && s1 !== null) s0 > s1 ? (score -= 1, pushRule(breakdown,'Sahm Rule','Monte','Stress récessionniste',-1)) : s0 < s1 ? (score += 1, pushRule(breakdown,'Sahm Rule','Baisse','Moins de stress macro',1)) : pushRule(breakdown,'Sahm Rule','Stable','Neutre',0);
  return { score, breakdown, model_note: 'Modèle US30 basé sur taux, inflation, emploi et stress macro US.' };
}

function scoreUS100(map) {
  let score = 0; const breakdown = [];
  const fed0 = toNum(map.FEDFUNDS[0]?.value), fed1 = toNum(map.FEDFUNDS[1]?.value);
  if (fed0 !== null && fed1 !== null) fed0 < fed1 ? (score += 3, pushRule(breakdown,'Fed Funds','En baisse','Très positif pour le US100 sensible aux taux',3)) : fed0 > fed1 ? (score -= 3, pushRule(breakdown,'Fed Funds','En hausse','Très négatif pour le US100 sensible aux taux',-3)) : pushRule(breakdown,'Fed Funds','Stable','Neutre',0);
  const y0 = toNum(map.DGS10[0]?.value), y1 = toNum(map.DGS10[1]?.value);
  if (y0 !== null && y1 !== null) y0 < y1 ? (score += 2, pushRule(breakdown,'US 10Y','Rendement en baisse','Soulage fortement les valeurs de croissance',2)) : y0 > y1 ? (score -= 2, pushRule(breakdown,'US 10Y','Rendement en hausse','Pèse fortement sur les valorisations tech',-2)) : pushRule(breakdown,'US 10Y','Stable','Neutre',0);
  const c0 = toNum(map.CPIAUCSL[0]?.value), c1 = toNum(map.CPIAUCSL[1]?.value);
  if (c0 !== null && c1 !== null) c0 < c1 ? (score += 2, pushRule(breakdown,'Inflation CPI','Ralentit','Très positif pour le US100',2)) : c0 > c1 ? (score -= 2, pushRule(breakdown,'Inflation CPI','Accélère','Très négatif pour le US100',-2)) : pushRule(breakdown,'Inflation CPI','Stable','Neutre',0);
  const p0 = toNum(map.PAYEMS[0]?.value), p1 = toNum(map.PAYEMS[1]?.value);
  if (p0 !== null && p1 !== null) p0 < p1 ? (score += 1, pushRule(breakdown,'Payrolls','En baisse','Peut aider le narratif de baisse de taux',1)) : p0 > p1 ? (score -= 1, pushRule(breakdown,'Payrolls','En hausse','Peut retarder la détente monétaire',-1)) : pushRule(breakdown,'Payrolls','Stable','Neutre',0);
  const s0 = toNum(map.SAHMREALTIME[0]?.value), s1 = toNum(map.SAHMREALTIME[1]?.value);
  if (s0 !== null && s1 !== null) s0 > s1 ? (score -= 1, pushRule(breakdown,'Sahm Rule','Monte','Stress récessionniste',-1)) : s0 < s1 ? (score += 1, pushRule(breakdown,'Sahm Rule','Baisse','Moins de stress macro',1)) : pushRule(breakdown,'Sahm Rule','Stable','Neutre',0);
  return { score, breakdown, model_note: 'Modèle US100 plus sensible aux taux et aux rendements que le modèle US30.' };
}

function scoreGER40(map) {
  let score = 0; const breakdown = [];
  const fx0 = toNum(map.DEXUSEU[0]?.value), fx1 = toNum(map.DEXUSEU[1]?.value);
  if (fx0 !== null && fx1 !== null) fx0 < fx1 ? (score += 1, pushRule(breakdown,'EURUSD','Euro plus faible','Plutôt favorable aux exportateurs allemands',1)) : fx0 > fx1 ? (score -= 1, pushRule(breakdown,'EURUSD','Euro plus fort','Peut peser sur les exportateurs allemands',-1)) : pushRule(breakdown,'EURUSD','Stable','Neutre',0);
  const y0 = toNum(map.DGS10[0]?.value), y1 = toNum(map.DGS10[1]?.value);
  if (y0 !== null && y1 !== null) y0 < y1 ? (score += 1, pushRule(breakdown,'US 10Y','Rendement en baisse','Soulage les actifs risqués',1)) : y0 > y1 ? (score -= 1, pushRule(breakdown,'US 10Y','Rendement en hausse','Pression globale sur les actions',-1)) : pushRule(breakdown,'US 10Y','Stable','Neutre',0);
  const fed0 = toNum(map.FEDFUNDS[0]?.value), fed1 = toNum(map.FEDFUNDS[1]?.value);
  if (fed0 !== null && fed1 !== null) fed0 < fed1 ? (score += 1, pushRule(breakdown,'Fed Funds','En baisse','Contexte mondial plus souple',1)) : fed0 > fed1 ? (score -= 1, pushRule(breakdown,'Fed Funds','En hausse','Contexte mondial plus restrictif',-1)) : pushRule(breakdown,'Fed Funds','Stable','Neutre',0);
  const c0 = toNum(map.CPIAUCSL[0]?.value), c1 = toNum(map.CPIAUCSL[1]?.value);
  if (c0 !== null && c1 !== null) c0 < c1 ? (score += 1, pushRule(breakdown,'Inflation US','Ralentit','Moins de pression globale sur les taux',1)) : c0 > c1 ? (score -= 1, pushRule(breakdown,'Inflation US','Accélère','Plus de pression sur les valorisations',-1)) : pushRule(breakdown,'Inflation US','Stable','Neutre',0);
  const p0 = toNum(map.PAYEMS[0]?.value), p1 = toNum(map.PAYEMS[1]?.value);
  if (p0 !== null && p1 !== null) p0 > p1 ? (score += 1, pushRule(breakdown,'Payrolls US','En hausse','Demande mondiale plus robuste',1)) : p0 < p1 ? (score -= 1, pushRule(breakdown,'Payrolls US','En baisse','Croissance mondiale plus faible',-1)) : pushRule(breakdown,'Payrolls US','Stable','Neutre',0);
  const s0 = toNum(map.SAHMREALTIME[0]?.value), s1 = toNum(map.SAHMREALTIME[1]?.value);
  if (s0 !== null && s1 !== null) s0 > s1 ? (score -= 1, pushRule(breakdown,'Sahm Rule','Monte','Stress récessionniste mondial',-1)) : s0 < s1 ? (score += 1, pushRule(breakdown,'Sahm Rule','Baisse','Moins de stress macro',1)) : pushRule(breakdown,'Sahm Rule','Stable','Neutre',0);
  return { score, breakdown, model_note: 'Modèle GER40 par proxies macro mondiaux et EURUSD, pas par données locales DAX directes.' };
}

function scoreXAUUSD(map) {
  let score = 0; const breakdown = [];
  const fed0 = toNum(map.FEDFUNDS[0]?.value), fed1 = toNum(map.FEDFUNDS[1]?.value);
  if (fed0 !== null && fed1 !== null) fed0 < fed1 ? (score += 2, pushRule(breakdown,'Fed Funds','En baisse','Positif pour l’or',2)) : fed0 > fed1 ? (score -= 2, pushRule(breakdown,'Fed Funds','En hausse','Négatif pour l’or',-2)) : pushRule(breakdown,'Fed Funds','Stable','Neutre',0);
  const y0 = toNum(map.DGS10[0]?.value), y1 = toNum(map.DGS10[1]?.value);
  if (y0 !== null && y1 !== null) y0 < y1 ? (score += 2, pushRule(breakdown,'US 10Y','Rendement en baisse','Positif pour l’or',2)) : y0 > y1 ? (score -= 2, pushRule(breakdown,'US 10Y','Rendement en hausse','Négatif pour l’or',-2)) : pushRule(breakdown,'US 10Y','Stable','Neutre',0);
  const fx0 = toNum(map.DEXUSEU[0]?.value), fx1 = toNum(map.DEXUSEU[1]?.value);
  if (fx0 !== null && fx1 !== null) fx0 > fx1 ? (score += 2, pushRule(breakdown,'EURUSD','Dollar plus faible','Soutien pour l’or',2)) : fx0 < fx1 ? (score -= 2, pushRule(breakdown,'EURUSD','Dollar plus fort','Frein pour l’or',-2)) : pushRule(breakdown,'EURUSD','Stable','Neutre',0);
  const c0 = toNum(map.CPIAUCSL[0]?.value), c1 = toNum(map.CPIAUCSL[1]?.value);
  if (c0 !== null && c1 !== null) c0 > c1 ? (score += 1, pushRule(breakdown,'Inflation CPI','Accélère','Argument inflationniste pour l’or',1)) : c0 < c1 ? (score -= 1, pushRule(breakdown,'Inflation CPI','Ralentit','Moins de besoin de couverture inflation',-1)) : pushRule(breakdown,'Inflation CPI','Stable','Neutre',0);
  const s0 = toNum(map.SAHMREALTIME[0]?.value), s1 = toNum(map.SAHMREALTIME[1]?.value);
  if (s0 !== null && s1 !== null) s0 > s1 ? (score += 1, pushRule(breakdown,'Sahm Rule','Monte','Stress macro favorable à l’or',1)) : s0 < s1 ? (score -= 1, pushRule(breakdown,'Sahm Rule','Baisse','Moins de demande refuge',-1)) : pushRule(breakdown,'Sahm Rule','Stable','Neutre',0);
  return { score, breakdown, model_note: 'Modèle XAUUSD basé sur Fed, rendements US, inflation et force relative du dollar.' };
}

function scoreEURUSD(map) {
  let score = 0; const breakdown = [];
  const fed0 = toNum(map.FEDFUNDS[0]?.value), fed1 = toNum(map.FEDFUNDS[1]?.value);
  if (fed0 !== null && fed1 !== null) fed0 < fed1 ? (score += 2, pushRule(breakdown,'Fed Funds','En baisse','Plutôt haussier pour EURUSD via USD plus faible',2)) : fed0 > fed1 ? (score -= 2, pushRule(breakdown,'Fed Funds','En hausse','Plutôt baissier pour EURUSD via USD plus fort',-2)) : pushRule(breakdown,'Fed Funds','Stable','Neutre',0);
  const y0 = toNum(map.DGS10[0]?.value), y1 = toNum(map.DGS10[1]?.value);
  if (y0 !== null && y1 !== null) y0 < y1 ? (score += 2, pushRule(breakdown,'US 10Y','Rendement en baisse','Soulage le dollar, soutien EURUSD',2)) : y0 > y1 ? (score -= 2, pushRule(breakdown,'US 10Y','Rendement en hausse','Renforce le dollar, pression sur EURUSD',-2)) : pushRule(breakdown,'US 10Y','Stable','Neutre',0);
  const c0 = toNum(map.CPIAUCSL[0]?.value), c1 = toNum(map.CPIAUCSL[1]?.value);
  if (c0 !== null && c1 !== null) c0 < c1 ? (score += 1, pushRule(breakdown,'Inflation US','Ralentit','Moins de pression hawkish sur la Fed',1)) : c0 > c1 ? (score -= 1, pushRule(breakdown,'Inflation US','Accélère','Plus de soutien au dollar',-1)) : pushRule(breakdown,'Inflation US','Stable','Neutre',0);
  const p0 = toNum(map.PAYEMS[0]?.value), p1 = toNum(map.PAYEMS[1]?.value);
  if (p0 !== null && p1 !== null) p0 < p1 ? (score += 1, pushRule(breakdown,'Payrolls US','En baisse','Données US plus molles, soutien EURUSD',1)) : p0 > p1 ? (score -= 1, pushRule(breakdown,'Payrolls US','En hausse','USD potentiellement soutenu',-1)) : pushRule(breakdown,'Payrolls US','Stable','Neutre',0);
  const fx0 = toNum(map.DEXUSEU[0]?.value), fx1 = toNum(map.DEXUSEU[1]?.value);
  if (fx0 !== null && fx1 !== null) fx0 > fx1 ? (score += 1, pushRule(breakdown,'EURUSD spot','Momentum en hausse','Confirme le biais haussier',1)) : fx0 < fx1 ? (score -= 1, pushRule(breakdown,'EURUSD spot','Momentum en baisse','Confirme le biais baissier',-1)) : pushRule(breakdown,'EURUSD spot','Stable','Neutre',0);
  return { score, breakdown, model_note: 'Modèle EURUSD basé sur la Fed, les rendements US, l’inflation US, les payrolls et le momentum spot EURUSD.' };
}

exports.handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    const apiKey = (q.apiKey || '').trim();
    const asset = (q.asset || 'US30').trim().toUpperCase();
    if (!apiKey) return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'API key FRED manquante' }) };
    if (!['US30','US100','GER40','XAUUSD','EURUSD'].includes(asset)) return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Actif non supporté' }) };

    const ids = Object.keys(COMMON_SERIES);
    const entries = await Promise.all(ids.map(async id => [id, await getSeries(apiKey, id, 3)]));
    const map = Object.fromEntries(entries);
    const latest = {};
    ids.forEach(id => { latest[id] = map[id][0] ? { date: map[id][0].date, value: map[id][0].value } : null; });

    let result = scoreUS30(map);
    if (asset === 'US100') result = scoreUS100(map);
    if (asset === 'GER40') result = scoreGER40(map);
    if (asset === 'XAUUSD') result = scoreXAUUSD(map);
    if (asset === 'EURUSD') result = scoreEURUSD(map);

    let bias_label = 'Neutre';
    let explanation = `Le contexte macro est équilibré pour ${asset}.`;
    if (result.score >= 3) { bias_label = 'Haussier'; explanation = `Le contexte macro favorise plutôt un biais haussier sur ${asset}.`; }
    else if (result.score <= -3) { bias_label = 'Baissier'; explanation = `Le contexte macro favorise plutôt un biais baissier sur ${asset}.`; }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify({ ok: true, source: 'FRED', asset, score: result.score, bias_label, explanation, latest, breakdown: result.breakdown, model_note: result.model_note })
    };
  } catch (err) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message || 'Erreur interne' }) };
  }
};
