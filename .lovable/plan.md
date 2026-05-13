## Goal

Produce a Play Store–ready Android build for Goalpick:
1. App displays as **"Goalpick"** on the device
2. Launcher icon = current Goalpick logo (`src/assets/goalpick-logo-v2.png`)
3. APK runs the **bundled web assets offline** (no Lovable preview URL)
4. CI also produces a **signed release AAB** suitable for upload to Google Play Console

---

## Changes

### 1. `capacitor.config.ts` — production mode
- Change `appName` from `cup-corner-clash` → `Goalpick`
- Remove the `server.url` / `cleartext` block so the app loads the bundled `dist/` web assets instead of fetching from the Lovable preview. (Keep a commented note for dev hot-reload.)

### 2. App display name
- After `npx cap sync`, set `android/app/src/main/res/values/strings.xml` `app_name` and `title_activity_main` to **Goalpick**. Done in CI via a `sed` step so it survives regeneration.

### 3. Launcher icon = Goalpick logo
- Add a build-time step in the workflow that uses **ImageMagick** to generate all Android launcher icon densities (mdpi 48, hdpi 72, xhdpi 96, xxhdpi 144, xxxhdpi 192) plus the round + foreground variants, from `src/assets/goalpick-logo-v2.png`, and writes them into `android/app/src/main/res/mipmap-*/`.
- Also overwrite `ic_launcher_foreground` for the adaptive icon (with padding so the shield isn't cropped).

### 4. CI workflow (`.github/workflows/android-build.yml`)
Add a second job (and keep debug APK for sideloading):
- **Job A — debug APK** (existing, unchanged behavior, but now builds bundled assets since `server.url` is gone)
- **Job B — release AAB**, only runs when keystore secrets are present:
  - Decode `ANDROID_KEYSTORE_BASE64` GitHub secret → `release.keystore`
  - Write `android/key.properties` from secrets
  - Patch `android/app/build.gradle` to read `key.properties` for `signingConfigs.release`
  - Run `./gradlew bundleRelease`
  - Upload `app-release.aab` artifact

### 5. README note
- Short section: how to upload the `.aab` to Google Play Console (create app → Production/Internal testing → upload bundle).

---

## What you (the user) must do

Play Store uploads require a signing key that **only you control** — it cannot live in the codebase. Before the release job can run, you'll need to:

1. **Generate a keystore once** on your machine:
   ```
   keytool -genkey -v -keystore goalpick-release.keystore \
     -alias goalpick -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Add four secrets to your GitHub repo (Settings → Secrets → Actions):
   - `ANDROID_KEYSTORE_BASE64` — `base64 goalpick-release.keystore` output
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS` (e.g. `goalpick`)
   - `ANDROID_KEY_PASSWORD`
3. Create the app in **Google Play Console** (one-time): https://play.google.com/console — pay the $25 dev fee, fill store listing, privacy policy URL, content rating, then upload the `.aab` from the workflow artifacts.

The debug APK will keep working without any of the above.

---

## Technical notes

- Package id stays `com.goalpick.app` (already correct for Play Store).
- Removing `server.url` means future UI changes require rebuilding the APK/AAB to ship — current behavior of "edit in Lovable, app updates" only works while `server.url` points at the preview. Acceptable trade-off for Store distribution.
- `versionCode` / `versionName` will be set in `android/app/build.gradle` (start at `versionCode 1`, `versionName "1.0.0"`); each Play upload needs `versionCode` bumped — workflow uses `${{ github.run_number }}` for that.
- Adaptive icon background color will be set to the app's primary green (`#…` from the logo).

---

## Files touched

- `capacitor.config.ts`
- `.github/workflows/android-build.yml`
- `README.md` (add Play Store section)
- (CI-generated, not committed) `android/app/src/main/res/mipmap-*`, `android/app/src/main/res/values/strings.xml`, `android/key.properties`
