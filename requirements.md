# Super Smash Ducky 4 — Character Selection Requirements

## Goal

Build a browser-based, online duck fighting game inspired by the stock-battle format and character-select presentation of *Super Smash Bros.* The prototype includes room setup, shared character selection, ready-up flow, and a playable stock-battle arena.

## Players and rooms

- Support 2–4 players on separate devices in one online session.
- Players create or join a session using a room code.
- Show the players in the room and indicate which player is selecting which duck.
- Duck selections are made simultaneously and are shared with the other players in the room.
- Keep room and selection state in memory for the active session only; do not persist selections across page reloads.

## Duck roster and data

- Load all available ducks from `https://api.ducks.ects-cmp.com/ducks`.
- Use duck sprites from `https://github.com/ectscmp/duck_system_assets/tree/main/images/sprites`.
- Render each duck from its six sprite parts, using the corresponding part colors so the displayed duck matches its data.
- A duck is selectable only when all required information is available:
  - Strength
  - Health
  - Focus
  - All six sprite parts, including the colors needed to render them
- If any required information is missing or unavailable, show the duck as unavailable and prevent selection.
- Include every duck returned by the API in the roster, including unavailable ducks.

## Roster interaction

- Show the full roster in one character-selection menu.
- Provide a search/filter field that filters as the user types.
- Match search terms against each duck's name, description, and creator name.
- Keep a player's selected duck visible even when it does not match the current search term.
- On hover over a duck, show its Strength, Health, and Focus in a side panel.
- Indicate clearly which player has selected each duck.

## Battle prototype

- Start the match when at least two connected players have selected a duck and every connected player is ready.
- Support 2–4 fighters in a shared stock battle, with three stocks per fighter.
- Include a main platform, floating platforms, knockback, ring-outs, respawns, and a last-duck-standing win condition.
- Support keyboard and touch controls for movement, jumping, attacks, special moves, and shielding.
- Include a three-hit jab combo, directional jab and smash attacks, and a duck-colored projectile special that consumes focus.
- Animate duck movement, attacks, knockback, shielding, and landings with visible arms and legs, punch extensions, attack trails, impact bursts, and squash-and-stretch.
- Give every fighter a triple jump with distinct takeoff, midair, and landing animations.
- Spawn a Smash Ball periodically; fighters damage it to claim one Final Smash. Fire immediately in the duck facing direction with the Special key or touch button, show the duck charging and lunging through a dramatic forward strike cutscene, and damage only opponents along its path.
- Let each player remap keyboard controls for the current browser session, with duplicate-key prevention and a reset-to-default option.
- Keep one host authoritative for match simulation and send state to the other players in the room.
- Show fighter names, stocks, damage, focus, and shield strength during the battle.
- Allow players to return to selection for a rematch without recreating the room.

- After all players ready up, show a shared stage-selection menu with multiple arena layouts; the host picks the stage before starting.
- Use forgiving attack collision ranges so close swings and projectiles connect consistently.

## Gameplay attributes

The stats should eventually affect gameplay. The current tentative mapping is:

- Strength → attack damage
- Health → resistance to knockback
- Focus → movement speed and special-move charge gained from hits

Intelligence and Kindness are not required for this milestone. These mappings are provisional and should be validated when battle mechanics are defined.

## Visual direction

- Use a bold character-select interface inspired by the real *Super Smash Bros.* UI.
- Display duck names and correctly colored composite sprites in the roster.
- Keep player indicators and the hovered duck's stats easy to distinguish.

## Out of scope for this prototype

- Local multiplayer
- Advanced combat systems such as grabs, multiple attack types, items, and additional stages
- Dedicated matchmaking servers or persistent player accounts
- Saved selections between sessions
- Using Intelligence or Kindness in gameplay

## Open decisions

- How rooms are created, how codes are generated, and how players reconnect after a disconnect.
- How player identity and player ordering are assigned within a room.
- Whether each duck may be selected by more than one player.
- Exact API response fields, sprite-part naming/assembly rules, and how API or asset errors are communicated to players.
- Whether a selection is locked in explicitly or changes immediately when a player clicks another duck.
- Final balance formulas for translating Strength, Health, and Focus into battle attributes.
- Reconnection and match recovery if the host disconnects.
