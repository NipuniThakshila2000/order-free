# Nov 10 program registration storage

The website form posts to `/api/register`. In production, it saves each registration as a JSON record in a **private Vercel Blob store** linked to the `order-free` project. Vercel supplies `BLOB_READ_WRITE_TOKEN` to the server; never expose it in browser code. The dashboard's `/api/admin-registrations` endpoint checks the existing admin session before reading the private records. The dashboard table shows every row with submission time, first and last name, email, and attendance, newest first, 50 per page. These records are independent of Google Apps Script.

The existing Sheet registrations were imported with `node scripts/migrate-registration-sheet.mjs`. The migration is repeatable: it skips rows already present. It requires `BLOB_READ_WRITE_TOKEN` in the process environment. Run it again after any final Sheet submissions made before the production form cutover. The legacy Google Sheet path remains as a fallback only if the private Blob token is absent.

## Legacy Google Sheet connection

The public form posts to `/api/register`. On the original site, that endpoint forwards validated entries to a Google Apps Script, which writes them to a `Registrations` tab. The form stays disabled until the required production environment variables are configured.

1. Open the [registration Sheet](https://docs.google.com/spreadsheets/d/18Nh09g0nwYdh3Xo7UdNUzXXV_rclv3XgTpvNoJgFEd4/edit) and choose **Extensions → Apps Script**. Replace the starter code with the contents of [`scripts/registration-sheet.gs`](scripts/registration-sheet.gs). The Sheet ID is already filled in.
2. In Apps Script, open **Project Settings → Script properties**. Add `REGISTRATION_TOKEN` with a long random value; keep it private.
3. Choose **Deploy → New deployment → Web app**. Set **Execute as: Me** and **Who has access: Anyone**. Authorize the script, then copy the deployment URL ending in `/exec`.
4. In the original Vercel project settings, add production environment variables `GOOGLE_SCRIPT_URL` (the `/exec` URL) and `REGISTRATION_TOKEN` (the same private value). These are already set for the original project.
5. Test a write to the Sheet. Only after it succeeds, set production environment variable `REGISTRATION_OPEN` to `true` and redeploy the site. Until then the public form remains closed.
6. Submit one test registration through the site and verify a row appears in the Sheet with timestamp, name, email, and attendance. The form should then show a confirmation.

After verifying the Blob migration, restrict the Sheet's sharing and any published/export access to authorized accounts. An unauthenticated export of the `Registrations` tab was reachable during migration. The Apps Script web app still requires its private token for mailing operations; do not put that token in the site HTML or browser JavaScript.

## Admin registration table

The admin dashboard has a separate **Nov 10 program registrations** table. It reads the private Blob store through the authenticated `/api/admin-registrations` endpoint. Google Apps Script updates are no longer needed for this table.

## Bulk email from the admin dashboard

The admin dashboard at `/admin-access.html` now has an **Email contacts** section. It combines the private `Registrations` Sheet with the admin access-application list. Audiences are all unique contacts, all event registrants, online or in-person registrants, and all access applicants. An address in both sources receives one email per campaign. Admins can send a test, preview the selected count and message, personalize the body with `{{firstName}}`, see progress and the Google daily quota, pause and resume, and inspect the latest delivery log. The `MailLog` tab is created automatically. A browser session can resume an interrupted campaign with the same draft and campaign ID; sent and in-progress addresses are held to prevent automatic duplicates. Review any `sending` rows in the log before manually retrying them.

To enable it, replace the Apps Script code with the updated `scripts/registration-sheet.gs` and **create a new web-app deployment version**. Set `BULK_EMAIL_SCRIPT_URL` to the new deployment URL when it differs from the registration script URL; this leaves `GOOGLE_SCRIPT_URL` pointing at the working registration deployment. Set `BULK_EMAIL_TOKEN` to that Apps Script project's `REGISTRATION_TOKEN` Script Property when its token differs from the original registration token. The original site's `/api/bulk-email` endpoint verifies the existing admin session and reads the main site's application list before calling Apps Script.

To send from a WOW address, add and verify that address under Gmail **Settings → Accounts and Import → Send mail as** for the Google account that deploys the script. Set `MAIL_FROM_ADDRESS` in that Apps Script project's Script Properties to the exact alias address. The script checks `GmailApp.getAliases()` and refuses to send if the address is missing or unverified. In the Apps Script editor, select `authorizeMail`, click **Run**, and approve the Gmail and Mail permissions. Then deploy a new web-app version. The admin dashboard shows the verified From address and remains disabled until the updated script is live. Google Apps Script's daily email quota still limits sends.

On the WOWMedia deployment, set `BULK_EMAIL_PROXY_URL=https://order-free.vercel.app/api/bulk-email` (using the actual original project URL). Keep the Sheet token only on the original project. Deploy both updated projects before using the mailing section. Test with an admin account and one test email, then confirm the `MailLog` entry after a small send.

## WOWMedia deployment

The WOWMedia project uses production variables `REGISTRATION_PROXY_URL=https://order-free.vercel.app/api/register` and `REGISTRATION_OPEN=true`. Its server endpoint forwards validated entries as JSON to the original site's API, which writes to the same Sheet. The original `REGISTRATION_TOKEN` stays in the original Vercel project; do not copy a placeholder token to WOWMedia. Keep the original site and its registration API active while this proxy is in use. To make WOWMedia independent later, configure its own `GOOGLE_SCRIPT_URL` and matching Apps Script `REGISTRATION_TOKEN`, remove `REGISTRATION_PROXY_URL`, and redeploy.
