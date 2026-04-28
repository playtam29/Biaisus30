exports.handler = async () => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify({ ok: true, function: 'health', app: 'Macro Bias Multi-Asset', version: 'v2-eurusd' })
});
