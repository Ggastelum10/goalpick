# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Android / Google Play Store

The GitHub Actions workflow `.github/workflows/android-build.yml` builds two artifacts on every push to `main` (or via "Run workflow"):

- **`goalpick-debug-apk`** — installable APK for sideloading on a test device.
- **`goalpick-release-aab`** — signed Android App Bundle for the Play Store (only built when the signing secrets below are set).

### One-time setup for Play Store releases

1. Generate a signing keystore on your machine and keep the file safe (losing it means you can never update the app):
   ```sh
   keytool -genkey -v -keystore goalpick-release.keystore \
     -alias goalpick -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Add these **GitHub repository secrets** (Settings → Secrets and variables → Actions):
   - `ANDROID_KEYSTORE_BASE64` — output of `base64 -i goalpick-release.keystore`
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS` (e.g. `goalpick`)
   - `ANDROID_KEY_PASSWORD`
3. Create the app once in [Google Play Console](https://play.google.com/console) (one-time $25 dev fee), fill out the store listing, privacy policy and content rating, then upload the `.aab` from the workflow artifacts to Internal testing → Production.

Each workflow run uses the run number as the Android `versionCode`, so successive uploads will be accepted by Play.
