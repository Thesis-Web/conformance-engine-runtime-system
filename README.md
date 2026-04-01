# Conformance Engine Runtime System (CERS)

Private-runtime, evidence-governed engineering conformance review system.

## Status

This repository contains the first deterministic build scaffold for CERS under the approved blueprint and engineering spec.

Current build phase:

- Engine-first
- TypeScript strict
- Human-as-interface-first POC
- Three-pack governed scope:
  - California High-rise / Buildings Pack v1
  - Appliance / Refrigeration Pack v2
  - Data Center Pack v3

Thin portal, browser upload UX, public auth, SharePoint connector implementation, and router/API automation are deferred for this build phase.

## Architecture Summary

CERS is a five-layer system:

1. Core Engine
2. Runtime Contract
3. Domain Packs
4. Case and State Orchestration
5. Thin Portal and Output Face

Build order is fixed:

- Layer 1 first
- Layer 2 second
- Layer 3 third
- Layer 4 minimum local orchestration for POC
- Layer 5 last

The engine performs:

Ingest -> Normalize -> Classify -> Compare -> Flag -> Ask -> Emit

Every run is governed by:

- immutable source hashing
- provenance ledger assignment
- two-pass model chain
- deterministic rules pass
- source-cited artifact output
- no-certification boundary

## Repository Structure

    /docs/
    /src/core/
    /src/contract/
    /src/packs/
    /src/orchestration/
    /src/cli/
    /src/artifacts/
    /src/validation/
    /src/types/
    /src/utils/
    /schemas/
    /fixtures/pack-v1/
    /fixtures/pack-v2/
    /fixtures/pack-v3/
    /runs/
    /tests/unit/
    /tests/integration/
    /tests/fixtures/

## Required Commands

The repository will provide these scripts:

- lint
- typecheck
- test
- test:integration
- build
- ci:gate
- run:poc
- run:validate
- pack:validate
- artifact:validate

## Security Posture

CERS is designed for hostile-ingest assumptions and private-runtime execution:

- content verification by signature/content, not extension only
- executable/script payload rejection
- immutable source hashing at first touch
- provenance preserved for the life of a run
- no client-side exposure of engine logic
- no output implying certification, approval, or signoff

## Proprietary Notice

All contents of this repository are proprietary and confidential.
No rights are granted except by explicit written permission from the owner.
