---
name: app-builder
description: Convert HTML/CSS/JS web apps into installable Android APK files. Use when the user asks to make an app/APK from a web project, turn a PWA into an Android app, package a website as a mobile app, or build an installable APK for Android phones. This skill handles the entire pipeline: scaffolding a Nitron project, building an unsigned APK, downloading Java JDK, signing with uber-apk-signer (v1+v2+v3 signatures), and outputting a ready-to-install .apk file.
---

# app-builder: Web App → Android APK Pipeline

This skill captures the complete workflow for converting a web-based app (HTML/CSS/JS) into a signed Android APK. It covers everything from project scaffolding to APK signing and distribution.

## Critical Rules

> **These rules exist because they were learned the hard way during real development. Breaking them will produce broken APKs.**

### Rule 1: All content must be inline — NO fetch() for pages

When an APK runs on Android, it loads from `file://` protocol. **The `fetch()` API does NOT work for loading local pages/files from `file://` in Android WebView.** This means:

- ❌ Do NOT create separate page files (home.html, diet.html, etc.) and load them via `fetch()`
- ✅ ALL UI content must be rendered inline — use a single `index.html` with all pages as hidden `<div>` elements, toggled with JS
- ✅ Use JavaScript template literals (`` ` ``) and `innerHTML` to render page content
- ✅ Store ALL data in memory or localStorage (not IndexedDB, which has file:// issues on some Android versions)

**Design pattern**: Single-Page Application (SPA) where every "page" is a JS function that returns an HTML string. A router function replaces `#page-container` innerHTML.

### Rule 2: Use dark theme for APK mobile apps

Dark backgrounds (#0F0F12 range) work significantly better than white for mobile APPs because:
- AMOLED screens save battery
- Less glare on phone screens
- Gradient accents (orange/green) pop against dark backgrounds
- The app looks more premium/modern

### Rule 3: Keep it lightweight

APKs built with Nitron are typically 40-60KB. Keep the single index.html under 100KB. Avoid:
- Heavy external dependencies
- Large image/assets (icons should be small PNGs)
- Multiple CSS/JS files (inline everything)

### Rule 4: Always sign the APK before distribution

Unsigned APKs are rejected by all modern Android devices with "Parse error" or "App not installed" errors. The signing step is NOT optional.

## Workflow Overview

```
Design (HTML/CSS/JS) → Nitron Project → Build → Sign → APK
```

## Step 1: Design the App

Use the **frontend-design** skill to create the app UI, but enforce these constraints:

1. **Single file**: Everything in one `index.html` (CSS in `<style>`, JS in `<script>`)
2. **SPA pattern**: Render all pages via JS, not separate HTML files
3. **Mobile-first**: Design for 390×844 viewport (iPhone size), max-width 480px
4. **Dark theme**: Use `#0F0F12` as background, `#1A1A20` for cards, vibrant accent colors
5. **Tab navigation**: Bottom tab bar with 5 items (switching pages via JS)
6. **Icons**: Generate 192×192 and 512×512 PNG icons (placed in `icons/` folder)

### Design patterns that work well in APK:
- Dark backgrounds with gradient accents (orange/amber/green)
- Progress rings with SVG circles
- Checkmark circles for daily tracking
- Toggle switches for settings
- Cards with subtle background gradients
- Bold typography with font weights 700-900

## Step 2: Scaffold the Nitron Project

Create the build project with these exact files:

### package.json
```json
{
  "name": "app-name",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "nitron dev",
    "build": "nitron build"
  },
  "dependencies": {
    "nitron": "latest"
  }
}
```

### app.js (Nitron config)
```javascript
import { app } from 'nitron'

app.init({
  name: "AppDisplayName",
  packageId: "com.yourname.app",
  version: "1.0.0",
  entry: "index.html",
  orientation: "portrait",
  statusBar: true,
  permissions: ["INTERNET", "VIBRATE"]
})
```

### Project structure:
```
my-app/
├── app.js           # Nitron configuration
├── package.json     # npm config
├── index.html       # Your single-page app (the entire app)
└── icons/
    ├── icon-192x192.png
    └── icon-512x512.png
```

Do NOT include:
- External CSS/JS files linked in index.html (they won't load from file://)
- Multiple HTML pages
- Node.js backend code

## Step 3: Build the Unsigned APK

```bash
cd my-app
npm install
npm run build
```

This produces `dist/app.apk` — an **unsigned** APK.

## Step 4: Sign the APK

Android requires APK signing. Use the Nitron-bundled `uber-apk-signer.jar` with a Java JDK.

### Step 4a: Download Java JDK (if not available)

```bash
# Download Microsoft JDK 17
curl -sL --connect-timeout 15 --max-time 90 -o /tmp/jdk.zip \
  "https://aka.ms/download-jdk/microsoft-jdk-17-windows-x64.zip"

# Extract
mkdir -p /tmp/jdk && unzip -q -o /tmp/jdk.zip -d /tmp/jdk_full
JAVA=$(find /tmp/jdk_full -name "java.exe" -type f | head -1)
```

On macOS/Linux, the URL changes to the corresponding platform build:
```
https://aka.ms/download-jdk/microsoft-jdk-17-macos-x64.tar.gz
https://aka.ms/download-jdk/microsoft-jdk-17-linux-x64.tar.gz
```

### Step 4b: Sign with uber-apk-signer

```bash
JAVA="/path/to/java"
UBER_JAR="node_modules/nitron/vendor/uber-apk-signer.jar"
APK="dist/app.apk"

"$JAVA" -jar "$UBER_JAR" -a "$APK" --overwrite --skipZipAlign
```

This produces **v1 + v2 + v3 signed** APK (verified output: `- signature verified [v1, v2, v3]`).

### Step 4c: Copy the final APK

```bash
cp "$APK" "/output/path/app-name.apk"
```

### Step 4d: Clean up Java download

```bash
rm -rf /tmp/jdk_full /tmp/jdk.zip
```

## Step 5: Distribution

Output: a single `.apk` file (typically 40-60KB for web-based apps).

**Distribution notes:**
- Users must enable "Install from unknown sources" on Android
- Some phones show "this app may be unsafe" warning — users can tap "Install anyway"
- To eliminate this warning permanently, the developer needs a $25 Google Play Developer account
- The APK can be shared via: WeChat, QQ, email, cloud storage, direct download link

## Important URLs & Resources

| Resource | URL |
|----------|-----|
| Microsoft JDK 17 (Windows) | `https://aka.ms/download-jdk/microsoft-jdk-17-windows-x64.zip` |
| Microsoft JDK 17 (macOS) | `https://aka.ms/download-jdk/microsoft-jdk-17-macos-x64.tar.gz` |
| Microsoft JDK 17 (Linux) | `https://aka.ms/download-jdk/microsoft-jdk-17-linux-x64.tar.gz` |
| Nitron npm package | `https://www.npmjs.com/package/nitron` |

## Troubleshooting

### "Parse Error" or "App not installed" on Android
**Cause**: APK is unsigned or incorrectly signed.
**Fix**: Re-run Step 4 with uber-apk-signer. Verify output shows `signature verified [v1, v2, v3]`.

### App opens but shows blank/white screen
**Cause**: fetch() calls to local files that don't exist in the APK, or external CSS/JS that can't load from file:// protocol.
**Fix**: Ensure everything is in a single index.html file, no external resources.

### Java not found
**Cause**: JDK not installed locally.
**Fix**: Download Microsoft JDK (Step 4a) — it's a portable download, no installation needed.

### npm install fails
**Cause**: Network issues or npm registry problems.
**Fix**: Run `npm config set registry https://registry.npmmirror.com` to use a Chinese mirror, then retry.

### uber-apk-signer "either provide out path or overwrite"
**Fix**: Use `--overwrite --skipZipAlign` together, NOT `-o /path`.
