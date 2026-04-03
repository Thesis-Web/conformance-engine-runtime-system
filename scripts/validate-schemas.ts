/**
 * schema:validate — validates schema files exist AND have correct structure.
 *
 * INCOMPLETE-001 fix: previously only checked file existence via existsSync.
 * Now also verifies each schema file:
 *   - is valid parseable JSON
 *   - contains a $schema declaration
 *   - contains a top-level "type" field
 *   - contains a "properties" or "items" field (structural content)
 *   - contains a "required" array where applicable
 *
 * Spec §11: schemas must be machine-readable with runtime-validatable structure.
 */

import { existsSync, readFileSync } from 'node:fs';

interface SchemaCheck {
  path: string;
  requireRequired: boolean; // some schemas (output-brief, engineer-review-packet) are string type
}

const REQUIRED_SCHEMAS: SchemaCheck[] = [
  { path: 'schemas/case-record.schema.json', requireRequired: true },
  { path: 'schemas/run-record.schema.json', requireRequired: true },
  { path: 'schemas/pack-manifest.schema.json', requireRequired: true },
  { path: 'schemas/finding.schema.json', requireRequired: true },
  { path: 'schemas/ask.schema.json', requireRequired: true },
  { path: 'schemas/output-brief.schema.json', requireRequired: false },
  { path: 'schemas/engineer-review-packet.schema.json', requireRequired: false },
];

let pass = true;

for (const check of REQUIRED_SCHEMAS) {
  // Existence check
  if (!existsSync(check.path)) {
    console.error(`MISSING schema: ${check.path}`);
    pass = false;
    continue;
  }

  // Parse check
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(check.path, 'utf8'));
  } catch (err) {
    console.error(`INVALID JSON in schema: ${check.path} — ${String(err)}`);
    pass = false;
    continue;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    console.error(`NOT AN OBJECT: ${check.path}`);
    pass = false;
    continue;
  }

  const schema = parsed as Record<string, unknown>;
  const errors: string[] = [];

  // Must have $schema declaration
  if (typeof schema['$schema'] !== 'string') {
    errors.push('missing $schema declaration');
  }

  // Must have a type field
  if (!('type' in schema)) {
    errors.push('missing top-level "type" field');
  }

  // Must have structural content: properties (for object schemas) or items (for array schemas)
  const hasProperties = 'properties' in schema && typeof schema['properties'] === 'object';
  const hasItems = 'items' in schema && typeof schema['items'] === 'object';
  const isStringType = schema['type'] === 'string';

  if (!hasProperties && !hasItems && !isStringType) {
    errors.push('missing "properties" or "items" field — schema has no structural content');
  }

  // Must have required array for object schemas with properties (where applicable)
  if (check.requireRequired && hasProperties) {
    if (!Array.isArray(schema['required']) || schema['required'].length === 0) {
      errors.push('"required" array is missing or empty — schema does not enforce required fields');
    }
  }

  if (errors.length > 0) {
    console.error(`STRUCTURAL ERRORS in ${check.path}:`);
    for (const e of errors) console.error(`  - ${e}`);
    pass = false;
  } else {
    console.log(`OK: ${check.path}`);
  }
}

if (!pass) {
  console.error('schema:validate FAIL');
  process.exit(1);
}

console.log('schema:validate PASS');
