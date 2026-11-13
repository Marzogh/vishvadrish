# Viśvadṛś

दूराद् धरायाः स्पन्दनम्

Satellite imagery exploration, downloads and browser-based time-lapse creation.

The first viewer supports JMA Himawari-9 full-disc B13 infrared imagery. It discovers
dated observations directly from JMA and provides a timeline, playback, zoom, pan,
source credit and recoverable loading errors. Image identity is not independently
verified: compare the catalogue time with the timestamp printed in the image.
Downloads, video export, other products and the optional HTTP service are unfinished.

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
pans. The viewer retains at most 12 image blobs and offers the latest 6, 12 or 24
catalogued observations. Refresh is required after five minutes before further
image requests. This guard does not independently verify a rolling URL's contents.

## Run the checks

Install Node.js 20 or newer, then run from the repository root:

```sh
npm test
```

No dependency installation is required. The test runner prints each test result
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
