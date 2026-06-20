// @ts-nocheck
import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Loader2 } from 'lucide-react';
import './CountTrain.css';

const loadScript = (src: string) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
};

// ==========================================
// 1. EXERCISE DATA & ENGINES (English Translated & Updated Emojis)
// ==========================================
const EXERCISES = [
  {
    id: 'squat', name: 'Squat', emoji: '🏋️‍♂️', color: '#ff6b6b', desc: 'Knee 90° • Straight back • Chest up', calories: 0.32, camDir: 'side', bilateral: false, camAngle: 'Side 90° — 2 Meters', jointsLeft: [23, 25, 27], jointsRight: [24, 26, 28], upAngle: 160, downAngle: 92, countOn: 'down',
    formChecks: [
      { name: 'back_left', jointsLeft: [11, 23, 25], jointsRight: [12, 24, 26], min: 140, max: 200, errorMsg: 'Back is bent — straighten it!', voiceMsg: 'Straighten your back' },
      { name: 'knee_toe', type: 'knee_toe', errorMsg: 'Knee past toes!', voiceMsg: 'Move your knees back' }
    ],
    feedback: ['Knees aligned ✓', 'Straight back ✓', 'Go lower ↓'], voiceRep: ['Lower', 'Good job', 'Excellent', 'Perfect form']
  },
  {
    id: 'pushup', name: 'Pushup', emoji: '🦾', color: '#6c63ff', desc: 'Chest to floor • Elbows 90°', calories: 0.36, camDir: 'side-low', bilateral: false, camAngle: 'Side Ground Level — 1.5 Meters', jointsLeft: [11, 13, 15], jointsRight: [12, 14, 16], upAngle: 160, downAngle: 80, countOn: 'down',
    formChecks: [{ name: 'body_straight', jointsLeft: [23, 11, 13], jointsRight: [24, 12, 14], min: 150, max: 200, errorMsg: 'Body not straight!', voiceMsg: 'Keep your body straight' }],
    feedback: ['Body is straight ✓', 'Elbows tucked ✓', 'Go lower ↓'], voiceRep: ['Lower', 'Good job', 'Strong', 'Excellent']
  },
  {
    id: 'curl', name: 'Bicep Curl', emoji: '💪', color: '#00e5ff', desc: 'Fixed elbows • Lift slowly • Balance sides', calories: 0.16, camDir: 'front', bilateral: true, upperBodyOnly: true, camAngle: 'Direct Front — 1.5 Meters', jointsLeft: [11, 13, 15], jointsRight: [12, 14, 16], upAngle: 50, downAngle: 150, countOn: 'up',
    formChecks: [], feedback: ['Elbow fixed ✓', 'Full range ✓', 'Lower slowly ↓'], voiceRep: ['Lift higher', 'Good job', 'Excellent', 'Great form']
  },
  {
    id: 'lunge', name: 'Lunge', emoji: '🏃‍♂️', color: '#00d68f', desc: 'Knee behind toe • Straight back', calories: 0.26, camDir: 'side', bilateral: true, lungeMode: true, camAngle: 'Side 90° — 2.5 Meters', jointsLeft: [23, 25, 27], jointsRight: [24, 26, 28], upAngle: 170, downAngle: 88, countOn: 'down',
    formChecks: [{ name: 'knee_toe', type: 'knee_toe', errorMsg: 'Knee past toes!', voiceMsg: 'Move your knees back' }],
    feedback: ['Straight back ✓', 'Knee 90° ✓', 'Deeper step ↓'], voiceRep: ['Go lower', 'Good job', 'Great', 'Excellent']
  },
  {
    id: 'shoulder', name: 'Shoulder Press', emoji: '🙌', color: '#ffa502', desc: 'Press overhead • Brace core', calories: 0.22, camDir: 'front', bilateral: false, upperBodyOnly: true, camAngle: 'Front — 1.5 Meters', jointsLeft: [11, 13, 15], jointsRight: [12, 14, 16], upAngle: 160, downAngle: 70, countOn: 'down',
    formChecks: [], feedback: ['Elbows forward ✓', 'Press overhead ✓', 'Shoulders stable ✓'], voiceRep: ['Push up', 'Good job', 'Excellent', 'Great form']
  },
  {
    id: 'plank', name: 'Plank', emoji: '🧱', color: '#ff6348', desc: 'Straight body • Tight core', calories: 0.11, camDir: 'side-low', isTimer: true, bilateral: false, camAngle: 'Side Ground Level — 1.5 Meters', jointsLeft: [], jointsRight: [],
    formChecks: [], feedback: ['Core engaged ✓', 'Hips level ✓', 'Neutral head ✓'], voiceRep: ['Hold it', 'You are strong', 'Keep going']
  },
  {
    id: 'jumpjack', name: 'Jumping Jacks', emoji: '🌟', color: '#eccc68', desc: 'Arms overhead • Legs wide', calories: 0.42, camDir: 'front', bilateral: false, camAngle: 'Direct Front — 3 Meters', jointsLeft: [11, 13, 15], jointsRight: [12, 14, 16], upAngle: 160, downAngle: 80, countOn: 'up',
    formChecks: [], feedback: ['Arms extended ✓', 'Legs wide ✓', 'Keep the rhythm ✓'], voiceRep: ['Keep going', 'Good job', 'Excellent']
  }
];

const AudioEngine = (() => {
  let ctx = null;
  function getCtx() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; }
  function beep(freq = 440, dur = 0.08, vol = 0.3, type = 'sine') {
    try { const ac = getCtx(); const osc = ac.createOscillator(); const gain = ac.createGain(); osc.connect(gain); gain.connect(ac.destination); osc.type = type; osc.frequency.value = freq; gain.gain.setValueAtTime(vol, ac.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur); osc.start(); osc.stop(ac.currentTime + dur); } catch (e) { }
  }
  function repSound(repNum, target) {
    if (repNum >= target) { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.15, 0.38, 'triangle'), i * 80)); } else { beep(800 + repNum * 18, 0.06, 0.22, 'sine'); }
  }
  return { beep, repSound, start: () => { beep(440, 0.1, 0.18, 'square'); setTimeout(() => beep(660, 0.1, 0.18, 'square'), 110); }, reset: () => beep(300, 0.12, 0.18, 'sawtooth') };
})();

