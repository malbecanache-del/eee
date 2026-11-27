/* =====================================================================
   La torre de Vela — CONTROLES TÁCTILES (v9)
   Solo se activa en celulares/tablets (o con ?touch=1 para probar en PC).
   Izquierda: joystick flotante (tirá más allá del aro para correr).
   Derecha: arrastrá para mirar + botones ⚔ 🛡 ⤒ ⟲ E.
   ===================================================================== */
(() => {
'use strict';
if (typeof IS_TOUCH === 'undefined' || !IS_TOUCH) return;
const $$ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const SAFE = s => `calc(env(safe-area-inset-${s},0px) + `;

document.head.insertAdjacentHTML('beforeend', `<style>
#tc{position:fixed;inset:0;z-index:5;pointer-events:none;touch-action:none}
#tc .z{position:absolute;pointer-events:auto;touch-action:none}
#jz{left:0;bottom:0;width:44%;height:72%}
#lz{right:0;top:0;width:56%;height:100%}
#tc .b{position:absolute;pointer-events:auto;touch-action:none;border-radius:50%;background:rgba(20,22,48,.55);border:2px solid rgba(255,255,255,.35);color:#f3ead7;display:flex;align-items:center;justify-content:center;font-size:24px;line-height:1;-webkit-user-select:none;user-select:none}
#tc .b.on{background:rgba(255,195,107,.5);border-color:#ffc36b}
#tc .b small{position:absolute;bottom:-14px;font-size:10px;opacity:.7}
#ja,#jk{position:absolute;border-radius:50%;display:none;pointer-events:none}
#ja{width:110px;height:110px;margin:-55px 0 0 -55px;border:2px solid rgba(255,255,255,.3);background:rgba(20,22,48,.25)}
#jk{width:50px;height:50px;margin:-25px 0 0 -25px;background:rgba(255,195,107,.55);border:2px solid #ffc36b}
#bA{right:${SAFE('right')}22px);bottom:${SAFE('bottom')}26px);width:88px;height:88px;font-size:34px}
#bD{right:${SAFE('right')}124px);bottom:${SAFE('bottom')}22px);width:60px;height:60px}
#bB{right:${SAFE('right')}20px);bottom:${SAFE('bottom')}128px);width:62px;height:62px}
#bJ{right:${SAFE('right')}98px);bottom:${SAFE('bottom')}98px);width:56px;height:56px}
#bE{right:${SAFE('right')}170px);bottom:${SAFE('bottom')}96px);width:52px;height:52px;font-weight:700;font-size:20px}
body.pn #tc,body.stt #tc{display:none}
#dlg,#hint{z-index:6!important;pointer-events:auto}
#ov{z-index:8!important}
#rot{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9;background:rgba(20,22,48,.92);border:1px solid var(--amber);border-radius:12px;padding:14px 18px;text-align:center;font-size:15px;max-width:76vw;display:none}
</style>`);

document.body.insertAdjacentHTML('beforeend', `<div id="tc"><div class="z" id="jz"></div><div class="z" id="lz"></div><div id="ja"></div><div id="jk"></div>
<div class="b" id="bA">⚔</div><div class="b" id="bD">⟲</div><div class="b" id="bB">🛡</div><div class="b" id="bJ">⤒</div><div class="b" id="bE">E</div></div>
<div id="rot">📱 Girá el celular en horizontal<br>para jugar más cómodo<br><small style="opacity:.7">(tocá para cerrar)</small></div>`);

/* ---------- joystick flotante ---------- */
const jz = $$('jz'), ja = $$('ja'), jk = $$('jk'), R = 55;
let jid = null, ox = 0, oy = 0;
const key = (a, on) => { if (on) down[KB[a]] = 1; else delete down[KB[a]]; };
function applyStick(nx, ny, run) {
  key('left', nx < -.35); key('right', nx > .35); key('fwd', ny < -.35); key('back', ny > .35); key('run', run && ny < -.35);
}
function stickEnd() { jid = null; ja.style.display = jk.style.display = 'none'; applyStick(0, 0, false); }
jz.addEventListener('pointerdown', e => {
  if (jid !== null) return; e.preventDefault(); e.stopPropagation(); jid = e.pointerId; jz.setPointerCapture(e.pointerId); ox = e.clientX; oy = e.clientY;
  ja.style.cssText = `display:block;left:${ox}px;top:${oy}px`; jk.style.cssText = `display:block;left:${ox}px;top:${oy}px`;
});
jz.addEventListener('pointermove', e => {
  if (e.pointerId !== jid) return; e.preventDefault(); e.stopPropagation();
  let dx = e.clientX - ox, dy = e.clientY - oy; const l = Math.hypot(dx, dy), run = l > R * 1.45, c = Math.min(l, R) / (l || 1);
  jk.style.left = ox + dx * c + 'px'; jk.style.top = oy + dy * c + 'px'; applyStick(dx / R, dy / R, run);
});
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) jz.addEventListener(ev, e => { if (e.pointerId === jid) stickEnd(); });

/* ---------- cámara: arrastrar en la mitad derecha ---------- */
const lz = $$('lz'); let lid = null, lx = 0, ly = 0;
lz.addEventListener('pointerdown', e => { if (lid !== null) return; e.preventDefault(); e.stopPropagation(); lid = e.pointerId; lz.setPointerCapture(e.pointerId); lx = e.clientX; ly = e.clientY; });
lz.addEventListener('pointermove', e => {
  if (e.pointerId !== lid) return; e.preventDefault(); e.stopPropagation();
  const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
  yaw -= dx * cfg.sens * 1.8; pitch = clamp(pitch + (cfg.inv ? -1 : 1) * dy * cfg.sens * 1.8, .12, 1.15);
});
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) lz.addEventListener(ev, e => { if (e.pointerId === lid) lid = null; });

