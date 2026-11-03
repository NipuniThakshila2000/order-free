# Source and calculation notes

The reading calculations use the supplied Sepharial and Lilly files, including the 1911 edition of Sepharial's *The Kabala of Numbers*. Guardian angel correspondences use Lenain's separate historical tables. This is a symbolic interpretation of old texts, not a prediction of certain events.

## What the code calculates

| Result | Supplied source | Implemented rule |
| --- | --- | --- |
| Birth-name values | Sepharial, *Kabalistic Astrology*, chapter III, PDF pp. 18–19 | A–Z values from the printed table, multiplied by descending letter positions. Each given name and the birth surname are counted separately. |
| Astrological date and Sun degree | Sepharial, chapter I, PDF pp. 14–15 | The day starts at noon. A birth before noon uses the previous date. The book's fixed calendar and repeated degrees determine the symbolic Sun degree. |
| Key number | Sepharial, chapters III and VI, PDF pp. 18–19 and 31–32 | Join the name values, degree, and sign number, then sum the digits. |
| Sign portrait | Sepharial, chapter VII, PDF pp. 35–37 | Short paraphrase of the sign description. |
| Annual point | Sepharial, *Kabalistic Astrology*, chapters XIII and XV, PDF pp. 57–59 and 68–69; 1911 *The Kabala of Numbers*, p. 133 | Add key number to calendar year; sum the result's digits; wrap values above 22 through the 22 Tarot points. |
| Annual house and rising sign | Sepharial, chapter XV, PDF pp. 64–68 | Move the natal sign through the houses in a 12-year cycle and the processional sign through the zodiac. The card text is a shortened paraphrase. |
| Age-cycle Tarot point | Sepharial, *The Kabala of Numbers* (1911), pp. 132–133 | Add the calendar year and the age attained on that year's birthday, sum the digits, and wrap values above 22 through the 22 Tarot points. The book's worked example is 1865 + age 1 = 1866 → 21; 1866 + age 2 = 1868 → 23 → point 1. |
| Guardian angel correspondences | Lenain, *La Science Cabalistique* (1823), Tables II–IV, pp. 28–38 | Date's five-day interval, date's 72-day cycle from 20 March, and local birth time's 20-minute interval yield three positions in the 72-name roster. The 1911 Sepharial book has no guardian angel table. |

The page provides years of life 1–98, matching the range of the printed annual conjunction table. It currently uses three of Sepharial's annual methods; it does not claim to implement every table or 700 calculations. The local Node API and browser call the same module at `src/reading.mjs`. The API does not store birth details.

## Limits of the supplied material and inputs

- The supplied Sepharial and Lilly books do not contain a verified roster of 72 named guardian angels or a rule assigning three by name, birth date, and birth time. Lenain's *La Science Cabalistique* (1823), [original scan](https://iapsop.com/ssoc/1823__lenain___science_cabalistique.pdf), supplies the separate historical date and time method. Spellings and order were checked against [this reading edition](https://magick.ly/kabbalah/yhvh/72angels), licensed CC BY 4.0 and credited here for its transcription. The site calls the resulting figures guardian angels for clarity; Lenain calls them *génies* in the source.
- The angel detail panels display Lenain's Chapter VI attribute and sphere of influence in the [Magick.ly English reading edition](https://magick.ly/books/la-science-cabalistique/chapitre-6), translated under CC BY 4.0. The 72 positions remain separate even where Lenain repeats a spelling; the page does not treat these historical descriptions as certain effects.
- The 72 angel portraits are artwork, not historical depictions of these named angels: 18 original painted figures were generated, and four color and ornament treatments of each create 72 separate WebP assets. The displayed images follow Lenain's resulting roster positions, but the appearance of each angel is illustrative.
- Lenain reserves 15–19 March, and leap day, outside the numbered date tables. The page reports no date assignment for those dates; the 20-minute birth-time correspondence remains available. The date calculation uses the printed calendar dates and local birth time as entered, without timezone conversion.
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
