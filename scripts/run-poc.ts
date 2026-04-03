/**
 * run:poc — §26 canonical POC case runner.
 *
 * Creates minimal case directories for all three packs and runs each through
 * the engine, proving pack portability per §18.3.4 POC law.
 * All three cases run through the same Layer 1 engine and Layer 2 runtime contract.
 * Only the Layer 3 pack law changes between runs.
 */

import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { runCase } from '../src/orchestration/run-orchestrator.js';

interface PocCaseSpec {
  packLabel: string;
  packManifestPath: string;
  sourceFiles: Array<{ name: string; content: string }>;
}

const PACK_V1_MANIFEST = join(process.cwd(), 'fixtures', 'pack-v1', 'manifest.json');
const PACK_V2_MANIFEST = join(process.cwd(), 'fixtures', 'pack-v2', 'manifest.json');
const PACK_V3_MANIFEST = join(process.cwd(), 'fixtures', 'pack-v3', 'manifest.json');

// §26.2 Pack v1 minimum — DESIGN_PLANS, TEST_REPORT, ENG_LETTER, STD_REFERENCE + COMPLIANCE_CERT
// §26.3 Pack v2 minimum — SPEC_SHEET, TEST_REPORT, MFR_SUBMITTAL, STD_REFERENCE
// §26.4 Pack v3 minimum — DESIGN_PLANS, SPEC_SHEET, TEST_REPORT, STD_REFERENCE
const POC_CASES: PocCaseSpec[] = [
  {
    packLabel: 'pack-v1-highrise',
    packManifestPath: PACK_V1_MANIFEST,
    sourceFiles: [
      {
        name: 'design-plans.pdf.txt',
        content:
          'DESIGN_PLANS fire_rating: 2-hour rated assembly CBC 2022 seismic_reference: ASCE 7-22',
      },
      {
        name: 'test-report.pdf.txt',
        content:
          'TEST_REPORT fire_rating: 1-hour rated assembly test condition: standard_version Title-24-2022',
      },
      {
        name: 'eng-letter.pdf.txt',
        content:
          'ENG_LETTER The assembly meets fire code requirements per CBC. seismic_reference: ASCE 7-22',
      },
      {
        name: 'std-reference.txt',
        content: 'STD_REFERENCE Title-24-2022 California Building Code structural requirements',
      },
      {
        name: 'compliance-cert.pdf.txt',
        content: 'COMPLIANCE_CERT fire_rating: 2-hour certified standard_version: Title-24-2022',
      },
    ],
  },
  {
    packLabel: 'pack-v2-appliance',
    packManifestPath: PACK_V2_MANIFEST,
    sourceFiles: [
      {
        name: 'spec-sheet.pdf.txt',
        content:
          'SPEC_SHEET product model XR-2000 efficiency_rating: 4.2 COP procedure_version: DOE-10CFR430',
      },
      {
        name: 'test-report.pdf.txt',
        content:
          'TEST_REPORT model XR-2000 efficiency_rating: 3.9 COP test_condition: standard DOE-10CFR430',
      },
      {
        name: 'mfr-submittal.pdf.txt',
        content:
          'MFR_SUBMITTAL model XR-2000 claimed efficiency_rating: 4.2 COP certification_condition: standard',
      },
      {
        name: 'std-reference.txt',
        content:
          'STD_REFERENCE Title-20 California Appliance Efficiency Regulations procedure_version: DOE-10CFR430',
      },
    ],
  },
  {
    packLabel: 'pack-v3-datacenter',
    packManifestPath: PACK_V3_MANIFEST,
    sourceFiles: [
      {
        name: 'design-plans.pdf.txt',
        content:
          'DESIGN_PLANS cooling_class: ASHRAE-A2 cooling_load: 500kW fire_suppression: FM-200',
      },
      {
        name: 'spec-sheet.pdf.txt',
        content: 'SPEC_SHEET equipment cooling_class: ASHRAE-A2 rated_limit: 450kW',
      },
      {
        name: 'test-report.pdf.txt',
        content:
          'TEST_REPORT cooling_class: ASHRAE-A1 tested_limit: 400kW fire_suppression: FM-200',
      },
      {
        name: 'std-reference.txt',
        content: 'STD_REFERENCE ASHRAE-2021 thermal guidance NFPA-75 protection requirements',
      },
    ],
  },
];

function makePocCaseDir(spec: PocCaseSpec): string {
  const caseDir = join(tmpdir(), `cers-poc-${spec.packLabel}-${randomUUID()}`);
  const sourceRoot = join(caseDir, 'sources');
  const runsDir = join(caseDir, 'runs');
  mkdirSync(sourceRoot, { recursive: true });
  mkdirSync(runsDir, { recursive: true });

  for (const file of spec.sourceFiles) {
    writeFileSync(join(sourceRoot, file.name), file.content, 'utf8');
  }

  // CONTRA-AUDIT-004 fix: derive packId from the actual manifest being used,
  // not hard-coded to pack-v1. Previously all three POC case.json files claimed
  // to be pack-california-highrise-v1 regardless of which pack was running.
  const manifestJson = JSON.parse(readFileSync(spec.packManifestPath, 'utf8')) as {
    packId: string;
  };
  const resolvedPackId = manifestJson.packId;

  const caseRecord = {
    caseId: randomUUID(),
    packId: resolvedPackId,
    title: `POC case: ${spec.packLabel}`,
    createdAt: new Date().toISOString(),
    createdBy: 'run:poc script',
    actorMode: 'human_interface_first',
    sourceRoot,
  };
  writeFileSync(join(caseDir, 'case.json'), JSON.stringify(caseRecord, null, 2), 'utf8');

  return caseDir;
}

const pocDirs: string[] = [];

async function main(): Promise<void> {
  console.log('run:poc — starting three-pack POC run per §26 canonical law');
  console.log('All three cases run through same engine+runtime. Only pack changes.\n');

  let passCount = 0;
  let failCount = 0;

  for (const spec of POC_CASES) {
    const caseDir = makePocCaseDir(spec);
    pocDirs.push(caseDir);

    console.log(`[${spec.packLabel}] running...`);
    try {
      const output = await runCase({
        casePath: caseDir,
        packManifestPath: spec.packManifestPath,
      });

      const gateFailures = output.gateResults.filter((g) => !g.passed);
      if (gateFailures.length > 0) {
        console.error(`[${spec.packLabel}] GATE FAILURES:`);
        for (const g of gateFailures) {
          console.error(`  ${g.gateName}: ${g.errors.join(', ')}`);
        }
        failCount++;
      } else {
        console.log(
          `[${spec.packLabel}] PASS — run ${output.run.runId} complete, all gates passed`,
        );
        passCount++;
      }
    } catch (err) {
      console.error(
        `[${spec.packLabel}] FAIL — ${err instanceof Error ? err.message : String(err)}`,
      );
      failCount++;
    }
  }

  console.log(`\nrun:poc complete — ${passCount} passed, ${failCount} failed`);

  if (failCount > 0) {
    process.exit(1);
  }
}

main().finally(() => {
  for (const dir of pocDirs) {
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  }
});
