// Authoritative game rules and frame-by-frame state updates: fighter movement,
// attacks, damage and knockback, platforms and ledges, Smash Ball effects,
// respawns, and match outcomes. It updates runtime data without drawing UI.
import { ARENA, COLORS, COMBAT, LEDGE, PHYSICS, SPAWN_PLATFORM, STAGES } from '../config.js';

export function createGameSimulation(runtime, emptyInput) {
function createFighter(player, index, playerCount) {
  const duck = runtime.ducks.find((candidate) => candidate.id === player.duckId);
  return {
    id: player.id,
    slot: player.slot,
    name: player.name,
    duckId: player.duckId,
    color: player.color,
    x: 190 + index * (580 / Math.max(1, playerCount - 1)),
    y: SPAWN_PLATFORM.startY - 38,
    vx: 0,
    vy: 0,
    damage: 0,
    stocks: 3,
    focus: 0,
    guard: 100,
    facing: index % 2 ? -1 : 1,
    grounded: true,
    attackCooldown: 0,
    specialCooldown: 0,
    respawn: 0,
    spawnPlatformY: SPAWN_PLATFORM.startY,
    spawnPlatformTimer: SPAWN_PLATFORM.duration,
    invuln: SPAWN_PLATFORM.invulnerability,
    eliminated: false,
    ultimateReady: false,
    attackTimer: 0,
    attackDuration: 1,
    attackType: '',
    attackWarmup: 0,
    attackActiveTimer: 0,
    attackHitIds: [],
    attackHitSmashBall: false,
    attackLungeApplied: false,
    ledgeGrabbed: false,
    ledgeSide: 0,
    ledgeRegrabCooldown: 0,
    attackHeld: false,
    smashHeld: false,
    specialHeld: false,
    comboStep: 0,
    comboWindow: 0,
    walkPhase: 0,
    landSquash: 0,
    jumpCount: 0,
    jumpPose: 0,
    jumpStyle: 0,
    hitstun: 0,
    flash: 0,
    stats: {
      strength: Number(duck?.stats.strength) || 0,
      health: Number(duck?.stats.health) || 0,
      focus: Number(duck?.stats.focus) || 0,
    },
  };
}
function createMatch(activePlayers, stageId) {
  const inputs = Object.fromEntries(activePlayers.map((player) => [player.id, emptyInput()]));
  return {
    active: true,
    stageId,
    entities: activePlayers.map((player, index) => createFighter(player, index, activePlayers.length)),
    inputs,
    projectiles: [],
    smashBall: null,
    smashSpawnIn: 900,
    cinematic: null,
    winnerId: null,
    finished: false,
    particles: [],
    shake: 0,
  };
}

function removeDisconnectedFighter(playerId) {
  const fighter = runtime.game.entities.find((candidate) => candidate.id === playerId);
  if (fighter) {
    fighter.stocks = 0;
    fighter.eliminated = true;
  }
  runtime.game.inputs[playerId] = emptyInput();
}

function spawnParticles(x,y,color,count=9) {
    for(let i=0;i<count;i++) {
      const angle=Math.random()*Math.PI*2,speed=1+Math.random()*5;runtime.game.particles.push( {
        x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-1,life:24+Math.random()*16,max:40,color,size:2+Math.random()*4
      })
    }
}
  
function applyHit(attacker,target,power,special=false,vertical='') {
  const resistance = 1 - Math.min(0.42, target.stats.health * 0.03);
  if (target.guard > 0 && runtime.game.inputs[target.id]?.shield) {
    applyGuardHit(attacker, target, special);
    return;
  }

  const damage = power + attacker.stats.strength * (special ? 0.65 : 0.38);
  target.damage += damage;
  const knockback = Math.min(COMBAT.maxKnockback, COMBAT.baseKnockback
    + damage * COMBAT.attackDamageKnockback
    + target.damage * COMBAT.damagePercentKnockback);

  target.vx = (vertical
    ? attacker.facing * 2
    : attacker.facing * knockback) * resistance;
  target.vy = getHitLaunchVelocity(vertical, knockback) * resistance;
  target.hitstun = 14 + Math.min(30, target.damage * 0.22);
  target.invuln = 11;
  target.flash = 14;
  attacker.focus = Math.min(100, attacker.focus + 7 + attacker.stats.focus * 0.24);
  if (target.ledgeGrabbed) releaseFighterFromLedge(target);
  spawnParticles(target.x, target.y, special ? '#ffcf5d' : '#fff3c4', special ? 20 : 13);
  runtime.game.shake = Math.max(runtime.game.shake, special ? 13 : 6);
}

function getHitLaunchVelocity(vertical, knockback) {
  if (vertical === 'up') {
    return -10 - Math.min(
      COMBAT.maxUpwardLaunchBonus,
      knockback * COMBAT.upwardLaunchScale,
    );
  }
  if (vertical === 'down') {
    return 5 + Math.min(
      COMBAT.maxDownwardLaunchBonus,
      knockback * COMBAT.downwardLaunchScale,
    );
  }
  return -4 - Math.min(
    COMBAT.maxHorizontalLaunchBonus,
    knockback * COMBAT.horizontalLaunchScale,
  );
}

function applyGuardHit(attacker, target, special) {
  target.guard = Math.max(0, target.guard - (special ? 35 : 24));
  target.vx = attacker.facing * (special ? 2.5 : 1.2);
  target.vy = special ? -2 : 0;
  target.flash = 5;
  spawnParticles(target.x, target.y, '#9be9ff', 8);
  if (target.guard !== 0) return;

  target.hitstun = 48;
  runtime.game.shake = 9;
  if (!target.ledgeGrabbed) return;
  releaseFighterFromLedge(target);
  target.vx = attacker.facing * 3.2;
  target.vy = -2;
}
  
function hitSmashBall(attacker,type,range) {
    const ball=runtime.game.smashBall;if(!ball||attacker.ultimateReady||attacker.attackHitSmashBall)return false;const dx=ball.x-attacker.x,dy=ball.y-attacker.y,vertical=type.includes('up')?'up':type.includes('down')?'down':'';const hit=type==='projectile'?Math.abs(dx)<range+ball.radius&&Math.abs(dy)<range+ball.radius:vertical==='up'?Math.abs(dx)<range&&dy>-145&&dy<50:vertical==='down'?Math.abs(dx)<range&&dy>-35&&dy<115:dx*attacker.facing>0&&Math.abs(dx)<range&&Math.abs(dy)<80;if(!hit)return false;attacker.attackHitSmashBall=true;ball.hp--;spawnParticles(ball.x,ball.y,ball.color,11);runtime.game.shake=Math.max(runtime.game.shake,4);if(ball.hp<=0) {
      runtime.game.smashBall=null;runtime.game.smashSpawnIn=720;attacker.ultimateReady=true;runtime.pendingGameEvents.push({ type: 'smash-ball-claimed', playerName: attacker.name })
    }
    return true
  }
  
function hitWithMove(attacker,type,power,range) {
  const attackRange = range;
  const vertical = type.includes('up') ? 'up' : type.includes('down') ? 'down' : '';
  hitSmashBall(attacker, type, attackRange);

  for (const target of runtime.game.entities) {
    if (target.id === attacker.id || attacker.attackHitIds.includes(target.id)) continue;
    if (target.eliminated || target.respawn > 0 || target.invuln > 0) continue;
    if (!isTargetInsideAttack(attacker, target, vertical, attackRange)) continue;

    attacker.attackHitIds.push(target.id);
    applyHit(attacker, target, power, false, vertical);
  }
}

function isTargetInsideAttack(attacker, target, vertical, range) {
  // Center the collision area on the visible swing instead of the duck's center.
  const attackOriginX = attacker.x + (vertical ? 0 : attacker.facing * COMBAT.attackOriginOffset);
  const attackOriginY = attacker.y + COMBAT.attackOriginYOffset;
  const distanceX = target.x - attackOriginX;
  const distanceY = target.y - attackOriginY;
  const withinReach = Math.abs(distanceX) < range + COMBAT.targetHalfWidth;

  if (vertical === 'up') {
    return withinReach
      && distanceY > COMBAT.upHitTop - COMBAT.targetHalfHeight
      && distanceY < COMBAT.upHitBottom + COMBAT.targetHalfHeight;
  }
  if (vertical === 'down') {
    return withinReach
      && distanceY > COMBAT.downHitTop - COMBAT.targetHalfHeight
      && distanceY < COMBAT.downHitBottom + COMBAT.targetHalfHeight;
  }

  const distanceInFront = distanceX * attacker.facing;
  return distanceInFront > -COMBAT.attackOriginOffset - COMBAT.targetHalfWidth
    && distanceInFront < range + COMBAT.targetHalfWidth
    && Math.abs(distanceY) < COMBAT.jabHitHeight + COMBAT.targetHalfHeight;
}
  
function beginFinalSmash(fighter) {
    fighter.ultimateReady=false;fighter.attackType='final-smash';fighter.attackTimer=220;fighter.attackDuration=220;runtime.game.cinematic= {
      ownerId:fighter.id,timer:0,phase:'intro',hitDone:false,impactX:Math.max(20,Math.min(940,fighter.x+fighter.facing*900)),impactY:fighter.y-10,facing:fighter.facing
    };runtime.game.shake=5
  }
  
function updateCinematic(deltaTime) {
  const cutscene = runtime.game.cinematic;
  if (!cutscene) return;

  cutscene.timer += deltaTime;
  cutscene.phase = cutscene.timer < 26 ? 'intro' : cutscene.timer < 112 ? 'reveal' : cutscene.timer < 160 ? 'impact' : 'aftermath';
  const owner = runtime.game.entities.find((fighter) => fighter.id === cutscene.ownerId);
  if (cutscene.timer >= 112 && !cutscene.hitDone && owner) {
    cutscene.hitDone = true;
    cutscene.phase = 'impact';
    runtime.game.shake = 28;
    const originX = owner.x;
    const originY = owner.y - 10;
    const directionX = cutscene.facing * ARENA.width;
    const beamLength = Math.abs(directionX);

    for (const target of runtime.game.entities) {
      if (target.id === owner.id || target.eliminated || target.respawn > 0 || target.invuln > 0) continue;
      const relativeX = target.x - originX;
      const relativeY = target.y - originY;
      const distanceAlongBeam = relativeX * cutscene.facing;
      const distanceFromBeam = Math.abs(relativeY);
      if (distanceAlongBeam < 0 || distanceAlongBeam > beamLength + 35 || distanceFromBeam > 82) continue;

      const resistance = 1 - Math.min(0.35, target.stats.health * 0.02);
      target.damage += 52 + Math.min(24, owner.stats.strength * 0.8);
      target.vx = cutscene.facing * (17 + Math.min(7, owner.stats.strength * 0.25)) * resistance;
      target.vy = -3;
      target.hitstun = 100;
      target.invuln = 8;
      target.guard = 0;
      target.flash = 22;
      spawnParticles(target.x, target.y, '#fff1a3', 34);
    }

    for (let index = 0; index < 12; index++) {
      spawnParticles(originX + directionX * (index / 11), originY, '#fff1a3', 3);
    }
    runtime.game.particles.push({ x: cutscene.impactX, y: cutscene.impactY, vx: 0, vy: 0, life: 30, max: 30, color: '#ffffff', size: 34 });
    spawnParticles(originX, originY, '#fff1a3', 30);
  }

  if (cutscene.timer >= 220) {
    runtime.game.cinematic = null;
    if (owner) {
      owner.invuln = 100;
      owner.attackType = '';
      owner.attackTimer = 0;
    }
  }
  updateParticles(deltaTime);
  runtime.game.shake = Math.max(0, runtime.game.shake - 0.42);
}
function updateParticles(deltaTime) {
  for (const particle of runtime.game.particles) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.16;
    particle.vx *= 0.97;
    particle.life -= deltaTime;
  }
  runtime.game.particles = runtime.game.particles.filter((particle) => particle.life > 0);
}

