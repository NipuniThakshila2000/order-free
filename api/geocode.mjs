import {searchBirthplaces} from '../src/location.mjs';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'public, max-age=3600');
  if (request.method !== 'GET') return response.status(405).json({error:'Method not allowed.'});
  try {
    const results = await searchBirthplaces(request.query.q);
    return response.status(200).json({results});
  } catch (error) {
    return response.status(503).json({error:error.message});
  }
}
