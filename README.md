# Viśvadṛś

दूराद् धरायाः स्पन्दनम्

Satellite imagery exploration, downloads and browser-based time-lapse creation.

The first viewer supports JMA Himawari-9 full-disc B13 infrared imagery. It discovers
dated observations directly from JMA and provides a timeline, playback, zoom, pan,
source credit and recoverable loading errors. Image identity is not independently
verified: compare the catalogue time with the timestamp printed in the image.
The Save menu exports a PNG frame, a ZIP image sequence with a provenance manifest, or a browser-encoded WebM video. Other products and the optional HTTP service remain unfinished.

## Open the viewer

With Node.js 20 or newer installed, run:

```sh
npm run dev
```

Open the printed loopback URL. The preview server serves local files only; the
browser fetches imagery directly from JMA. Stop it with Ctrl+C. Product access
requires an internet connection. Playback advances after each frame loads, so
the selected playback rate is a target rather than precise video timing.

Use the timeline arrow keys to select observations. Focus the image view and
press plus/minus to zoom, arrow keys to pan, or zero to fit. Pointer dragging also
pans. The viewer retains at most 12 image URLs and 24 acquired image blobs (up to 50 MB) and offers the latest 6, 12 or 24
catalogued observations. Refresh is required after five minutes before further
image requests. This guard does not independently verify a rolling URL's contents.

## Run the checks

Install Node.js 20 or newer, then run from the repository root:

```sh
npm test
```

No dependency installation is required for unit tests. Run `npm ci` before starting the viewer or building it. The test runner prints each test result
and a final pass/fail count. Tests use synthetic metadata and do not fetch imagery
or write production files.

For Chromium browser tests, install the locked development dependency and browser:

```sh
npm ci
npx playwright install chromium
```

Set `VISHVADRISH_TEST_OUTPUT` to an absolute directory outside the application
directory, then run `npm run test:browser`. The test runner prints individual
results. The default suite uses synthetic images and catalogue responses; the
live provider test is explicitly skipped. Set `JMA_LIVE=1` to include direct JMA
discovery, image loading and pixel-access checks. Screenshots and failure traces
go to the configured output directory. The tests start and stop a loopback server
on port 4173; stop any existing preview on that port first.

## Programmatic use

In a browser module, `discoverJma()` from `src/providers/jma.mjs` retrieves the
provider's actual dated observation options. It accepts an `AbortSignal`. Outside
a browser, supply parsed `{ slot, label }` options to `framesFromJmaOptions()`.

`createSequence()` from `src/core/sequence.mjs` selects frames by inclusive UTC
range and sampling step, requires an explicit frame limit and gap policy, and
freezes the output geometry and provenance. It records a selection; it does not
retrieve or validate image pixels, apply gap handling, or generate media.

See [architecture](docs/architecture.md) and [source support](docs/sources.md).

## Licence

Application code is MIT-licensed. Provider imagery has separate terms and
attribution requirements. No satellite imagery is included in this repository.

## Exports and static build

Open Save to choose a frame, image sequence or WebM video. Video uses the selected
playback rate and all selected frames. Choose 550 or 1100 px imagery width,
Standard or High quality, and skip gaps or hold the previous image. The output
adds a 56 px source-credit strip. Timestamp text can be hidden; source credit is
always retained. PNG and ZIP use the selected size; quality applies to video.
Download links appear after processing, together with a JSON provenance manifest.
The video can be previewed before downloading. Cancel export stops the job without
offering partial output. Jobs are limited to 24 observations, 144 held output
frames and 50 MB result size. ZIP packaging and video finalisation use memory;
this is not an unlimited streaming exporter.

WebM tries VP9, then VP8, using browser capability checks. MP4 is not offered.
If neither encoder is supported, use the image sequence. Chromium has automated export coverage; installed Safari and Zen passed baseline live exports. Physical mobile devices remain untested. See [browser support](docs/browser-support.md) for the exact matrix. Catalogue and
filename times describe scan end and scan start respectively, ten minutes apart.
Exports retain acquired bytes and catalogue associations, not an independent
reading of timestamps printed in the pixels.

Run `npm run build` to prepare a static site in `dist/`. Only index.html, src/
and prepared vendor files are included. Nothing is published by this command.
Dependencies are copied locally; the browser does not import them from a CDN.
