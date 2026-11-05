# Registration and bulk email

The public Nov 10 form writes each submission to the private Vercel Blob store through `/api/register`. The admin dashboard reads those records through `/api/admin-registrations`. New submissions go directly to this store; no Google Sheet or Google Form is involved. The original Sheet rows were imported once with `scripts/migrate-registration-sheet.mjs`.

Production needs `BLOB_READ_WRITE_TOKEN` and `REGISTRATION_OPEN=true`. Only server code can access the private store. The admin endpoints also require an authenticated admin session. The registration table shows submission time, first and last name, email, and attendance.

## Bulk email

The dashboard's **Email sending** section combines the private registration records with access applicants from the main site's admin API. Audiences include all contacts, registrants, online registrants, in-person registrants, and applicants. Addresses are deduplicated. Admins can preview counts, personalize plain text with `{{firstName}}`, send a test, send in batches, pause or resume, and view a delivery log. The log is stored privately in Vercel Blob, not in a Sheet.

The original Vercel project needs `BULK_EMAIL_SCRIPT_URL` and `BULK_EMAIL_TOKEN`. The script is used only to send through Gmail. The script's `BULK_EMAIL_TOKEN` Script Property must match the Vercel token. The WOWMedia site, if serving this dashboard, needs `BULK_EMAIL_PROXY_URL=https://order-free.vercel.app/api/bulk-email` so its dashboard uses the same private contacts and log.

To activate the sender, open the Apps Script project behind `BULK_EMAIL_SCRIPT_URL`, replace its code with [bulk-mail.gs](scripts/bulk-mail.gs), set the `BULK_EMAIL_TOKEN` Script Property, run `authorizeMail` and grant the requested Gmail permissions, then edit the web app deployment to a new version. The account deploying the script must first add and verify `info@wowlife.lk` in Gmail **Settings → Accounts and Import → Send mail as**. The script checks that alias and refuses to send without it. The dashboard keeps Send disabled until its status check confirms the WOW address. Gmail's daily recipient quota still applies.

The dashboard requires confirmation before a real bulk send. A campaign ID and private log prevent automatic repeat delivery to addresses already recorded as sent. Any delivery marked `sending` after an interruption is held for manual review, since the mail may already have gone out.

## Historical migration

The Sheet migration script remains only for importing old submissions. It is not called by any live registration or email endpoint. After the cutover, remove the old `GOOGLE_SCRIPT_URL` and `REGISTRATION_TOKEN` Vercel variables. Keep `BULK_EMAIL_SCRIPT_URL` and `BULK_EMAIL_TOKEN` for Gmail sending.
