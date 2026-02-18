# Auto-Update Setup Guide

To finalize the auto-update configuration, you need to generate signing keys and configure your GitHub repository.

## 1. Generate Signing Keys

Tauri requires updates to be signed with a private key. Run the following command in your terminal:

```bash
npx tauri signer generate -w ./cuoti.key
```

This will:
1.  Generate a private key (saved to `cuoti.key`).
2.  Generate a public key (`cuoti.key.pub`).
3.  Automatically update `src-tauri/tauri.conf.json` with the public key.

**Note:** If prompted for a password, enter one and remember it (or keep it empty for no password, though not recommended).
2.  Generate a public key.
3.  Automatically update `src-tauri/tauri.conf.json` with the public key.

**IMPORTANT:**
-   **NEVER** commit the private key or its password to Git.
-   Keep the private key safe. If you lose it, you cannot issue updates for existing users.

## 2. Configure GitHub Secrets

Go to your GitHub Repository > Settings > Secrets and variables > Actions, and add the following secrets:

-   `TAURI_SIGNING_PRIVATE_KEY`: The content of the private key (`.key`) file generated above.
-   `TAURI_SIGNING_KEY_PASSWORD`: The password you set for the key (if any).

## 3. Configure `tauri.conf.json`

Open `src-tauri/tauri.conf.json` and replace `OWNER` and `REPO` in the updater endpoint URL with your actual GitHub username and repository name:

```json
"endpoints": [
  "https://github.com/juandosimple/Cuoti/releases/latest/download/latest.json"
]
```

## 4. Workflows

A GitHub Action workflow has been created at `.github/workflows/release.yml`. Whenever you push a tag starting with `v` (e.g., `v1.0.1`), it will:
1.  Build the app.
2.  Sign the update.
3.  Create a GitHub Release.
4.  Upload the assets.

## How to Release

1.  Update the version in `package.json` and `src-tauri/tauri.conf.json`.
2.  Commit the changes.
3.  Tag the commit: `git tag v0.1.1`
4.  Push the tag: `git push origin v0.1.1`

The GitHub Action will handle the rest.
