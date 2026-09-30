// Keyboard, touch and wheel input. Movement is exposed as a shared `keys` object; one-shot
// presses become bus events "action:<name>". Works with real keys and with CDP
// Input.dispatchKeyEvent (rawKeyDown / keyUp), including events that carry only a keyCode or key.
const MOVE = { ArrowUp:'up', KeyW:'up', ArrowDown:'down', KeyS:'down', ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right', Space:'brake', ShiftLeft:'boost', ShiftRight:'boost' };
const ACTIONS = { KeyH:'honk', KeyR:'reset', KeyE:'interact', KeyF:'interact', Enter:'interact', Escape:'exit' };   // F is the interact key the hints name; E stays until the key contract lands
const KEYCODES = { 8:'Backspace', 9:'Tab', 13:'Enter', 16:'ShiftLeft', 17:'ControlLeft', 18:'AltLeft', 27:'Escape', 32:'Space', 37:'ArrowLeft', 38:'ArrowUp', 39:'ArrowRight', 40:'ArrowDown' };
const KEYNAMES = { ' ':'Space', Shift:'ShiftLeft', Enter:'Enter', Escape:'Escape', Esc:'Escape', ArrowUp:'ArrowUp', ArrowDown:'ArrowDown', ArrowLeft:'ArrowLeft', ArrowRight:'ArrowRight', Tab:'Tab' };

export function codeOf(e){
  if(e.code) return e.code;
  const k = e.keyCode || e.which;
  if(KEYCODES[k]) return KEYCODES[k];
  if(k >= 65 && k <= 90) return 'Key' + String.fromCharCode(k);
  if(k >= 48 && k <= 57) return 'Digit' + (k - 48);
  if(e.key && e.key.length === 1 && /[a-z]/i.test(e.key)) return 'Key' + e.key.toUpperCase();
  return KEYNAMES[e.key] || '';
}

export function createInput({ state, bus }){
  const keys = { up:false, down:false, left:false, right:false, brake:false, boost:false };
  const held = new Set();
  const typing = t => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

  function press(code, down, repeat=false, ev=null){
    if(down){
      held.add(code);
      if(MOVE[code]){ keys[MOVE[code]] = true; ev?.preventDefault(); }
      bus.emit('key', { code, down:true, repeat });
      if(ACTIONS[code] && !repeat) bus.emit('action:' + ACTIONS[code], { code });
    } else {
      held.delete(code);
      if(MOVE[code]) keys[MOVE[code]] = false;
      bus.emit('key', { code, down:false, repeat:false });
    }
  }
  function clear(){ for(const k in keys) keys[k] = false; held.clear(); }

  addEventListener('keydown', e => { if(!state.started || typing(e.target)) return; press(codeOf(e), true, e.repeat, e); });
  addEventListener('keyup', e => { press(codeOf(e), false); });
  addEventListener('blur', clear);

  document.querySelectorAll('#touch button').forEach(b => {
    const k = b.dataset.k;
    const on = e => { e.preventDefault(); b.classList.add('on'); if(k === 'honk') bus.emit('action:honk', { code:'touch' }); else keys[k] = true; b.setPointerCapture?.(e.pointerId); };
    const off = () => { b.classList.remove('on'); if(k !== 'honk') keys[k] = false; };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('lostpointercapture', off);
  });
  addEventListener('wheel', e => { if(!state.started) return; state.zoom = Math.max(0.6, Math.min(1.7, state.zoom * (e.deltaY > 0 ? 1.08 : 0.93))); }, { passive:true });

  return {
    keys,                                   // movement intent, read every frame
    isDown: code => held.has(code),         // any key by KeyboardEvent.code
    on: (action, fn) => bus.on('action:' + action, fn),   // 'honk' | 'reset' | 'interact' | 'exit' | anything you emit
    trigger: action => bus.emit('action:' + action, { code:'synthetic' }),
    press: (code, down) => press(code, down),             // synthetic key, bypasses the started gate
    clear,
    ACTIONS, MOVE,
  };
}
