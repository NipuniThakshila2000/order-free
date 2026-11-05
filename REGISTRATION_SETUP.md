# Registration and bulk email

The public Nov 10 form writes each submission to the private Vercel Blob store through `/api/register`. The admin dashboard reads those records through `/api/admin-registrations`. New submissions go directly to this store; no Google Sheet or Google Form is involved. The original Sheet rows were imported once with `scripts/migrate-registration-sheet.mjs`.

Production needs `BLOB_READ_WRITE_TOKEN` and `REGISTRATION_OPEN=true`. Only server code can access the private store. The admin endpoints also require an authenticated admin session. The registration table shows submission time, first and last name, email, and attendance.

## Bulk email

The dashboard's **Email sending** section combines the private registration records with access applicants from the main site's admin API. Audiences include all contacts, registrants, online registrants, in-person registrants, and applicants. Addresses are deduplicated. Admins can preview counts, personalize plain text with `{{firstName}}`, send a test, send in batches, pause or resume, and view a delivery log. The log is stored privately in Vercel Blob, not in a Sheet.

The original Vercel project needs the WOW mailbox SMTP settings: `WOW_SMTP_HOST`, `WOW_SMTP_PORT` (465 or 587), `WOW_SMTP_USER=info@wowlife.lk`, and `WOW_SMTP_PASSWORD` (an app password or mail token). These belong only in Vercel's server environment variables. The WOWMedia site, if serving this dashboard, needs `BULK_EMAIL_PROXY_URL=https://order-free.vercel.app/api/bulk-email` so its dashboard uses the same private contacts and log.

To activate sending, add those four SMTP settings and redeploy. The server connects with TLS, requires the SMTP login to be `info@wowlife.lk`, and sends with that From and Reply-To address. The dashboard keeps Send disabled until the SMTP connection authenticates. The mail provider's own daily or hourly limits still apply; SMTP does not expose a quota count to this dashboard.

The dashboard requires confirmation before a real bulk send. A campaign ID and private log prevent automatic repeat delivery to addresses already recorded as sent. Any delivery marked `sending` after an interruption is held for manual review, since the mail may already have gone out.

## Historical migration

The Sheet migration script remains only for importing old submissions. It is not called by any live registration or email endpoint. The old `GOOGLE_SCRIPT_URL`, `REGISTRATION_TOKEN`, `BULK_EMAIL_SCRIPT_URL`, and `BULK_EMAIL_TOKEN` Vercel variables are unnecessary after the SMTP cutover.
