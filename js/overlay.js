/* =========================================================
   OVERLAY - Data visualization UI
========================================================= */

function drawBarRow(label, valueText, frac, x, y, barW) {
  fill(0, 0, 96, 0.68);
  text(label, x, y);

  fill(0, 0, 96, 0.55);
  text(valueText, x + 64, y);

  const bx = x + 112;
  const by = y - 10;
  const h = 8;

  fill(0, 0, 96, 0.14);
  rect(bx, by, barW, h, 4);

  fill(0, 0, 96, 0.55);
  rect(bx, by, barW * constrain(frac, 0, 1), h, 4);
}

function drawDataOverlay(level) {
  push();
  resetMatrix();
  textFont('monospace');
  textSize(12);
  noStroke();

  const x = 18;
  let y = 28;
  const barW = 170;
  const gap = 18;

  drawBarRow("BPM", nf(data.bpm, 3, 0), map(constrain(data.bpm, 40, 140), 40, 140, 0, 1), x, y, barW);

  if (level >= 2) {
    y += gap;
    drawBarRow("Arousal", nf(data.arousal, 1, 2), data.arousal, x, y, barW);

    y += gap;
    const v = constrain(data.valence, -1, 1);

    fill(0, 0, 96, 0.68);
    text("Valence", x, y);
    fill(0, 0, 96, 0.55);
    text(nf(v, 1, 2), x + 64, y);

    const bx = x + 112;
    const by = y - 10;
    const h = 8;

    fill(0, 0, 96, 0.14);
    rect(bx, by, barW, h, 4);

    fill(0, 0, 96, 0.22);
    rect(bx + barW / 2 - 1, by, 2, h, 1);

    const half = barW / 2;
    const mag = abs(v) * half;

    if (v >= 0) fill(340, 35, 94, 0.58);
    else fill(0, 85, 40, 0.60);

    if (v >= 0) rect(bx + half, by, mag, h, 4);
    else rect(bx + half - mag, by, mag, h, 4);
  }

  if (level >= 3) {
    y += gap;
    drawBarRow("Proxim", nf(data.proximity, 1, 2), data.proximity, x, y, barW);
  }

  pop();
}
