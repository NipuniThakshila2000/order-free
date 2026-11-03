# Connect the November 11 registration form to Google Sheets

The public form posts to `/api/register`. That server endpoint forwards validated entries to a Google Apps Script, which writes them to a `Registrations` tab. The form stays disabled until both Vercel environment variables are configured.

1. Open the [registration Sheet](https://docs.google.com/spreadsheets/d/18Nh09g0nwYdh3Xo7UdNUzXXV_rclv3XgTpvNoJgFEd4/edit) and choose **Extensions → Apps Script**. Replace the starter code with the contents of [`scripts/registration-sheet.gs`](scripts/registration-sheet.gs). The Sheet ID is already filled in.
2. In Apps Script, open **Project Settings → Script properties**. Add `REGISTRATION_TOKEN` with a long random value; keep it private.
3. Choose **Deploy → New deployment → Web app**. Set **Execute as: Me** and **Who has access: Anyone**. Authorize the script, then copy the deployment URL ending in `/exec`.
4. In Vercel project settings, add production environment variables `GOOGLE_SCRIPT_URL` (the `/exec` URL) and `REGISTRATION_TOKEN` (the same private value). Redeploy the site.
5. Submit one test registration and verify a row appears in the Sheet with timestamp, name, email, and attendance. The form should then show a confirmation.

Keep the Sheet private. The Apps Script is publicly callable, but it requires the private token supplied only by the Vercel server endpoint. Do not put the token in the site HTML or browser JavaScript.
