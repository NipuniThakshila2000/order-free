# Connect the NOV 10 registration form to Google Sheets

The public form posts to `/api/register`. On the original site, that endpoint forwards validated entries to a Google Apps Script, which writes them to a `Registrations` tab. The form stays disabled until the required production environment variables are configured.

1. Open the [registration Sheet](https://docs.google.com/spreadsheets/d/18Nh09g0nwYdh3Xo7UdNUzXXV_rclv3XgTpvNoJgFEd4/edit) and choose **Extensions → Apps Script**. Replace the starter code with the contents of [`scripts/registration-sheet.gs`](scripts/registration-sheet.gs). The Sheet ID is already filled in.
2. In Apps Script, open **Project Settings → Script properties**. Add `REGISTRATION_TOKEN` with a long random value; keep it private.
3. Choose **Deploy → New deployment → Web app**. Set **Execute as: Me** and **Who has access: Anyone**. Authorize the script, then copy the deployment URL ending in `/exec`.
4. In the original Vercel project settings, add production environment variables `GOOGLE_SCRIPT_URL` (the `/exec` URL) and `REGISTRATION_TOKEN` (the same private value). These are already set for the original project.
5. Test a write to the Sheet. Only after it succeeds, set production environment variable `REGISTRATION_OPEN` to `true` and redeploy the site. Until then the public form remains closed.
6. Submit one test registration through the site and verify a row appears in the Sheet with timestamp, name, email, and attendance. The form should then show a confirmation.

Keep the Sheet private. The Apps Script is publicly callable, but it requires the private token supplied only by the Vercel server endpoint. Do not put the token in the site HTML or browser JavaScript.

## Bulk email from the admin dashboard

The admin dashboard at `/admin-access.html` now has an **Email contacts** section. It combines the private `Registrations` Sheet with the admin access-application list. Audiences are all unique contacts, all event registrants, online or in-person registrants, and all access applicants. An address in both sources receives one email per campaign. Admins can send a test, preview the selected count and message, personalize the body with `{{firstName}}`, see progress and the Google daily quota, pause and resume, and inspect the latest delivery log. The `MailLog` tab is created automatically. A browser session can resume an interrupted campaign with the same draft and campaign ID; sent and in-progress addresses are held to prevent automatic duplicates. Review any `sending` rows in the log before manually retrying them.

To enable it, replace the Apps Script code with the updated `scripts/registration-sheet.gs` and **create a new web-app deployment version**. Set `BULK_EMAIL_SCRIPT_URL` to the new deployment URL when it differs from the registration script URL; this leaves `GOOGLE_SCRIPT_URL` pointing at the working registration deployment. Set `BULK_EMAIL_TOKEN` to that Apps Script project's `REGISTRATION_TOKEN` Script Property when its token differs from the original registration token. The original site's `/api/bulk-email` endpoint verifies the existing admin session and reads the main site's application list before calling Apps Script. In the Apps Script editor, select `authorizeMail`, click **Run**, and approve the Google `send_mail` permission. If the deployed project already has the mailing code but lacks that helper, add the helper from this source file to the editor and run it; the authorization applies to the script project. The sending address is the Google account that deployed the web app, and that account's MailApp daily quota limits sends.

On the WOWMedia deployment, set `BULK_EMAIL_PROXY_URL=https://order-free.vercel.app/api/bulk-email` (using the actual original project URL). Keep the Sheet token only on the original project. Deploy both updated projects before using the mailing section. Test with an admin account and one test email, then confirm the `MailLog` entry after a small send.

## WOWMedia deployment

The WOWMedia project uses production variables `REGISTRATION_PROXY_URL=https://order-free.vercel.app/api/register` and `REGISTRATION_OPEN=true`. Its server endpoint forwards validated entries as JSON to the original site's API, which writes to the same Sheet. The original `REGISTRATION_TOKEN` stays in the original Vercel project; do not copy a placeholder token to WOWMedia. Keep the original site and its registration API active while this proxy is in use. To make WOWMedia independent later, configure its own `GOOGLE_SCRIPT_URL` and matching Apps Script `REGISTRATION_TOKEN`, remove `REGISTRATION_PROXY_URL`, and redeploy.
