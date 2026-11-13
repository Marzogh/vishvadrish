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
| Downloads, video and API | Not implemented |
| Australia regional products, colour, water vapour | Require separate access, attribution and geometry checks |

The fresh catalogue contained 139 dated options. Its observation label was ten
minutes later than the sampled rolling filename slot. Code retains the label and
slot separately; it does not infer observation time from filenames. These URLs
are rolling locators, not archives. HTTP success and CORS headers do not establish
that pixels match a requested observation or qualify a complete browser workflow.

Responsive layout, keyboard controls, forced colours, reduced motion, palette
contrast and colour-vision simulations are checked in Chromium using synthetic
fixtures. These checks do not qualify a physical mobile device or another browser.
No Safari, Firefox, public static-host or video-export qualification is claimed.
IMD public integration is unavailable pending affirmative permission.
Other providers are not integrated. No maintainer-hosted proxy is used.
