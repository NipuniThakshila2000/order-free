const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  const scriptUrl = process.env.GOOGLE_SCRIPT_URL;
  const token = process.env.REGISTRATION_TOKEN;
  const ready = Boolean(scriptUrl && token && process.env.REGISTRATION_OPEN === 'true');
  if (request.method === 'GET') return response.status(200).json({ready});
  if (request.method !== 'POST') return response.status(405).json({error: 'Method not allowed.'});
  if (!ready) return response.status(503).json({error: 'Registration is not open yet.'});

  const {firstName, lastName, email, attendance, website} = request.body || {};
  if (website) return response.status(200).json({ok: true}); // Hidden spam trap.
  if (![firstName, lastName, email, attendance].every((value) => typeof value === 'string')) {
    return response.status(400).json({error: 'Complete all registration fields.'});
  }
  const data = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim(),
    attendance
  };
  if (!data.firstName || !data.lastName || data.firstName.length > 100 || data.lastName.length > 100 ||
      !emailPattern.test(data.email) || data.email.length > 254 || !['online', 'in-person'].includes(attendance)) {
    return response.status(400).json({error: 'Check your name, email, and attendance choice.'});
  }
  try {
    const sheetResponse = await fetch(scriptUrl, {
      method: 'POST',
      headers: {'Content-Type': 'text/plain;charset=utf-8'},
      body: JSON.stringify({...data, token})
    });
    const result = await sheetResponse.json();
    if (!sheetResponse.ok || result.ok !== true) throw new Error('Sheet write failed.');
    return response.status(200).json({ok: true});
  } catch {
    return response.status(502).json({error: 'Registration could not be saved. Please try again.'});
  }
}
