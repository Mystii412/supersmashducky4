# Super Smash Ducky: contributor rules

## Project
Browser ES module multiplayer brawler. `app.js` is the module entry point; application code lives under
`src/` in configuration, duck assets, game simulation/rendering, network rooms, and UI modules.
PeerJS is host-authoritative: the host runs the simulation, while guests send inputs and receive snapshots.

## Refactor rules
- Never change gameplay values, physics, network message formats, or visible UI
  unless the task explicitly says so.
- If something looks like a bug, don't fix it silently. Report it at the end.
- Descriptive names only (fighter, player, duck, connection, input). No
  single-letter variables except short loop indices.
- Magic numbers become named constants (PHYSICS, COMBAT, TIMING) with the
  original values.
- Functions stay under ~40 lines, single-purpose, verb-named, early returns.
- Simulation code must not touch the DOM, canvas, or PeerJS. Networking code
  must not contain game rules. Rendering code must not mutate game state.
- Message handling uses a handler lookup table, not else-if chains.
- Keep module dependencies explicit with imports and injected runtime/UI callbacks.
- Keep `src/main.js` as the composition root; feature logic belongs in its owning module.
- Comments explain why, not what (snapshot format, sprite sheet math).
- Format with Prettier defaults. Run lint and tests before finishing.

## Workflow
- Make small commits, one concern each.
- Don't mix refactors with bug fixes.
