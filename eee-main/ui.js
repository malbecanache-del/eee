/* =====================================================================
   La torre de Vela — INTERFAZ (v9)
   Pantalla de carga/título, HUD (vida, aguante, minimapa, jefe, jugadores),
   menús mejorados, pantalla de muerte, victoria cooperativa y final.
   Funciona igual en PC y celular (los controles táctiles están en mobile.js).
   ===================================================================== */
(() => {
'use strict';
const $$ = id => document.getElementById(id);
const mp = () => window.MP || {};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TOUCH = typeof IS_TOUCH !== 'undefined' && IS_TOUCH;
const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };

/* ---------- estilos ---------- */
document.head.insertAdjacentHTML('beforeend', `<style>
:root{--hp1:#ff7a56;--hp2:#c8301e;--st:#ffc36b;--line:rgba(255,255,255,.16)}
body{overscroll-behavior:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}
#lc{position:fixed;left:14px;top:calc(env(safe-area-inset-top,0px) + 14px);display:flex;flex-direction:column;gap:8px;width:min(290px,50vw);z-index:2;pointer-events:none}
#lc>.p,#lc>div{position:static!important;max-width:none!important;box-sizing:border-box}
#rc{position:fixed;right:14px;top:calc(env(safe-area-inset-top,0px) + 14px);display:flex;flex-direction:column;align-items:flex-end;gap:8px;z-index:2;pointer-events:none}
#rc>.p{position:static!important}#rc>#mm{position:relative!important;flex:none}
#pc{padding:9px 12px 8px}
#pc .pn{display:flex;justify-content:space-between;align-items:baseline;font-size:14px;margin-bottom:5px}
#pc .pn b{color:var(--amber);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:60%}
#pc .pn span{font-size:12px;opacity:.75}
.bar{position:relative;height:16px;border-radius:8px;background:rgba(10,12,28,.85);border:1px solid var(--line);overflow:hidden}
.bar i{position:absolute;left:0;top:0;bottom:0;border-radius:7px}
.bar.hp .g{background:#f3e3c0;opacity:.8}.bar.hp .f{background:linear-gradient(var(--hp1),var(--hp2))}
.bar.hp.low .f{animation:lowhp .7s infinite alternate}
@keyframes lowhp{from{filter:brightness(1)}to{filter:brightness(1.7)}}
.bar span{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;text-shadow:0 1px 2px #000;letter-spacing:.03em}
#hpp{position:absolute;right:10px;top:-2px;font-weight:700;font-size:15px;opacity:0;transition:opacity .5s;pointer-events:none;text-shadow:0 1px 3px #000}
#pc #sta{position:static!important;width:auto!important;height:7px!important;padding:0!important;margin-top:6px;background:rgba(10,12,28,.85)!important;border:1px solid var(--line);border-radius:5px;overflow:hidden}
#pc #sta i{border-radius:5px}
#pc .rs{display:flex;justify-content:space-between;align-items:center;margin-top:6px;font-size:12px;opacity:.9}
#pc #mode{position:static!important;padding:1px 7px!important;font-size:11px!important;background:rgba(255,195,107,.18)!important;color:var(--amber)}
#obj{font-size:13px!important;line-height:1.35}
#pl{padding:6px 10px;font-size:12px;display:none}
#pl .h{opacity:.7;margin-bottom:3px}
#pl .r{display:flex;align-items:center;gap:6px;margin-top:3px}
#pl .r b{font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#pl .r i{display:block;width:46px;height:5px;border-radius:3px;background:rgba(255,255,255,.15);overflow:hidden}
#pl .r i u{display:block;height:100%;background:var(--hp1)}
#mm{position:relative;width:132px;height:132px;border-radius:50%;overflow:hidden;border:2px solid rgba(255,195,107,.55);background:#0b0d1c;padding:0}
#mm canvas{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;display:block}
#mm b{position:absolute;left:50%;top:2px;transform:translateX(-50%);font-size:11px;color:var(--amber);text-shadow:0 1px 2px #000}
#inf{font-size:12px!important;padding:6px 10px!important;min-width:0!important}
#tb{display:flex;gap:6px;pointer-events:auto;margin-right:2px}
#tb button,#xo{font:inherit;font-size:15px;line-height:1;width:38px;height:38px;border-radius:50%;background:var(--panel);color:var(--ink);border:1px solid var(--line);cursor:pointer;padding:0}
#tb button:active,#xo:active{background:#3a4180}#xo{position:fixed;left:calc(50% + 244px);top:50px;display:none;z-index:8}
#bb{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 12px);transform:translateX(-50%);width:min(520px,60vw);padding:7px 12px 8px;display:none;z-index:2;text-align:center}
#bb .n{font-size:14px;color:var(--amber);letter-spacing:.08em;margin-bottom:4px}
#bb .n small{opacity:.7;letter-spacing:0;margin-left:8px;color:var(--ink)}
#bb .bar{height:15px}#bb .bar .f{background:linear-gradient(#ffcf70,#c8501e)}#bb .bar .g{background:#f3e3c0;opacity:.8}
#bb .m{position:absolute;top:0;bottom:0;width:2px;background:rgba(255,255,255,.55)}
#xo{position:fixed;right:calc(env(safe-area-inset-right,0px) + 14px);top:calc(env(safe-area-inset-top,0px) + 14px);display:none;z-index:8}
#ov .card{max-height:84vh}
.card .mrow{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0}
.card select,.card input[type=text]{font:inherit;background:#232852;color:var(--ink);border:1px solid var(--line);border-radius:8px;padding:5px 8px}
.card .warn{background:#5a2020!important;border-color:#a04040!important}
.card table{border-collapse:collapse;font-size:13px;width:100%}.card td,.card th{padding:3px 8px 3px 0;text-align:left;border-bottom:1px solid var(--line)}
#dead,#vic{position:fixed;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;gap:12px;text-align:center;z-index:7;opacity:0;transition:opacity 1.2s}
#dead{background:radial-gradient(rgba(60,0,0,.55),rgba(8,0,0,.92))}
#dead h2,#vic h2{font-size:clamp(30px,7vw,60px);margin:0;letter-spacing:.1em;color:#d9482b}
#vic{background:radial-gradient(rgba(70,50,10,.6),rgba(8,6,2,.93))}#vic h2{color:var(--amber)}
#dead p,#vic p{margin:0;max-width:min(460px,88vw);line-height:1.45}
.bt{font:inherit;font-size:18px;background:#3a2a1a;color:var(--ink);border:1px solid var(--amber);border-radius:8px;padding:9px 24px;cursor:pointer;pointer-events:auto}
.bt[disabled]{opacity:.45;cursor:default}
.bt.alt{background:#232852;border-color:var(--line)}
#vic table{font-size:15px;min-width:min(340px,80vw)}#vic td{padding:3px 12px;border-bottom:1px solid var(--line)}#vic td:last-child{text-align:right;color:var(--amber)}
#st{overflow:auto;padding:18px;box-sizing:border-box}
#st .sub{opacity:.8;max-width:520px}
#st input{font:inherit;font-size:16px;padding:7px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.3);background:rgba(20,22,48,.8);color:var(--ink);text-align:center;width:min(260px,80vw);box-sizing:border-box}
#ldw{width:min(360px,84vw)}
#ldb{height:10px;border-radius:6px;background:rgba(255,255,255,.14);overflow:hidden;border:1px solid var(--line)}
#ldb i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ff9a3a,#ffd070);transition:width .25s}
#ldt{font-size:13px;opacity:.85;margin-top:6px;min-height:1.3em}
#st .row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;align-items:center}
#st .small{font-size:12px;opacity:.7;max-width:480px;line-height:1.4}
#st .lnk{font:inherit;font-size:13px;background:transparent;color:var(--amber);border:none;text-decoration:underline;cursor:pointer;padding:2px 6px}
.cin #lc,.cin #rc,.cin #bb,.cin #eb,.cin #dn,.cin #tc{display:none!important}
@media (max-width:820px),(pointer:coarse){
 #lc{left:8px;top:calc(env(safe-area-inset-top,0px) + 8px);width:min(210px,40vw);gap:5px}
 #rc{right:8px;top:calc(env(safe-area-inset-top,0px) + 8px)}
 #pc{padding:6px 8px 6px}#pc .pn{font-size:12px;margin-bottom:3px}.bar{height:14px}.bar span{font-size:10px}
 #obj{font-size:11px!important;padding:6px 8px!important}#obj small{display:none}
 #mm{width:92px;height:92px}#inf{display:none!important}
 #tb button{width:34px;height:34px;font-size:14px}
 #help{display:none!important}
 #bb{width:min(420px,56vw);top:calc(env(safe-area-inset-top,0px) + 6px)}
 #xo{left:auto;right:calc(env(safe-area-inset-right,0px) + 14px);top:calc(env(safe-area-inset-top,0px) + 56px)}
 #dlg{bottom:calc(env(safe-area-inset-bottom,0px) + 150px)!important;font-size:15px!important;max-width:calc(100vw - 330px)!important;left:12px!important;transform:none!important}
 #hint{bottom:46%!important}
 #pl{display:none!important}
 #chat{display:none!important}
 body.chatopen #chat{display:block!important;bottom:calc(env(safe-area-inset-bottom,0px) + 12px)!important;left:50%!important;transform:translateX(-50%);width:min(420px,80vw)!important;z-index:9}
}
</style>`);

/* ---------- estructura del HUD ---------- */
document.body.insertAdjacentHTML('beforeend', `
<div id="lc"><div id="pc" class="p"><div class="pn"><b id="pnm">Viajero</b><span id="plv"></span></div>
 <div class="bar hp" id="hpb"><i class="g" id="hpg"></i><i class="f" id="hpf"></i><span id="hpt">100 / 100</span><em id="hpp"></em></div></div>
 <div id="pl" class="p"></div></div>
<div id="rc"><div id="tb"><button id="tm" title="Menú (Esc)">☰</button><button id="ti" title="Inventario (Tab)">🎒</button><button id="tmp" title="Mapa (M)">🗺</button><button id="tch" title="Chat (Enter)" style="display:none">💬</button></div>
 <div id="mm" class="p"><canvas id="mmc" width="132" height="132"></canvas><b>N</b></div></div>
<div id="bb" class="p"><div class="n">DRAGÓN ANCESTRAL<small id="bbs"></small></div><div class="bar hp"><i class="g" id="bbg"></i><i class="f" id="bbf"></i><i class="m" style="left:60%"></i><i class="m" style="left:20%"></i><span id="bbt"></span></div></div>
<button id="xo" title="Cerrar">✕</button>
<div id="dead"><h2>HAS CAÍDO</h2><p id="dtx"></p><p id="dls" style="opacity:.75"></p><button class="bt" id="dbt">Despertar</button></div>
<div id="vic"><h2>¡EL DRAGÓN HA CAÍDO!</h2><p>La torre de Vela vuelve a encenderse. Esto fue obra de todos:</p><table id="vtb"></table><div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><button class="bt" id="vfin">Ver el final juntos</button><button class="bt alt" id="vcl">Seguir jugando</button></div></div>`);
// reutilizamos elementos del juego base dentro de las columnas del HUD
{ const lc = $$('lc'), rc = $$('rc'), pc = $$('pc');
  lc.append($$('obj')); lc.insertBefore($$('obj'), $$('pl'));
  pc.append($$('sta')); const rs = document.createElement('div'); rs.className = 'rs'; rs.innerHTML = '<span id="emt"></span>'; rs.append($$('mode')); pc.append(rs);
  rc.append($$('inf')); }
const IC = { menu: $$('tm'), inv: $$('ti'), map: $$('tmp'), chat: $$('tch') };
IC.menu.onclick = () => { if (typeof panel !== 'undefined' && panel == 'menu') { closeP(); grab(); } else openP('menu'); };
IC.inv.onclick = () => { if (panel == 'inv') { closeP(); grab(); } else openP('inv'); };
IC.map.onclick = () => { if (panel == 'map') { closeP(); grab(); } else openP('map'); };
IC.chat.onclick = () => { if (mp().openChat) mp().openChat(); };
$$('xo').onclick = () => { closeP(); grab(); };
{ // botón cerrar visible mientras haya un panel abierto
  const ov = $$('ov'); new MutationObserver(() => { $$('xo').style.display = ov.style.display === 'flex' ? 'block' : 'none'; }).observe(ov, { attributes: true, attributeFilter: ['style'] }); }

/* ---------- pantalla de carga / título ---------- */
const st = $$('st');
{
  const h1 = st.querySelector('h1');
  (h1.nextElementSibling || h1).insertAdjacentHTML('afterend', '<div id="ldw"><div id="ldb"><i></i></div><div id="ldt">Preparando…</div></div>' +
    '<input id="nm" maxlength="16" placeholder="Tu nombre" autocomplete="off">' +
    '<div class="row"><input id="rm" maxlength="16" placeholder="Sala (vacío = pública)" autocomplete="off"><button class="lnk" id="rcp">Copiar link para invitar</button></div>');
  $$('b1').insertAdjacentHTML('beforebegin', '<div id="ns" class="small" style="min-height:1.3em"></div>');
  st.insertAdjacentHTML('beforeend', '<div class="small" id="tps"></div><div class="row"><button class="lnk" id="lre" style="display:none">Reintentar carga</button><button class="lnk" id="lfb" style="display:none">Jugar igual con gráficos básicos</button></div>');
  $$('nm').value = ls.get('tv_name') || '';
  const rurl = new URLSearchParams(location.search).get('room');
  $$('rm').value = (rurl != null ? rurl : ls.get('tv_room') || '').replace(/[^\w\-]/g, '').slice(0, 16);
  $$('tps').textContent = TOUCH
    ? 'Joystick a la izquierda para moverte, arrastrá a la derecha para mirar. Botones: ⚔ atacar, 🛡 bloquear, ⤒ saltar, ⟲ esquivar.'
    : 'WASD moverte · Shift correr · Clic izq. atacar · Clic der. bloquear · C esquivar · E interactuar · Tab inventario · M mapa · Enter chat';
  if (rurl) $$('ns').textContent = 'Te invitaron a la sala "' + $$('rm').value + '".';
}
const myName = () => ($$('nm').value || '').trim().slice(0, 16);
const roomVal = () => ($$('rm').value || '').trim().replace(/[^\w\-]/g, '').slice(0, 16);
let playLocked = true;
function syncLoad() {
  const TVs = window.TV && TV.state; if (!TVs) return;
  const ok = TVs.ready || TVs.fallback;
  $$('ldb').firstChild.style.width = (TVs.ready ? 100 : Math.round(clamp(TVs.frac, 0, 1) * 100)) + '%';
  $$('ldt').textContent = TVs.failed && !TVs.fallback ? (TVs.msg || 'No se pudieron cargar los modelos 3D.') : TVs.ready ? '¡Mundo 3D listo!' : TVs.fallback ? 'Gráficos básicos.' : (TVs.msg || 'Cargando mundo 3D…') + ' ' + Math.round(clamp(TVs.frac, 0, 1) * 100) + ' %';
  $$('lre').style.display = $$('lfb').style.display = TVs.failed && !TVs.fallback ? 'inline-block' : 'none';
  playLocked = !ok;
  for (const id of ['b1', 'b2']) { const b = $$(id); b.disabled = playLocked; b.style.opacity = playLocked ? .45 : 1; b.style.cursor = playLocked ? 'default' : 'pointer'; }
}
if (window.TV) { TV.onChange = syncLoad; syncLoad(); }
$$('lre').onclick = () => TV.retry(); $$('lfb').onclick = () => TV.allowFallback();
const playHooks = [];
for (const id of ['b1', 'b2']) {
  const b = $$(id), old = b.onclick;
  b.onclick = e => {
    if (playLocked) return;
    ls.set('tv_name', myName()); ls.set('tv_room', roomVal());
    if (mp().join) mp().join(myName(), roomVal());
    playHooks.forEach(f => { try { f(); } catch (er) {} });
    if (old) old.call(b, e);
  };
}
$$('nm').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const b = $$('b2').style.display !== 'none' ? $$('b2') : $$('b1'); b.click(); } });
$$('nm').addEventListener('mousedown', e => e.stopPropagation()); $$('rm').addEventListener('mousedown', e => e.stopPropagation());
let rmT = 0; $$('rm').addEventListener('input', () => { clearTimeout(rmT); rmT = setTimeout(() => { if (mp().join) mp().join(myName(), roomVal(), true); }, 600); });
function inviteLink() {
  const u = new URL(location.href); u.hash = ''; const r = roomVal() || mp().room && mp().room() || ''; if (r) u.searchParams.set('room', r); else u.searchParams.delete('room'); u.searchParams.delete('touch'); return u.toString();
}
async function copyLink() {
  const l = inviteLink();
  try { await navigator.clipboard.writeText(l); toast('Link copiado: mandáselo a tus amigos'); }
  catch (e) { prompt('Copiá este link y compartilo:', l); }
}
$$('rcp').onclick = copyLink;