const VoiceEngine = (() => {
  let enabled = false; let lastSpoken = ''; let lastSpeakTime = 0; const COOLDOWN_MS = 2200;
  function speak(text) {
    if (!enabled) return; const now = Date.now(); if (text === lastSpoken && now - lastSpeakTime < COOLDOWN_MS) return; lastSpoken = text; lastSpeakTime = now;
    if (!('speechSynthesis' in window)) return; window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text); utt.lang = 'en-US'; utt.rate = 1.0; utt.pitch = 1.0; utt.volume = 0.9;
    const voices = window.speechSynthesis.getVoices(); const enVoice = voices.find(v => v.lang.startsWith('en')); if (enVoice) utt.voice = enVoice;
    window.speechSynthesis.speak(utt);
  }
  function toggle() { enabled = !enabled; return enabled; }
  return { speak, toggle, isEnabled: () => enabled };
})();

const StateMachine = (() => {
  const STATES = { IDLE: 'IDLE', ECCENTRIC: 'ECCENTRIC', PAUSE: 'PAUSE', CONCENTRIC: 'CONCENTRIC', COMPLETED: 'COMPLETED' };
  let state = STATES.IDLE; let hysteresis = 8;
  function getState() { return state; }
  function update(angle, ex) {
    if (!ex || ex.isTimer) return false; const { upAngle, downAngle, countOn } = ex; let repCompleted = false;
    if (countOn === 'down') {
      if (state === STATES.IDLE && angle > upAngle - hysteresis) { state = STATES.CONCENTRIC; } else if (state === STATES.CONCENTRIC && angle < downAngle + hysteresis) { state = STATES.ECCENTRIC; repCompleted = true; } else if (state === STATES.ECCENTRIC && angle > upAngle - hysteresis) { state = STATES.CONCENTRIC; }
    } else {
      if (state === STATES.IDLE && angle > downAngle - hysteresis) { state = STATES.ECCENTRIC; } else if (state === STATES.ECCENTRIC && angle < upAngle + hysteresis) { state = STATES.CONCENTRIC; repCompleted = true; } else if (state === STATES.CONCENTRIC && angle > downAngle - hysteresis) { state = STATES.ECCENTRIC; }
    }
    return repCompleted;
  }
  function reset() { state = STATES.IDLE; }
  function progress(angle, ex) {
    if (!ex || ex.isTimer) return 0; const { upAngle, downAngle, countOn } = ex;
    if (countOn === 'down') { return 1 - Math.max(0, Math.min(1, (angle - downAngle) / (upAngle - downAngle))); } else { return Math.max(0, Math.min(1, (downAngle - angle) / (downAngle - upAngle))); }
  }
  return { update, reset, getState, progress, STATES };
})();

function calcAngle(a, b, c) {
  let r = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x); let ang = Math.abs(r * 180 / Math.PI); if (ang > 180) ang = 360 - ang; return ang;
}

const BilateralTracker = (() => {
  const leftSM = { state: 'ECCENTRIC' }; const rightSM = { state: 'ECCENTRIC' }; let leftReps = 0; let rightReps = 0;
  let lungeActiveSide = null; let lungeLastAngle = 999;

  function detectActiveSide(lm, ex) {
    const leftJoints = ex.jointsLeft || []; const rightJoints = ex.jointsRight || [];
    if (!leftJoints.length || !rightJoints.length) return { side: 'left', joints: leftJoints, confidence: 1 };
    const avgVis = (indices) => indices.reduce((s, i) => s + (lm[i]?.visibility ?? 0), 0) / indices.length;
    const leftConf = avgVis(leftJoints); const rightConf = avgVis(rightJoints);
    if (leftConf >= rightConf) return { side: 'left', joints: leftJoints, confidence: leftConf }; else return { side: 'right', joints: rightJoints, confidence: rightConf };
  }

  function getAngleForSide(lm, joints) {
    if (!joints || joints.length < 3) return null;
    const [ai, bi, ci] = joints; const a = lm[ai], b = lm[bi], c = lm[ci];
    if (!a || !b || !c) return null;
    if (Math.min(a.visibility, b.visibility, c.visibility) < 0.45) return null;
    return calcAngle(a, b, c);
  }

  function updateBilateral(lm, ex) {
    const results = { leftRep: false, rightRep: false };

    // Lunge special mode: detect which leg is bending more (forward leg)
    if (ex.lungeMode) {
      const leftAngle = getAngleForSide(lm, ex.jointsLeft);
      const rightAngle = getAngleForSide(lm, ex.jointsRight);
      if (leftAngle === null && rightAngle === null) return results;

      // The active (forward) leg is the one with the smaller (more bent) knee angle
      let activeSide, activeAngle, activeSM;
      if (leftAngle !== null && rightAngle !== null) {
        activeSide = leftAngle <= rightAngle ? 'left' : 'right';
      } else {
        activeSide = leftAngle !== null ? 'left' : 'right';
      }
      activeAngle = activeSide === 'left' ? leftAngle : rightAngle;
      activeSM = activeSide === 'left' ? leftSM : rightSM;

      // If user switched legs, reset the state machine for the new side
      if (lungeActiveSide !== null && lungeActiveSide !== activeSide) {
        leftSM.state = 'ECCENTRIC'; rightSM.state = 'ECCENTRIC';
      }
      lungeActiveSide = activeSide;

      const { upAngle, downAngle } = ex;
      if (activeSM.state === 'ECCENTRIC' && activeAngle < downAngle + 10) { activeSM.state = 'CONCENTRIC'; }
      else if (activeSM.state === 'CONCENTRIC' && activeAngle > upAngle - 10) {
        activeSM.state = 'ECCENTRIC';
        if (activeSide === 'left') { leftReps++; results.leftRep = true; }
        else { rightReps++; results.rightRep = true; }
      }
      return results;
    }

    const updateSide = (sm, joints, ex) => {
      if (!joints.length) return false; const [ai, bi, ci] = joints; const a = lm[ai], b = lm[bi], c = lm[ci];
      if (!a || !b || !c) return false; if (Math.min(a.visibility, b.visibility, c.visibility) < 0.45) return false;
      const angle = calcAngle(a, b, c); const { upAngle, downAngle, countOn } = ex;
      if (countOn === 'up') {
        if (sm.state === 'ECCENTRIC' && angle < upAngle + 8) { sm.state = 'CONCENTRIC'; return true; }
        if (sm.state === 'CONCENTRIC' && angle > downAngle - 8) { sm.state = 'ECCENTRIC'; }
      } else {
        if (sm.state === 'CONCENTRIC' && angle < downAngle + 8) { sm.state = 'ECCENTRIC'; return true; }
        if (sm.state === 'ECCENTRIC' && angle > upAngle - 8) { sm.state = 'CONCENTRIC'; }
      }
      return false;
    };
    if (updateSide(leftSM, ex.jointsLeft, ex)) { leftReps++; results.leftRep = true; }
    if (updateSide(rightSM, ex.jointsRight, ex)) { rightReps++; results.rightRep = true; }
    return results;
  }
  function reset() { leftReps = 0; rightReps = 0; leftSM.state = 'ECCENTRIC'; rightSM.state = 'ECCENTRIC'; lungeActiveSide = null; lungeLastAngle = 999; }
  function getCounts() { return { left: leftReps, right: rightReps, total: leftReps + rightReps }; }
  return { detectActiveSide, updateBilateral, reset, getCounts };
})();

