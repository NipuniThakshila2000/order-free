// Counts page loads in aggregate. No visitor identifier or birth detail is sent.
fetch(new URL('api/page-metrics', document.baseURI), {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({site: location.hostname.toLowerCase()}),
  credentials: 'omit',
  keepalive: true
}).catch(() => {});
