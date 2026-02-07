/* =========================================================
   NOISE - High ISO film grain effect
   Renders over entire canvas like high ISO photography
========================================================= */

let noiseLayer = null;

function initNoiseLayer() {
  noiseLayer = createGraphics(width, height);
  noiseLayer.pixelDensity(1);
}

function drawFilmGrain(intensity = 0.12) {
  if (!noiseLayer || noiseLayer.width !== width || noiseLayer.height !== height) {
    initNoiseLayer();
  }

  noiseLayer.loadPixels();
  const d = noiseLayer.pixelDensity();
  const w = noiseLayer.width * d;
  const h = noiseLayer.height * d;
  const pixels = noiseLayer.pixels;

  // Generate film grain noise
  for (let i = 0; i < pixels.length; i += 4) {
    // Random grain value - mimics high ISO sensor noise
    const grain = (Math.random() - 0.5) * 255 * intensity;

    // Slight color variation for realistic film grain
    const rVar = grain + (Math.random() - 0.5) * 8;
    const gVar = grain + (Math.random() - 0.5) * 8;
    const bVar = grain + (Math.random() - 0.5) * 8;

    pixels[i] = 128 + rVar;     // R
    pixels[i + 1] = 128 + gVar; // G
    pixels[i + 2] = 128 + bVar; // B
    pixels[i + 3] = 255;        // A
  }

  noiseLayer.updatePixels();

  // Blend noise over the scene
  push();
  blendMode(OVERLAY);
  tint(255, 40);
  image(noiseLayer, 0, 0);
  pop();
}