const FormChecker = (() => {
  function checkKneeToe(lm, side) {
    const kneeIdx = side === 'left' ? 25 : 26; const ankleIdx = side === 'left' ? 27 : 28; const knee = lm[kneeIdx]; const ankle = lm[ankleIdx];
    if (!knee || !ankle) return false; if (knee.visibility < 0.5 || ankle.visibility < 0.5) return false;
    return (knee.x - ankle.x) > 0.06;
  }
  function check(lm, ex, activeSide) {
    if (!ex || !ex.formChecks) return []; const errors = [];
    for (const rule of ex.formChecks) {
      if (rule.type === 'knee_toe') {
        if (checkKneeToe(lm, activeSide)) { const kneeIdx = activeSide === 'left' ? 25 : 26; const ankleIdx = activeSide === 'left' ? 27 : 28; errors.push({ errorMsg: rule.errorMsg, voiceMsg: rule.voiceMsg, highlightJoints: [kneeIdx, ankleIdx] }); }
        continue;
      }
      const joints = activeSide === 'left' ? rule.jointsLeft : rule.jointsRight; if (!joints || joints.length < 3) continue;
      const [ai, bi, ci] = joints; const a = lm[ai], b = lm[bi], c = lm[ci]; if (!a || !b || !c) continue;
      if (Math.min(a.visibility, b.visibility, c.visibility) < 0.45) continue;
      const angle = calcAngle(a, b, c);
      if (angle < rule.min || angle > rule.max) { errors.push({ errorMsg: rule.errorMsg, voiceMsg: rule.voiceMsg, highlightJoints: joints }); }
    }
    return errors;
  }
  return { check };
})();

