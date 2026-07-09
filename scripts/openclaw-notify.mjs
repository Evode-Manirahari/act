#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

function readDotenv() {
  if (!existsSync('.env')) {
    return {};
  }

  return Object.fromEntries(
    readFileSync('.env', 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        const key = line.slice(0, index).trim();
        const rawValue = line.slice(index + 1).trim();
        const value = rawValue.replace(/^['"]|['"]$/g, '');
        return [key, value];
      }),
  );
}

const [, , ...parts] = process.argv;
const message = parts.join(' ').trim();
const dotenv = readDotenv();
const channel = (process.env.OPENCLAW_CHANNEL ?? dotenv.OPENCLAW_CHANNEL)?.trim();
const target = (process.env.OPENCLAW_TARGET ?? dotenv.OPENCLAW_TARGET)?.trim();

if (!message) {
  console.error('Usage: pnpm openclaw:notify -- "message to send"');
  process.exit(1);
}

if (!target) {
  console.error('Set OPENCLAW_TARGET before sending an ACT OpenClaw notification.');
  process.exit(1);
}

const args = ['message', 'send', '--target', target, '--message', message];
if (channel) {
  args.splice(2, 0, '--channel', channel);
}

const result = spawnSync('openclaw', args, { stdio: 'inherit' });

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
