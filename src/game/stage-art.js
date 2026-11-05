// Loads the static SVG background for each stage and draws stage-specific
// animated lighting on the canvas. The renderer calls these helpers so
// backdrop artwork can be reused instead of rebuilt every frame.
import { ARENA } from '../config.js';

export function loadStageBackgrounds(stages) {
  return new Map(stages.map((stage) => {
    const image = new Image();
    image.onerror = () => console.error('Unable to load stage background:', stage.background);
    image.src = stage.background;
    return [stage.id, image];
  }));
}

export function drawStageBackground(context, stage, backgroundImages) {
  const image = backgroundImages.get(stage.id);
  if (image?.complete && image.naturalWidth > 0) {
    context.drawImage(image, 0, 0, ARENA.width, ARENA.height);
    return;
  }

  // Keep the arena visible while its image loads or if an asset is missing.
  context.fillStyle = stage.sky[1];
  context.fillRect(0, 0, ARENA.width, ARENA.height);
}

export function drawSpotlights(context, time) {
  for (let lightIndex = 0; lightIndex < 3; lightIndex++) {
    const x = 180 + lightIndex * 300 + Math.sin(time * 0.7 + lightIndex) * 25;
    const beam = context.createLinearGradient(x, 80, x + 70, 420);
    beam.addColorStop(0, '#d5f7ff15');
    beam.addColorStop(1, '#d5f7ff00');
    context.fillStyle = beam;
    context.beginPath();
    context.moveTo(x - 15, 65);
    context.lineTo(x + 22, 65);
    context.lineTo(x + 110, 420);
    context.lineTo(x - 170, 420);
    context.fill();
  }
}