/* ---------- HUD en vivo ---------- */
let hpShown = 100, hpGhost = 100, lastHp = 100, popT = 0, popAcc = 0, lastTxt = '', frame = 0, termT = 0;
const hpF = $$('hpf'), hpG = $$('hpg'), hpT = $$('hpt'), hpB = $$('hpb'), hpP = $$('hpp');
function hud(now) {
  requestAnimationFrame(hud); frame++;
  if (typeof hp === 'undefined') return;
  const M = mp(), maxHp = (window.CB && CB.CFG.player.hp) || 100, cur = Math.max(0, hp), pct = clamp(cur / maxHp, 0, 1) * 100;
  $$('pnm').textContent = (M.name && M.name()) || myName() || 'Viajero';
  const d = cur - lastHp; lastHp = cur;
  if (Math.abs(d) >= .99) { popAcc += d; popT = 1.1; }
  if (popT > 0) { popT -= 1 / 60; hpP.style.opacity = clamp(popT * 2, 0, 1); hpP.textContent = (popAcc > 0 ? '+' : '') + Math.round(popAcc); hpP.style.color = popAcc > 0 ? '#8dffb0' : '#ff8a6a'; if (popT <= 0) popAcc = 0; }
  hpGhost = Math.max(pct, hpGhost - .7); if (hpGhost < pct) hpGhost = pct;
  hpF.style.width = pct + '%'; hpG.style.width = hpGhost + '%';
  const tx = Math.ceil(cur) + ' / ' + maxHp; if (tx !== lastTxt) { hpT.textContent = tx; lastTxt = tx; }
  hpB.classList.toggle('low', pct < 25 && pct > 0);
  if (frame % 6 === 0) {
    $$('emt').textContent = '● ' + emb + ' ascuas · ⚔ ' + (window.CB ? CB.damage() : '') + ' daño';
    $$('plv').textContent = typeof heavy !== 'undefined' && heavy ? 'Armadura pesada' : '';
    const on = M.online && M.online();
    IC.chat.style.display = on ? 'inline-block' : 'none';
    boss(on); players(on); deadUI();
  }
  if (frame % 2 === 0) minimap();
}
/* barra del jefe: la ve quien pelea, y también quien solo sabe que otros están peleando */
let bbg = 100; const bbEl = $$('bb');
function boss(on) {
  const g = window.GX, DRo = g && g.DR, b = M_boss(on); let r = null, sub = '';
  if (DRo && DRo.on && !DRo.dead) { r = clamp(DRo.hp / DRo.mx, 0, 1); if (b) sub = b.a > 1 ? b.a + ' héroes combatiendo' : ''; }
  else if (b && !b.dead && b.r < 1) { r = b.r; sub = 'otros héroes lo están combatiendo'; }
  if (r == null) { bbEl.style.display = 'none'; bbg = 100; return; }
  bbEl.style.display = 'block'; const p = r * 100; bbg = Math.max(p, bbg - 1.2);
  $$('bbf').style.width = p + '%'; $$('bbg').style.width = bbg + '%'; $$('bbt').textContent = Math.ceil(p) + ' %'; $$('bbs').textContent = sub;
}
const M_boss = on => on && mp().boss ? mp().boss : null;
/* lista de jugadores en línea */
function players(on) {
  const el = $$('pl'); if (!on || !mp().players) { el.style.display = 'none'; return; }
  const L = mp().players(); el.style.display = 'block';
  el.innerHTML = '<div class="h">● En línea (' + (L.length + 1) + ') · sala ' + esc(mp().room()) + '</div>' + L.map(p => '<div class="r"><b>' + esc(p.name) + '</b><i><u style="width:' + clamp(p.hp, 0, 100) + '%"></u></i></div>').join('');
}

