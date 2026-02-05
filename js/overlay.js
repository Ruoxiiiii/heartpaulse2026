/* =========================================================
   OVERLAY - Data visualization UI (HTML-based for sharp text)
========================================================= */

let _overlayEl = null;
let _overlayInitialized = false;

function _initOverlay() {
  if (_overlayInitialized) return;
  _overlayInitialized = true;

  // Create overlay container
  _overlayEl = document.createElement('div');
  _overlayEl.id = 'data-overlay';
  _overlayEl.innerHTML = `
    <div class="row" id="row-bpm">
      <span class="label">BPM</span>
      <span class="value" id="val-bpm">72</span>
      <div class="bar"><div class="fill" id="fill-bpm"></div></div>
    </div>
    <div class="row" id="row-arousal">
      <span class="label">Arousal</span>
      <span class="value" id="val-arousal">0.20</span>
      <div class="bar"><div class="fill" id="fill-arousal"></div></div>
    </div>
    <div class="row" id="row-valence">
      <span class="label">Valence</span>
      <span class="value" id="val-valence">0.00</span>
      <div class="bar valence-bar">
        <div class="center-line"></div>
        <div class="fill-pos" id="fill-valence-pos"></div>
        <div class="fill-neg" id="fill-valence-neg"></div>
      </div>
    </div>
    <div class="row" id="row-proximity">
      <span class="label">Proximity</span>
      <span class="value" id="val-proximity">0.00</span>
      <div class="bar"><div class="fill" id="fill-proximity"></div></div>
    </div>
  `;

  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    #data-overlay {
      position: fixed;
      top: 14px;
      left: 14px;
      z-index: 100;
      font-family: "SF Mono", "Fira Code", "Consolas", "Monaco", monospace;
      font-size: 11px;
      line-height: 1;
      color: rgba(255, 255, 255, 0.88);
      pointer-events: none;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    #data-overlay .row {
      display: flex;
      align-items: center;
      margin-bottom: 6px;
      height: 14px;
    }
    #data-overlay .row.hidden {
      display: none;
    }
    #data-overlay .label {
      width: 62px;
      color: rgba(255, 255, 255, 0.82);
      font-weight: 500;
    }
    #data-overlay .value {
      width: 42px;
      color: rgba(255, 255, 255, 0.65);
      text-align: right;
      margin-right: 10px;
    }
    #data-overlay .bar {
      width: 110px;
      height: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      position: relative;
      overflow: hidden;
    }
    #data-overlay .fill {
      height: 100%;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 4px;
      transition: width 0.1s ease-out;
    }
    #data-overlay .valence-bar .center-line {
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      width: 1px;
      margin-left: -0.5px;
      background: rgba(255, 255, 255, 0.28);
    }
    #data-overlay .fill-pos {
      position: absolute;
      left: 50%;
      top: 0;
      height: 100%;
      background: rgba(247, 150, 180, 0.65);
      border-radius: 0 4px 4px 0;
      transition: width 0.1s ease-out;
    }
    #data-overlay .fill-neg {
      position: absolute;
      right: 50%;
      top: 0;
      height: 100%;
      background: rgba(200, 90, 90, 0.65);
      border-radius: 4px 0 0 4px;
      transition: width 0.1s ease-out;
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(_overlayEl);
}

function drawDataOverlay(level) {
  if (!_overlayInitialized) _initOverlay();
  if (!_overlayEl) return;

  // Update visibility based on level
  document.getElementById('row-arousal').classList.toggle('hidden', level < 2);
  document.getElementById('row-valence').classList.toggle('hidden', level < 2);
  document.getElementById('row-proximity').classList.toggle('hidden', level < 3);

  // Update BPM
  document.getElementById('val-bpm').textContent = Math.round(data.bpm);
  const bpmFrac = map(constrain(data.bpm, 40, 140), 40, 140, 0, 100);
  document.getElementById('fill-bpm').style.width = bpmFrac + '%';

  if (level >= 2) {
    // Update Arousal
    document.getElementById('val-arousal').textContent = data.arousal.toFixed(2);
    document.getElementById('fill-arousal').style.width = (data.arousal * 100) + '%';

    // Update Valence
    const v = constrain(data.valence, -1, 1);
    document.getElementById('val-valence').textContent = v.toFixed(2);
    const vMag = Math.abs(v) * 50;
    if (v >= 0) {
      document.getElementById('fill-valence-pos').style.width = vMag + '%';
      document.getElementById('fill-valence-neg').style.width = '0%';
    } else {
      document.getElementById('fill-valence-pos').style.width = '0%';
      document.getElementById('fill-valence-neg').style.width = vMag + '%';
    }
  }

  if (level >= 3) {
    // Update Proximity
    document.getElementById('val-proximity').textContent = data.proximity.toFixed(2);
    document.getElementById('fill-proximity').style.width = (data.proximity * 100) + '%';
  }
}

// Show/hide overlay
function setOverlayVisible(visible) {
  if (!_overlayInitialized) _initOverlay();
  if (_overlayEl) {
    _overlayEl.style.display = visible ? 'block' : 'none';
  }
}
