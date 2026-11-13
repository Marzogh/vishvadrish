# Runtime dependencies

Mediabunny 1.65.2 is MPL-2.0 licensed. Source: https://github.com/Vanilagy/mediabunny/tree/v1.65.2 . The unmodified distribution is copied from the locked npm package into vendor/mediabunny.mjs, with its full licence in vendor/mediabunny-LICENSE. Preserve the licence and source link when distributing the static build.

fflate 0.8.2 is MIT licensed. Source: https://github.com/101arrowz/fflate/tree/v0.8.2 . Its browser module and full licence are copied into vendor/fflate.mjs and vendor/fflate-LICENSE. Preserve the copyright and licence notice.

These dependencies do not change the MIT licence of Viśvadṛś code. JMA imagery has separate provider terms, described in sources.md. Playwright is a development-only dependency and is not copied into static builds.

## Fonts

IBM Plex Sans (Regular, Medium, SemiBold), IBM Plex Mono (Regular) and IBM Plex
Sans Devanagari (Regular, SemiBold) are bundled as unmodified WOFF2 files under
`assets/fonts/`. Source: [IBM Plex](https://github.com/IBM/plex), downloaded
14 November 2026 from the corresponding `packages/plex-*/fonts/complete/woff2/`
directories. They are licensed under the SIL Open Font License 1.1. Preserve
`assets/fonts/OFL.txt` when distributing the viewer. The static viewer loads
these files locally, without a font CDN.
