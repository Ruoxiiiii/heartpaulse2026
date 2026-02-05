/* =========================================================
   CLOUDS - Cloud particle system

   Visual mapping:
   - |valence| (0-1) -> cloud count (fewer = neutral, more = strong emotion)
   - arousal (0-1) -> movement intensity & shape distortion
========================================================= */

function initSelfClouds() {
  selfClouds = [];
  for (let i = 0; i < 4; i++) {
    selfClouds.push(makeCloud(width * 0.50 + random(-40, 40), height * 0.52 + random(-30, 30)));
  }
}

function makeCloud(x, y) {
  return {
    x, y,
    baseR: random(135, 235),
    seed: random(10000),
    life: 1,
    targetLife: 1,
    morphAmp: 0.0,
    morphSpeed: 0.0,
    drift: 0.0,
    arousal: 0.2
  };
}

/**
 * Set cloud count based on |valence|
 * Low |valence| (neutral) = 1-2 clouds
 * High |valence| (strong emotion) = 6-8 clouds
 */
function setCloudMass(arr, absV, arousal) {
  // Valence controls count: neutral = few, strong emotion = many
  const minCount = 1;
  const maxCount = 8;
  const targetCount = floor(lerp(minCount, maxCount, pow(absV, 0.7)));

  // Organic cloud spawning - fade in new clouds
  while (arr.length < targetCount) {
    const ref = arr[0] || makeCloud(width * 0.5, height * 0.5);
    const spreadFactor = lerp(80, 220, arousal || 0.2);
    const newCloud = makeCloud(
      ref.x + random(-spreadFactor, spreadFactor),
      ref.y + random(-spreadFactor * 0.7, spreadFactor * 0.7)
    );
    newCloud.life = 0.01; // Start invisible
    newCloud.targetLife = 1;
    arr.push(newCloud);
  }

  // Mark excess clouds for fade out
  for (let i = 0; i < arr.length; i++) {
    if (i < targetCount) {
      arr[i].targetLife = 1;
    } else {
      arr[i].targetLife = 0;
    }
  }

  // Remove fully faded clouds
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i].life < 0.01 && arr[i].targetLife === 0) {
      arr.splice(i, 1);
    }
  }

  // Cloud size slightly influenced by valence intensity
  const rScale = lerp(0.95, 1.12, absV);
  for (let c of arr) {
    c.baseR = constrain(c.baseR * (0.998 + 0.004 * rScale), 100, 280);
  }
}

/**
 * Apply arousal-driven dynamics
 * Low arousal = calm, centered, smooth shapes
 * High arousal = spread out, fast movement, distorted shapes
 */
function applyCloudDynamicsNoShake(arr, arousalRaw, arousalVis, t, isSelf) {
  // Arousal controls intensity of all dynamics
  const amp = lerp(0.05, 1.60, arousalVis);      // Shape distortion
  const spd = lerp(0.08, 2.80, arousalVis);      // Animation speed
  const drift = lerp(0.003, 0.15, arousalVis);   // Position drift

  // Spread from center increases with arousal
  const spreadForce = lerp(0.0, 0.08, arousalVis);
  const centerX = width * 0.52;
  const centerY = height * 0.52;

  for (let c of arr) {
    // Store arousal for use in drawClouds
    c.arousal = arousalRaw;
    c.morphAmp = amp;
    c.morphSpeed = spd;
    c.drift = drift;

    // Organic life transitions
    c.life = lerp(c.life, c.targetLife, 0.04);

    // Movement noise - faster and more erratic at high arousal
    const noiseScale = lerp(0.08, 0.20, arousalVis);
    const nx = (noise(c.seed + t * noiseScale * spd, c.y * 0.003) - 0.5);
    const ny = (noise(3000 + c.seed + t * noiseScale * spd, c.x * 0.003) - 0.5);

    const scale = isSelf ? 1.0 : 0.92;

    // Base drift movement
    c.x += nx * drift * 1.2 * scale;
    c.y += ny * drift * scale;

    // High arousal pushes clouds outward from center
    if (arousalRaw > 0.4) {
      const dx = c.x - centerX;
      const dy = c.y - centerY;
      const dist = max(1, sqrt(dx * dx + dy * dy));
      c.x += (dx / dist) * spreadForce * scale;
      c.y += (dy / dist) * spreadForce * 0.8 * scale;
    }

    // Low arousal gently pulls clouds toward center
    if (arousalRaw < 0.35) {
      const pullStrength = lerp(0.012, 0.004, arousalRaw / 0.35);
      c.x = lerp(c.x, centerX, pullStrength);
      c.y = lerp(c.y, centerY, pullStrength);
    }

    // Add subtle breathing motion
    const breathe = sin(t * 0.5 + c.seed) * lerp(0.5, 2.5, arousalVis);
    c.x += breathe * 0.3;
    c.y += breathe * 0.2;
  }
}

/**
 * Draw clouds with arousal-responsive distortion
 */
function drawClouds(arr, col, alpha, t) {
  for (let c of arr) {
    if (c.life < 0.02) continue;

    const arousal = c.arousal || 0.2;
    const a = alpha * c.life;

    // More points for smoother curves
    const n = floor(lerp(16, 24, pow(arousal, 0.6)));

    // Precompute curve points with arousal-driven distortion
    const pts = [];
    for (let i = 0; i < n; i++) {
      const ang = (TWO_PI * i) / n;

      // Continuous noise sampling around the circle
      const wobbleSpeed = lerp(0.10, 0.32, arousal);
      const wobble = noise(
        c.seed + cos(ang) * 2,
        c.seed * 0.5 + sin(ang) * 2,
        t * wobbleSpeed * c.morphSpeed
      );

      const baseShape = lerp(0.82, 0.65, arousal);
      const distortRange = lerp(0.40, 1.0, arousal);
      const rr = c.baseR * (baseShape + distortRange * wobble * (0.80 + c.morphAmp));

      pts.push({
        x: c.x + cos(ang) * rr,
        y: c.y + sin(ang) * rr
      });
    }

    // Clean solid fill
    fill(col.h, col.s, col.b, a);
    _cloudCurve(pts, c.x, c.y, n, 1.0);
  }
}

// Closed Catmull-Rom curve with proper seamless closure
function _cloudCurve(pts, cx, cy, n, sc) {
  // Helper to get point with wrapping index
  const getX = i => cx + (pts[((i % n) + n) % n].x - cx) * sc;
  const getY = i => cy + (pts[((i % n) + n) % n].y - cy) * sc;

  beginShape();
  // Wrap around: start from -2 to n+2 for smooth closure
  for (let i = -2; i <= n + 2; i++) {
    curveVertex(getX(i), getY(i));
  }
  endShape();
}
