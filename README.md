# order-free

Appointed Seasons is a free browser reading based on the supplied historical sources. The astronomical chart and birthplace lookup need the local server or deployed API.

The reading code lives in `src/*.mjs`. After changing it, refresh the browser bundle with `npm run build`.

```text
npm ci
npm test
npm run build
npm start
```

Open `http://localhost:3000`. The standalone HTML page can show symbolic results without the birthplace lookup API; Lilly's timed chart needs the server.

See `SOURCE_NOTES.md` for the calculation rules and limits.
