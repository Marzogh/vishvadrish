# Viśvadṛś

दूराद् धरायाः स्पन्दनम्

Satellite imagery exploration, downloads and browser-based time-lapse creation.

The project is at the foundation stage. It currently contains reusable metadata,
JMA observation discovery and immutable sequence selection. There is no viewer,
image download workflow, video exporter, HTTP service or deployment package yet.

## Run the checks

Install Node.js 20 or newer, then run from the repository root:

```sh
npm test
```

No dependency installation is required. The test runner prints each test result
and a final pass/fail count. Tests use synthetic metadata and do not fetch imagery
or write production files.

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
