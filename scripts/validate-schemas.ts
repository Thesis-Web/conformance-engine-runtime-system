import { existsSync } from 'node:fs';

const REQUIRED = [
  'schemas/case-record.schema.json',
  'schemas/run-record.schema.json',
  'schemas/pack-manifest.schema.json',
  'schemas/finding.schema.json',
  'schemas/ask.schema.json',
  'schemas/output-brief.schema.json',
  'schemas/engineer-review-packet.schema.json',
];

let pass = true;

for (const schemaPath of REQUIRED) {
  if (!existsSync(schemaPath)) {
    console.error('MISSING schema: ' + schemaPath);
    pass = false;
  } else {
    console.log('OK: ' + schemaPath);
  }
}

if (!pass) {
  process.exit(1);
}

console.log('schema:validate PASS');
