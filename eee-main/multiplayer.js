(()=>{'use strict';
// Si el juego está en GitHub Pages y el servidor en otro lado, poné acá la URL del servidor, ej: 'wss://torre-de-vela.onrender.com'
const DEFAULT_SERVER='';
const $=id=>document.getElementById(id),K=['ll','rl','kl','kr','l','r','el','er','capeX','capeZ','tw','cx','hy','hx'],SLEN=45;
let ws=null,myId=0,started=false,retry=0,count=1,open=false,room='',roomName='publica',gen=0,laterT=0;
const names=new Map(),R=new Map(),boss={r:1,s:1,a:1,dead:false};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

function cleanRoom(r){return String(r||'').toLowerCase().replace(/[^\w\-]/g,'').slice(0,16)}
(()=>{const q=new URLSearchParams(location.search).get('room');if(q!=null)room=cleanRoom(q);else try{room=cleanRoom(localStorage.getItem('tv_room'))}catch(e){}})();
function url(){let s=new URLSearchParams(location.search).get('server')||window.TV_SERVER||DEFAULT_SERVER;
  if(!s)s=location.protocol==='file:'?'ws://localhost:8000/ws':(location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws';
  s=s.replace(/^http/,'ws');s=/\/ws$/.test(s)?s:s.replace(/\/$/,'')+'/ws';return s+(room?'?room='+encodeURIComponent(room):'')}
const myName=()=>(window.UI&&UI.name&&UI.name())||(myName.d=myName.d||'Viajero'+(100+Math.floor(Math.random()*900)));

/* ---------- chat ---------- */
document.head.insertAdjacentHTML('beforeend','<style>#chat{position:fixed;left:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 92px);width:min(360px,70vw);z-index:4;font-size:14px;line-height:1.35;pointer-events:none}#nc{opacity:.8;font-size:12px;margin-bottom:3px}#cl div{background:rgba(20,22,48,.7);border-radius:6px;padding:2px 8px;margin-top:2px;word-wrap:break-word;width:fit-content;max-width:100%}#cl i{opacity:.7}#cl b{color:var(--amber);margin-right:6px}#ci{display:none;pointer-events:auto;width:100%;box-sizing:border-box;margin-top:4px;font:inherit;background:rgba(20,22,48,.92);color:var(--ink);border:1px solid var(--amber);border-radius:6px;padding:5px 8px;-webkit-user-select:text;user-select:text}.cin #chat{display:none!important}</style>');
document.body.insertAdjacentHTML('beforeend','<div id="chat"><div id="nc"></div><div id="cl"></div><input id="ci" maxlength="140" autocomplete="off" placeholder="Escribí y Enter para enviar (Esc cancela)"></div>');
const cl=$('cl'),ci=$('ci');ci.addEventListener('mousedown',e=>e.stopPropagation());
const stat=t=>{if(window.UI&&UI.status)UI.status(t)};
function hud(){$('nc').textContent=ws&&myId?'● '+count+(count==1?' jugador':' jugadores')+' · sala '+roomName+' · Enter: chat':'○ sin conexión (jugando solo)'}
function add(d){cl.append(d);while(cl.children.length>8)cl.firstChild.remove();setTimeout(()=>{if(!open)d.style.display='none'},15000)}
function chat(n,m){const d=document.createElement('div'),b=document.createElement('b');b.textContent=n;d.append(b,document.createTextNode(m));add(d)}
function sys(t){const d=document.createElement('div'),i=document.createElement('i');i.textContent=t;d.append(i);add(d)}

/* ---------- red ---------- */
const tx=o=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify(o))};
function sync(v){if(typeof tod!=='number'||typeof v!=='number')return;const d=((v-tod+1.5)%1)-.5;if(Math.abs(d)>.003)tod=(tod+d+1)%1}
function setBoss(b){if(!b)return;boss.r=b.r;boss.s=b.s||1;boss.a=b.a||1;boss.dead=!!b.dead}
function status(){stat('En línea: '+count+(count==1?' jugador':' jugadores')+' · sala "'+roomName+'"')}
function on(m){
  if(m.t==='w'){myId=m.id;count=m.n;roomName=m.room||'publica';names.clear();for(const p of m.players){names.set(p.id,p.n);upd(p.id,p.s)}sync(m.tod);setBoss(m.boss);status();hud()}
  else if(m.t==='j'){if(!names.has(m.id))sys(m.n+' se unió');names.set(m.id,m.n);const r=R.get(m.id);if(r)label(r)}
  else if(m.t==='l'){const n=names.get(m.id);if(n)sys(n+' se fue');names.delete(m.id);drop(m.id)}
  else if(m.t==='u'){for(const id in m.d)upd(+id,m.d[id])}
  else if(m.t==='c')chat(m.n,m.m);
  else if(m.t==='e'){const n=names.get(m.id)||'Alguien';if(m.e==='die')sys(n+' cayó en combate')}
  else if(m.t==='boss'){setBoss(m);if(m.reset)sys('El Dragón Ancestral volvió a despertar')}
  else if(m.t==='win'){boss.dead=true;boss.r=0;if(window.CB&&CB.coopWin)CB.coopWin(m)}
  else if(m.t==='k'){sync(m.tod);count=m.n;hud();status()}}
function connect(){
  const g=++gen;let w;try{w=new WebSocket(url())}catch(e){return later()}ws=w;
  w.onopen=()=>{if(g!==gen)return;retry=0;tx({t:'hi',n:myName()})};
  w.onmessage=e=>{if(g!==gen)return;let m;try{m=JSON.parse(e.data)}catch(_){return}on(m)};
  w.onclose=()=>{if(g!==gen)return;ws=null;myId=0;for(const id of[...R.keys()])drop(id);stat('Sin conexión: podés jugar solo. Reintentando…');hud();later()};
  w.onerror=()=>{}}
const later=()=>{clearTimeout(laterT);laterT=setTimeout(connect,Math.min(15000,1500*(++retry)))};
function reconnect(){gen++;clearTimeout(laterT);if(ws){try{ws.close()}catch(e){}}ws=null;myId=0;names.clear();for(const id of[...R.keys()])drop(id);boss.r=1;boss.dead=false;count=1;retry=0;hud();connect()}
/* el daño al jefe se agrupa (máx. ~7 mensajes por segundo) */
let bPend=0;setInterval(()=>{if(bPend>0&&ws&&ws.readyState===1&&myId){tx({t:'bd',f:Math.round(bPend*1e5)/1e5})}bPend=0},140);
setInterval(()=>{if(!started||!myId)return;const a=window.HEROAPI,S=a?a.snap():{},
  s=[P.position.x,P.position.y,P.position.z,P.rotation.y,P.rotation.x,shield.visible?1:0];
  for(const q of K)s.push(S[q]||0);if(typeof EN!=='undefined')for(const q of EN)s.push(q.on?q.g.position.x:0,q.on?q.g.position.z:0,q.on?q.g.rotation.y:99);
  while(s.length<SLEN-1)s.push(0);s.push(typeof hp==='number'?Math.max(0,hp):100);
  tx({t:'s',s:s.map(v=>Math.round(v*100)/100)})},66);

/* ---------- jugadores remotos ---------- */
function tagTex(txt){const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');
  x.font='600 30px system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineWidth=6;x.strokeStyle='rgba(10,12,28,.85)';
  x.strokeText(txt,128,32);x.fillStyle='#ffc36b';x.fillText(txt,128,32);return new THREE.CanvasTexture(c)}
function barTex(p){const c=document.createElement('canvas');c.width=128;c.height=16;const x=c.getContext('2d');
  x.fillStyle='rgba(10,12,28,.85)';x.fillRect(0,0,128,16);x.fillStyle=p>0?'#d9482b':'#555';x.fillRect(3,3,Math.max(0,122*p/100),10);x.strokeStyle='rgba(255,255,255,.5)';x.strokeRect(.5,.5,127,15);return new THREE.CanvasTexture(c)}
function label(r){const n=names.get(r.id)||'Viajero';if(r.nm===n)return;r.nm=n;if(r.tag.material.map)r.tag.material.map.dispose();r.tag.material.map=tagTex(n);r.tag.material.needsUpdate=true}
function setBar(r,p){p=Math.round(clamp(p,0,100)/10)*10;if(r.bp===p)return;r.bp=p;if(r.bar.material.map)r.bar.material.map.dispose();r.bar.material.map=barTex(p);r.bar.material.needsUpdate=true}
function mk(id){const g=new THREE.Group();g.rotation.order='YXZ';
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,2.6,10),new THREE.MeshStandardMaterial({color:0x6a7fb0}));cap.position.y=1.3;g.add(cap);
  const tag=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,fog:false,depthWrite:false}));tag.scale.set(3.2,.8,1);tag.position.y=4.1;g.add(tag);
  const bar=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,fog:false,depthWrite:false}));bar.scale.set(2.2,.28,1);bar.position.y=3.6;g.add(bar);
  const r={id,g,tag,bar,bp:-1,cap,model:null,bones:null,sh:null,t:null,c:null,nm:'',en:[]};label(r);setBar(r,100);scene.add(g);R.set(id,r);return r}
