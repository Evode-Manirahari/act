# ACT mobile — dev build setup

Expo Go is great for quick iteration but doesn't support every native
module ACT uses (Sentry RN being the main one). For real on-device
testing of the capture loop you want a **dev client** — an Expo build
of *your* app with live JS reload, but with all native modules baked in.

## Four EAS build profiles in `eas.json`

| Profile | What it builds | API base URL | Use when |
|---|---|---|---|
| `development` | Dev client, internal distribution | Fly (act-api-evode) | First on-device install, day-to-day dev |
| `development-simulator` | Same, but iOS simulator-compatible | Fly | Quick fix iteration in Xcode/Simulator |
| `development-local` | Dev client, distribution internal | `http://localhost:8080` | When the api is on your laptop |
| `preview` | Production-style binary (APK on Android, ad-hoc on iOS) | Fly | Hand to a design partner for testing |
| `production` | App Store / Play Store binary | Fly | Ship to real users |

## First-time setup

```bash
cd apps/mobile

# 1. Install EAS CLI if you don't have it
npm i -g eas-cli

# 2. Log in (uses your Expo account — same one as `expo login`)
eas login

# 3. Verify the project id matches app.json (it should — extra.eas.projectId)
eas project:info
```

## Day-to-day workflow

### Build the dev client once

```bash
# iOS device (needs your iPhone UDID + Apple Developer account)
pnpm build:dev-ios

# Android device (APK, no Play Store required)
pnpm build:dev-android

# iOS Simulator (Mac only — no Apple Developer fee)
pnpm build:dev-sim
```

EAS gives you a download link when the build finishes (~10-15 min the
first time, 5-10 min after that). Install it on the device.

### Run the JS bundle against your local Metro

```bash
pnpm start:dev-client
```

Open the dev client app on the device → it auto-connects. Live reload,
hot module replacement, everything Expo Go offered, but with full
native module support.

### Switch API target on the fly

The dev client reads the API base URL at runtime from
`EXPO_PUBLIC_API_BASE_URL`. The dev build embeds Fly by default. If you
want to point at a local act-api temporarily:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.42:8080 pnpm start:dev-client
```

(Replace with your laptop's LAN IP — `localhost` won't work because
that resolves on the phone itself.)

## Sharing a preview build with a design partner

```bash
pnpm build:preview
```

Gives you a download link (APK for Android, an ad-hoc iOS build for
TestFlight). Send it to the partner. No code on their side.

## When to stop using dev builds

When you're ready to ship to the App Store / Play Store, switch to
`pnpm build:preview` for one more round of testing, then
`eas build --profile production --platform all` for the real submission.

## Troubleshooting

- **"Cannot connect to dev server"**: dev client + `pnpm start:dev-client`
  must run on the same network. If your laptop firewall blocks port
  8081, allow it for `node`.
- **Sentry errors at startup**: check `SENTRY_DSN` is set as an EAS
  secret (`eas secret:create --name SENTRY_DSN --value ...`).
- **Camera permission prompt doesn't appear on iOS**: the
  `NSCameraUsageDescription` lives in `app.json`. If you change the
  string you need to rebuild — `pnpm prebuild && pnpm build:dev-ios`.
