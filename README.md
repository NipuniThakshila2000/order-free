# Redeeming the Seasons

Redeeming the Seasons is a browser experience based on the supplied historical sources. The astronomical chart and birthplace lookup need the local server or deployed API.

## Experience access

Visitors see an immutable sample form and a short sample result. The application lightbox asks for full name, email, phone, country, years at WOWLife Church, how the visitor found the teachings, and who recommended WOWLife Church. It requires age and application consent confirmation. The request is submitted to the WOWLife workshop access API for review. That upstream API must accept, store, and return the `recommendedBy` field for it to appear in the admin review screen.

The admin review screen is `/admin-access.html`, or `/RedeemingTheSeasons/admin-access.html` on the main domain. Sign in with the dedicated experience dashboard token or the existing WOWLife customer dashboard token, then approve or reject applicants. Approval emails the applicant a link to the main site. Approved applicants sign in with a six-digit email code. Their birth details are calculated in the browser; checking the Terms and Conditions box saves details and complete results in the separate `redeeming_experience` PostgreSQL database. Leaving it unchecked keeps results in the browser only. Login sessions expire after 14 days; admin sessions expire after 12 hours.

The experience site's `/api/access` and `/api/experience-data` functions proxy to the main site's access and saved-data APIs. Both projects must be deployed for applications, approvals, email sign-in, and account history to work. The main site's admin screen lists saved records and allows viewing or downloading complete JSON. Account holders can view and delete their own saved records.

The admin dashboard also includes bulk email for all contacts, event registrants, or access applicants. It offers a personalized plain-text draft, a test send, a recipient count preview, batched sending with pause and resume, daily quota visibility, and a private delivery log. Contacts shared by both sources receive one email per campaign. Gmail sends from the verified WOW address through a standalone Apps Script; see `REGISTRATION_SETUP.md` for deployment.

The website's Nov 10 form saves each submission to private Vercel Blob storage. The admin dashboard reads those records through an authenticated endpoint and shows the submitted name, email, attendance choice, and timestamp. Existing Sheet rows were imported into the same store; the form and table no longer require the Sheet web app. See `REGISTRATION_SETUP.md` for storage and migration details.

The admin screen also shows aggregate page loads for the Redeeming the Seasons page: today, the last 7 and 30 days, all time, a 30-day chart, and counts by published site address. The browser sends only the site hostname; the main database stores daily counters with no visitor identifier. Counts start when this tracking is deployed and exclude visitors whose browsers block the request.

The calculation code lives in `src/*.mjs`. After changing it, refresh the browser bundle with `npm run build`.

```text
npm ci
npm test
npm run build
npm start
```

Open `http://localhost:3000`. The standalone HTML page can show symbolic results without the birthplace lookup API; Lilly's timed chart needs the server.

See `SOURCE_NOTES.md` for the calculation rules and limits.