function updateSmashBall(deltaTime) {
  if (runtime.game.smashBall) {
    const ball = runtime.game.smashBall;
    ball.phase += 0.035 * deltaTime;
    ball.life -= deltaTime;
    ball.x = ball.baseX + Math.sin(ball.phase) * 92;
    ball.y = ball.baseY + Math.sin(ball.phase * 1.7) * 26;
    if (ball.life <= 0) {
      runtime.game.smashBall = null;
      runtime.game.smashSpawnIn = 540;
    }
    return;
  }
  runtime.game.smashSpawnIn -= deltaTime;
  if (runtime.game.smashSpawnIn > 0) return;
  const baseX = 340 + Math.random() * 280;
  runtime.game.smashBall = { x: baseX, y: 210, baseX, baseY: 210, phase: 0, life: 600, hp: 6, maxHp: 6, radius: 24, color: '#ffd85b' };
  runtime.pendingGameEvents.push({ type: 'smash-ball-spawned' });
  spawnParticles(baseX, 210, '#ffd85b', 20);
}

function updateGameSimulation(deltaTime) {
  if (!runtime.isHost || !runtime.game.active || runtime.game.finished) return;
  if (runtime.game.cinematic) {
    updateCinematic(deltaTime);
    return;
  }
  updateSmashBall(deltaTime);
  for (const fighter of runtime.game.entities) updateFighter(fighter, deltaTime);
  updateProjectiles(deltaTime);
  updateParticles(deltaTime);
  runtime.game.shake = Math.max(0, runtime.game.shake - 0.55);
  checkForMatchWinner();
}
function updateFighter(fighter, deltaTime) {
  if (fighter.eliminated) return;
  if (fighter.respawn > 0) {
    updateFighterRespawn(fighter, deltaTime);
    return;
  }
  updateFighterTimers(fighter, deltaTime);
  const input = runtime.game.inputs[fighter.id] || emptyInput();
  updateFighterGuard(fighter, input, deltaTime);
  const pressed = getPressedAttackInputs(fighter, input);
  if (fighter.spawnPlatformTimer > 0) {
    updateFighterOnSpawnPlatform(fighter, input, deltaTime);
    return;
  }
  if (fighter.ledgeGrabbed) {
    updateFighterOnLedge(fighter, input, pressed);
    return;
  }
  updateFighterMovementInput(fighter, input, deltaTime);
  handleFighterAttacks(fighter, input, pressed, deltaTime);
  useFighterSpecial(fighter, pressed.specialPressed);
  advanceFighterPhysics(fighter, deltaTime);
}
function updateFighterOnSpawnPlatform(fighter, input, deltaTime) {
  const jumpPressed = input.jump && !fighter.jumpHeld;
  fighter.jumpHeld = !!input.jump;
  fighter.vx = 0;

  if (jumpPressed) {
    fighter.spawnPlatformTimer = 0;
    fighter.grounded = false;
    fighter.jumpCount = 1;
    fighter.jumpStyle = 1;
    fighter.jumpPose = 18;
    fighter.vy = SPAWN_PLATFORM.jumpVelocity;
    return;
  }

  fighter.spawnPlatformTimer = Math.max(0, fighter.spawnPlatformTimer - deltaTime);
  fighter.spawnPlatformY += SPAWN_PLATFORM.fallSpeed * deltaTime;
  fighter.y = fighter.spawnPlatformY - 38;
  fighter.vy = 0;
  fighter.grounded = fighter.spawnPlatformTimer > 0;
}
function updateFighterRespawn(fighter, deltaTime) {
  fighter.respawn -= deltaTime;
  if (fighter.respawn > 0 || fighter.stocks <= 0) return;
  fighter.x = 170 + (fighter.slot - 1) * 205;
  fighter.spawnPlatformY = SPAWN_PLATFORM.startY;
  fighter.y = fighter.spawnPlatformY - 38;
  fighter.vx = 0;
  fighter.vy = 0;
  fighter.grounded = true;
  fighter.spawnPlatformTimer = SPAWN_PLATFORM.duration;
  fighter.ledgeGrabbed = false;
  fighter.ledgeSide = 0;
  fighter.damage = 0;
  fighter.jumpCount = 0;
  fighter.attackType = '';
  fighter.attackTimer = 0;
  fighter.attackWarmup = 0;
  fighter.attackActiveTimer = 0;
  fighter.invuln = SPAWN_PLATFORM.invulnerability;
  fighter.guard = 100;
  fighter.landSquash = 8;
  fighter.jumpHeld = !!runtime.game.inputs[fighter.id]?.jump;
  spawnParticles(fighter.x, fighter.y, fighter.color, 18);
}
function updateFighterTimers(fighter, deltaTime) {
  for (const timer of ['invuln', 'attackCooldown', 'specialCooldown', 'hitstun', 'flash', 'comboWindow', 'ledgeRegrabCooldown']) {
    if (fighter[timer] > 0) fighter[timer] -= deltaTime;
  }
}
function updateFighterGuard(fighter, input, deltaTime) {
  fighter.guarding = !!input.shield;
  if (input.shield) fighter.guard = Math.max(0, fighter.guard - 0.17 * deltaTime);
  else fighter.guard = Math.min(100, fighter.guard + 0.1 * deltaTime);
}
function getPressedAttackInputs(fighter, input) {
  const pressed = {
    jabPressed: input.attack && !fighter.attackHeld,
    smashPressed: input.smash && !fighter.smashHeld,
    specialPressed: input.special && !fighter.specialHeld,
  };
  fighter.attackHeld = !!input.attack;
  fighter.smashHeld = !!input.smash;
  fighter.specialHeld = !!input.special;
  return pressed;
}
function updateFighterMovementInput(fighter, input, deltaTime) {
  if (fighter.hitstun > 0) {
    fighter.vx *= 0.985;
    return;
  }
  const direction = Number(input.right) - Number(input.left);
  const speed = PHYSICS.baseRunSpeed + Math.min(PHYSICS.focusRunBonus, fighter.stats.focus / 30);
  const acceleration = fighter.grounded ? PHYSICS.groundAcceleration : PHYSICS.airAcceleration;
  if (direction !== 0) {
    fighter.vx += (direction * speed - fighter.vx) * acceleration * deltaTime;
  } else {
    const friction = fighter.grounded ? PHYSICS.groundFriction : PHYSICS.airFriction;
    fighter.vx *= Math.pow(friction, deltaTime);
  }
  if (input.left) fighter.facing = -1;
  if (input.right) fighter.facing = 1;
  const jumpPressed = input.jump && !fighter.jumpHeld;
  fighter.jumpHeld = !!input.jump;
  if (fighter.grounded) fighter.jumpCount = 0;
  if (jumpPressed && (fighter.grounded || fighter.jumpCount < PHYSICS.maxJumps)) performFighterJump(fighter);
  if (input.down && !fighter.grounded) fighter.vy += PHYSICS.fallControl * deltaTime;
}
function performFighterJump(fighter) {
  fighter.jumpCount += 1;
  fighter.jumpStyle = fighter.jumpCount;
  fighter.jumpPose = fighter.jumpCount === 3 ? 28 : 18;
  fighter.vy = PHYSICS.jumpVelocities[fighter.jumpCount];
  fighter.grounded = false;
  const duck = runtime.ducks.find((candidate) => candidate.id === fighter.duckId);
  const featherColor = COLORS[duck?.colors.head] || fighter.color;
  spawnParticles(fighter.x, fighter.y + 24, featherColor, fighter.jumpCount === 3 ? 22 : 12);
  if (fighter.jumpCount === 3) runtime.game.shake = Math.max(runtime.game.shake, 4);
}
function startAttack(fighter, attackType, duration, warmup, cooldown) {
  fighter.attackType = attackType;
  fighter.attackTimer = duration;
  fighter.attackDuration = duration;
  fighter.attackWarmup = warmup;
  fighter.attackActiveTimer = 0;
  fighter.attackHitIds = [];
  fighter.attackHitSmashBall = false;
  fighter.attackLungeApplied = false;
  fighter.attackCooldown = cooldown;
  const lunge = attackType.startsWith('smash') ? COMBAT.smashLunge : COMBAT.jabLunge;
  fighter.vx += fighter.facing * lunge;
}
function handleFighterAttacks(fighter, input, pressed, deltaTime) {
  if (fighter.hitstun <= 0 && fighter.attackCooldown <= 0 && pressed.smashPressed) {
    startAttack(fighter, input.up ? 'smash-up' : input.down ? 'smash-down' : 'smash-forward', 31, 8, 40);
    fighter.comboWindow = 0;
  } else if (fighter.hitstun <= 0 && fighter.attackCooldown <= 0 && pressed.jabPressed) {
    fighter.comboStep = fighter.comboWindow > 0 ? fighter.comboStep % 3 + 1 : 1;
    fighter.comboWindow = 42;
    const attackType = input.up ? 'jab-up' : input.down ? 'jab-down' : 'jab-' + fighter.comboStep;
    startAttack(fighter, attackType, 14, 2, [16, 18, 26][fighter.comboStep - 1]);
  }
  if (fighter.attackWarmup > 0) {
    fighter.attackWarmup -= deltaTime;
    if (fighter.attackWarmup <= 0) fighter.attackActiveTimer = COMBAT.activeFrames;
  }
  if (fighter.attackActiveTimer > 0) {
    if (fighter.attackType.startsWith('smash') && !fighter.attackLungeApplied) {
      fighter.vx += fighter.facing * COMBAT.smashActiveLunge;
      fighter.attackLungeApplied = true;
    }
    resolveFighterAttack(fighter);
    fighter.attackActiveTimer = Math.max(0, fighter.attackActiveTimer - deltaTime);
  }
  if (fighter.attackTimer > 0) fighter.attackTimer = Math.max(0, fighter.attackTimer - deltaTime);
  else fighter.attackType = '';
}
function resolveFighterAttack(fighter) {
  if (fighter.attackType.startsWith('smash')) {
    hitWithMove(fighter, fighter.attackType, 10, COMBAT.smashRange);
    runtime.game.shake = Math.max(runtime.game.shake, 8);
    return;
  }
  hitWithMove(fighter, fighter.attackType, [0, 4, 5, 7][fighter.comboStep] || 5, COMBAT.jabRange);
}
function useFighterSpecial(fighter, specialPressed) {
  if (!specialPressed || fighter.hitstun > 0) return;
  if (fighter.ultimateReady) {
    beginFinalSmash(fighter);
    return;
  }
  if (fighter.specialCooldown > 0 || fighter.focus < 35) return;
  fighter.focus -= 35;
  fighter.specialCooldown = 78;
  fighter.attackType = 'special';
  fighter.attackTimer = 18;
  fighter.attackDuration = 18;
  const duck = runtime.ducks.find((candidate) => candidate.id === fighter.duckId);
  const color = COLORS[duck?.colors.head] || '#ffd05c';
  runtime.game.projectiles.push({ ownerId: fighter.id, x: fighter.x + fighter.facing * 46, y: fighter.y - 12, vx: fighter.facing * 8.5, life: 78, radius: 15, color, power: 9 });
  spawnParticles(fighter.x + fighter.facing * 44, fighter.y - 12, color, 8);
}
function advanceFighterPhysics(fighter, deltaTime) {
  const previousY = fighter.y;
  const wasGrounded = fighter.grounded;
  fighter.vy += PHYSICS.gravity * deltaTime;
  fighter.x += fighter.vx * deltaTime;
  fighter.y += fighter.vy * deltaTime;
  fighter.grounded = false;
  const stage = STAGES.find((candidate) => candidate.id === runtime.game.stageId) || STAGES[0];
  for (const platform of stage.platforms) landOnPlatform(fighter, platform, previousY, wasGrounded);
  landOnMainStage(fighter, previousY, wasGrounded);
  if (!fighter.grounded) tryGrabLedge(fighter, stage);
  updateFighterAnimationTimers(fighter, deltaTime);
  handleFighterRingOut(fighter);
  fighter.x = Math.max(-90, Math.min(1050, fighter.x));
}
function tryGrabLedge(fighter, stage) {
  if (fighter.vy < 0 || fighter.hitstun > 0 || fighter.ledgeRegrabCooldown > 0) return;
  const ledges = stage.platforms.map((platform) => ({
    left: platform.x,
    right: platform.x + platform.w,
    top: platform.y,
  }));
  ledges.push({
    left: ARENA.playableLeft,
    right: ARENA.playableRight,
    top: ARENA.floorY,
  });

  const nearbyLedge = ledges.find((ledge) => {
    const nearVerticalEdge = fighter.y >= ledge.top - LEDGE.catchAboveTop
      && fighter.y <= ledge.top + LEDGE.catchBelowTop;
    const nearLeftEdge = fighter.x >= ledge.left - LEDGE.catchDistance
      && fighter.x <= ledge.left;
    const nearRightEdge = fighter.x >= ledge.right
      && fighter.x <= ledge.right + LEDGE.catchDistance;
    const side = nearLeftEdge ? -1 : 1;
    return nearVerticalEdge
      && (nearLeftEdge || nearRightEdge)
      && !isLedgeOccupied(ledge, side);
  });
  if (!nearbyLedge) return;

  const side = fighter.x < nearbyLedge.left ? -1 : 1;
  fighter.ledgeGrabbed = true;
  fighter.ledgeSide = side;
  fighter.x = side < 0
    ? nearbyLedge.left - LEDGE.hangOffsetX
    : nearbyLedge.right + LEDGE.hangOffsetX;
  fighter.y = nearbyLedge.top + LEDGE.hangOffsetY;
  fighter.vx = 0;
  fighter.vy = 0;
  fighter.facing = -side;
  fighter.attackType = '';
  fighter.attackWarmup = 0;
  fighter.attackActiveTimer = 0;
  fighter.jumpPose = 0;
  fighter.landSquash = 0;
  spawnParticles(fighter.x, fighter.y - 20, fighter.color, 8);
}
function isLedgeOccupied(ledge, side) {
  const ledgeX = side < 0
    ? ledge.left - LEDGE.hangOffsetX
    : ledge.right + LEDGE.hangOffsetX;
  return runtime.game.entities.some((otherFighter) => {
    if (!otherFighter.ledgeGrabbed || otherFighter.ledgeSide !== side) return false;
    const sameEdge = Math.abs(otherFighter.y - (ledge.top + LEDGE.hangOffsetY)) < 2;
    return sameEdge && Math.abs(otherFighter.x - ledgeX) < LEDGE.hangOffsetX;
  });
}
function updateFighterOnLedge(fighter, input, pressed) {
  const side = fighter.ledgeSide;
  fighter.x = Math.round(fighter.x);
  fighter.vx = 0;
  fighter.vy = 0;
  const jumpPressed = input.jump && !fighter.jumpHeld;
  fighter.jumpHeld = !!input.jump;
  if (jumpPressed) {
    releaseFighterFromLedge(fighter);
    fighter.jumpCount = 1;
    fighter.jumpStyle = 1;
    fighter.jumpPose = 18;
    fighter.vy = LEDGE.recoverySpeed;
    fighter.vx = -side * LEDGE.recoveryInwardSpeed;
    fighter.invuln = Math.max(fighter.invuln, LEDGE.releaseInvulnerability);
    return;
  }
  if (pressed.jabPressed || pressed.smashPressed) {
    releaseFighterFromLedge(fighter);
    startAttack(fighter, pressed.smashPressed ? 'smash-forward' : 'jab-1', 18, 2, 24);
    fighter.vy = -3;
    fighter.vx = -side * LEDGE.recoveryInwardSpeed;
    return;
  }
  const movingAway = side < 0 ? input.left : input.right;
  if (input.down || movingAway) dropFighterFromLedge(fighter);
}
function releaseFighterFromLedge(fighter) {
  fighter.ledgeGrabbed = false;
  fighter.ledgeSide = 0;
  fighter.ledgeRegrabCooldown = LEDGE.regrabDelay;
  fighter.grounded = false;
}
function dropFighterFromLedge(fighter) {
  const side = fighter.ledgeSide;
  releaseFighterFromLedge(fighter);
  fighter.vx = side * 2.2;
  fighter.vy = LEDGE.dropSpeed;
}
function landOnPlatform(fighter, platform, previousY, wasGrounded) {
  const crossesPlatform = fighter.vy >= 0 && previousY + 38 <= platform.y && fighter.y + 38 >= platform.y;
  const overlapsPlatform = fighter.x > platform.x - 20 && fighter.x < platform.x + platform.w + 20;
  if (!crossesPlatform || !overlapsPlatform) return;
  if (!wasGrounded) {
    fighter.landSquash = 7;
    spawnParticles(fighter.x, fighter.y + 34, fighter.color, 7);
  }
  fighter.y = platform.y - 38;
  fighter.vy = 0;
  fighter.grounded = true;
}
function landOnMainStage(fighter, previousY, wasGrounded) {
  if (fighter.y + 38 < ARENA.floorY || fighter.x <= ARENA.playableLeft || fighter.x >= ARENA.playableRight) return;
  if (!wasGrounded) {
    fighter.landSquash = 8;
    spawnParticles(fighter.x, fighter.y + 34, fighter.color, 9);
  }
  fighter.y = ARENA.floorY - 38;
  fighter.vy = 0;
  fighter.grounded = true;
}
function updateFighterAnimationTimers(fighter, deltaTime) {
  if (fighter.grounded) fighter.jumpCount = 0;
  fighter.walkPhase = (fighter.walkPhase || 0) + Math.abs(fighter.vx) * 0.075;
  fighter.jumpPose = Math.max(0, (fighter.jumpPose || 0) - deltaTime);
  fighter.landSquash = Math.max(0, (fighter.landSquash || 0) - deltaTime);
}
function handleFighterRingOut(fighter) {
  if (fighter.y <= ARENA.blastY && fighter.x >= ARENA.blastLeft && fighter.x <= ARENA.blastRight) return;
  fighter.stocks -= 1;
  if (fighter.stocks <= 0) fighter.eliminated = true;
  else fighter.respawn = 55;
  fighter.x = Math.max(140, Math.min(820, fighter.x));
  fighter.y = 260;
  const particleX = Math.max(120, Math.min(840, fighter.x));
  spawnParticles(particleX, Math.min(500, fighter.y), '#ffbf57', 18);
}
function updateProjectiles(deltaTime) {
  for (const projectile of runtime.game.projectiles) {
    if (projectile.life <= 0) continue;
    projectile.x += projectile.vx;
    projectile.life -= deltaTime;
    const owner = runtime.game.entities.find((fighter) => fighter.id === projectile.ownerId);
    if (!owner) continue;
    if (hitSmashBall(owner, 'projectile', projectile.radius + 5)) {
      projectile.life = 0;
      continue;
    }
    for (const target of runtime.game.entities) {
      if (target.id === owner.id || target.eliminated || target.respawn > 0 || target.invuln > 0) continue;
      const overlapsX = Math.abs(target.x - projectile.x) < projectile.radius + COMBAT.projectileHitWidth;
      const overlapsY = Math.abs(target.y - projectile.y) < projectile.radius + COMBAT.projectileHitHeight;
      if (!overlapsX || !overlapsY) continue;
      applyHit(owner, target, projectile.power, true);
      spawnParticles(projectile.x, projectile.y, projectile.color, 16);
      projectile.life = 0;
      break;
    }
    if (projectile.x < 25 || projectile.x > 935) projectile.life = 0;
  }
  runtime.game.projectiles = runtime.game.projectiles.filter((projectile) => projectile.life > 0);
}
function checkForMatchWinner() {
  const remainingFighters = runtime.game.entities.filter((fighter) => !fighter.eliminated);
  if (remainingFighters.length > 1) return;
  runtime.game.smashBall = null;
  runtime.game.projectiles = [];
  runtime.game.finished = true;
  runtime.game.winnerId = remainingFighters[0]?.id || null;
  runtime.game.needsFinalSnapshot = true;
  runtime.matchResultRendered = false;
}

  return { createMatch, removeDisconnectedFighter, updateGameSimulation };
}
