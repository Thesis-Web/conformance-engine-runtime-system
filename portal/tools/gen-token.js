#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TOKENS_PATH =
  process.env.TOKENS_PATH || path.join(__dirname, '..', '..', '..', 'cers-tokens.json');

const label = process.argv[2];
const limit = parseInt(process.argv[3] || '10', 10);

if (!label) {
  console.error('Usage: node tools/gen-token.js <label> [limit]');
  process.exit(1);
}

let store = { tokens: {} };
try {
  store = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
} catch {}

const id = crypto.randomUUID();
store.tokens[id] = { label, limit, used: 0, created: new Date().toISOString(), last_used: null };
fs.writeFileSync(TOKENS_PATH, JSON.stringify(store, null, 2), 'utf8');

console.log(
  '\nToken created:\n  ID:    ' +
    id +
    '\n  Label: ' +
    label +
    '\n  Limit: ' +
    limit +
    ' runs\n\nSend this to the recipient:\n  Token: ' +
    id +
    '\n  URL:   https://cers.exnulla.com\n',
);
