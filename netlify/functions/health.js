exports.handler = async () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify({ ok: true, function: 'health', app: 'US30 Daily Bias', version: 'v1' })
});
