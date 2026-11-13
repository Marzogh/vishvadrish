# Architecture

## Foundation

Shared functionality uses native JavaScript modules, without runtime dependencies.
Browsers can load these modules from an ordinary static host; Node can import the
same metadata and sequence functions for scripts or a future HTTP service.
Node's built-in test runner provides offline checks. No frontend framework,
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

Add the viewer and actual browser discovery tests next, then validated retrieval
and export. Preview and exports must consume the same frozen selection. Test
encoder timing and saved output before choosing an encoder. Local imports and
the optional service will share the metadata contracts without becoming a
dependency of the static application.