const CanvasRenderer = (() => {
  const FULL_BODY_LANDMARKS = [0, 11, 12, 13, 14, 23, 24, 25, 26, 27, 28];
  const UPPER_BODY_LANDMARKS = [0, 11, 12, 13, 14, 15, 16];
  const SIDE_LANDMARKS_LEFT = [0, 11, 13, 15, 23, 25, 27]; const SIDE_LANDMARKS_RIGHT = [0, 12, 14, 16, 24, 26, 28];
  function calibrationScore(lm, ex) {
    if (!lm) return 0; const isSide = ex && (ex.camDir === 'side' || ex.camDir === 'side-low');
    if (isSide) { const scoreSet = (indices) => { const visible = indices.filter(i => lm[i] && lm[i].visibility > 0.5); return visible.length / indices.length; }; return Math.max(scoreSet(SIDE_LANDMARKS_LEFT), scoreSet(SIDE_LANDMARKS_RIGHT)); }
    if (ex && ex.upperBodyOnly) { const visible = UPPER_BODY_LANDMARKS.filter(i => lm[i] && lm[i].visibility > 0.5); return visible.length / UPPER_BODY_LANDMARKS.length; }
    const visible = FULL_BODY_LANDMARKS.filter(i => lm[i] && lm[i].visibility > 0.5); return visible.length / FULL_BODY_LANDMARKS.length;
  }
  function drawSkeleton(ctx, lm, w, h, errorJoints = new Set()) {
    if (!lm || !window.POSE_CONNECTIONS) return;
    for (const [start, end] of window.POSE_CONNECTIONS) {
      const a = lm[start], b = lm[end]; if (!a || !b) continue; if (a.visibility < 0.4 || b.visibility < 0.4) continue;
      const isError = errorJoints.has(start) || errorJoints.has(end); ctx.beginPath(); ctx.moveTo(a.x * w, a.y * h); ctx.lineTo(b.x * w, b.y * h); ctx.strokeStyle = isError ? 'rgba(255,71,87,0.9)' : 'rgba(0,229,255,0.55)'; ctx.lineWidth = isError ? 4 : 2.5; ctx.stroke();
    }
    for (let i = 0; i < lm.length; i++) {
      const pt = lm[i]; if (!pt || pt.visibility < 0.4) continue; const isError = errorJoints.has(i); ctx.beginPath(); ctx.arc(pt.x * w, pt.y * h, isError ? 7 : 4, 0, Math.PI * 2); ctx.fillStyle = isError ? 'rgba(255,71,87,0.9)' : 'rgba(255,107,107,0.8)'; ctx.strokeStyle = isError ? '#ff4757' : 'rgba(0,229,255,0.6)'; ctx.lineWidth = 1.5; ctx.fill(); ctx.stroke();
    }
  }
  function drawCalibrationSilhouette(ctx, w, h, score) {
    const ready = score >= 0.85; const color = ready ? `rgba(0,214,143,${0.3 + score * 0.4})` : `rgba(255,255,255,${0.1 + score * 0.2})`;
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.setLineDash([8, 6]); const cx = w / 2, cy = h * 0.12; const scale = Math.min(w, h) * 0.55;
    ctx.beginPath(); ctx.arc(cx, cy, scale * 0.09, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(cx, cy + scale * 0.09); ctx.lineTo(cx, cy + scale * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - scale * 0.25, cy + scale * 0.25); ctx.lineTo(cx, cy + scale * 0.13); ctx.lineTo(cx + scale * 0.25, cy + scale * 0.25); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy + scale * 0.5); ctx.lineTo(cx - scale * 0.15, cy + scale * 0.88); ctx.moveTo(cx, cy + scale * 0.5); ctx.lineTo(cx + scale * 0.15, cy + scale * 0.88); ctx.stroke(); ctx.restore();
  }
  function drawErrorLabels(ctx, lm, w, h, errors) {
    if (!errors.length || !lm) return; ctx.save(); ctx.font = 'bold 13px Tajawal, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    errors.forEach((err, idx) => {
      if (!err.highlightJoints || !err.highlightJoints.length) return; const joint = lm[err.highlightJoints[0]]; if (!joint || joint.visibility < 0.4) return;
      const x = joint.x * w; const y = joint.y * h - 20 - idx * 24; const textW = ctx.measureText(err.errorMsg).width + 16;
      ctx.fillStyle = 'rgba(255,71,87,0.88)'; ctx.beginPath(); ctx.roundRect(x - textW / 2, y - 10, textW, 22, 5); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(err.errorMsg, x, y + 1);
    });
    ctx.restore();
  }
  function drawAngleArc(ctx, a, b, c, angle, w, h) {
    if (!a || !b || !c) return; const bx = b.x * w, by = b.y * h; const r = 22; const a1 = Math.atan2(a.y * h - by, a.x * w - bx); const a2 = Math.atan2(c.y * h - by, c.x * w - bx);
    ctx.save(); ctx.beginPath(); ctx.arc(bx, by, r, a1, a2); ctx.strokeStyle = 'rgba(255,165,0,0.75)'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = 'rgba(255,165,0,0.9)'; ctx.font = 'bold 11px Oxanium, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(`${Math.round(angle)}°`, bx + 30, by); ctx.restore();
  }
  return { drawSkeleton, drawCalibrationSilhouette, drawErrorLabels, drawAngleArc, calibrationScore };
})();