/* ---------- minimapa (norte arriba, con niebla de exploración) ---------- */
const mmc = $$('mmc'), mmx = mmc.getContext('2d'), tcv = document.createElement('canvas'); tcv.width = tcv.height = 132; const tcx = tcv.getContext('2d');
const RAD = 130; let lastTer = 0, terOK = false;
function terrain() {
  if (typeof mcol === 'undefined' || typeof P === 'undefined') return;
  const im = tcx.createImageData(132, 132), px = P.position.x, pz = P.position.z;
  for (let j = 0; j < 132; j++) for (let i = 0; i < 132; i++) {
    const x = px + (i - 66) / 66 * RAD, z = pz + (j - 66) / 66 * RAD, ci = Math.floor((x + 400) / SC), cj = Math.floor((z + 400) / SC), o = (j * 132 + i) * 4;
    if (ci < 0 || cj < 0 || ci >= MW || cj >= MW) { im.data[o + 3] = 255; continue; }
    const c = mcol[cj * MW + ci], s = mseen[cj * MW + ci] ? 255 : 26;
    im.data[o] = c[0] * s; im.data[o + 1] = c[1] * s; im.data[o + 2] = c[2] * s; im.data[o + 3] = 255;
  }
  tcx.putImageData(im, 0, 0); terOK = true;
}
function minimap() {
  if (typeof P === 'undefined' || typeof POI === 'undefined') return;
  const n = performance.now(); if (n - lastTer > 250) { lastTer = n; terrain(); }
  if (!terOK) return;
  const px = P.position.x, pz = P.position.z, k = 66 / RAD, X = x => 66 + (x - px) * k, Y = z => 66 + (z - pz) * k;
  mmx.clearRect(0, 0, 132, 132); mmx.drawImage(tcv, 0, 0);
  for (const p of POI) if (p.disc) { const x = X(p.x), y = Y(p.z); if (x < 0 || y < 0 || x > 132 || y > 132) continue; mmx.fillStyle = p.t == 'f' ? (p.lit ? '#ffb347' : '#7a8296') : p.op ? '#8a8f99' : '#8ad6ff'; mmx.beginPath(); if (p.t == 'f') mmx.arc(x, y, 3.2, 0, 7); else { mmx.moveTo(x, y - 3.6); mmx.lineTo(x + 3.6, y); mmx.lineTo(x, y + 3.6); mmx.lineTo(x - 3.6, y); } mmx.fill(); }
  mmx.fillStyle = '#ff4a3a'; for (const q of EN) if (q.on && q.st !== 'dying') { const x = X(q.g.position.x), y = Y(q.g.position.z); if (x > 0 && y > 0 && x < 132 && y < 132) { mmx.beginPath(); mmx.arc(x, y, 2.4, 0, 7); mmx.fill(); } }
  if (mp().players) { mmx.fillStyle = '#6dff9a'; for (const p of mp().players()) { const x = X(p.x), y = Y(p.z); if (x > 0 && y > 0 && x < 132 && y < 132) { mmx.beginPath(); mmx.arc(x, y, 3, 0, 7); mmx.fill(); } } }
  const g = window.GX && GX.tgt && GX.tgt();   // objetivo de la misión: flecha dorada en el borde
  if (g) { const gx = g.x != null ? g.x : g.position.x, gz = g.z != null ? g.z : g.position.z; let dx = (gx - px) * k, dz = (gz - pz) * k; const l = Math.hypot(dx, dz); if (l > 58) { dx *= 58 / l; dz *= 58 / l; } mmx.fillStyle = '#ffd070'; mmx.beginPath(); mmx.arc(66 + dx, 66 + dz, 4, 0, 7); mmx.fill(); mmx.strokeStyle = '#000'; mmx.lineWidth = 1; mmx.stroke(); }
  mmx.save(); mmx.translate(66, 66); mmx.rotate(-P.rotation.y); mmx.fillStyle = '#fff'; mmx.strokeStyle = '#000'; mmx.lineWidth = 1; mmx.beginPath(); mmx.moveTo(0, 6); mmx.lineTo(-4.5, -4); mmx.lineTo(4.5, -4); mmx.closePath(); mmx.fill(); mmx.stroke(); mmx.restore();
}

