# Browser compatibility checks

Checked 14 November 2026 (Australia/Brisbane). These results qualify the listed cases, not every browser setting or device.

| Environment | Checked | Result |
| --- | --- | --- |
| Playwright Chromium | 550 px/standard/2 fps; 1100 px/high/4 fps/24 observations; held gaps/timestamps off; missing encoder/cancellation | All four cases passed |
| Installed Zen | Live JMA viewing, six-frame default WebM creation and actual download | Passed; saved file also decoded in Chromium at 550 × 606, 3 s |
| Installed Safari 26.5 | Live JMA viewing, six-frame default WebM creation, download and saved-file playback | Passed; saved file also decoded in Chromium at 550 × 606, 3 s |
| Playwright Firefox | Test browser installation did not complete | Tests could not launch; not an application failure |
| Playwright WebKit | Test browser unavailable after the preceding installation stalled | Tests could not launch; separate from actual Safari results |
| Physical phones/tablets | No device used | Not tested |

Saved Chromium outputs were reloaded from disk. Baseline: 550 × 606, 1.5 s. Large/high/24-frame: 1100 × 1156, 6 s. Held-gap sequence: 550 × 606, 2 s, marker order 0,1,1,2; optional timestamp pixels absent. The mandatory source-credit strip remained present. Output height includes its 56 px credit strip.

The compatibility cases also check a 390 × 844 viewport for horizontal overflow. This does not qualify touch hardware. Zen and Safari received baseline checks only, not the complete settings matrix. Zen's saved file was verified in Chromium; native Zen saved-file playback was not separately inspected. Safari's player reached 00:03/00:03. No claim of independent per-frame verification of live satellite timestamps is made.

Run after installing dependencies and the required Playwright browsers:

```sh
VISHVADRISH_TEST_OUTPUT=/absolute/private/output npx playwright test --config tests/playwright.compat.config.mjs
```

Use `--project chromium` to select only the installed Chromium test browser. The list reporter prints each result. Output must remain outside the application directory. Browser installation and unavailable engines are prerequisites, not passing tests. MP4 remains unavailable. This pass does not qualify public hosting or long/unbounded jobs.