function drop(id){const r=R.get(id);if(!r)return;scene.remove(r.g);r.en.forEach(e=>scene.remove(e.m));if(r.tag.material.map)r.tag.material.map.dispose();if(r.bar.material.map)r.bar.material.map.dispose();R.delete(id)}
function upd(id,s){if(!Array.isArray(s)||s.length<SLEN-1)return;const r=R.get(id)||mk(id);r.t=s;if(!r.c)r.c=s.slice()}
function model(r){const a=window.HEROAPI;if(r.model||!a||!a.HQ.ready)return;
  const m=THREE.SkeletonUtils.clone(a.root);r.bones={};
  m.traverse(o=>{if(o.isBone)r.bones[o.name]=o;if(o.userData&&o.userData.tvShield)r.sh=o});
  r.g.add(m);r.model=m;r.g.remove(r.cap);r.cap=null}
const ghost=()=>window.CB&&CB.makeGhost?CB.makeGhost():EN[0].g.clone(true);
let lt=performance.now();
(function tick(){requestAnimationFrame(tick);const n=performance.now(),dt=Math.min(.1,(n-lt)/1000),a=window.HEROAPI,k=1-Math.exp(-12*dt);lt=n;
  for(const r of R.values()){const c=r.c,t=r.t;if(!t)continue;model(r);
    for(let i=0;i<20;i++){if(i===3){const d=Math.atan2(Math.sin(t[3]-c[3]),Math.cos(t[3]-c[3]));c[3]+=d*k}else if(i!==5)c[i]+=(t[i]-c[i])*k}
    c[5]=t[5];c[44]=t[44];r.g.position.set(c[0],c[1],c[2]);r.g.rotation.set(c[4],c[3],0);
    setBar(r,c[44]);
    if(r.bones&&a){const S={};K.forEach((q,i)=>S[q]=c[6+i]);const p=a.pose(S);
      for(const q in p){const b=r.bones[q];if(b)b.quaternion.set(p[q][0],p[q][1],p[q][2],p[q][3])}
      if(r.sh)r.sh.visible=!!(c[5]&1)}
    if(typeof EN!=='undefined')for(let i=0;i<8;i++){let e=r.en[i];const x=t[20+i*3],z=t[21+i*3],y=t[22+i*3];
      if(y===99||y===undefined){if(e)e.m.visible=false;continue}
      if(!e){const m=ghost();scene.add(m);e=r.en[i]={m,x,z}}
      if(!e.m.visible){e.x=x;e.z=z}else{e.x+=(x-e.x)*k;e.z+=(z-e.z)*k}
      e.m.visible=true;e.m.position.set(e.x,Hg(e.x,e.z),e.z);e.m.rotation.y=y}
    const near=Math.hypot(c[0]-P.position.x,c[2]-P.position.z)<70;r.tag.visible=near;r.bar.visible=near}})();