export default function CountTrainPage() {
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  useEffect(() => {
    const loadAll = async () => {
      try {
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js');
        await loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js');
        setScriptsLoaded(true);
      } catch (error) {
        console.error('Error loading MediaPipe:', error);
      }
    };
    loadAll();
  }, []);

  useEffect(() => {
    if (!scriptsLoaded) return;
    if (typeof window.Pose === 'undefined') return;

    let currentEx = EXERCISES[0];
    let reps = 0, totalReps = 0, sets = 0, calories = 0, targetReps = 12;
    let isTracking = false, isCalibrated = false;
    let plankInterval = null, plankSeconds = 0;
    let formErrors = [];
    let lastVoiceRep = -1, goodRepsThisSet = 0, totalFormChecks = 0, passedFormChecks = 0;
    const CIRCUMFERENCE = 427;
    let notifTimer = null;
    const activeFeedback = new Set();

    const videoEl = document.getElementById('videoFeed');
    const canvasEl = document.getElementById('poseCanvas');
    const ctx2d = canvasEl?.getContext('2d');

    const CameraManager = (() => {
      let pose = null, camera = null, onResultsCb = null, initialized = false;
      async function init(vidEl, onResults) {
        onResultsCb = onResults;
        pose = new window.Pose({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
        pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, enableSegmentation: false, minDetectionConfidence: 0.55, minTrackingConfidence: 0.55 });
        pose.onResults(onResultsCb);
        camera = new window.Camera(vidEl, {
          onFrame: async () => { try { await pose.send({ image: vidEl }); } catch (e) { } },
          width: 640, height: 480
        });
        try { await camera.start(); initialized = true; return true; } catch (err) { return false; }
      }
      function stop() { if (camera) camera.stop(); initialized = false; }
      return { init, stop, isReady: () => initialized };
    })();

    function updateCalibrationUI(score, ex) {
      const instruction = document.getElementById('calibInstruction');
      if (!instruction) return;
      if (score >= 0.85) {
        instruction.textContent = '✅ Perfect! Full body in frame — Press Start'; instruction.classList.add('ready');
        if (!isCalibrated) { isCalibrated = true; VoiceEngine.speak('Perfect, you can start now'); }
      } else {
        const pct = Math.round(score * 100); const angleHint = ex && ex.camAngle ? ex.camAngle : 'Step back until full body is in frame';
        instruction.textContent = `📐 Please stand: ${angleHint} (${pct}%)`; instruction.classList.remove('ready'); isCalibrated = false;
      }
    }

    function onPoseResults(results) {
      if (!canvasEl || !videoEl) return;
      canvasEl.width = videoEl.videoWidth || 640; canvasEl.height = videoEl.videoHeight || 480;
      const W = canvasEl.width; const H = canvasEl.height;
      ctx2d.save(); ctx2d.clearRect(0, 0, W, H);
      const lm = results.poseLandmarks;
      const calibScore = CanvasRenderer.calibrationScore(lm, currentEx);
      updateCalibrationUI(calibScore, currentEx);

      if (!lm) {
        CanvasRenderer.drawCalibrationSilhouette(ctx2d, W, H, 0); ctx2d.restore();
        const sideHud = document.getElementById('sideHud'); if(sideHud) sideHud.textContent = '⟳ Detecting...';
        return;
      }

      if (!isCalibrated) CanvasRenderer.drawCalibrationSilhouette(ctx2d, W, H, calibScore);
      const { side, joints, confidence } = BilateralTracker.detectActiveSide(lm, currentEx);

      (() => {
        const ls = lm[11], rs = lm[12]; const hudEl = document.getElementById('sideHud');
        if(hudEl) {
          if (ls && rs && ls.visibility > 0.4 && rs.visibility > 0.4) {
            const xGap = Math.abs(rs.x - ls.x);
            if (xGap < 0.10) { hudEl.textContent = '↔ Side ✓'; hudEl.classList.add('ct-text-success'); hudEl.classList.remove('ct-text-warn'); }
            else if (xGap < 0.18) { hudEl.textContent = '↗ Angled'; hudEl.classList.add('ct-text-warn'); hudEl.classList.remove('ct-text-success'); }
            else { const sideLabel = side === 'left' ? 'Left 👈' : 'Right 👉'; hudEl.textContent = `Front — ${sideLabel} (${Math.round(confidence * 100)}%)`; hudEl.classList.add('ct-text-warn'); hudEl.classList.remove('ct-text-success'); }
          } else { hudEl.textContent = '⟳ Detecting...'; hudEl.classList.add('ct-text-warn'); hudEl.classList.remove('ct-text-success'); }
        }
      })();

      if (isTracking && isCalibrated) { formErrors = FormChecker.check(lm, currentEx, side); totalFormChecks++; if (!formErrors.length) passedFormChecks++; } else { formErrors = []; }
      
      const errFlash = document.getElementById('formErrorFlash');
      if (errFlash) {
        if (formErrors.length > 0) {
          errFlash.classList.add('bad'); formErrors.forEach(e => showFeedback(e.errorMsg, 'bad'));
          if (formErrors[0].voiceMsg) VoiceEngine.speak(formErrors[0].voiceMsg);
        } else { errFlash.classList.remove('bad'); }
      }

      const errorJointSet = new Set(formErrors.flatMap(e => e.highlightJoints || []));
      CanvasRenderer.drawSkeleton(ctx2d, lm, W, H, errorJointSet);
      CanvasRenderer.drawErrorLabels(ctx2d, lm, W, H, formErrors);

      if (isTracking && isCalibrated && !currentEx.isTimer) {
        if (joints.length >= 3 && !formErrors.length) {
          const [ai, bi, ci] = joints; const a = lm[ai], b = lm[bi], c = lm[ci];
          if (a && b && c && a.visibility > 0.45 && b.visibility > 0.45 && c.visibility > 0.45) {
            const angle = calcAngle(a, b, c);
            CanvasRenderer.drawAngleArc(ctx2d, a, b, c, angle, W, H);
            const prog = StateMachine.progress(angle, currentEx);
            const stageFill = document.getElementById('stageFill'); if(stageFill) stageFill.style.width = `${prog * 100}%`;
            const hudAngle = document.getElementById('hudAngle'); if(hudAngle) hudAngle.textContent = `∠ ${Math.round(angle)}°`;

            if (currentEx.bilateral) {
              const result = BilateralTracker.updateBilateral(lm, currentEx); const counts = BilateralTracker.getCounts();
              const bl = document.getElementById('biLeft'); if(bl) bl.textContent = counts.left;
              const br = document.getElementById('biRight'); if(br) br.textContent = counts.right;
              if (result.leftRep || result.rightRep) { reps = Math.max(counts.left, counts.right); registerRep(); }
            } else {
              if (StateMachine.update(angle, currentEx)) registerRep();
            }

            const smState = StateMachine.getState(); const badge = document.getElementById('stateBadge');
            if(badge) { badge.textContent = smState; badge.className = 'state-badge ' + smState.toLowerCase(); }
          }
        } else if (formErrors.length > 0) {
          const stageFill = document.getElementById('stageFill'); if(stageFill) stageFill.style.width = '0%';
        }
      }

      if (totalFormChecks > 5) {
        const pct = Math.round((passedFormChecks / totalFormChecks) * 100);
        const acc = document.getElementById('sAccuracy'); if(acc) acc.textContent = `${pct}%`;
      }
      ctx2d.restore();
    }

    function registerRep() {
      if (!currentEx.bilateral) reps++; totalReps++; calories += currentEx.calories || 0.2; goodRepsThisSet++;
      AudioEngine.repSound(reps, targetReps); showRepFlash(reps); updateRing(); updateStats();
      const el = document.getElementById('repCount');
      if(el){ el.style.transform = 'scale(1.35)'; el.style.color = currentEx.color; setTimeout(() => { el.style.transform = 'scale(1)'; el.style.color = 'inherit'; }, 220); }
      if (currentEx.voiceRep) { const msgs = currentEx.voiceRep; const msg = msgs[Math.min(reps - 1, msgs.length - 1)]; if (msg && reps !== lastVoiceRep) { VoiceEngine.speak(msg); lastVoiceRep = reps; } }
      if (currentEx.feedback && reps % 3 === 0) { showFeedback(currentEx.feedback[Math.floor(Math.random() * currentEx.feedback.length)], 'good'); }
      if (reps >= targetReps) { sets++; AudioEngine.repSound(targetReps, targetReps); VoiceEngine.speak('Well done! Set complete'); showNotif(`🎉 Set ${sets} complete! Take a rest`); setTimeout(() => resetCounter(true), 2600); }
    }

    function updateRing() {
      const pct = Math.min(reps / targetReps, 1); const offset = CIRCUMFERENCE * (1 - pct);
      const rf = document.getElementById('ringFill'); if(rf) rf.style.strokeDashoffset = offset;
      const rg = document.getElementById('ringGlow'); if(rg) rg.style.strokeDashoffset = offset;
      const rc = document.getElementById('repCount'); if(rc) rc.textContent = currentEx.bilateral ? Math.max(BilateralTracker.getCounts().left, BilateralTracker.getCounts().right) : reps;
    }

    function updateStats() {
      const sTR = document.getElementById('sTotalReps'); if(sTR) sTR.textContent = totalReps;
      const hTR = document.getElementById('hTotalReps'); if(hTR) hTR.textContent = totalReps;
      const sTS = document.getElementById('sTotalSets'); if(sTS) sTS.textContent = sets;
      const hTS = document.getElementById('hTotalSets'); if(hTS) hTS.textContent = sets;
      const sC = document.getElementById('sCalories'); if(sC) sC.textContent = Math.round(calories);
      const hC = document.getElementById('hCalories'); if(hC) hC.textContent = Math.round(calories);
    }

    function startPlankTimer() {
      plankSeconds = 0;
      plankInterval = setInterval(() => {
        plankSeconds++; const min = String(Math.floor(plankSeconds / 60)).padStart(2, '0'); const sec = String(plankSeconds % 60).padStart(2, '0');
        const rc = document.getElementById('repCount'); if(rc) rc.textContent = `${min}:${sec}`;
        const pct = Math.min(plankSeconds / 60, 1);
        const rf = document.getElementById('ringFill'); if(rf) rf.style.strokeDashoffset = CIRCUMFERENCE * (1 - pct);
        const rg = document.getElementById('ringGlow'); if(rg) rg.style.strokeDashoffset = CIRCUMFERENCE * (1 - pct);
        if (plankSeconds % 15 === 0) { AudioEngine.beep(600, 0.08, 0.2); if (plankSeconds % 30 === 0) VoiceEngine.speak('Hold it, you are strong'); }
        if (plankSeconds === 60) { VoiceEngine.speak('Great job! Full minute plank'); showNotif('🎉 Full minute plank! Legend!'); sets++; totalReps++; updateStats(); stopPlankTimer(); }
      }, 1000);
    }
    function stopPlankTimer() { clearInterval(plankInterval); plankInterval = null; }

    function toggleTracking() {
      if (!CameraManager.isReady()) { showNotif('⚠️ Turn on camera first'); return; }
      isTracking = !isTracking; const btn = document.getElementById('startBtn');
      if (isTracking) {
        if (!isCalibrated) { showNotif('⚠️ Ensure full body is in frame'); }
        AudioEngine.start(); StateMachine.reset(); BilateralTracker.reset(); goodRepsThisSet = 0; totalFormChecks = 0; passedFormChecks = 0;
        if(btn){ btn.className = 'ctrl-btn btn-pause'; btn.textContent = '⏸ Pause'; }
        showNotif(`💪 ${currentEx.name} — ${currentEx.camAngle}`); VoiceEngine.speak(`Start ${currentEx.name}`);
        if (currentEx.isTimer) startPlankTimer();
      } else {
        if(btn){ btn.className = 'ctrl-btn btn-go'; btn.textContent = '▶ Start'; }
        if (currentEx.isTimer) stopPlankTimer(); VoiceEngine.speak('Paused');
      }
    }

    function resetCounter(silent = false) {
      reps = 0; StateMachine.reset(); BilateralTracker.reset(); stopPlankTimer(); plankSeconds = 0; totalFormChecks = 0; passedFormChecks = 0; formErrors = []; lastVoiceRep = -1; goodRepsThisSet = 0;
      const rc = document.getElementById('repCount'); if(rc) rc.textContent = currentEx.isTimer ? '00:00' : '0';
      const rf = document.getElementById('ringFill'); if(rf) rf.style.strokeDashoffset = CIRCUMFERENCE;
      const rg = document.getElementById('ringGlow'); if(rg) rg.style.strokeDashoffset = CIRCUMFERENCE;
      const sf = document.getElementById('stageFill'); if(sf) sf.style.width = '0%';
      const sb = document.getElementById('stateBadge'); if(sb){ sb.textContent = 'IDLE'; sb.className = 'state-badge'; }
      const acc = document.getElementById('sAccuracy'); if(acc) acc.textContent = '—';
      const bl = document.getElementById('biLeft'); if(bl) bl.textContent = '0';
      const br = document.getElementById('biRight'); if(br) br.textContent = '0';
      const fFlash = document.getElementById('formErrorFlash'); if(fFlash) fFlash.classList.remove('bad');
      if (isTracking) toggleTracking(); if (!silent) { AudioEngine.reset(); showNotif('↺ Reset done'); }
    }

    function changeTarget(delta) { 
      targetReps = Math.max(1, targetReps + delta); 
      const ti = document.getElementById('targetInput'); 
      if(ti) ti.value = targetReps; 
      updateRing(); 
    }

    function toggleVoice() { const on = VoiceEngine.toggle(); const btn = document.getElementById('voiceToggle'); if(btn){ btn.textContent = on ? '🔊 Voice Coach: ON' : '🔇 Voice Coach: OFF'; btn.classList.toggle('active', on); } if (on) VoiceEngine.speak('Voice is ready'); }

    async function initCamera() {
      const cp = document.getElementById('camPlaceholder'); if(cp) cp.classList.add('hidden');
      if(videoEl) videoEl.style.display = 'block';
      const co = document.getElementById('calibrationOverlay'); if(co) co.classList.remove('hidden');
      showNotif('⏳ Loading AI Model...');
      const ok = await CameraManager.init(videoEl, onPoseResults);
      if (ok) {
        const ht = document.getElementById('hudTop'); if(ht) ht.style.display = 'flex';
        showNotif('✅ Camera ready — step back until full body is in frame');
      } else {
        if(cp) cp.classList.remove('hidden'); showNotif('❌ Failed to access camera — Check permissions', 'var(--danger)');
      }
    }

    function selectExercise(ex, btn) {
      document.querySelectorAll('.ex-tab').forEach(b => b.classList.remove('active')); btn.classList.add('active');
      currentEx = ex; if (isTracking) toggleTracking(); resetCounter(true); StateMachine.reset(); BilateralTracker.reset(); isCalibrated = false; updateExerciseUI();
    }

    function buildTabs() {
      const sel = document.getElementById('exSelector'); if(!sel) return;
      sel.innerHTML = '';
      EXERCISES.forEach((ex, i) => {
        const btn = document.createElement('div'); btn.className = 'ex-tab' + (i === 0 ? ' active' : '');
        btn.innerHTML = `<span class="ex-emoji">${ex.emoji}</span><span class="ex-label">${ex.name}</span>${ex.bilateral ? '<span class="bilateral-badge">Bilateral</span>' : ''}`;
        btn.onclick = () => selectExercise(ex, btn); sel.appendChild(btn);
      });
      updateExerciseUI();
    }

    function updateExerciseUI() {
      const ei = document.getElementById('exIcon'); if(ei) ei.textContent = currentEx.emoji;
      const et = document.getElementById('exTitle'); if(et) et.textContent = currentEx.name;
      const ed = document.getElementById('exDesc'); if(ed) ed.textContent = currentEx.desc;
      
      const exImg = document.getElementById('exFullImg'); 
      if(exImg) exImg.src = `/${currentEx.id}.png`; 
      
      const rf = document.getElementById('ringFill'); if(rf) rf.style.stroke = currentEx.color;
      const rg = document.getElementById('ringGlow'); if(rg) rg.style.stroke = currentEx.color;
      const biDisplay = document.getElementById('bilateralDisplay'); if(biDisplay) { if (currentEx.bilateral) biDisplay.classList.add('visible'); else biDisplay.classList.remove('visible'); }

      // Hide target row for timer-based exercises (plank)
      const targetRow = document.getElementById('targetRow');
      if(targetRow) { targetRow.style.display = currentEx.isTimer ? 'none' : ''; }
      const ringSub = document.getElementById('ringSub');
      if(ringSub) { ringSub.textContent = currentEx.isTimer ? 'TIME' : 'REPS'; }
    }

    function showNotif(text, color) {
      const el = document.getElementById('notif'); if(!el) return; el.textContent = text; el.style.borderColor = color || 'var(--border)'; el.classList.add('show');
      clearTimeout(notifTimer); notifTimer = setTimeout(() => el.classList.remove('show'), 3200);
    }
    function showRepFlash(num) {
      const el = document.getElementById('repFlash'); const numEl = document.getElementById('repFlashNum'); if(!el || !numEl) return;
      numEl.textContent = num; numEl.style.color = currentEx.color; el.classList.remove('boom'); void el.offsetWidth; el.classList.add('boom');
    }
    function showFeedback(text, type = 'good') {
      if (activeFeedback.has(text)) return; activeFeedback.add(text); const bar = document.getElementById('feedbackBar'); if(!bar) return;
      const chip = document.createElement('div'); chip.className = `fb-chip${type === 'warn' ? ' warn' : type === 'bad' ? ' bad' : ''}`; chip.textContent = text;
      bar.appendChild(chip); setTimeout(() => chip.classList.add('show'), 40); setTimeout(() => { chip.classList.remove('show'); setTimeout(() => { chip.remove(); activeFeedback.delete(text); }, 320); }, 2600);
    }

    window.toggleTrackingCT = toggleTracking;
    window.resetCounterCT = resetCounter;
    window.changeTargetCT = changeTarget;
    window.toggleVoiceCT = toggleVoice;
    window.initCameraCT = initCamera;

    const targetInput = document.getElementById('targetInput');
    if (targetInput) {
      targetInput.addEventListener('change', (e) => {
        const val = parseInt(e.target.value);
        if (!isNaN(val) && val > 0) {
          targetReps = val;
          updateRing();
        } else {
          e.target.value = targetReps;
        }
      });
    }

    buildTabs();
    const initBtn = document.getElementById('initBtn');
    if (initBtn) initBtn.onclick = initCamera;

    return () => {
      CameraManager.stop();
      if(window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [scriptsLoaded]);

  return (
    <MainLayout title="Count Train" subtitle="AI Gym Tracker">
      {!scriptsLoaded ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading AI Models...</p>
        </div>
      ) : (
        <>
        <style>{`
          .ex-full-img-zoom { cursor: zoom-in; transition: transform 0.15s; }
          .ex-full-img-zoom:hover { transform: scale(1.04); }
          .img-zoom-modal { display: none; position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.88); align-items: center; justify-content: center; }
          .img-zoom-modal.open { display: flex; }
          .img-zoom-content { max-width: 90vw; max-height: 88vh; border-radius: 12px; box-shadow: 0 8px 48px rgba(0,0,0,0.7); object-fit: contain; }
          .img-zoom-close { position: absolute; top: 18px; right: 24px; color: #fff; font-size: 28px; cursor: pointer; opacity: 0.8; line-height: 1; }
          .img-zoom-close:hover { opacity: 1; }
        `}</style>
        <div className="count-train-wrapper" dir="ltr">
          <div className="app">
            {/* ===== HEADER ===== */}
            <div className="header">
              <div className="header-stats ct-header-stats-wide">
                <div className="hstat"><div className="hstat-val" id="hTotalReps">0</div><div className="hstat-lbl">Reps</div></div>
                <div className="hstat"><div className="hstat-val" id="hTotalSets">0</div><div className="hstat-lbl">Sets</div></div>
                <div className="hstat"><div className="hstat-val" id="hCalories">0</div><div className="hstat-lbl">Cals</div></div>
              </div>
            </div>

            {/* ===== EXERCISE TABS ===== */}
            <div className="ex-selector" id="exSelector"></div>

            {/* ===== MAIN GRID ===== */}
            <div className="main-grid">

              {/* Camera / Canvas Zone */}
              <div className="cam-wrapper" id="camWrapper">
                <div className="cam-placeholder" id="camPlaceholder">
                  <div className="cam-guide">
                    <div className="cam-guide-title">📷 Start Training</div>
                  </div>
                  <button className="start-btn" id="initBtn" onClick={() => window.initCameraCT && window.initCameraCT()}>🎯 Start Smart Tracking</button>
                  <div className="ct-guide-text">
                    Your skeleton will be drawn, side automatically detected, and form validated.
                  </div>
                </div>

                <video id="videoFeed" autoPlay muted playsInline className="ct-hidden-start"></video>
                <canvas id="poseCanvas"></canvas>
                <div className="cam-overlay"></div>
                <div className="form-error-flash" id="formErrorFlash"></div>

                <div id="calibrationOverlay" className="hidden">
                  <div className="calib-instruction" id="calibInstruction">📐 Step back until your full body is in frame</div>
                </div>

                <div className="hud-top ct-hidden-start" id="hudTop">
                  <div className="hud-badge"><div className="hud-dot"></div> AI LIVE</div>
                  <div id="sideHud">⟳ Detecting side...</div>
                  <div className="hud-badge ct-text-warn" id="hudAngle">∠ —°</div>
                </div>

                <div className="bilateral-display" id="bilateralDisplay">
                  <div className="bi-side"><div className="bi-side-lbl">Left</div><div className="bi-side-val" id="biLeft">0</div></div>
                  <div className="bi-side"><div className="bi-side-lbl">Right</div><div className="bi-side-val" id="biRight">0</div></div>
                </div>

                <div className="feedback-bar" id="feedbackBar"></div>
                <div className="stage-bar"><div className="stage-fill" id="stageFill"></div></div>
              </div>

              {/* ===== SIDE PANEL ===== */}
              <div className="side-panel">
                <div className="ex-card">
                  <div className="ex-card-header">
                    <span className="ex-icon" id="exIcon">🏋️‍♂️</span>
                    <div>
                      <div className="ex-card-title" id="exTitle">Select Exercise</div>
                      <div className="ex-card-sub" id="exDesc">—</div>
                    </div>
                  </div>
                  <div className="ex-card-body ct-flex-center">
                    {/* Unified Image Display */}
                    <img 
                      id="exFullImg" 
                      className="ex-full-img ex-full-img-zoom" 
                      src="/squat.png" 
                      alt="Exercise Form"
                      onClick={() => {
                        const modal = document.getElementById('imgZoomModal');
                        const modalImg = document.getElementById('imgZoomModalImg');
                        const src = document.getElementById('exFullImg')?.src;
                        if(modal && modalImg && src){ modalImg.src = src; modal.classList.add('open'); }
                      }}
                      title="Click to zoom"
                    />
                  </div>
                </div>

                <div className="counter-card">
                  <div className="target-row" id="targetRow">
                    <button className="target-btn" onClick={() => window.changeTargetCT && window.changeTargetCT(-1)}>−</button>
                    <span className="target-label">Target</span>
                    <input 
                      type="number" 
                      id="targetInput" 
                      className="target-input" 
                      defaultValue="12" 
                      min="1" 
                      max="100" 
                      aria-label="Target Reps"
                      title="Target Reps"
                    />
                    <span className="target-label">Reps</span>
                    <button className="target-btn" onClick={() => window.changeTargetCT && window.changeTargetCT(1)}>+</button>
                  </div>

                  <div className="ring-wrap">
                    <svg className="ring-svg" width="185" height="185" viewBox="0 0 160 160">
                      <circle className="ring-track" cx="80" cy="80" r="68"/>
                      <circle className="ring-glow" id="ringGlow" cx="80" cy="80" r="68" stroke="#00e5ff" strokeDasharray="427" strokeDashoffset="427"/>
                      <circle className="ring-fill" id="ringFill" cx="80" cy="80" r="68" stroke="#00e5ff" strokeDasharray="427" strokeDashoffset="427"/>
                    </svg>
                    <div className="ring-num"><div className="ring-val" id="repCount">0</div><div className="ring-sub" id="ringSub">REPS</div></div>
                  </div>

                  <div className="state-badge" id="stateBadge">IDLE</div>

                  <div className="controls">
                    <button className="ctrl-btn btn-go" id="startBtn" onClick={() => window.toggleTrackingCT && window.toggleTrackingCT()}>▶ Start</button>
                    <button className="ctrl-btn btn-reset" onClick={() => window.resetCounterCT && window.resetCounterCT()}>↺ Reset</button>
                  </div>

                  <button className="voice-toggle" id="voiceToggle" onClick={() => window.toggleVoiceCT && window.toggleVoiceCT()}>
                    🔇 Voice Coach: OFF
                  </button>
                </div>
              </div>
            </div>

            {/* ===== STATS ROW ===== */}
            <div className="stats-row ct-mt-14">
              <div className="stat-card"><div className="stat-icon">🔥</div><div className="stat-val ct-text-danger" id="sTotalReps">0</div><div className="stat-lbl">Total Reps</div></div>
              <div className="stat-card"><div className="stat-icon">🏆</div><div className="stat-val ct-text-warn" id="sTotalSets">0</div><div className="stat-lbl">Completed Sets</div></div>
              <div className="stat-card"><div className="stat-icon">⚡</div><div className="stat-val ct-text-accent" id="sCalories">0</div><div className="stat-lbl">Calories Burned</div></div>
              <div className="stat-card"><div className="stat-icon">🎯</div><div className="stat-val ct-text-success" id="sAccuracy">—</div><div className="stat-lbl">Form Accuracy</div></div>
            </div>

          </div>

          <div className="notif-wrap"><div className="notif" id="notif"></div></div>
          <div className="rep-flash" id="repFlash"><div className="rep-num" id="repFlashNum"></div></div>

          {/* Image Zoom Modal */}
          <div 
            id="imgZoomModal" 
            className="img-zoom-modal"
            onClick={() => document.getElementById('imgZoomModal')?.classList.remove('open')}
          >
            <div className="img-zoom-close">✕</div>
            <img id="imgZoomModalImg" src="" alt="Exercise Form Zoomed" className="img-zoom-content" />
          </div>
        </div>
        </>
      )}
    </MainLayout>
  );
}