/* ---------- pantalla de muerte ---------- */
let deadShown = false;
function deadUI() {
  if (!window.CB) return; const s = CB.state(), el = $$('dead');
  if (s.dead && !deadShown) {
    deadShown = true; el.style.display = 'flex'; requestAnimationFrame(() => el.style.opacity = 1);
    $$('dtx').textContent = s.killer ? 'Te venció: ' + s.killer + '.' : 'Las sombras te vencieron.';
    $$('dls').textContent = 'Despertarás junto al ' + s.fire + (s.lost ? ' y perderás ' + s.lost + ' ascuas.' : '.');
    $$('dbt').disabled = false;
  }
  if (s.dead) $$('dbt').textContent = 'Despertar (' + Math.max(0, Math.ceil(s.auto - s.deadT)) + ')';
  if (!s.dead && deadShown) { deadShown = false; el.style.opacity = 0; setTimeout(() => { if (!deadShown) el.style.display = 'none'; }, 1200); }
}
$$('dbt').onclick = () => { if (window.CB && CB.state().deadT > .8) { CB.respawn(); grab(); } };

/* ---------- victoria cooperativa y final ---------- */
let lastBoard = null;
function victory(data) {
  lastBoard = data && data.board || [];
  $$('vtb').innerHTML = lastBoard.length ? lastBoard.map((r, i) => '<tr><td>' + (i == 0 ? '👑 ' : '') + esc(r.n) + '</td><td>' + r.p + ' %</td></tr>').join('') : '<tr><td>' + esc(myName() || 'Viajero') + '</td><td>100 %</td></tr>';
  const v = $$('vic'); v.style.display = 'flex'; requestAnimationFrame(() => v.style.opacity = 1);
  if (typeof setLook === 'function') setLook(false);
}
function closeVic() { const v = $$('vic'); v.style.opacity = 0; setTimeout(() => v.style.display = 'none', 1200); if (typeof grab === 'function') grab(); }
$$('vcl').onclick = closeVic;
$$('vfin').onclick = () => { closeVic(); if (window.GX && GX.finale) setTimeout(() => GX.finale(), 600); };
function endScreen(onContinue) {
  const names = []; if (lastBoard && lastBoard.length) lastBoard.forEach(r => names.push(r.n)); else { names.push(myName() || 'Viajero'); if (mp().players) mp().players().forEach(p => names.push(p.name)); }
  st.style.display = 'flex';
  st.innerHTML = '<h1>FIN</h1><div style="font-size:22px;opacity:.92;max-width:560px;line-height:1.4">El fuego de la torre volvió a arder.<br>Los viajeros volvieron a casa.</div>' +
    '<div class="small" style="font-size:14px;opacity:.85">Héroes de la torre de Vela:<br><b style="color:var(--amber);font-size:17px">' + names.map(esc).join(' · ') + '</b></div>' +
    '<div style="font-size:17px;opacity:.7">Continuará…</div><button class="bt" id="b3">Seguir explorando</button>';
  $$('b3').onclick = () => { st.style.display = 'none'; if (onContinue) onContinue(); };
}