/* ---------- botones ---------- */
function btn(id, down_, up_) {
  const b = $$(id); let pid = null;
  b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); pid = e.pointerId; b.setPointerCapture(e.pointerId); b.classList.add('on'); if (navigator.vibrate) try { navigator.vibrate(8); } catch (er) {} down_(); });
  const end = e => { if (e.pointerId !== pid) return; pid = null; b.classList.remove('on'); if (up_) up_(); };
  b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end); b.addEventListener('lostpointercapture', end);
}
btn('bA', () => { atkReq = true; });
btn('bB', () => { blk = true; }, () => { blk = false; });
btn('bJ', () => { jumpReq = true; });
btn('bD', () => { dodgeReq = true; });
btn('bE', () => { if (!panel) interact(); });

/* ---------- evitar eventos de mouse "fantasma", zoom y scroll ---------- */
const uiSel = '#ov,#st,#chat,#dlg,#hint,#dead,#vic,#xo,#tb,button,input,select,textarea';
for (const t of ['mousedown', 'mouseup', 'contextmenu', 'wheel']) addEventListener(t, e => { if (e.target.closest && e.target.closest(uiSel)) return; e.stopImmediatePropagation(); }, true);
addEventListener('pointermove', e => { if (e.pointerType === 'touch' && !(e.target.closest && e.target.closest(uiSel))) e.stopImmediatePropagation(); }, true);
document.addEventListener('touchmove', e => { if (!(e.target.closest && e.target.closest('#ov .card,#chat,#st,#vic'))) e.preventDefault(); }, { passive: false });
for (const g of ['gesturestart', 'gesturechange']) document.addEventListener(g, e => e.preventDefault());
let lastTap = 0; document.addEventListener('touchend', e => { const n = Date.now(); if (n - lastTap < 300 && !(e.target.closest && e.target.closest('input,textarea'))) e.preventDefault(); lastTap = n; }, { passive: false });

/* textos del juego pensados para teclado -> versión táctil */
for (const id of ['hint', 'dnext']) {
  const el = $$(id); let busy = false;
  new MutationObserver(() => { if (busy) return; const t = el.textContent, n = t.replace(/^Tecla \S+ para /, 'Tocá para ').replace(/ con \S+$/, id == 'dnext' ? ' tocando acá' : '$&'); if (n !== t) { busy = true; el.textContent = n; busy = false; } }).observe(el, { childList: true, characterData: true, subtree: true });
}

/* ocultar controles con menús / título abiertos */
setInterval(() => { document.body.classList.toggle('pn', !!panel); document.body.classList.toggle('stt', $$('st').style.display !== 'none'); document.body.classList.toggle('chatopen', document.activeElement === $$('ci')); }, 150);

/* pantalla completa, bloqueo de horizontal y pantalla siempre encendida al jugar */
if (window.UI) UI.onPlay(() => {
  const de = document.documentElement;
  try { const r = de.requestFullscreen && de.requestFullscreen({ navigationUI: 'hide' }); if (r && r.then) r.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {}); } catch (e) {}
  try { if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(() => {}); } catch (e) {}
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && $$('st').style.display === 'none') try { navigator.wakeLock && navigator.wakeLock.request('screen').catch(() => {}); } catch (e) {} });

/* aviso de orientación */
const rot = $$('rot'); function chk() { if (innerHeight > innerWidth * 1.05 && !chk.done) rot.style.display = 'block'; else rot.style.display = 'none'; }
rot.onclick = () => { chk.done = true; rot.style.display = 'none'; }; addEventListener('resize', chk); chk();
})();
