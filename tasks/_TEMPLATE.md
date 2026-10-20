---
name: be-12-example
role: BE                      # BE | FE | CHORE
worker: claude                # claude (headless, auto-run) | agy (prepared, user launches)
branch: be/BE-12-example
base: origin/main
files_allowed: lib/server-gateway/**, lib/actions/**, docs/roadmap/BACKEND.md
---
# Task: be-12-example

## Goal
One or two sentences. What is true when this is finished.

## Read first
- AGENTS.md sections X, Y
- exact files/dirs the worker must read

## Steps
1. Concrete, verifiable step. (print STEP 1 DONE)
2. ...

## Done when
- [ ] Observable condition 1 (e.g. "every gateway method throws GatewayError")
- [ ] Observable condition 2
- [ ] Roadmap items ticked: BE-x.y

## Out of scope
- Things the worker must NOT do (pages, contracts, migrations, installs).