/* ---------- menú e inventario con más información ---------- */
const QN = { auto: 'Automática', high: 'Alta', med: 'Media', low: 'Baja (celulares)' };
const _rm = renderMenu;
renderMenu = function () {
  _rm();
  const M = mp(), on = M.online && M.online(), q = ls.get('tv_q') || 'auto';
  $$('menu').insertAdjacentHTML('beforeend', `<h4>Gráficos</h4><div class="mrow"><select id="mq">${Object.keys(QN).map(k => `<option value="${k}" ${k == q ? 'selected' : ''}>${QN[k]}</option>`).join('')}</select><button id="mrl">Aplicar (recarga)</button></div>
<h4>Online</h4><div class="mrow">${on ? '● Sala <b>' + esc(M.room()) + '</b> · ' + M.count + ' jugador' + (M.count == 1 ? '' : 'es') : '○ Sin conexión (jugás solo)'}</div><div class="mrow"><button id="mlk">Copiar link para invitar amigos</button></div>
<h4>Partida</h4><div class="mrow"><button id="msc">Atajo: ir al Dragón (final cooperativo)</button></div><div class="mrow">${document.fullscreenEnabled ? '<button id="mfs">Pantalla completa</button>' : ''}<button id="mnw" class="warn">Nueva partida</button></div>`);
};
$$('menu').addEventListener('click', e => {
  const id = e.target.id;
  if (id == 'mrl') location.reload();
  else if (id == 'mlk') copyLink();
  else if (id == 'msc') { if (confirm('Te llevo cerca de la guarida del Dragón con el poder ya conseguido (útil para jugar el final con amigos). ¿Seguro?')) { closeP(); grab(); CB.shortcutDragon(); } }
  else if (id == 'mfs') { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); }
  else if (id == 'mnw') { if (confirm('Esto borra tu progreso guardado en este navegador y empieza de cero. ¿Seguro?')) { ['torreVela_mundo1', 'torreVela_historia'].forEach(k => { try { localStorage.removeItem(k); } catch (er) {} }); location.reload(); } }
});
$$('menu').addEventListener('change', e => { if (e.target.id == 'mq') ls.set('tv_q', e.target.value); });
const _di = drawInv;
drawInv = function () {
  _di();
  const C = window.CB, mons = C ? Object.values(C.MON) : [];
  $$('inv').insertAdjacentHTML('beforeend', `<h4>Combate</h4><p>Vida: ${Math.ceil(Math.max(0, hp))} / ${C ? C.CFG.player.hp : 100}<br>Daño de espada: ${C ? C.damage() : ''}${heavy ? ' (armadura pesada: recibís 25 % menos de daño)' : ''}<br>Ascuas: ${emb} · Monstruos derrotados: ${KL}</p>
<h4>Bestiario</h4><table><tr><th>Monstruo</th><th>Vida</th><th>Daño</th><th>Resist.</th></tr>${mons.map(m => `<tr><td>${esc(m.name)}</td><td>${m.hp}</td><td>${m.dmg}</td><td>${Math.round(m.resist * 100)}%</td></tr>`).join('')}${C ? `<tr><td>${esc(C.CFG.guardian.name)}</td><td>${C.CFG.guardian.hp}</td><td>${C.CFG.guardian.dmg}</td><td>${Math.round(C.CFG.guardian.resist * 100)}%</td></tr><tr><td>${esc(C.CFG.dragon.name)}</td><td>${C.CFG.dragon.hp}+</td><td>20–70</td><td>${Math.round(C.CFG.dragon.resist * 100)}%</td></tr>` : ''}</table>`);
};

requestAnimationFrame(hud);
window.UI = { victory, endScreen, onPlay: f => playHooks.push(f), copyLink, name: myName, room: roomVal, status: t => { const n = $$('ns'); if (n) n.textContent = t; } };
})();
