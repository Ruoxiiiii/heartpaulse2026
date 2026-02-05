/* =========================================================
   MAIN - p5.js setup, draw loop, and event handlers

   LIFE / RELATIONSHIP / HEART

   Controls:
   - D: Toggle data overlay
   - R: Restart
========================================================= */

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  colorMode(HSB, 360, 100, 100, 1);
  frameRate(60);
  noStroke();

  startTime = millis();
  lastFrameTime = 0;
  ecgScroll = 0;

  initSelfClouds();
  initStage2(0);
  initStage2Field();
  initStage3(0);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function keyPressed() {
  if (key === "d" || key === "D") showData = !showData;
  if (key === "r" || key === "R") restart();
}

function restart() {
  stopped = false;
  loop();
  startTime = millis();
  lastFrameTime = 0;
  ecgScroll = 0;

  proximity = 0;
  data = { bpm: 72, arousal: 0.2, valence: 0.5, proximity: 0 };

  initSelfClouds();
  initStage2(0);
  initStage2Field();
  initStage3(0);
}

function draw() {
  if (stopped) return;

  const t = (millis() - startTime) / 1000;
  background(CFG.bg.h, CFG.bg.s, CFG.bg.b);

  const dt = max(0, t - lastFrameTime);
  lastFrameTime = t;

  const t1 = CFG.stage.age;
  const t2 = t1 + CFG.stage.emotion;
  const t3 = t2 + CFG.stage.relationship;

  if (t < t1) {
    stageAge(t, dt);
    if (showData) drawDataOverlay(1);
  } else if (t < t2) {
    stageEmotion(t);
    if (showData) drawDataOverlay(2);
  } else if (t < t3) {
    stageRelationship(t);
    if (showData) drawDataOverlay(3);
  } else if (t < TOTAL) {
    stageDeath(t);
  } else {
    stopped = true;
    noLoop();
  }
}
