/* =========================================================
   CLOUDS - Cloud particle system
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
    morphAmp: 0.0,
    morphSpeed: 0.0,
    drift: 0.0
  };
}

function setCloudMass(arr, absV) {
  const targetCount = floor(lerp(3, 10, pow(absV, 0.85)));
  while (arr.length < targetCount) {
    const ref = arr[0] || makeCloud(width * 0.5, height * 0.5);
    arr.push(makeCloud(ref.x + random(-220, 220), ref.y + random(-160, 160)));
  }
  while (arr.length > targetCount) arr.pop();

  const rScale = lerp(0.98, 1.18, absV);
  for (let c of arr) {
    c.baseR = constrain(c.baseR * (0.996 + 0.010 * rScale), 95, 320);
  }
}

function applyCloudDynamicsNoShake(arr, arousalRaw, arousalVis, t, isSelf) {
  const amp = lerp(0.02, 1.10, arousalVis);
  const spd = lerp(0.03, 1.90, arousalVis);
  const drift = lerp(0.0015, 0.050, arousalVis);

  for (let c of arr) {
    c.morphAmp = amp;
    c.morphSpeed = spd;
    c.drift = drift;

    const nx = (noise(c.seed + t * 0.12 * spd, c.y * 0.002) - 0.5);
    const ny = (noise(3000 + c.seed + t * 0.12 * spd, c.x * 0.002) - 0.5);

    const scale = isSelf ? 1.0 : 0.95;
    c.x += nx * drift * 0.9 * scale;
    c.y += ny * drift * 0.8 * scale;

    if (arousalRaw < 0.35) {
      c.x = lerp(c.x, width * 0.52, 0.006);
      c.y = lerp(c.y, height * 0.52, 0.006);
    }
  }
}

function drawClouds(arr, col, alpha, t) {
  for (let c of arr) {
    if (c.life < 0.02) continue;

    const n = 22;
    const a = alpha * c.life;

    // Precompute curve points
    const pts = [];
    for (let i = 0; i < n; i++) {
      const ang = (TWO_PI * i) / n;

      const wobble = noise(
        cos(ang) + 1 + c.seed,
        sin(ang) + 1 + c.seed * 0.33,
        t * 0.16 * c.morphSpeed
      );

      const rr = c.baseR * (0.74 + 0.78 * wobble * (0.85 + c.morphAmp));
      pts.push({
        x: c.x + cos(ang) * rr,
        y: c.y + sin(ang) * rr * 0.92
      });
    }

    // Outer glow layers
    const glow = [
      { sc: 1.28, ga: a * 0.03, db: 16 },
      { sc: 1.18, ga: a * 0.07, db: 11 },
      { sc: 1.10, ga: a * 0.14, db: 7 },
      { sc: 1.04, ga: a * 0.26, db: 3 },
    ];
    for (const g of glow) {
      fill(col.h, max(0, col.s - 8), min(100, col.b + g.db), g.ga);
      _cloudCurve(pts, c.x, c.y, n, g.sc);
    }

    // Main body with canvas glow
    const gc = color(col.h, max(0, col.s - 5), min(100, col.b + 10));
    gc.setAlpha(a * 0.45);
    drawingContext.shadowBlur = 22;
    drawingContext.shadowColor = gc.toString();
    fill(col.h, col.s, col.b, a);
    _cloudCurve(pts, c.x, c.y, n, 1.0);
    drawingContext.shadowBlur = 0;

    // Inner luminous core
    fill(col.h, max(0, col.s - 16), min(100, col.b + 15), a * 0.15);
    _cloudCurve(pts, c.x, c.y, n, 0.52);
  }
}

// Closed Catmull-Rom curve
function _cloudCurve(pts, cx, cy, n, sc) {
  const px = i => cx + (pts[i].x - cx) * sc;
  const py = i => cy + (pts[i].y - cy) * sc;
  beginShape();
  curveVertex(px(n - 1), py(n - 1));
  for (let i = 0; i < n; i++) curveVertex(px(i), py(i));
  curveVertex(px(0), py(0));
  curveVertex(px(1), py(1));
  endShape(CLOSE);
}
