exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const apiKey = (body.apiKey || '').trim();

    if (!apiKey) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'API key manquante' })
      };
    }

    const url = `https://api.tradingeconomics.com/calendar/country/united%20states?c=${encodeURIComponent(apiKey)}&importance=2&values=true`;
    const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: data?.error || data?.message || `HTTP ${response.status}`, details: data })
      };
    }

    const sliced = Array.isArray(data) ? data.slice(0, 10) : data;
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sliced)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Erreur interne' })
    };
  }
};
