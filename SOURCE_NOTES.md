# Source and calculation notes

This page uses only the three supplied files for its historical reading. It is a symbolic interpretation of an old text, not a prediction of certain events.

## What the code calculates

| Result | Supplied source | Implemented rule |
| --- | --- | --- |
| Birth-name values | Sepharial, *Kabalistic Astrology*, chapter III, PDF pp. 18–19 | A–Z values from the printed table, multiplied by descending letter positions. Each given name and the birth surname are counted separately. |
| Astrological date and Sun degree | Sepharial, chapter I, PDF pp. 14–15 | The day starts at noon. A birth before noon uses the previous date. The book's fixed calendar and repeated degrees determine the symbolic Sun degree. |
| Key number | Sepharial, chapters III and VI, PDF pp. 18–19 and 31–32 | Join the name values, degree, and sign number, then sum the digits. |
| Sign portrait | Sepharial, chapter VII, PDF pp. 35–37 | Short paraphrase of the sign description. |
| Annual point | Sepharial, chapters XIII and XV, PDF pp. 57–59 and 68–69 | Add key number to calendar year; sum the result's digits; show the corresponding point. |
| Annual house and rising sign | Sepharial, chapter XV, PDF pp. 64–68 | Move the natal sign through the houses in a 12-year cycle and the processional sign through the zodiac. The card text is a shortened paraphrase. |

The page provides years of life 1–98, matching the range of the printed annual conjunction table. It currently uses three of Sepharial's annual methods; it does not claim to implement every table or 700 calculations. The local Node API and browser call the same module at `src/reading.mjs`. The API does not store birth details.

## Limits of the supplied material and inputs

- The books do not contain a verified roster of 72 named guardian angels or a rule assigning three by name, birth date, and birth time. The previous page used an unrelated Lenain source and assignment formula, which have been removed to respect the strict source constraint. Historically named angel descriptions and assignments require the missing source and rules.
- The 72 angel portraits are artwork, not text-derived angel identities: 18 original painted figures were generated, and four color and ornament treatments of each create 72 separate WebP assets. The three portraits shown with a reading are chosen by a transparent visual mapping from key number, Sun degree, and selected year. That mapping is presentation only. The accompanying insights are from the cited Sepharial chapters.
- Sepharial says that judging length of life requires the Moon's age and position (chapter I, PDF p. 15). Lilly's natal and annual methods also require a complete chart, including astronomical positions and a birth location. This page does not invent a death year.
- The supplied Lilly PDF and Word transcription cover historical natal, directions, profections, revolutions, and transits. They inform the source boundary, but the implemented numeric rules above come from Sepharial. No full Lilly chart is implied.
- The printed A–Z name table cannot faithfully evaluate names in other scripts. The form asks for Latin spelling.

## Run locally

You can open `index (2).html` directly in a browser. Its classic browser script is generated from the source modules; after changing `src/app.mjs`, `src/reading.mjs`, or `src/source-data.mjs`, run `node scripts/build_browser.mjs` to refresh `src/app.bundle.js`.

Use Node.js 20 or newer:

```text
node server.mjs
```

Open `http://localhost:3000`. A POST to `/api/reading` accepts JSON with `given`, `surname`, `date` (`YYYY-MM-DD`), and `time` (`HH:MM`).
The optional `place` field is returned on the profile, and the form's `from` year selects the first displayed year. Neither changes the book's arithmetic.
