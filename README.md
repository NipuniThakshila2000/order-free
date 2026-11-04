# Redeeming the Seasons

Redeeming the Seasons is a browser reading based on the supplied historical sources. The astronomical chart and birthplace lookup need the local server or deployed API.

## Reading access

Visitors see an immutable sample form and a short sample result. The application lightbox asks for full name, email, years at WOWLife Church, and how the visitor found the teachings. The request is stored in the WOWLife workshop database for review.

The admin review screen is `/admin-access.html`. Sign in with the existing WOWLife customer dashboard token, then approve or reject applicants. Approval emails the applicant a link to the reading site. Approved applicants sign in with a six-digit email code; their own birth details are calculated in the browser and are not saved in the application database. Login sessions expire after 14 days; admin sessions expire after 12 hours.

The reading site's `/api/access` function proxies to the workshop site's `/api/reading-access`, where database and Mandrill credentials are already configured. Both projects must be deployed for applications, approvals, and email sign-in to work.

The reading code lives in `src/*.mjs`. After changing it, refresh the browser bundle with `npm run build`.

```text
npm ci
npm test
npm run build
npm start
```

Open `http://localhost:3000`. The standalone HTML page can show symbolic results without the birthplace lookup API; Lilly's timed chart needs the server.

See `SOURCE_NOTES.md` for the calculation rules and limits.
