# Connect the November 11 registration form to Google Sheets

The public form posts to `/api/register`. That server endpoint forwards validated entries to a Google Apps Script, which writes them to a `Registrations` tab. The form stays disabled until both Vercel environment variables are configured.

1. Create a Google Sheet for registrations. Copy its ID from the URL between `/d/` and `/edit`.
2. In the Sheet, open **Extensions → Apps Script**. Replace the starter code with the contents of [`scripts/registration-sheet.gs`](scripts/registration-sheet.gs).
3. In Apps Script, open **Project Settings → Script properties**. Add `SHEET_ID` with the ID from step 1. Add `REGISTRATION_TOKEN` with a long random value; keep it private.
4. Choose **Deploy → New deployment → Web app**. Set **Execute as: Me** and **Who has access: Anyone**. Authorize the script, then copy the deployment URL ending in `/exec`.
5. In Vercel project settings, add production environment variables `GOOGLE_SCRIPT_URL` (the `/exec` URL) and `REGISTRATION_TOKEN` (the same private value). Redeploy the site.
6. Submit one test registration and verify a row appears in the Sheet with timestamp, name, email, and attendance. The form should then show a confirmation.

Keep the Sheet private. The Apps Script is publicly callable, but it requires the private token supplied only by the Vercel server endpoint. Do not put the token in the site HTML or browser JavaScript.
