# Registration and bulk email

The public Nov 10 form writes each submission to the private Vercel Blob store through `/api/register`. The admin dashboard reads those records through `/api/admin-registrations`. New submissions go directly to this store; no Google Sheet or Google Form is involved. The original Sheet rows were imported once with `scripts/migrate-registration-sheet.mjs`.

Production needs `BLOB_READ_WRITE_TOKEN` and `REGISTRATION_OPEN=true`. Only server code can access the private store. The admin endpoints also require an authenticated admin session. The registration table shows submission time, first and last name, email, and attendance.

## Bulk email

The dashboard's **Email sending** section combines the private registration records with access applicants from the main site's admin API. Audiences include all contacts, registrants, online registrants, in-person registrants, and applicants. Addresses are deduplicated. Admins can preview counts, personalize plain text with `{{firstName}}`, send a test, send in batches, pause or resume, and view a delivery log. The log is stored privately in Vercel Blob, not in a Sheet.

The Architecture of Freedom main site holds `MANDRILL_API_KEY` and `EMAIL_FROM` in its production environment. Its `/api/bulk-email-bridge` endpoint verifies the existing admin session and sends one message at a time through Mandrill. The `order-free` dashboard forwards only the admin session cookie to that endpoint; it does not store or receive the Mandrill key. The WOWMedia site, if serving this dashboard, needs `BULK_EMAIL_PROXY_URL=https://order-free.vercel.app/api/bulk-email` so its dashboard uses the same private contacts and log.

The main site checks that `wowlife.lk` is verified for signing and has valid DMARC in its Mandrill account before enabling Send. Each message uses `info@wowlife.lk` as From and Reply-To. Mandrill may accept a message as `sent` or `queued`; the delivery log records that response. The provider's sending limits still apply.

The dashboard requires confirmation before a real bulk send. A campaign ID and private log prevent automatic repeat delivery to addresses already recorded as sent. Any delivery marked `sending` after an interruption is held for manual review, since the mail may already have gone out.

## Historical migration

The Sheet migration script remains only for importing old submissions. It is not called by any live registration or email endpoint. The old `GOOGLE_SCRIPT_URL`, `REGISTRATION_TOKEN`, `BULK_EMAIL_SCRIPT_URL`, and `BULK_EMAIL_TOKEN` Vercel variables are unnecessary.
