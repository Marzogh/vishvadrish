# Viśvadṛś

दूराद् धरायाः स्पन्दनम्

Satellite imagery exploration, downloads and browser-based time-lapse creation.

The viewer supports JMA Himawari-9 full-disc and Australia regional B13 infrared, B08 water vapour and True Color Reproduction. It discovers
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
pans. The viewer retains at most 12 image URLs and 24 acquired image blobs (up to 50 MB) and selects observations by catalogue-limited Hours. Refresh is required after five minutes before further
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
offering partial output. Jobs are limited to 144 observations, 144 held output
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

## Australia views

Use Region and Product above the image. End selects an actual dated catalogue
observation; Hours selects the observations ending there. Colour may be
blank at night: choose an earlier end time or infrared. Blank/dark colour frames
are rejected, not replaced with a different band.

Australia uses JMA's fixed 901 × 701 raster covering 110–155°E, 10–45°S. This
includes mainland Australia and Tasmania, not all external territories. Exact CRS
and pixel conventions are unverified; no coordinate overlays or reprojection are
applied. Export width preserves the raster aspect ratio; height is rounded to an
even pixel count for video, then adds 56 px for source credit. A 550 px Australia
export is 550 × 484. Preview pan/zoom does not alter the selected export extent.

TCR outputs always retain JMA, NOAA/NESDIS and CSU/CIRA credit. Source information,
JSON manifests and the image package's ATTRIBUTION.txt include the composite
explanation, collaboration acknowledgement and references required by JMA.

Hours is an editable preset field, defaulting to All available. It selects actual observations ending at End. Numeric durations are limited to the current JMA catalogue, not an assumed multi-day archive. The viewer shows available hours and resulting frame count. A selection is capped at 144 observations and 50 MB of acquired imagery.

Play buffers the complete selected sequence before starting, with progress and cancellation. Decoded display frames are capped at 700 px width and 256 MB estimated RGBA storage, alongside the 50 MB acquired-image limit. Exports retain original acquired pixels. Playback performs no image network requests and keeps the previous frame visible while preparing. Changing the selection releases the display buffer.

The viewer starts with True Color Reproduction and 4 fps. The fps dropdown offers 1, 2, 4, 6, 8 and 10 for both playback and video export. Fullscreen expands the viewer and keeps the timeline and playback controls floating over the image. Use Exit fullscreen or Escape to leave it.

In fullscreen, translucent controls fade after two seconds without activity. Pointer movement, touch or keyboard interaction reveals them again.

Validated images are cached locally across refreshes in the same tab session,
keyed by dated observation, region and product, not rolling filename alone.
The catalogue is still fetched to discover new observations; only missing images
are downloaded. Closing the tab ends its cache identity. A newly opened tab does
not reuse that session. Browser storage cannot reliably be erased at the exact
moment a tab closes: old bytes are capped at 50 MB across sessions and expire
after 24 hours, with cleanup on subsequent cache writes. This is not an archive.
If browser storage is unavailable, a visible notice explains the memory-only
fallback. Failed or invalid image responses are not saved.
