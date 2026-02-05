/* =========================================================
   COLORS - Color mapping functions
========================================================= */

function colorFromValenceAndEmotion(valence, emoName) {
  const absV = abs(valence);

  if (emoName === "reset") return { h: 0, s: 0, b: 100 };

  if (valence >= 0) {
    const h = (emoName === "excited") ? 330 : 340;
    const s = lerp(26, 88, absV);
    const b = lerp(86, 97, 0.55 + 0.45 * absV);
    return { h, s, b };
  } else {
    if (emoName === "grief") {
      return { h: 200, s: lerp(18, 42, absV), b: lerp(52, 74, 1 - absV * 0.35) };
    }
    if (emoName === "fear") {
      return { h: 342, s: lerp(82, 98, absV), b: lerp(12, 24, 1 - absV * 0.55) };
    }
    // anxious: more true red
    return { h: 356, s: lerp(74, 94, absV), b: lerp(22, 44, 0.35 + 0.65 * absV) };
  }
}

function alphaFromValence(valence, emoName, base = 0.24) {
  const absV = abs(valence);
  const presence = pow(absV, 0.6);

  let a = base * lerp(0.35, 1.70, presence);

  let floorA = 0.10;
  if (emoName === "reset") floorA = 0.08;
  if (emoName === "comfort") floorA = 0.06;
  if (emoName === "excited") floorA = 0.08;
  if (emoName === "grief") floorA = 0.16;
  if (emoName === "anxious") floorA = 0.30;
  if (emoName === "fear") floorA = 0.38;

  if (valence < 0) a *= 1.08;
  a = max(a, floorA);
  return constrain(a, 0, 0.58);
}

function lerpColorHSB(c1, c2, k) {
  return {
    h: lerp(c1.h, c2.h, k),
    s: lerp(c1.s, c2.s, k),
    b: lerp(c1.b, c2.b, k)
  };
}