/* ---------- chat: Enter abre, Enter envía, Esc cancela ---------- */
const canChat=()=>started&&!panel&&ws&&ws.readyState===1&&myId;
function openC(){open=true;for(const k in down)delete down[k];blk=false;setLook(false);ci.style.display='block';[...cl.children].forEach(d=>d.style.display='');ci.focus()}
function closeC(send){open=false;const v=ci.value.trim();ci.value='';ci.style.display='none';ci.blur();if(send&&v)tx({t:'c',m:v});grab()}
addEventListener('keydown',e=>{
  if(open){e.stopImmediatePropagation();if(e.key==='Enter'){e.preventDefault();closeC(true)}else if(e.key==='Escape'){e.preventDefault();closeC(false)}}
  else if(e.key==='Enter'&&!e.repeat&&canChat()){e.preventDefault();e.stopImmediatePropagation();openC()}},true);
ci.addEventListener('blur',()=>{if(open)setTimeout(()=>{if(open&&document.activeElement!==ci)closeC(false)},100)});

/* ---------- API para el resto del juego ---------- */
window.MP={
  online:()=>!!(ws&&ws.readyState===1&&myId),name:()=>myName(),room:()=>roomName,get count(){return count},boss,
  players:()=>{const L=[];for(const r of R.values())if(r.t)L.push({id:r.id,name:names.get(r.id)||'Viajero',hp:r.c?r.c[44]:100,x:r.c?r.c[0]:r.t[0],z:r.c?r.c[2]:r.t[2]});return L},
  bossHit:f=>{if(ws&&myId)bPend+=Math.min(.08,f)},
  sendEvent:e=>tx({t:'ev',e}),
  openChat:()=>{if(canChat())openC()},
  join:(n,r,soft)=>{if(!soft)started=true;const nr=cleanRoom(r);if(nr!==room){room=nr;reconnect()}else if(!soft)tx({t:'hi',n:myName()})}
};
hud();connect();
})();
