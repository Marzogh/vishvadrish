# Architecture

## Foundation

Shared functionality uses native JavaScript modules, without runtime dependencies.
Browsers can load these modules from an ordinary static host; Node can import the
same metadata and sequence functions for scripts or a future HTTP service.
Node's built-in test runner provides offline checks. Playwright is a development-only
dependency for Chromium browser tests. No frontend framework,
server framework, database or encoder has been selected.

The browser-specific HTML boundary uses `DOMParser`. Local/server callers can
use their own HTML parser and pass observation options into the same conversion
function. Provider URLs are constructed from validated slots, not arbitrary URLs
provided by visitors.

## Data contracts

- Product: source-specific identity, representation, coverage, expected cadence,
  rights and separate implementation capability states.
- Frame: product ID, canonical UTC observation label, discovery time and source
  locator. JMA frames remain `catalogue-only`; discovery is not pixel validation.
- Sequence version 1: copied and deeply frozen product/frame metadata, inclusive
  requested range, sampling step, explicit gap policy and fixed output geometry.
  Gaps are measured before sampling, so deliberate sampling does not erase them.

Only an unreferenced source-raster output grid is currently accepted. It records
pixel dimensions and contain fit, without claiming a geographic transformation.
Geographic grids require source validation before implementation. The sequence
records `skip` or `hold` intent; a later renderer must implement that policy.
Requested-range edges are retained but not classified as missing observations,
because the catalogue alone does not prove coverage beyond its returned entries.

JMA rolling image URLs can change content. IDs based on dated catalogue labels
identify intended observations, not immutable image bytes. Retrieval must validate
identity and dimensions and preserve acquired pixels before export. This is an
unimplemented requirement, not a guarantee supplied by the foundation.

## Next implementation boundaries

The compact viewer uses inline frame-count and playback-speed buttons, with selected values underlined and exposed through aria-pressed. SVG icon controls have accessible names and 32 px targets. Source and product context stays in one row; timing caveats, image dimensions and product explanation are available through the information disclosure. Loading, errors, age and gaps remain visible when relevant.

The browser viewer consumes a frozen sequence, retrieves images on demand and
retains at most 12 image blobs. It checks response status, MIME type, a 5 MB blob
limit, decodability and nonzero dimensions. This is not independent timestamp or
geographic validation. It aborts superseded fetches and rejects results from older
requests. Playback skips catalogued gaps and stops on image errors. Its speed is
load-dependent, not an export clock. A five-minute catalogue age guard limits use
of stale rolling locators; it does not eliminate the upstream rollover race.

Next add independently validated retrieval and export. Preview and exports must
consume the same frozen selection. Test
encoder timing and saved output before choosing an encoder. Local imports and
the optional service will share the metadata contracts without becoming a
dependency of the static application.
