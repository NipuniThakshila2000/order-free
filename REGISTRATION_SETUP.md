# Connect the November 11 registration form to Google Sheets

The public form posts to `/api/register`. On the original site, that endpoint forwards validated entries to a Google Apps Script, which writes them to a `Registrations` tab. The form stays disabled until the required production environment variables are configured.

1. Open the [registration Sheet](https://docs.google.com/spreadsheets/d/18Nh09g0nwYdh3Xo7UdNUzXXV_rclv3XgTpvNoJgFEd4/edit) and choose **Extensions → Apps Script**. Replace the starter code with the contents of [`scripts/registration-sheet.gs`](scripts/registration-sheet.gs). The Sheet ID is already filled in.
2. In Apps Script, open **Project Settings → Script properties**. Add `REGISTRATION_TOKEN` with a long random value; keep it private.
3. Choose **Deploy → New deployment → Web app**. Set **Execute as: Me** and **Who has access: Anyone**. Authorize the script, then copy the deployment URL ending in `/exec`.
4. In the original Vercel project settings, add production environment variables `GOOGLE_SCRIPT_URL` (the `/exec` URL) and `REGISTRATION_TOKEN` (the same private value). These are already set for the original project.
5. Test a write to the Sheet. Only after it succeeds, set production environment variable `REGISTRATION_OPEN` to `true` and redeploy the site. Until then the public form remains closed.
6. Submit one test registration through the site and verify a row appears in the Sheet with timestamp, name, email, and attendance. The form should then show a confirmation.

Keep the Sheet private. The Apps Script is publicly callable, but it requires the private token supplied only by the Vercel server endpoint. Do not put the token in the site HTML or browser JavaScript.

## WOWMedia deployment

The WOWMedia project uses production variables `REGISTRATION_PROXY_URL=https://order-free.vercel.app/api/register` and `REGISTRATION_OPEN=true`. Its server endpoint forwards validated entries as JSON to the original site's API, which writes to the same Sheet. The original `REGISTRATION_TOKEN` stays in the original Vercel project; do not copy a placeholder token to WOWMedia. Keep the original site and its registration API active while this proxy is in use. To make WOWMedia independent later, configure its own `GOOGLE_SCRIPT_URL` and matching Apps Script `REGISTRATION_TOKEN`, remove `REGISTRATION_PROXY_URL`, and redeploy.
