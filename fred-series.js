exports.handler = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    const apiKey = (q.apiKey || '').trim();
    const seriesId = (q.seriesId || 'UNRATE').trim().toUpperCase();
    const limit = Math.max(1, Math.min(parseInt(q.limit || '12', 10) || 12, 60));

    if (!apiKey) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'API key FRED manquante' })
      };
    }

    const metaUrl = `https://api.stlouisfed.org/fred/series?series_id=${encodeURIComponent(seriesId)}&api_key=${encodeURIComponent(apiKey)}&file_type=json`;
    const obsUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(seriesId)}&api_key=${encodeURIComponent(apiKey)}&file_type=json&sort_order=desc&limit=${limit}`;

    const [metaRes, obsRes] = await Promise.all([
      fetch(metaUrl, { headers: { 'Accept': 'application/json' } }),
      fetch(obsUrl, { headers: { 'Accept': 'application/json' } })
    ]);

    const metaTxt = await metaRes.text();
    const obsTxt = await obsRes.text();

    if (!metaRes.ok) {
      return { statusCode: metaRes.status, headers: { 'Content-Type': 'application/json' }, body: metaTxt };
    }
    if (!obsRes.ok) {
      return { statusCode: obsRes.status, headers: { 'Content-Type': 'application/json' }, body: obsTxt };
    }

    const meta = JSON.parse(metaTxt);
    const obs = JSON.parse(obsTxt);

    const payload = {
      ok: true,
      source: 'FRED',
      series_id: seriesId,
      title: meta.seriess && meta.seriess[0] ? meta.seriess[0].title : seriesId,
      units: meta.seriess && meta.seriess[0] ? meta.seriess[0].units : null,
      frequency: meta.seriess && meta.seriess[0] ? meta.seriess[0].frequency : null,
      observations: Array.isArray(obs.observations) ? obs.observations : []
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: JSON.stringify(payload)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Erreur interne' })
    };
  }
};
