# Source support

## JMA Himawari-9 full-disc B13 infrared

Assessed 13 November 2026. Discovery uses the dated options on the
[JMA full-disc viewer](https://www.data.jma.go.jp/mscweb/data/himawari/sat_img.php?area=fd_).
The source is a provider-rendered JPEG, not calibrated temperature data.

The [MSC website terms](https://www.data.jma.go.jp/mscweb/en/general/note.html)
permit reuse and modification subject to source citation, edit disclosure and
the remaining terms, including third-party rights and excluded content. Credit
must link to the relevant JMA page. Derivatives must disclose edits and must not
imply that JMA created them. The application's MIT licence does not license imagery.

| Capability | Status |
| --- | --- |
| Dated discovery | Implemented and tested in Chromium |
| Direct provider access | Fresh HTTP catalogue and JPEG requests succeeded with permissive CORS headers |
| Browser image/canvas access | Current viewer passed live desktop Chromium loading, navigation and pixel readback |
| Pixel observation identity and dimensions | Not validated by this implementation |
| Downloads and video | PNG, ZIP with manifest, browser WebM; API remains unimplemented |
| Australia regional products, colour, water vapour | Require separate access, attribution and geometry checks |

The sampled catalogue observation label is scan end. Its rolling filename slot is scan start, ten minutes earlier. Both are recorded with dates, including midnight rollover. Code retains the label and
slot separately; it does not infer observation time from filenames. These URLs
are rolling locators, not archives. HTTP success and CORS headers do not establish
that pixels match a requested observation or qualify a complete browser workflow.

Responsive layout, keyboard controls, forced colours, reduced motion, palette
contrast and colour-vision simulations are checked in Chromium using synthetic
fixtures. These checks do not qualify a physical mobile device or another browser.
Installed Safari and Zen passed baseline live WebM exports; the exact checks and remaining gaps are recorded in browser-support.md. Playwright Firefox/WebKit and public static hosting remain unqualified.
IMD public integration is unavailable pending affirmative permission.
Other providers are not integrated. No maintainer-hosted proxy is used.

## Australia regional products

B13 infrared, B08 water vapour and True Color Reproduction use JMA's Australia
viewer and published regional files. Product IDs, discovery, scan times, source
links, source dimensions and geographic extent are retained independently.
Region and product changes discard old selections, caches and export links.
TCR is a processed daylight composite and may be blank at night. Dark-frame
checking is a content guard, not a solar-geometry or image-quality classifier.
The provider's 901 × 701 grid is preserved, with no guessed reprojection. Expected
regional dimensions are checked during acquisition; a mixed-size sequence fails.
TCR uses the minimum credit explicitly allowed at the bottom of JMA's catalogue
when the complete explanation/references are impractical in a compact output:
JMA, NOAA/NESDIS and CSU/CIRA. The fuller material accompanies source details,
manifests and image packages. This does not extend rights to other providers.

## Full-disc water vapour and colour

Full-disc B08 and True Color Reproduction use their own JMA product IDs and
rolling image paths; they do not reuse B13 pixels. Both retain full-disc framing.
TCR carries the same JMA, NOAA/NESDIS and CSU/CIRA credits described above.
Only Himawari-9 is currently integrated; Full disc and Australia select region,
not satellite. Additional satellites remain future integration work.
