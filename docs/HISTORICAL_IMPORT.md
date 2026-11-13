# Historical imagery extension

Viśvadṛś runs on GitHub Pages. NICT historical colour requires the Viśvadṛś History extension. The extension retrieves provider-rendered images directly on the visitor’s device; playback and video creation stay in their browser. No account, local server, hosted relay or manual image import is required. NICT receives the image requests. No images or videos pass through a server operated by this project.

## Chrome

Download the Chrome extension ZIP, extract it and keep the folder. Open chrome://extensions, enable Developer mode, select Load unpacked and choose the folder containing manifest.json. Enable the extension and NICT access if prompted. Reload the viewer and choose History. Updates require replacing the folder contents and reloading the extension.

## Firefox and Zen

For normal installation, use the Mozilla-signed package when available. Open it in Firefox or Zen, approve installation and grant access to NICT, then reload the viewer. An unsigned package is not a normal-user release. It can be loaded temporarily through about:debugging > This Firefox > Load Temporary Add-on for testing only. Temporary installation ends when the browser closes.

## Use

Choose History, set the UTC date and start/end times, then Load. The viewer buffers a complete sequence before playback. Cancellation and missing-slot counts are shown. Existing scrubber, fps, zoom, fullscreen and Save controls apply. Live JMA returns to current imagery. Without the extension, live imagery remains available and History opens installation help.

This version supports only full-disc NICT D531106 colour at 550 × 550. Limits are 144 ten-minute slots within one UTC date, 5 MB per image and 50 MB total. A full day may exceed the byte limit. Source 404 slots are reported and skipped; other failures stop loading without replacing the previous sequence. Valid image placeholders are not independently detected. Archive extent and NICT scan-start/end semantics remain unverified. Exports retain NICT/JMA/CEReS credit and the non-commercial-use notice. Historical bytes are held in memory and discarded when replaced or the page closes/reloads.

Safari and mobile extension installation are not supported by this release. The extension allows only the project’s GitHub Pages path and loopback HTTP preview pages to request fixed NICT colour URLs. It does not accept arbitrary source URLs. It requests no browsing-history, cookie or storage permission. Loopback access supports private development; it is not a user requirement.

## Package and sign

Run node scripts/package-extension.mjs /absolute/private/output to generate Chrome’s unpacked folder/ZIP and Firefox’s unsigned source ZIP. Source and licence are included; there is no remote executable code. Firefox uses background scripts; Chrome uses a service worker. The stable Firefox ID is recorded in the generated manifest. Submit the Firefox ZIP through Mozilla’s unlisted/self-distribution channel only after owner approval. Keep its assigned identity across updates. The signed file is not automatically generated or published by this build. Until it exists, the UI explicitly says the Firefox download is not available; do not offer the unsigned package as a normal-user download.

The static build includes the Chrome sideload ZIP, excludes the unsigned Firefox package, and includes no tests or Node acquisition server. Adding a signed Firefox download and updating its installation link require a separately approved step.
