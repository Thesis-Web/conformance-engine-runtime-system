'use strict';

/**
 * CERS Thin Portal Server — Layer 5
 *
 * Responsibilities (spec §15):
 *   - engineer workspace (token-gated)
 *   - upload endpoint (client/manufacturer packages)
 *   - job status polling
 *   - artifact retrieval
 *   - bounded brief view
 *
 * Must NOT:
 *   - expose engine logic or internal reasoning chain
 *   - expose pack law internals
 *   - present output as certification or approval
 *
 * Token pattern mirrors orbital/space-server exactly:
 *   tokens.json at TOKENS_PATH (outside repo, never committed)
 *   Format: { "tokens": { "<uuid>": { "label": "...", "limit": N, "used": 0, "created": "...", "last_used": null } } }
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const multer = require('multer');

const app = express();
app.use(express.json({ limit: '1mb' }));

// ── Config ──────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);
const TOKENS_PATH = process.env.TOKENS_PATH || path.join(__dirname, '..', '..', 'tokens.json');
const USAGE_LOG_PATH = process.env.USAGE_LOG_PATH || path.join(__dirname, '..', '..', 'usage.log');

// Upload quarantine — matches blueprint /var/lib/cers/quarantine intent.
// For POC, land under portal/uploads/ and process from there.
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
const RUNS_DIR = process.env.RUNS_DIR || path.join(__dirname, '..', 'runs');

fs.mkdirSync(UPLOADS_DIR, { recursive: true });
fs.mkdirSync(RUNS_DIR, { recursive: true });

// ── Token auth (same pattern as orbital/space-server) ────────────────────────
function loadTokens() {
  try {
    return JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
  } catch {
    return { tokens: {} };
  }
}

function saveTokens(data) {
  try {
    fs.writeFileSync(TOKENS_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('[token] Failed to save tokens.json:', e.message);
  }
}

function logUsage(tokenId, label, used, limit, ip) {
  const line =
    JSON.stringify({
      ts: new Date().toISOString(),
      service: 'cers-portal',
      token: tokenId.slice(0, 8) + '...',
      label,
      run: used,
      limit,
      ip: ip || 'unknown',
    }) + '\n';
  try {
    fs.appendFileSync(USAGE_LOG_PATH, line, 'utf8');
  } catch (e) {
    console.error('[token] Failed to write usage.log:', e.message);
  }
}

function resolveToken(req) {
  // Accept token from header (preferred) or query param (fallback for fetch from gate)
  return req.headers['x-cers-token'] || req.query.token || null;
}

function tokenAuth(req, res, next) {
  // Allow loopback without token for operator/dev testing
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const isLocal = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip);
  if (isLocal) return next();

  const tokenId = resolveToken(req);
  if (!tokenId)
    return res
      .status(401)
      .json({ ok: false, error: 'No token. Request access at cers.exnulla.com.' });

  const store = loadTokens();
  const entry = store.tokens[tokenId];
  if (!entry) return res.status(401).json({ ok: false, error: 'Invalid token.' });
  if (entry.used >= entry.limit) {
    return res.status(429).json({
      ok: false,
      error: `Token exhausted (${entry.used}/${entry.limit} runs used). Contact owner to continue.`,
    });
  }

  req.cersMeta = { tokenId, label: entry.label, entry };
  next();
}

function consumeToken(req) {
  const store = loadTokens();
  const entry = store.tokens[req.cersMeta.tokenId];
  if (!entry) return;
  entry.used += 1;
  entry.last_used = new Date().toISOString();
  saveTokens(store);
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  logUsage(req.cersMeta.tokenId, entry.label, entry.used, entry.limit, ip);
  console.log(`[cers-portal] ${entry.label} — run ${entry.used}/${entry.limit} from ${ip}`);
}

// ── Token validation endpoint (called from gate.html before storing) ─────────
// Does NOT consume a run — just confirms the token is valid and not exhausted.
// Safari-safe: pure JSON response, no cookies, no redirects.
app.get('/api/check-token', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const tokenId = resolveToken(req);
  if (!tokenId) return res.json({ ok: false, error: 'No token provided.' });

  const store = loadTokens();
  const entry = store.tokens[tokenId];
  if (!entry) return res.json({ ok: false, error: 'Invalid token.' });
  if (entry.used >= entry.limit) {
    return res.json({
      ok: false,
      error: `Token exhausted (${entry.used}/${entry.limit} runs used).`,
      exhausted: true,
    });
  }
  return res.json({ ok: true, label: entry.label, remaining: entry.limit - entry.used });
});

// ── File upload ──────────────────────────────────────────────────────────────
// Multer config: accept only allowed extensions, 100 MiB per file (spec §13.5)
const ALLOWED_EXT = new Set(['.pdf', '.docx', '.txt', '.json', '.csv']);
const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MiB

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      return cb(
        new Error(`File type ${ext} is not accepted. Allowed: ${[...ALLOWED_EXT].join(', ')}`),
      );
    }
    cb(null, true);
  },
});

// Upload endpoint — token-gated, does NOT consume a run (upload is free; run costs a token)
app.post('/api/upload', tokenAuth, upload.array('files', 20), (req, res) => {
  const files = req.files || [];
  if (files.length === 0) return res.status(400).json({ ok: false, error: 'No files received.' });

  const caseId = randomUUID();
  const caseDir = path.join(UPLOADS_DIR, caseId);
  fs.mkdirSync(caseDir, { recursive: true });

  // Move files into case directory
  const manifest = [];
  for (const file of files) {
    const dest = path.join(caseDir, file.filename);
    fs.renameSync(file.path, dest);
    manifest.push({ fileId: file.filename, originalName: file.originalname, size: file.size });
  }

  fs.writeFileSync(
    path.join(caseDir, 'upload-manifest.json'),
    JSON.stringify(
      {
        caseId,
        uploadedAt: new Date().toISOString(),
        tokenLabel: req.cersMeta?.label || 'operator',
        files: manifest,
      },
      null,
      2,
    ),
  );

  console.log(`[cers-portal] upload caseId=${caseId} files=${files.length}`);
  return res.json({ ok: true, caseId, fileCount: files.length });
});

// Run trigger — token-gated, consumes one run
app.post('/api/run', tokenAuth, (req, res) => {
  const { caseId, packId } = req.body || {};
  if (!caseId) return res.status(400).json({ ok: false, error: 'caseId required.' });

  const allowedPacks = [
    'pack-california-highrise-v1',
    'pack-california-appliance-refrig-v2',
    'pack-california-datacenter-v3',
  ];
  const pack = allowedPacks.includes(packId) ? packId : 'pack-california-highrise-v1';

  // Consume token run before triggering
  consumeToken(req);

  const runId = randomUUID();
  const runDir = path.join(RUNS_DIR, runId);
  fs.mkdirSync(runDir, { recursive: true });

  // Write a run-request record. The engine CLI (run:poc / cers run-case) is invoked
  // by an operator in human-as-interface-first mode, or wired later via child_process.
  // For POC, this creates the request artifact and signals the operator.
  const runRequest = {
    runId,
    caseId,
    packId: pack,
    status: 'queued',
    requestedAt: new Date().toISOString(),
    tokenLabel: req.cersMeta?.label || 'operator',
    operatorNote: 'Human-as-interface-first mode. Operator must execute cers run-case to process.',
  };
  fs.writeFileSync(path.join(runDir, 'run-request.json'), JSON.stringify(runRequest, null, 2));

  console.log(`[cers-portal] run queued runId=${runId} caseId=${caseId} pack=${pack}`);
  return res.json({ ok: true, runId, status: 'queued' });
});

// Run status
app.get('/api/run/:runId', tokenAuth, (req, res) => {
  const runDir = path.join(RUNS_DIR, req.params.runId);
  const requestPath = path.join(runDir, 'run-request.json');
  const runJsonPath = path.join(runDir, 'run.json');

  if (!fs.existsSync(runDir)) return res.status(404).json({ ok: false, error: 'Run not found.' });

  // Check for completed run.json (written by engine)
  if (fs.existsSync(runJsonPath)) {
    const run = JSON.parse(fs.readFileSync(runJsonPath, 'utf8'));
    return res.json({ ok: true, runId: req.params.runId, status: run.status, run });
  }

  // Fall back to request record
  if (fs.existsSync(requestPath)) {
    const req2 = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
    return res.json({ ok: true, runId: req.params.runId, status: req2.status });
  }

  return res.json({ ok: true, runId: req.params.runId, status: 'unknown' });
});

// Artifact list for a run
app.get('/api/run/:runId/artifacts', tokenAuth, (req, res) => {
  const runDir = path.join(RUNS_DIR, req.params.runId);
  if (!fs.existsSync(runDir)) return res.status(404).json({ ok: false, error: 'Run not found.' });

  const REQUIRED_ARTIFACTS = [
    '01-ingest-log.json',
    '02-provenance-ledger.json',
    '03-source-inventory.json',
    '04-classification-output.json',
    '05-comparison-result-set.json',
    '06-contradiction-log.json',
    '07-hole-log.json',
    '08-ambiguity-queue.json',
    '09-ask-list.json',
    '10-output-brief.md',
    '11-engineer-review-packet.md',
  ];

  const available = REQUIRED_ARTIFACTS.filter((name) => fs.existsSync(path.join(runDir, name)));
  return res.json({ ok: true, runId: req.params.runId, artifacts: available });
});

// Artifact download — never exposes engine internals, only output artifacts
app.get('/api/run/:runId/artifact/:filename', tokenAuth, (req, res) => {
  const { runId, filename } = req.params;
  // Sanitize: only numbered artifact filenames
  if (!/^(0[0-9]|1[0-5])-[\w-]+\.(json|md)$/.test(filename)) {
    return res.status(400).json({ ok: false, error: 'Invalid artifact filename.' });
  }
  const filePath = path.join(RUNS_DIR, runId, filename);
  if (!fs.existsSync(filePath))
    return res.status(404).json({ ok: false, error: 'Artifact not found.' });
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.sendFile(filePath);
});

// ── Static portal pages ──────────────────────────────────────────────────────
// Gate serves at / — no token required (it's the entry point)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'gate.html')));
app.get('/gate', (req, res) => res.sendFile(path.join(__dirname, 'gate.html')));

// Portal shell — token validated client-side via sessionStorage before reaching here
app.get('/portal', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Health check for nginx upstream / deploy verification
app.get('/health', (req, res) =>
  res.json({ ok: true, service: 'cers-portal', ts: new Date().toISOString() }),
);

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, '127.0.0.1', () => {
  console.log(`[cers-portal] listening on http://127.0.0.1:${PORT}`);
  console.log(`[cers-portal] TOKENS_PATH=${TOKENS_PATH}`);
  console.log(`[cers-portal] UPLOADS_DIR=${UPLOADS_DIR}`);
  console.log(`[cers-portal] RUNS_DIR=${RUNS_DIR}`);
});
