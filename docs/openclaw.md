# OpenClaw setup for ACT

OpenClaw is installed in this repo as a root dev tool from the upstream
[`openclaw/openclaw`](https://github.com/openclaw/openclaw) package. Use it as
an optional operator channel for pilot notifications and agent control. It is
not bundled into the Expo mobile app and does not replace ACT's in-app debrief
queue.

Upstream OpenClaw recommends Node 24, or Node 22.19+ at minimum.

## What this gives ACT

- Local gateway control through `pnpm openclaw:gateway`.
- Channel inspection through `pnpm openclaw:channels`.
- A small repo helper for sending ACT pilot notifications:
  `pnpm openclaw:notify -- "message"`.
- A clear path to notify an operator or senior tech when a debrief question is
  waiting, while keeping the app's existing human review gates intact.

## First-time setup

Install dependencies:

```bash
pnpm install
```

Check OpenClaw health:

```bash
pnpm openclaw:doctor
```

For a full local-machine setup, upstream recommends the onboarding flow:

```bash
pnpm exec openclaw onboard --install-daemon
```

If model auth is expired, refresh it from the OpenClaw CLI:

```bash
openclaw models auth login --provider anthropic
```

Start the gateway in the foreground:

```bash
pnpm openclaw:gateway
```

Or check an existing gateway service:

```bash
pnpm openclaw:gateway:status
```

If `pnpm openclaw:doctor` reports that the gateway service entrypoint points at
the global OpenClaw install instead of this repo's pinned OpenClaw package, that
is safe for local development. Use `pnpm openclaw:gateway` to run the repo-pinned
gateway in the foreground. Only reinstall the daemon when you intentionally want
the system service to use this repo's OpenClaw version:

```bash
pnpm exec openclaw gateway install
```

## Configure a channel

List channels:

```bash
pnpm openclaw:channels
```

Configure a channel with OpenClaw directly. Telegram is the fastest pilot path:

```bash
openclaw channels add --channel telegram --token <telegram-bot-token>
```

Store the target outside git:

```bash
OPENCLAW_CHANNEL=telegram
OPENCLAW_TARGET=<pilot-chat-or-user-id>
```

For local development, copy `.env.example` to `.env` and set those values there.
Do not commit real bot tokens, phone numbers, or channel IDs.

## Send a test ACT notification

```bash
pnpm openclaw:notify -- "ACT pilot check: debrief question waiting."
```

This helper sends through:

```bash
openclaw message send --channel "$OPENCLAW_CHANNEL" --target "$OPENCLAW_TARGET" --message "..."
```

If `OPENCLAW_CHANNEL` is unset, OpenClaw chooses the default channel for the
target.

## Pilot use

Use OpenClaw for operator-facing notifications only:

- "1 debrief question is waiting."
- "A reviewed lesson was published."
- "Weekly ACT pilot report is ready."

Do not use OpenClaw to give live HVAC diagnosis in the field. ACT's product
boundary is reviewed, post-job knowledge capture; Ask ACT answers only from
published cards.
