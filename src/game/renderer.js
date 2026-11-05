// Canvas presentation layer for the live match. It reads the current runtime
// state and draws stage art, duck sprites and poses, combat effects, items,
// and overlays; game rules and networking are handled by separate modules.
import { ARENA, SPAWN_PLATFORM, STAGES } from '../config.js';
import { drawSpotlights, drawStageBackground } from './stage-art.js';

export function createBattleRenderer({ runtime, querySelector, backgroundImages, spriteCache }) {
  const renderImages = new Map();

  function drawBattle() {
    const canvas = querySelector('#arenaCanvas');
    const context = canvas.getContext('2d');
    const time = performance.now() / 1000;
    const stage = STAGES.find((candidate) => candidate.id === runtime.game.stageId) || STAGES[0];

    context.clearRect(0, 0, ARENA.width, ARENA.height);
    context.save();
    applyScreenShake(context, runtime.game.shake);

    // Keep scene layers ordered so the spotlights sit over the stage and under the fighters.
    drawStageBackground(context, stage, backgroundImages);
    drawSpotlights(context, time);
    drawSpawnPlatforms(context, runtime.game.entities);
    drawSmashBall(context, runtime.game.smashBall);
    drawProjectiles(context, runtime.game.projectiles);
    drawFighters(context, runtime.game.entities);
    drawParticles(context, runtime.game.particles);

    // The outer save/restore contains the shake transform and any canvas state changes.
    context.restore();
  }

  function applyScreenShake(context, shakeAmount) {
    if (shakeAmount <= 0) return;
    context.translate(
      (Math.random() - 0.5) * shakeAmount,
      (Math.random() - 0.5) * shakeAmount,
    );
  }

  function drawSmashBall(context, smashBall) {
    if (!smashBall) return;

    const bob = Math.sin(performance.now() / 110) * 5;
    const centerY = smashBall.y + bob;
    context.save();
    context.shadowColor = '#ffd94d';
    context.shadowBlur = 30;

    const aura = context.createRadialGradient(
      smashBall.x, centerY, 3,
      smashBall.x, centerY, 37,
    );
    aura.addColorStop(0, '#fffde8');
    aura.addColorStop(0.35, '#ffe274');
    aura.addColorStop(0.72, '#ff9e35');
    aura.addColorStop(1, '#ff8a2500');
    context.fillStyle = aura;
    context.beginPath();
    context.arc(smashBall.x, centerY, 38, 0, Math.PI * 2);
    context.fill();

    context.shadowBlur = 0;
    context.strokeStyle = '#fff3a7';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(smashBall.x, centerY, 19, 0, Math.PI * 2);
    context.stroke();
    drawSmashBallStar(context, smashBall.x, centerY);

    context.fillStyle = '#241c31';
    context.font = '900 10px system-ui,sans-serif';
    context.textAlign = 'center';
    context.fillText(String(smashBall.hp), smashBall.x, centerY + 3);
    context.restore();
  }

  function drawSmashBallStar(context, centerX, centerY) {
    context.fillStyle = '#fff9db';
    context.beginPath();
    for (let pointIndex = 0; pointIndex < 10; pointIndex++) {
      const angle = -Math.PI / 2 + pointIndex * Math.PI / 5;
      const radius = pointIndex % 2 ? 7 : 15;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      if (pointIndex === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.fill();
  }

  function drawProjectiles(context, projectiles = []) {
    for (const projectile of projectiles) drawProjectile(context, projectile);
  }

  function drawProjectile(context, projectile) {
    const glow = context.createRadialGradient(
      projectile.x - 4, projectile.y - 5, 2,
      projectile.x, projectile.y, projectile.radius + 5,
    );
    glow.addColorStop(0, '#fffde2');
    glow.addColorStop(0.25, projectile.color);
    glow.addColorStop(1, projectile.color + '00');

    context.save();
    context.strokeStyle = projectile.color;
    context.lineWidth = 4;
    context.shadowColor = projectile.color;
    context.shadowBlur = 22;
    context.beginPath();
    context.moveTo(projectile.x - projectile.vx * 3, projectile.y);
    context.lineTo(projectile.x, projectile.y);
    context.stroke();

    context.fillStyle = glow;
    context.beginPath();
    context.arc(projectile.x, projectile.y, projectile.radius + 5, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#fff9d9';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(projectile.x, projectile.y, projectile.radius * 0.58, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  function drawFighters(context, fighters) {
    for (const fighter of fighters) drawFighter(context, fighter);
  }

  function drawSpawnPlatforms(context, fighters) {
    for (const fighter of fighters) {
      if (fighter.eliminated || fighter.respawn > 0 || fighter.spawnPlatformTimer <= 0) continue;
      const platformTop = fighter.y + 38;
      context.save();
      context.shadowColor = '#8beaff';
      context.shadowBlur = 18;
      context.fillStyle = '#183c58dd';
      context.fillRect(fighter.x - SPAWN_PLATFORM.width / 2, platformTop, SPAWN_PLATFORM.width, 12);
      context.fillStyle = '#c9f8ff';
      context.fillRect(fighter.x - SPAWN_PLATFORM.width / 2 + 7, platformTop, SPAWN_PLATFORM.width - 14, 3);
      context.restore();
    }
  }

  function drawFighter(context, fighter) {
    if (fighter.eliminated || fighter.respawn > 0) return;

    const duck = runtime.ducks.find((candidate) => candidate.id === fighter.duckId);
    const pose = getFighterPose(fighter);
    drawFighterShadow(context, fighter);
    drawSpawnProtection(context, fighter);
    if (fighter.guarding) drawGuardBubble(context, fighter);
    if (fighter.jumpStyle === 3 && fighter.jumpPose > 0) drawThirdJumpAura(context, fighter);
    if (fighter.flash > 0) drawHitFlash(context, fighter);
    drawFighterArtwork(context, fighter, duck, pose);
    drawAttackArc(context, fighter, pose.attackProgress, pose.lunge);
    drawSmashWindup(context, fighter);
    drawFighterLabel(context, fighter);
  }

  function drawSpawnProtection(context, fighter) {
    if (fighter.invuln <= 0) return;
    context.save();
    context.globalAlpha = 0.45 + Math.sin(performance.now() / 55) * 0.15;
    context.strokeStyle = '#9beaff';
    context.lineWidth = fighter.spawnPlatformTimer > 0 ? 3 : 2;
    context.setLineDash(fighter.spawnPlatformTimer > 0 ? [7, 5] : []);
    context.shadowColor = '#5ddcff';
    context.shadowBlur = 16;
    context.beginPath();
    context.ellipse(fighter.x, fighter.y, 48, 53, 0, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  function getFighterPose(fighter) {
    const attackProgress = fighter.attackDuration
      ? 1 - fighter.attackTimer / fighter.attackDuration
      : 0;
    const isAttacking = !!fighter.attackType;
    const pose = { attackProgress, ...getGroundPose(fighter), lunge: 0 };

    if (isAttacking) {
      Object.assign(pose, getAttackPose(fighter, attackProgress));
    } else if (fighter.jumpPose > 0) {
      Object.assign(pose, getJumpPose(fighter));
    } else if (!fighter.grounded && !fighter.ledgeGrabbed) {
      Object.assign(pose, getAirPose(fighter));
    } else if (fighter.ledgeGrabbed) {
      Object.assign(pose, getLedgePose(fighter));
    }

    if (fighter.hitstun > 0) Object.assign(pose, getHitstunPose());
    return applyLandingSquash(pose, fighter.landSquash);
  }

  function getGroundPose(fighter) {
    if (!fighter.grounded) return { bob: 0, tilt: 0, scaleX: 1, scaleY: 1 };
    const idleTime = performance.now() / 320 + fighter.slot;
    if (Math.abs(fighter.vx) > 0.4) {
      return {
        bob: Math.sin(fighter.walkPhase || 0) * Math.min(3, Math.abs(fighter.vx) * 0.6)
          - Math.abs(Math.sin(fighter.walkPhase * 2)) * 2,
        tilt: Math.sin(fighter.walkPhase * 2) * 0.055,
        scaleX: 1,
        scaleY: 1,
      };
    }
    return { bob: Math.sin(idleTime) * 1.8, tilt: 0, scaleX: 1, scaleY: 1 + Math.sin(idleTime) * 0.014 };
  }

  function getAirPose(fighter) {
    return {
      scaleX: 0.94,
      scaleY: fighter.vy > 0 ? 1.11 : 0.96,
      tilt: Math.max(-0.2, Math.min(0.2, fighter.vx * 0.018)),
    };
  }

  function getLedgePose(fighter) {
    return {
      bob: Math.sin(performance.now() / 110) * 2,
      tilt: fighter.ledgeSide * 0.18,
      scaleX: 0.94,
      scaleY: 1.06,
    };
  }

  function getHitstunPose() {
    return { tilt: -0.25, scaleX: 0.9, scaleY: 1.08 };
  }

  function applyLandingSquash(pose, landSquash) {
    if (landSquash <= 0) return pose;
    const squash = Math.min(0.16, landSquash * 0.018);
    return { ...pose, scaleX: pose.scaleX + squash, scaleY: pose.scaleY - squash };
  }

  function getAttackPose(fighter, progress) {
    if (fighter.attackType.startsWith('jab')) {
      return {
        lunge: Math.sin(Math.min(1, progress * 1.2) * Math.PI) * 11,
        tilt: 0.13 + Math.sin(progress * Math.PI) * 0.12,
        scaleX: 0.9,
        scaleY: 1.08,
      };
    }
    if (fighter.attackType.startsWith('smash')) {
      if (fighter.attackWarmup > 0) {
        return {
          lunge: -fighter.facing * 8,
          tilt: fighter.attackType.includes('down') ? -0.24 : 0.3,
          scaleX: 1.08,
          scaleY: 0.91,
        };
      }
      return {
        lunge: Math.sin(Math.min(1, progress * 1.35) * Math.PI) * 19,
        tilt: fighter.attackType.includes('up') ? -0.42 : fighter.attackType.includes('down') ? 0.5 : 0.2,
        scaleX: 0.82,
        scaleY: 1.17,
      };
    }
    if (fighter.attackType === 'special') {
      return { lunge: Math.sin(progress * Math.PI) * 9, tilt: -0.16, scaleX: 0.92, scaleY: 1.1 };
    }
    return { lunge: 0, tilt: 0, scaleX: 1, scaleY: 1 };
  }

  function getJumpPose(fighter) {
    const jumpDuration = fighter.jumpStyle === 3 ? 28 : 18;
    const progress = 1 - fighter.jumpPose / jumpDuration;
    if (fighter.jumpStyle === 3) {
      return { tilt: progress * Math.PI * 2, scaleX: 0.86, scaleY: 1.14 };
    }
    if (fighter.jumpStyle === 2) {
      return { tilt: Math.sin(progress * Math.PI) * 0.32, scaleX: 0.9, scaleY: 1.12 };
    }
    return { tilt: -0.12, scaleX: 0.84, scaleY: 1.2 };
  }

  function drawFighterShadow(context, fighter) {
    const shadowScale = Math.max(0.35, 1 - Math.max(0, 420 - fighter.y) * 0.002);
    context.fillStyle = '#07111a88';
    context.beginPath();
    context.ellipse(fighter.x, Math.min(420, fighter.y + 38), 35 * shadowScale, 7 * shadowScale, 0, 0, Math.PI * 2);
    context.fill();
  }

  function drawGuardBubble(context, fighter) {
    context.save();
    context.strokeStyle = '#78ddffdd';
    context.fillStyle = '#7adfff20';
    context.lineWidth = 4;
    context.shadowColor = '#65d8ff';
    context.shadowBlur = 18;
    context.beginPath();
    context.ellipse(fighter.x, fighter.y, 44, 53, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
  }

  function drawThirdJumpAura(context, fighter) {
    const pulse = performance.now();
    context.save();
    context.strokeStyle = '#ffe37b';
    context.shadowColor = '#ffcf55';
    context.shadowBlur = 18;
    context.lineWidth = 3;
    context.beginPath();
    context.ellipse(
      fighter.x,
      fighter.y,
      43 + Math.sin(pulse / 45) * 5,
      50 + Math.sin(pulse / 50) * 5,
      fighter.jumpPose * 0.05,
      0,
      Math.PI * 2,
    );
    context.stroke();
    context.restore();
  }

  function drawHitFlash(context, fighter) {
    context.save();
    context.globalAlpha = Math.min(0.75, fighter.flash / 14);
    context.fillStyle = '#fff5c7';
    context.beginPath();
    context.ellipse(fighter.x, fighter.y, 43, 48, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawFighterArtwork(context, fighter, duck, pose) {
    const spriteData = duck && spriteCache.get(duck.id);
    if (!spriteData) {
      drawFallbackDuck(context, fighter, pose);
      return;
    }

    // Reuse decoded sprite images; rebuilding an Image from its data URL every frame is costly.
    if (!renderImages.has(duck.id)) {
      const image = new Image();
      image.src = spriteData;
      renderImages.set(duck.id, image);
    }
    const image = renderImages.get(duck.id);
    if (!image.complete) return;

    if (fighter.jumpStyle >= 2 && fighter.jumpPose > 0) {
      drawJumpTrails(context, fighter, pose, image);
    }
    drawDuckSprite(context, fighter, pose, image);
  }

  function drawJumpTrails(context, fighter, pose, image) {
    const trailCount = fighter.jumpStyle === 3 ? 3 : 1;
    for (let trailIndex = trailCount; trailIndex > 0; trailIndex--) {
      context.save();
      context.globalAlpha = 0.11 * trailIndex;
      context.translate(
        fighter.x + pose.lunge * fighter.facing - fighter.facing * fighter.vx * trailIndex * 2,
        fighter.y + pose.bob + trailIndex * 8,
      );
      context.scale(fighter.facing, 1);
      context.rotate(pose.tilt - trailIndex * 0.12);
      context.scale(pose.scaleX, pose.scaleY);
      context.drawImage(image, -46, -47, 92, 86);
      context.restore();
    }
  }

  function drawDuckSprite(context, fighter, pose, image) {
    context.save();
    context.translate(fighter.x + pose.lunge * fighter.facing, fighter.y + pose.bob);
    // Mirroring the sprite also mirrors the swing pose to match the fighter's facing.
    context.scale(fighter.facing, 1);
    context.rotate(pose.tilt);
    context.scale(pose.scaleX, pose.scaleY);
    context.drawImage(image, -46, -47, 92, 86);
    context.restore();
  }

  function drawFallbackDuck(context, fighter, pose) {
    context.fillStyle = fighter.color;
    context.beginPath();
    context.ellipse(
      fighter.x + pose.lunge * fighter.facing,
      fighter.y,
      27 * pose.scaleX,
      30 * pose.scaleY,
      pose.tilt,
      0,
      Math.PI * 2,
    );
    context.fill();
  }

  function drawAttackArc(context, fighter, progress, lunge) {
    const hasSwing = fighter.attackType.startsWith('jab')
      || fighter.attackType.startsWith('smash')
      || fighter.attackType === 'special';
    if (!fighter.attackType || fighter.attackWarmup > 0 || progress <= 0.12 || progress >= 0.88 || !hasSwing) return;

    const sweep = (progress - 0.12) / 0.76;
    const arcCenterAngle = fighter.attackType.includes('up')
      ? -Math.PI / 2
      : fighter.attackType.includes('down')
        ? Math.PI / 2
        : 0;
    const isSpecial = fighter.attackType === 'special';
    context.save();
    context.translate(fighter.x + fighter.facing * (24 + lunge), fighter.y - 8);
    context.scale(fighter.facing, 1);
    context.globalAlpha = Math.sin(sweep * Math.PI) * 0.9;
    context.lineCap = 'round';
    context.strokeStyle = isSpecial ? '#ffe47b' : '#effaff';
    context.shadowColor = isSpecial ? '#ffae32' : '#77ddff';
    context.shadowBlur = isSpecial ? 24 : 17;
    context.lineWidth = fighter.attackType.startsWith('smash') ? 11 : 6;

    const arcStart = arcCenterAngle - 0.9 + sweep * 1.8;
    context.beginPath();
    context.arc(0, 0, 57, arcStart, arcStart + 0.9);
    context.stroke();
    context.globalAlpha *= 0.55;
    context.strokeStyle = '#fff';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(0, 0, 69, arcStart + 0.12, arcStart + 0.8);
    context.stroke();
    context.restore();
  }

  function drawSmashWindup(context, fighter) {
    if (!fighter.attackType.startsWith('smash') || fighter.attackWarmup <= 0) return;
    context.save();
    context.strokeStyle = '#fff0bdaa';
    context.lineWidth = 3;
    context.setLineDash([5, 6]);
    context.beginPath();
    context.arc(fighter.x + fighter.facing * 20, fighter.y - 4, 48, -0.8, 0.8);
    context.stroke();
    context.setLineDash([]);
    context.restore();
  }

  function drawFighterLabel(context, fighter) {
    context.fillStyle = '#f4f6ed';
    context.font = '900 13px system-ui,sans-serif';
    context.lineWidth = 3;
    context.strokeStyle = '#13212c';
    context.strokeText(fighter.name, fighter.x, fighter.y - 57);
    context.fillText(fighter.name, fighter.x, fighter.y - 57);
    context.fillStyle = fighter.color;
    context.beginPath();
    context.arc(fighter.x, fighter.y - 73, 11, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#fff';
    context.font = '900 11px system-ui,sans-serif';
    context.fillText(`P${fighter.slot}`, fighter.x, fighter.y - 69);
  }

  function drawParticles(context, particles = []) {
    for (const particle of particles) {
      const lifeRatio = particle.life / particle.max;
      context.globalAlpha = Math.max(0, lifeRatio);
      context.fillStyle = particle.color;
      context.shadowColor = particle.color;
      context.shadowBlur = 10;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size * Math.max(0.25, lifeRatio), 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    context.shadowBlur = 0;
  }

  return drawBattle;
}
