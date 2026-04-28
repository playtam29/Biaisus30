exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  try {
    const body = JSON.parse(event.body || '{}');
    const apiKey = (body.apiKey || '').trim();
    if (!apiKey) {
      return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'API key manquante' }) };
    }
    const url = `https://api.tradingeconomics.com/calendar/country/united%20states?c=${encodeURIComponent(apiKey)}&importance=2&values=true`;
    const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const txt = await response.text();
    return { statusCode: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: txt };
  } catch (err) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: err.message || 'Erreur interne' }) };
  }
};
