// Shared configuration for the whole game: API and sprite locations, stage
// definitions, colors, controls, and gameplay tuning values. Other modules
// import these constants so settings stay consistent and easy to adjust.
// Configuration
// Keep tuning values and external asset locations together.
export const API_URL = 'https://api.ducks.ects-cmp.com/ducks';
export const SHEETS = {
  back: 'assets/sprites/Duck_Sprites_Back.png',
  front: 'assets/sprites/Duck_Sprites_Front.png',
  normal: 'assets/sprites/Duck_Sprites_Heads_Normal.png',
  derpy: 'assets/sprites/Duck_Sprites_Heads_Derpy.png',
};
export const SPRITE_SHEET = { sourceWidth: 500, cellHeight: 356.25, canvasWidth: 240, canvasHeight: 224, scale: 2 };
export const COLORS = {
  red: '#c81916', green: '#8bee00', yellow: '#f0e88d', purple: '#a000ee',
  blue: '#0845ec', brown: '#683c20', pink: '#f7a4be',
};
export const PLAYER_COLORS = ['#ed5143', '#36b8dc', '#f1b735', '#bd65df'];
export const STAGES = [
  {
    id: 'ducky-dome', name: 'Ducky Dome', tag: 'CLASSIC',
    background: 'assets/stages/ducky-dome.svg',
    sky: ['#17283c', '#34566a', '#121d2a'], top: '#b8f1ec',
    platforms: [{ x: 250, w: 155, y: 320 }, { x: 555, w: 155, y: 320 }],
  },
  {
    id: 'cloud-steps', name: 'Cloud Steps', tag: 'THREE-TIER',
    background: 'assets/stages/cloud-steps.svg',
    sky: ['#20344e', '#587f9a', '#172638'], top: '#c7f5ff',
    platforms: [{ x: 155, w: 170, y: 344 }, { x: 395, w: 170, y: 286 }, { x: 635, w: 170, y: 344 }],
  },
  {
    id: 'sunset-split', name: 'Sunset Split', tag: 'WIDE GAPS',
    background: 'assets/stages/sunset-split.svg',
    sky: ['#422b42', '#93604d', '#241c31'], top: '#ffd188',
    platforms: [{ x: 150, w: 190, y: 330 }, { x: 620, w: 190, y: 330 }, { x: 390, w: 180, y: 265 }],
  },
];

// Keep gameplay tuning values separate from simulation and rendering logic.
export const STAGE_PREVIEW = {
  height: 112,
  topRange: 180,
  topOffset: 250,
  maxTopPercent: 78,
};
export const ARENA = {
  width: 960,
  height: 540,
  floorY: 420,
  blastY: 560,
  blastLeft: -50,
  blastRight: 1010,
  playableLeft: 90,
  playableRight: 870,
};
export const SPAWN_PLATFORM = {
  width: 112,
  startY: 92,
  fallSpeed: 1.55,
  duration: 90,
  invulnerability: 108,
  jumpVelocity: -11.7,
};
export const PHYSICS = {
  gravity: 0.48,
  jumpVelocities: [0, -11.7, -11.1, -13.4],
  maxJumps: 3,
  fallControl: 0.18,
  groundAcceleration: 0.34,
  airAcceleration: 0.2,
  groundFriction: 0.82,
  airFriction: 0.96,
  baseRunSpeed: 4.4,
  focusRunBonus: 1.2,
};
export const COMBAT = {
  baseKnockback: 4,
  attackDamageKnockback: 0.5,
  damagePercentKnockback: 0.065,
  maxKnockback: 28,
  horizontalLaunchScale: 0.38,
  maxHorizontalLaunchBonus: 12,
  upwardLaunchScale: 0.22,
  maxUpwardLaunchBonus: 9,
  downwardLaunchScale: 0.32,
  maxDownwardLaunchBonus: 8,
  jabRange: 46,
  smashRange: 66,
  attackOriginOffset: 24,
  attackOriginYOffset: -8,
  projectileHitWidth: 26,
  projectileHitHeight: 28,
  jabHitHeight: 58,
  targetHalfWidth: 22,
  targetHalfHeight: 22,
  upHitTop: -104,
  upHitBottom: 44,
  downHitTop: -32,
  downHitBottom: 86,
  jabLunge: 0.45,
  smashLunge: 1.2,
  smashActiveLunge: 4.5,
  // Covers the ~90 ms input update interval used by online players.
  activeFrames: 8,
};
export const LEDGE = {
  catchDistance: 40,
  catchAboveTop: 24,
  catchBelowTop: 30,
  hangOffsetX: 12,
  hangOffsetY: 21,
  regrabDelay: 24,
  dropSpeed: 4,
  recoverySpeed: -10.5,
  recoveryInwardSpeed: 4.1,
  releaseInvulnerability: 16,
};
export const TIMING = {
  inputSendIntervalMs: 90,
  snapshotIntervalMs: 55,
  cinematicSnapshotIntervalMs: 45,
  hudRefreshIntervalMs: 110,
};
export const DEFAULT_CONTROLS = {
  left: 'a', right: 'd', up: 'w', down: 's', jump: 'Space',
  attack: 'j', smash: 'i', special: 'k', shield: 'l',
};
export const CONTROL_LABELS = {
  left: 'Move / side attack left', right: 'Move / side attack right',
  up: 'Up / up attack', down: 'Down / down attack', jump: 'Jump / triple jump',
  attack: 'Jab combo', smash: 'Smash attack', special: 'Special / Final Smash', shield: 'Shield',
};
