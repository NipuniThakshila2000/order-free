import {registrationStoreReady, saveRegistration} from '../src/registration-store.mjs';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  const ready = Boolean(registrationStoreReady() && process.env.REGISTRATION_OPEN === 'true');
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
    await saveRegistration({...data, submittedAt:new Date().toISOString()});
    return response.status(200).json({ok: true});
  } catch (problem) {
    console.error(`Registration storage failed: ${problem instanceof Error ? problem.message : 'unknown error'}`);
    return response.status(502).json({error: 'Registration could not be saved. Please try again.'});
  }
}
