/* =====================================================================
   La torre de Vela — SISTEMA DE COMBATE (v9)
   Se carga después del juego base y se engancha en:
     - world()      -> CB.tick(dt, ctx)           (enemigos comunes, vida del jugador)
     - guardianes   -> CB.canHit / CB.hitGuardian / CB.killGuardian
     - dragón       -> CB.canHit / CB.hitDragon / CB.syncBoss
   Toda la configuración numérica está en CFG y MON (más abajo).
   ===================================================================== */
(() => {
'use strict';

/* ---------- CONFIGURACIÓN ---------- */
const CFG = {
  player: {
    hp: 100,            // vida máxima del personaje
    dmg: 25,            // daño base de la espada
    pwBonus: 10,        // +daño al conseguir el poder de la historia (PW)
    heavyBonus: 10,     // +daño con armadura pesada
    heavyTaken: .75,    // la armadura pesada recibe 25 % menos de daño
    iFrames: .7,        // invulnerabilidad (s) después de recibir un golpe
    iFramesBlock: .35,  // invulnerabilidad (s) si el golpe fue bloqueado
    blockTaken: .3,     // fracción de daño que pasa al bloquear (enemigos comunes)
    blockStam: 14,      // aguante que cuesta bloquear un golpe
    respawnLoss: .25,   // fracción de ascuas que se pierde al morir
    regen: .4,          // vida por segundo fuera de combate
    regenFire: 5,       // vida por segundo junto a un fuego encendido
    regenDelay: 4,      // segundos sin recibir daño antes de regenerar
    autoRespawn: 8      // segundos hasta despertar solo
  },
  guardian: { name: 'Guardián de ceniza', hp: 200, dmg: 18, resist: .25 },
  dragon:   { name: 'Dragón Ancestral',   hp: 1200, resist: .10 },
  heal: { amount: 25, chance: { sombra: .18, acechador: .12, centinela: .35 } }
};

/* Tipos de monstruo: vida, daño, resistencia (0–1 = % de daño que ignoran), velocidad, etc. */
const MON = {
  sombra:    { name: 'Caballero caído',     hp: 100, dmg: 10, resist: 0,   speed: 3.0, range: 2.0, windup: .50, cd: 1.4, scale: 1.00, tint: [1, 1, 1],       poise: 0,  knock: 1.0, embers: .4 },
  acechador: { name: 'Acechador',           hp: 60,  dmg: 7,  resist: 0,   speed: 4.8, range: 1.8, windup: .30, cd: .9,  scale: .85,  tint: [.7, .9, 1.3],   poise: 0,  knock: 1.4, embers: .3 },
  centinela: { name: 'Centinela de hierro', hp: 180, dmg: 18, resist: .35, speed: 2.2, range: 2.4, windup: .75, cd: 2.0, scale: 1.25, tint: [1.3, .75, .65], poise: 30, knock: .5,  embers: .8 }
};
const REG_W = { 1: [['sombra', .6], ['acechador', .4]], 2: [['sombra', .5], ['acechador', .2], ['centinela', .3]],
                3: [['acechador', .5], ['sombra', .5]], 4: [['sombra', .7], ['acechador', .3]], 5: [['centinela', .5], ['sombra', .5]] };

/* ---------- utilidades ---------- */
const G = () => window.GX || {};
const burst = (...a) => { const g = G(); if (g.burst) g.burst(...a); };
const tone  = (...a) => { const g = G(); if (g.tone) g.tone(...a); };
const nse   = (...a) => { const g = G(); if (g.nse) g.nse(...a); };
const fxp   = (...a) => { const g = G(); if (g.fx) g.fx(...a); };
const cinOn = () => { const g = G(); return !!(g.cinOn && g.cinOn()); };
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = u => 1 - (1 - u) * (1 - u);

const PD = { dead: false, deadT: 0, iF: 0, flick: false, lastHit: -99, respawned: false, lost: 0, fire: '', killer: '', won: false };
let swingId = 0, lastAtk = 0, swingActive = false; const swingSet = new Set();
let shake = 0, now = 0, spawnT = 0;

/* ---------- capas de interfaz propias del combate (barras y números) ---------- */
document.head.insertAdjacentHTML('beforeend', `<style>
#eb,#dn{position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:3}
.eb1{position:absolute;left:0;top:0;width:92px;margin-left:-46px;text-align:center;font-size:11px;line-height:1.2;color:#f3ead7;text-shadow:0 1px 2px #000,0 0 4px #000;opacity:0;transition:opacity .25s;display:none}
.eb1 .bb{height:7px;margin-top:2px;background:rgba(10,12,28,.85);border:1px solid rgba(255,255,255,.4);border-radius:4px;overflow:hidden;position:relative}
.eb1 .bb i{position:absolute;left:0;top:0;bottom:0;border-radius:3px}
.eb1 .g{background:#f3e3c0;opacity:.85}.eb1 .f{background:linear-gradient(#ff7a56,#c8301e)}
.eb1.boss .f{background:linear-gradient(#ffd070,#c8801e)}
.dn1{position:absolute;left:0;top:0;font-weight:700;font-size:21px;color:#fff3c8;text-shadow:0 0 3px #000,0 2px 4px #000;white-space:nowrap;display:none}
.dn1.rs{color:#b9c8e8;font-size:18px}.dn1.kill{color:#ffd070;font-size:26px}.dn1.heal{color:#8dffb0}.dn1.big{color:#ffb070}
</style>`);
const ebL = document.createElement('div'); ebL.id = 'eb'; document.body.appendChild(ebL);
const dnL = document.createElement('div'); dnL.id = 'dn'; document.body.appendChild(dnL);
const barPool = [], numPool = [];
function getBar(i) {
  let b = barPool[i];
  if (!b) {
    const el = document.createElement('div'); el.className = 'eb1';
    el.innerHTML = '<span class="n"></span><div class="bb"><i class="g"></i><i class="f"></i></div>';
    ebL.appendChild(el); b = barPool[i] = { el, n: el.firstChild, g: el.querySelector('.g'), f: el.querySelector('.f') };
  }
  return b;
}
/* número flotante en el mundo (daño, curación) */
function num(text, x, y, z, cls) {
  let n = numPool.find(q => q.life <= 0);
  if (!n) { const el = document.createElement('div'); el.className = 'dn1'; dnL.appendChild(el); n = { el, life: 0 }; numPool.push(n); }
  n.life = n.max = 1.0; n.x = x + rnd(-.4, .4); n.y = y; n.z = z; n.el.textContent = text; n.el.className = 'dn1 ' + (cls || ''); n.el.style.display = 'block';
}
const V3 = new T.Vector3();
function project(x, y, z) { V3.set(x, y, z).project(cam); return V3.z > 1 || V3.z < -1 ? null : [(V3.x * .5 + .5) * innerWidth, (-V3.y * .5 + .5) * innerHeight]; }

/* ---------- materiales: destello rojo al recibir un golpe + tinte por tipo ---------- */
function collectMats(root) {
  const out = [], seen = new Set();
  root.traverse(o => { if (!o.isMesh) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => {
    if (!m || !m.emissive || seen.has(m)) return; seen.add(m);
    out.push({ m, base: m.color ? m.color.clone() : null, e0: m.emissive.clone(), i0: m.emissiveIntensity }); }); });
  return out;
}
function setTint(q, tint) {
  if (!q.mats) return;
  for (const o of q.mats) if (o.base) o.m.color.setRGB(o.base.r * tint[0], o.base.g * tint[1], o.base.b * tint[2]);
}
function applyFlash(q, f) {
  if (!q.mats && q.k) q.mats = collectMats(q.k.g);
  if (!q.mats) return;
  for (const o of q.mats) { if (f > 0) { o.m.emissive.setRGB(o.e0.r + f, o.e0.g + f * .2, o.e0.b + f * .1); o.m.emissiveIntensity = Math.max(o.i0, 1); } else { o.m.emissive.copy(o.e0); o.m.emissiveIntensity = o.i0; } }
}
const bodyOf = q => q.m2 || (q.k && q.k.g) || null;

/* ---------- ataque del jugador: ventana de golpe, una vez por espadazo ---------- */
function swingTick() {
  if (atkT > lastAtk + .2) { swingId++; swingSet.clear(); nse(.14, 1400, .05); tone(260, .12, 'sawtooth', .025, 120); }
  lastAtk = atkT;
  swingActive = !PD.dead && atkT < .41 && atkT > .17;   // fase "de ida" de la animación (u = .25 … .68)
}
/* ¿el espadazo actual alcanza este objetivo? Devuelve true UNA sola vez por objetivo y por espadazo. */
function canHit(key, x, z, range) {
  if (!swingActive || swingSet.has(key)) return false;
  const dx = x - P.position.x, dz = z - P.position.z, d = Math.hypot(dx, dz);
  if (d > range) return false;
  if (d > 1.3 && (Math.sin(P.rotation.y) * dx + Math.cos(P.rotation.y) * dz) / d < .15) return false;
  swingSet.add(key); return true;
}
const dmgRaw = () => CFG.player.dmg + (PW ? CFG.player.pwBonus : 0) + (heavy ? CFG.player.heavyBonus : 0);
const addShake = a => { shake = Math.max(shake, a); };

/* ---------- vida del jugador ---------- */
function nearestFire() {
  let q = POI[0], bd = 1e9;
  POI.forEach(p => { if (p.t == 'f' && p.lit) { const d = Math.hypot(p.x - P.position.x, p.z - P.position.z); if (d < bd) { bd = d; q = p; } } });
  return q;
}
/* Golpe con cooldown: respeta esquive, bloqueo (con dirección) e invulnerabilidad breve. Devuelve true si hizo daño. */
function takeHit(n, o) {
  o = o || {};
  if (PD.dead || cinOn() || dodT > 0 || PD.iF > 0) return false;
  let blocked = false;
  if (blk && atkT <= 0 && stam > 0) {
    blocked = true;
    if (o.src) { const dx = o.src.x - P.position.x, dz = o.src.z - P.position.z, d = Math.hypot(dx, dz) || 1; blocked = (Math.sin(P.rotation.y) * dx + Math.cos(P.rotation.y) * dz) / d > -.2; }
  }
  let dmg = n;
  if (blocked) { dmg *= o.fire ? .5 : (o.boss ? .25 : CFG.player.blockTaken); stam = Math.max(0, stam - (o.boss ? 20 : CFG.player.blockStam)); stD = .8; }
  if (heavy) dmg *= CFG.player.heavyTaken;
  dmg = Math.max(1, Math.round(dmg));
  hp = Math.max(0, hp - dmg);
  PD.lastHit = now; PD.iF = blocked ? CFG.player.iFramesBlock : CFG.player.iFrames; PD.flick = !blocked;
  hurt = Math.max(hurt, blocked ? .12 : Math.min(.6, .22 + dmg / 60));
  if (blocked) { tone(200, .1, 'square', .12); nse(.08, 2500, .12); addShake(.12); }
  else { tone(90, .16, 'sawtooth', .2, 50); nse(.1, 500, .15); addShake(.3); }
  if (hp <= 0) die(o.name || '');
  return true;
}
/* Daño continuo (charcos de fuego): no usa invulnerabilidad, se aplica proporcional al tiempo. */
function takeDot(n, o) {
  if (PD.dead || cinOn() || dodT > 0) return;
  let dmg = n;
  if (blk && atkT <= 0 && stam > 0) { dmg *= .5; stam = Math.max(0, stam - n * .5); stD = .5; }
  if (heavy) dmg *= CFG.player.heavyTaken;
  hp = Math.max(0, hp - dmg); PD.lastHit = now; hurt = Math.max(hurt, .15);
  if (hp <= 0) die((o && o.name) || 'Fuego');
}
function heal(n) {
  if (PD.dead || hp >= CFG.player.hp) return false;
  hp = Math.min(CFG.player.hp, hp + n); return true;
}
function die(by) {
  if (PD.dead) return;
  PD.dead = true; PD.deadT = 0; PD.killer = by || ''; PD.flick = false; hp = 0; hurt = 0; swingActive = false;
  PD.lost = Math.floor(emb * CFG.player.respawnLoss); PD.fire = nearestFire().n;
  for (const k in down) delete down[k]; blk = false; atkReq = jumpReq = dodgeReq = false;
  tone(70, 1.2, 'sawtooth', .25, 25); nse(.6, 300, .2); addShake(.5);
  if (window.MP && MP.sendEvent) MP.sendEvent('die');
}
function respawn() {
  if (!PD.dead) return;
  const q = nearestFire();
  P.position.x = q.x + 2.5; P.position.z = q.z + 2.5; vx = vz = 0; jy = 0; vy = 0;
  hp = CFG.player.hp; stam = 100; PD.iF = 2.5; PD.flick = false; emb = Math.max(0, emb - PD.lost);
  EN.forEach(e => { e.on = 0; e.g.visible = false; e.st = 'chase'; });
  orbs3.forEach(o => { o.on = 0; o.m.visible = false; });
  PD.dead = false; P.rotation.z = 0; P.visible = true; PD.respawned = true; hurt = 0;
  toast('Las sombras te vencieron. Despertás junto al ' + q.n + (PD.lost ? ' (perdiste ' + PD.lost + ' ascuas)' : ''));
}

/* ---------- esencias de vida (drop de los monstruos) ---------- */
const orbs3 = [];
for (let i = 0; i < 6; i++) {
  const m = new T.Mesh(new T.SphereGeometry(.32, 10, 8), new T.MeshBasicMaterial({ color: 0x7dffb0, fog: false }));
  m.visible = false; scene.add(m); orbs3.push({ m, on: 0, x: 0, z: 0, life: 0 });
}
function dropOrb(x, z) {
  const o = orbs3.find(q => !q.on); if (!o) return;
  o.on = 1; o.x = x; o.z = z; o.life = 25; o.m.visible = true; o.m.position.set(x, Hg(x, z) + 1, z);
}
function orbsTick(dt, px, pz) {
  for (const o of orbs3) {
    if (!o.on) continue;
    o.life -= dt; const dx = px - o.x, dz = pz - o.z, d = Math.hypot(dx, dz) || .01;
    if (o.life <= 0) { o.on = 0; o.m.visible = false; continue; }
    if (d < 6 && !PD.dead && hp < CFG.player.hp) { o.x += dx / d * 6 * dt; o.z += dz / d * 6 * dt; }
    o.m.position.set(o.x, Hg(o.x, o.z) + 1 + Math.sin(t * 3 + o.x) * .2, o.z);
    o.m.scale.setScalar(1 + Math.sin(t * 6) * .1);
    if (Math.random() < .25) fxp(o.x + rnd(-.3, .3), o.m.position.y, o.z + rnd(-.3, .3), 0, 1.5, 0, .6, .6, 0x7dffb0);
    if (d < 2.2 && heal(CFG.heal.amount)) {
      o.on = 0; o.m.visible = false; burst(o.x, o.m.position.y, o.z, 12, 0x7dffb0, 4); tone(520, .25, 'sine', .12, 880);
      num('+' + CFG.heal.amount, P.position.x, P.position.y + 3.4, P.position.z, 'heal');
    }
  }
}

/* ---------- enemigos comunes ---------- */
function pickType(rg) { const w = REG_W[rg] || REG_W[1]; let r = Math.random(), s = 0; for (const [k, p] of w) { s += p; if (r <= s) return k; } return w[0][0]; }
function resetBody(q) { const b = bodyOf(q); if (b) { b.rotation.set(0, 0, 0); b.position.y = 0; } q.lean = 0; }
function spawnTick(dt, px, pz, rg, night) {
  spawnT -= dt; if (spawnT > 0) return; spawnT = 1.5;
  const cap = Math.max(0, (night ? 7 : 4) - nl());
  if (rg == 0 || EN.filter(q => q.on).length >= cap) return;
  const an = rnd(0, 6.28), r = rnd(28, 44), x = px + Math.sin(an) * r, z = pz + Math.cos(an) * r;
  if (!(H(x, z) > -.5 && B(x, z) != 0 && !nearFire(x, z, 24))) return;
  const q = EN.find(e => !e.on); if (!q) return;
  const ty = pickType(B(x, z)), T0 = MON[ty];
  q.on = 1; q.type = ty; q.max = T0.hp; q.hp = T0.hp; q.cd = 1 + Math.random() * .6; q.st = 'chase'; q.tmr = 0; q.kx = q.kz = 0;
  q.flash = 0; q.lastHit = -99; q.gh = 1; q.dt = 0; q.id = EN.indexOf(q);
  q.g.scale.setScalar(T0.scale); q.g.position.set(x, Hg(x, z), z); q.g.rotation.set(0, 0, 0); q.g.visible = true;
  resetBody(q); if (q.mats) { applyFlash(q, 0); setTint(q, T0.tint); }
}
function killEnemy(q) {
  const T0 = MON[q.type]; q.hp = 0; q.st = 'dying'; q.dt = 0; q.kx = q.kz = 0;
  KL++; const n = 1 + (Math.random() < T0.embers ? 1 : 0); emb += n; toast('+' + n + (n > 1 ? ' ascuas' : ' ascua'));
  if (Math.random() < (CFG.heal.chance[q.type] || .15)) dropOrb(q.g.position.x, q.g.position.z);
  burst(q.g.position.x, q.g.position.y + 1.5, q.g.position.z, 16, 0xffaa44, 6);
  tone(110, .35, 'sawtooth', .18, 40); nse(.25, 700, .15); addShake(.18);
  const g = G(); if (g.sv) g.sv();
}
function hitEnemy(q) {
  const T0 = MON[q.type], raw = dmgRaw(), dealt = Math.max(1, Math.round(raw * (1 - T0.resist)));
  q.hp = Math.max(0, q.hp - dealt); q.lastHit = now; q.flash = .22;
  const p = q.g.position; num('-' + dealt, p.x, p.y + 3.6 * T0.scale, p.z, T0.resist > 0 ? 'rs' : (q.hp <= 0 ? 'kill' : ''));
  const dx = p.x - P.position.x, dz = p.z - P.position.z, d = Math.hypot(dx, dz) || 1, k = 7 * T0.knock;
  q.kx = dx / d * k; q.kz = dz / d * k;
  burst(p.x, p.y + 1.8, p.z, 7, 0xffc34a, 3); tone(rnd(170, 230), .09, 'square', .1); nse(.07, 1800, .14); addShake(.1);
  if (q.hp <= 0) killEnemy(q);
  else if (raw >= T0.poise) { q.st = 'stagger'; q.tmr = .35; }
}
function strike(q, T0) {
  q.st = 'recover'; q.tmr = .35; q.cd = Math.max(.2, T0.cd - T0.windup - .35);   // el ciclo completo (aviso + golpe + espera) dura T0.cd
  const p = q.g.position, d = Math.hypot(P.position.x - p.x, P.position.z - p.z);
  if (d <= T0.range + .7 && takeHit(T0.dmg, { src: p, name: T0.name })) burst(P.position.x, P.position.y + 1.8, P.position.z, 6, 0xff5a3a, 3);
  else if (d > T0.range + .7 || dodT > 0) burst(p.x, p.y + 1, p.z, 4, 0xaaaaaa, 2);   // fallo: el golpe corta el aire
}
function updEnemy(q, dt, px, pz) {
  const g = q.g, T0 = MON[q.type] || MON.sombra, p = g.position;
  if (q.st === 'dying') { dying(q, dt, T0); return; }
  let dx = px - p.x, dz = pz - p.z; const d = Math.hypot(dx, dz) || .01;
  if (d > 80 || B(p.x, p.z) == 0 || nearFire(p.x, p.z, 14)) { q.on = 0; g.visible = false; return; }   // las sombras no cruzan los fuegos
  const wantY = Math.atan2(dx, dz); g.rotation.y += Math.atan2(Math.sin(wantY - g.rotation.y), Math.cos(wantY - g.rotation.y)) * Math.min(1, 9 * dt);
  if (q.kx || q.kz) {
    const nx = p.x + q.kx * dt, nz = p.z + q.kz * dt; if (H(nx, nz) > -.9) { p.x = nx; p.z = nz; }
    const f = Math.exp(-8 * dt); q.kx *= f; q.kz *= f; if (Math.abs(q.kx) + Math.abs(q.kz) < .05) q.kx = q.kz = 0;
  }
  if (q.flash > 0) { q.flash = Math.max(0, q.flash - dt); applyFlash(q, q.flash / .22 * .9); }
  switch (q.st) {
    case 'stagger': q.tmr -= dt; if (q.tmr <= 0) q.st = 'chase'; break;
    case 'windup': q.tmr -= dt; if (q.tmr <= 0) strike(q, T0); break;
    case 'recover': q.tmr -= dt; if (q.tmr <= 0) q.st = 'chase'; break;
    default: {
      if (d < 26 && d > T0.range * .85) { const sp = (d < 9 ? 1.3 : 1) * T0.speed * dt, x = p.x + dx / d * sp, z = p.z + dz / d * sp; if (H(x, z) > -.9) { p.x = x; p.z = z; } }
      q.cd -= dt;
      if (d < T0.range && q.cd <= 0 && !PD.dead) { q.st = 'windup'; q.tmr = T0.windup; if (T0.windup > .6) tone(160, .25, 'triangle', .08, 220); }
    }
  }
  for (const o of EN) if (o !== q && o.on && o.st !== 'dying') { const ox = p.x - o.g.position.x, oz = p.z - o.g.position.z, od = Math.hypot(ox, oz); if (od < 1.5 && od > .01) { p.x += ox / od * 1.5 * dt; p.z += oz / od * 1.5 * dt; } }
  p.y = Hg(p.x, p.z) + Math.sin(t * 3 + (q.id || 0) * 5) * .15;
  const body = bodyOf(q);
  if (body) {
    let tg = 0; if (q.st === 'windup') tg = -.45 * (1 - Math.max(0, q.tmr) / T0.windup); else if (q.st === 'recover' && q.tmr > .2) tg = .55; else if (q.st === 'stagger') tg = -.6;
    q.lean += (tg - q.lean) * Math.min(1, 14 * dt); body.rotation.x = q.lean;
  }
}
function dying(q, dt, T0) {
  q.dt += dt; const u = q.dt / 1.4, g = q.g, body = bodyOf(q);
  if (q.flash > 0) { q.flash = Math.max(0, q.flash - dt); applyFlash(q, q.flash / .22 * .9); }
  if (body) body.rotation.x = -(Math.PI / 2) * ease(Math.min(1, q.dt / .55));
  g.position.y = Hg(g.position.x, g.position.z) - (u > .4 ? (u - .4) / .6 * 1.6 : 0);
  g.scale.setScalar(T0.scale * (u > .5 ? 1 - (u - .5) / .5 * .8 : 1));
  if (Math.random() < .5) fxp(g.position.x + rnd(-.6, .6), g.position.y + .4, g.position.z + rnd(-.6, .6), rnd(-1, 1), rnd(1, 3), rnd(-1, 1), .8, .8, 0xff8a2a);
  if (u >= 1) { q.on = 0; g.visible = false; g.scale.setScalar(T0.scale); resetBody(q); q.st = 'chase'; }
}

/* ---------- guardianes y dragón (su IA sigue en index.html; aquí solo el daño) ---------- */
function hitGuardian(g) {
  const raw = dmgRaw(), dealt = Math.max(1, Math.round(raw * (1 - CFG.guardian.resist)));
  g.hp = Math.max(0, g.hp - dealt); g.lastHit = now; g.flash = .22;
  num('-' + dealt, g.x, Hg(g.x, g.z) + 6, g.z, 'rs'); applyFlashG(g, .9); addShake(.15); return dealt;
}
function applyFlashG(g, f) { if (!g.mats) g.mats = collectMats(g.g); for (const o of g.mats) { if (f > 0) { o.m.emissive.setRGB(o.e0.r + f, o.e0.g + f * .2, o.e0.b + f * .1); o.m.emissiveIntensity = Math.max(o.i0, 1); } else { o.m.emissive.copy(o.e0); o.m.emissiveIntensity = o.i0; } } }
function killGuardian(g) {
  g.on = 0; g.dying = 1; g.dt = 0; burst(g.x, Hg(g.x, g.z) + 3, g.z, 24, 0xffc34a, 7); tone(90, .5, 'sawtooth', .22, 30); addShake(.3);
}
function guardiansTick(dt) {
  const GD = G().GD || [];
  for (const g of GD) {
    if (g.flash > 0) { g.flash = Math.max(0, g.flash - dt); applyFlashG(g, g.flash / .22 * .9); }
    if (!g.dying) continue;
    g.dt += dt; const u = g.dt / 1.6;
    g.g.rotation.x = -(Math.PI / 2) * ease(Math.min(1, g.dt / .7));
    g.g.position.y = Hg(g.x, g.z) - (u > .4 ? (u - .4) / .6 * 2.5 : 0);
    if (Math.random() < .5) fxp(g.x + rnd(-1, 1), g.g.position.y + .6, g.z + rnd(-1, 1), rnd(-1, 1), rnd(1, 3), rnd(-1, 1), .8, 1, 0xffb040);
    if (u >= 1) { g.dying = 0; g.g.visible = false; g.g.rotation.x = 0; }
  }
}
/* golpe al dragón: devuelve el daño real aplicado y lo informa al servidor (vida compartida) */
function hitDragon(DRo, mul) {
  const raw = dmgRaw() * (mul || 1), dealt = Math.max(1, Math.round(raw * (1 - CFG.dragon.resist)));
  DRo.hp -= dealt; DRo.lastHit = now;
  const dm = G().DM; if (dm) num('-' + dealt, DRo.x, Hg(DRo.x, DRo.z) + 9, DRo.z, mul > 1 ? 'big' : 'rs');
  addShake(.12);
  if (window.MP && MP.bossHit) MP.bossHit(dealt / DRo.mx);
  return dealt;
}
/* vida del jefe compartida entre jugadores de la misma sala */
function onlineBoss() { return window.MP && MP.online && MP.online() && MP.boss ? MP.boss : null; }
function bossStartHp(mx) { const b = onlineBoss(); return b && !b.dead ? Math.max(1, b.r * mx) : mx; }
function syncBoss() {
  const b = onlineBoss(), DRo = G().DR; if (!b || !DRo || !DRo.on || DRo.dead) return;
  if (b.dead) { DRo.hp = 0; return; }
  const tgt = b.r * DRo.mx; if (tgt < DRo.hp) DRo.hp = tgt;
}
function coopWin(data) {
  if (PD.won) return; PD.won = true;
  const g = G(); if (g.DR && g.DR.on && !g.DR.dead && g.dDie) g.dDie();
  setTimeout(() => { if (window.UI && UI.victory) UI.victory(data); }, 2600);
}

/* ---------- atajo para jugar el final cooperativo con amigos ---------- */
function shortcutDragon() {
  const g = G(), ST = g.ST; if (!ST) return false;
  if (ST.q < 5) ST.q = 5; ST.gd = 3; ST.ins = Math.max(ST.ins, 3); PW = 1; got = 3; if (state < 3) state = 3;
  (g.GD || []).forEach(x => { x.on = 0; x.g.visible = false; });
  orbs.forEach(o => { o.visible = false; o.children[0].intensity = 0; });
  const x = VK[0], z = VK[1] - 36; P.position.set(x, 0, z); vx = vz = 0; jy = 0; vy = 0;
  if (g.sv) g.sv(); updateObj(); toast('Atajo: estás cerca de la guarida del Dragón Ancestral'); return true;
}

/* ---------- bucle principal del combate ---------- */
function tick(dt, c) {
  now = performance.now() / 1000;
  if (PD.respawned) { if (PD.rf) { PD.respawned = false; PD.rf = 0; } else PD.rf = 1; }
  if (cinOn()) return;
  const px = c.px, pz = c.pz;
  swingTick();
  PD.iF = Math.max(0, PD.iF - dt);
  if (PD.dead) {
    PD.deadT += dt; for (const k in down) delete down[k]; blk = false; atkReq = jumpReq = dodgeReq = false;
    P.rotation.z = (Math.PI / 2) * ease(Math.min(1, PD.deadT / .6));
    if (PD.deadT > CFG.player.autoRespawn) respawn();
  } else spawnTick(dt, px, pz, c.rg, c.night);
  for (const q of EN) {
    if (!q.on) continue;
    if (q.st !== 'dying' && swingActive && !PD.dead && canHit(q, q.g.position.x, q.g.position.z, 3.2)) hitEnemy(q);
    updEnemy(q, dt, px, pz);
  }
  guardiansTick(dt); orbsTick(dt, px, pz);
  if (!PD.dead) {
    const rg = nearFire(px, pz, 12) ? CFG.player.regenFire : (now - PD.lastHit > CFG.player.regenDelay ? CFG.player.regen : 0);
    hp = Math.min(CFG.player.hp, hp + rg * dt);
    if (PD.flick) { if (PD.iF > 0) P.visible = ((now * 14) | 0) % 2 === 0; else { PD.flick = false; P.visible = true; } }
  }
  syncBoss();
  if (PD.won && window.MP && MP.boss && !MP.boss.dead) PD.won = false;
}

/* ---------- barras de vida y números flotantes (después de renderizar) ---------- */
let lastUi = performance.now();
function uiLoop() {
  requestAnimationFrame(uiLoop);
  const n = performance.now(), dt = Math.min(.1, (n - lastUi) / 1000); lastUi = n;
  const list = [];
  for (const q of EN) if (q.on && q.st !== 'dying' && q.g.visible) { const T0 = MON[q.type]; if (T0) list.push({ o: q, name: T0.name, hp: q.hp, max: q.max, x: q.g.position.x, y: q.g.position.y + 3.5 * T0.scale, z: q.g.position.z }); }
  for (const g of (G().GD || [])) if (g.on && g.g.visible) list.push({ o: g, name: CFG.guardian.name, hp: g.hp, max: CFG.guardian.hp, x: g.x, y: Hg(g.x, g.z) + 7.4, z: g.z });
  let used = 0;
  for (const it of list) {
    const o = it.o, d = Math.hypot(it.x - P.position.x, it.z - P.position.z), recent = now - (o.lastHit || -99) < 5;
    if (!(d < 22 || recent) || d > 60) continue;
    const s = project(it.x, it.y, it.z); if (!s) continue;
    const b = getBar(used++), pct = clamp(it.hp / it.max, 0, 1);
    o.gh = Math.max(pct, (o.gh == null ? 1 : o.gh) - dt * .6);
    b.el.style.display = 'block'; b.el.style.opacity = recent || d < 17 ? 1 : clamp((22 - d) / 5, 0, 1);
    b.el.style.transform = 'translate(' + s[0].toFixed(1) + 'px,' + s[1].toFixed(1) + 'px) translateY(-100%)';
    if (b.nm !== it.name) { b.n.textContent = it.name; b.nm = it.name; }
    b.f.style.width = pct * 100 + '%'; b.g.style.width = o.gh * 100 + '%';
  }
  for (let i = used; i < barPool.length; i++) barPool[i].el.style.display = 'none';
  for (const q of numPool) {
    if (q.life <= 0) continue; q.life -= dt; q.y += dt * 1.8;
    if (q.life <= 0) { q.el.style.display = 'none'; continue; }
    const s = project(q.x, q.y, q.z); if (!s) { q.el.style.display = 'none'; continue; }
    q.el.style.display = 'block'; q.el.style.opacity = clamp(q.life / .35, 0, 1);
    q.el.style.transform = 'translate(' + s[0].toFixed(1) + 'px,' + s[1].toFixed(1) + 'px) translate(-50%,-50%) scale(' + (1 + (q.life / q.max) * .25).toFixed(2) + ')';
  }
}
requestAnimationFrame(uiLoop);

/* sacudida de cámara (solo fuera de cinemáticas): se aplica al renderizar y se revierte */
{
  const rr = ren.render.bind(ren);
  ren.render = (s, c) => {
    if (shake > .005 && !cinOn()) {
      const ox = c.position.x, oy = c.position.y, oz = c.position.z, a = shake;
      c.position.set(ox + rnd(-a, a), oy + rnd(-a, a), oz + rnd(-a, a)); rr(s, c); c.position.set(ox, oy, oz);
      shake *= .88;
    } else rr(s, c);
  };
}

/* ---------- API pública ---------- */
window.CB = {
  CFG, MON, PD,
  tick, takeHit, takeDot, heal, die, respawn,
  canHit, hitGuardian, killGuardian, hitDragon, bossStartHp, syncBoss, coopWin, shortcutDragon,
  shake: addShake,
  dead: () => PD.dead,
  justRespawned: () => PD.respawned,   // true durante ~2 cuadros después de despertar (el dragón se retira)
  state: () => ({ dead: PD.dead, deadT: PD.deadT, lost: PD.lost, fire: PD.fire, killer: PD.killer, iF: PD.iF, auto: CFG.player.autoRespawn }),
  damage: () => dmgRaw(),
  num,
  /* animación de brazos de los caballeros "básicos" (solo si los modelos 3D no cargaron) */
  armAnim(q) { if (!q.k) return; const T0 = MON[q.type]; if (!T0) return; if (q.st === 'windup') q.k.ar.rotation.x = -2.4 * (1 - Math.max(0, q.tmr) / T0.windup); else if (q.st === 'recover' && q.tmr > .15) q.k.ar.rotation.x = .6; },
  /* cuando el modelo 3D del enemigo termina de cargar: materiales propios para poder teñirlo y hacerlo destellar */
  onModel(q) {
    q.m2.traverse(o => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone(); });
    q.mats = collectMats(q.m2); const T0 = MON[q.type]; if (T0) setTint(q, T0.tint);
  },
  /* copia neutra (sin tinte ni destello) de un enemigo, para mostrar las sombras de otros jugadores */
  makeGhost() {
    const q = EN[0]; if (q.mats) { applyFlash(q, 0); setTint(q, [1, 1, 1]); }
    const sc = q.g.scale.x, rx = bodyOf(q) ? bodyOf(q).rotation.x : 0; if (bodyOf(q)) bodyOf(q).rotation.x = 0; q.g.scale.setScalar(1);
    const m = q.g.clone(true);
    m.traverse(o => { if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(x => x.clone()) : o.material.clone(); });
    q.g.scale.setScalar(sc); if (bodyOf(q)) bodyOf(q).rotation.x = rx; const T0 = MON[q.type]; if (q.mats && T0) setTint(q, T0.tint);
    m.rotation.set(0, 0, 0); return m;
  }
};
})();
