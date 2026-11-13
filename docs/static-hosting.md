# Static hosting and embedding

## Build

Run `npm ci`, then `npm run build`. Both commands report their progress and
exit with a failure status if they cannot finish. Publish only the contents of
`dist/`. It contains `index.html`, `src/`, `assets/` (including font licences)
and `vendor/` (including dependency licences). Do not publish the source checkout,
tests, generated evidence or installed `node_modules/`.

The application uses relative asset and module paths and needs no route rewrite
or processing server. Host the directory with a trailing slash, for example
`https://chipsncode.com/vishvadrish/` or a GitHub Pages project directory.
Configure the host to redirect the slashless directory URL to the trailing-slash
URL. Serve JavaScript with a JavaScript MIME type, CSS as `text/css`, and WOFF2
fonts as `font/woff2`. HTTPS is required for browser video encoding outside
loopback development.

Building is not publication. A chipsncode deployment must include this output at
`/vishvadrish/`, alongside its own generated site, and link to it from the
Viśvadṛś project page. The viewer's Chips’nCode link returns to the main website.
No chipsncode publication or GitHub Pages deployment is performed by the build.

## Links

Supported query parameters:

| Parameter | Values | Default |
| --- | --- | --- |
| `region` | `full-disc`, `australia` | `full-disc` |
| `product` | `trm` (True Color Reproduction), `b13` (infrared), `b08` (water vapour) | `trm` |
| `embed` | `1` for compact article layout | Standalone |

Changing Region or Product updates the current URL without adding a history
entry. URLs preserve unrelated query parameters and fragments. A link selects
current catalogue observations, not an immutable archive or saved time window.

## Article embed

```html
<iframe
  src="https://chipsncode.com/vishvadrish/?region=australia&amp;product=trm&amp;embed=1"
  title="Viśvadṛś satellite imagery for Australia"
  width="1100"
  height="720"
  style="width:100%; border:0"
  loading="lazy"
  allow="fullscreen"
  allowfullscreen
></iframe>
```

Keep an ordinary link nearby for readers who prefer the standalone viewer.
Do not add a restrictive `sandbox` attribute without validating playback,
browser storage, downloads, new tabs and fullscreen under that policy. The
viewer needs JavaScript and fetches imagery directly from JMA. It creates
local blob URLs for display and downloads. It does not upload generated media.
The article's content policy must permit the iframe origin; the viewer host
must permit framing by the article origin. Cross-origin framing also needs
the fullscreen permission shown above. Browser or host policies may still
restrict fullscreen, storage or downloads; report and test actual host behaviour.

Theme preferences are stored using `vishvadrish-theme`, independent of other
products. System follows the device theme without a stored override. Embedded
storage restrictions may limit persistence to the current page.

## Verification

`npm run test:browser` builds the site first, then includes tests against the
built files mounted at `/vishvadrish/`, and a separate-origin article iframe.
Tests use synthetic provider responses and verify local font loading, selection
links, themes, fullscreen, PNG downloads and frame attribution. They do not
prove a live host's headers, provider availability or physical mobile support.
Check those on the intended published URL before claiming public qualification.

Favicons, the Apple touch icon and the header mark use the supplied project
artwork. Open Graph and Twitter image metadata point to the supplied 1200 × 630
preview at `https://chipsncode.com/vishvadrish/assets/brand/`.
When publishing at another origin or subdirectory, update those absolute preview
URLs in `index.html`. Icons, fonts, modules and styles use relative paths.
The README banner is documentation artwork and is not displayed in the viewer.
