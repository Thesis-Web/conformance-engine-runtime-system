import * as fs from 'node:fs';
import * as path from 'node:path';

const schemasDir = path.join(process.cwd(), 'schemas');
const requiredSchemas = [
  'case-record.schema.json',
  'run-record.schema.json',
  'pack-manifest.schema.json',
  'finding.schema.json',
  'ask.schema.json',
  'output-brief.schema.json',
  'engineer-review-packet.schema.json',
  'base-standards-module.schema.json',
  'jurisdiction-family-config.schema.json',
  'tier-overlay.schema.json',
  'effective-pack-manifest.schema.json',
  'effective-pack-store-record.schema.json',
  'effective-pack-resolution-result.schema.json',
];

let hasError = false;

console.log('=== Schema Validation ===');

for (const filename of requiredSchemas) {
  const fullPath = path.join(schemasDir, filename);
  if (!fs.existsSync(fullPath)) {
    console.error(`ERROR: Missing schema ${filename}`);
    hasError = true;
    continue;
  }

  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    const schemaObj = JSON.parse(content) as Record<string, unknown>;

    if (schemaObj['type'] !== 'object') {
      console.error(`ERROR: ${filename} missing top-level object type`);
      hasError = true;
      continue;
    }

    if (!('properties' in schemaObj)) {
      console.error(`ERROR: ${filename} missing properties`);
      hasError = true;
      continue;
    }

    console.log(`OK: schemas/${filename}`);
  } catch (error) {
    console.error(`ERROR: Failed to parse ${filename}: ${String(error)}`);
    hasError = true;
  }
}

if (hasError) {
  process.exit(1);
}

console.log('schema:validate PASS');
