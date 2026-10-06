// Synthesised sound, off until chosen. The DOM button lives in hud.js.
export function createSound(){
  let actx = null, on = false, eng = null;
  function init(){
    if(actx){ if(actx.state === 'suspended') void actx.resume(); return; }
    actx = new AudioContext();
    const o = actx.createOscillator(), f = actx.createBiquadFilter(), g = actx.createGain();
    o.type = 'sawtooth'; o.frequency.value = 60; f.type = 'lowpass'; f.frequency.value = 380; g.gain.value = 0;
    o.connect(f); f.connect(g); g.connect(actx.destination); o.start();
    eng = { o, g };
  }
  function tone(freq, dur, type='sine', gain=0.15, slide){
    if(!on || !actx) return;
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, t); if(slide) o.frequency.exponentialRampToValueAtTime(slide, t+dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t+0.01); g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t+dur+0.03);
  }
  const sfx = {
    honk(){ tone(415, 0.28, 'square', 0.07); tone(523, 0.28, 'square', 0.06); },
    thud(v){ tone(120 + Math.random()*60, 0.16, 'triangle', Math.min(0.25, 0.04 + v*0.02), 70); },
    clink(v){ tone(900 + Math.random()*400, 0.25, 'sine', Math.min(0.12, 0.03 + v*0.01)); },
    boing(){ tone(280, 0.22, 'sine', 0.12, 720); },
    bump(){ tone(90, 0.2, 'square', 0.08, 50); },
  };
  function setOn(v){ on = v; if(!on && eng) eng.g.gain.value = 0; }
  // Engine hum: pass the vehicle speed, or null to silence it.
  function engine(speed){
    if(!eng) return;
    if(!on || speed == null){ eng.g.gain.value = 0; return; }
    eng.o.frequency.value = 55 + Math.abs(speed)*7; eng.g.gain.value = 0.018 + Math.abs(speed)*0.0028;
  }
  document.addEventListener('visibilitychange', () => { if(!actx) return; if(document.hidden) void actx.suspend(); else void actx.resume(); });
  return { init, setOn, get on(){ return on; }, get ctx(){ return actx; }, tone, sfx, engine };
}
