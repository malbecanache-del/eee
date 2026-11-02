(()=>{'use strict';
// Si el juego está en GitHub Pages y el servidor en otro lado, poné acá la URL del servidor, ej: 'wss://torre-de-vela.onrender.com'
const DEFAULT_SERVER='';
const $=id=>document.getElementById(id),K=['ll','rl','kl','kr','l','r','el','er','capeX','capeZ','tw','cx','hy','hx'];
let ws=null,myId=0,started=false,retry=0,count=1,open=false;const names=new Map(),R=new Map();

function url(){let s=new URLSearchParams(location.search).get('server')||window.TV_SERVER||DEFAULT_SERVER;
  if(!s)s=location.protocol==='file:'?'ws://localhost:8000/ws':(location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws';
  s=s.replace(/^http/,'ws');return/\/ws$/.test(s)?s:s.replace(/\/$/,'')+'/ws'}

/* ---------- interfaz: nombre, contador y chat ---------- */
document.head.insertAdjacentHTML('beforeend','<style>#chat{position:fixed;left:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 92px);width:min(360px,70vw);z-index:4;font-size:14px;line-height:1.35;pointer-events:none}#nc{opacity:.8;font-size:12px;margin-bottom:3px}#cl div{background:rgba(20,22,48,.7);border-radius:6px;padding:2px 8px;margin-top:2px;word-wrap:break-word;width:fit-content;max-width:100%}#cl i{opacity:.7}#cl b{color:var(--amber);margin-right:6px}#ci{display:none;pointer-events:auto;width:100%;box-sizing:border-box;margin-top:4px;font:inherit;background:rgba(20,22,48,.92);color:var(--ink);border:1px solid var(--amber);border-radius:6px;padding:5px 8px}#nm{font:inherit;font-size:16px;padding:6px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.3);background:rgba(20,22,48,.8);color:var(--ink);text-align:center;margin:14px 0 4px}#ns{font-size:13px;opacity:.75;min-height:1.3em;margin-bottom:6px}.cin #chat{display:none!important}</style>');
document.body.insertAdjacentHTML('beforeend','<div id="chat"><div id="nc"></div><div id="cl"></div><input id="ci" maxlength="140" autocomplete="off" placeholder="Escribí y Enter para enviar (Esc cancela)"></div>');
const cl=$('cl'),ci=$('ci');ci.addEventListener('mousedown',e=>e.stopPropagation());
if($('b1')){$('b1').insertAdjacentHTML('beforebegin','<input id="nm" maxlength="16" placeholder="Tu nombre"><div id="ns"></div>');
  try{$('nm').value=localStorage.getItem('tv_name')||''}catch(e){}
  const cont=$('b2').style.display!=='none',bp=$('b1').cloneNode();bp.id='bp';bp.textContent='Jugar';bp.style.cssText=$('b1').style.cssText;$('b1').style.display=$('b2').style.display='none';$('b1').after(bp);
  const go=()=>{if(started)return;started=true;try{localStorage.setItem('tv_name',myName())}catch(e){}tx({t:'hi',n:myName()});$(cont?'b2':'b1').click()};
  bp.onclick=go;$('nm').addEventListener('keydown',e=>{if(e.key==='Enter')go()})}
const myName=()=>(($('nm')&&$('nm').value)||'').trim().slice(0,16)||(myName.d=myName.d||'Viajero'+(100+Math.floor(Math.random()*900)));
const stat=t=>{const n=$('ns');if(n)n.textContent=t};
function hud(){$('nc').textContent=ws&&myId?'● '+count+(count==1?' jugador en línea':' jugadores en línea')+' · Enter: chat':'○ sin conexión (jugando solo)'}
function add(d){cl.append(d);while(cl.children.length>8)cl.firstChild.remove();setTimeout(()=>{if(!open)d.style.display='none'},15000)}
function chat(n,m){const d=document.createElement('div'),b=document.createElement('b');b.textContent=n;d.append(b,document.createTextNode(m));add(d)}
function sys(t){const d=document.createElement('div'),i=document.createElement('i');i.textContent=t;d.append(i);add(d)}

/* ---------- red ---------- */
const tx=o=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify(o))};
function sync(v){if(typeof tod!=='number'||typeof v!=='number')return;const d=((v-tod+1.5)%1)-.5;if(Math.abs(d)>.003)tod=(tod+d+1)%1}
function on(m){
  if(m.t==='w'){myId=m.id;count=m.n;names.clear();for(const p of m.players){names.set(p.id,p.n);upd(p.id,p.s)}sync(m.tod);stat('En línea: '+count+(count==1?' jugador':' jugadores'));hud()}
  else if(m.t==='j'){if(!names.has(m.id))sys(m.n+' se unió');names.set(m.id,m.n);const r=R.get(m.id);if(r)label(r)}
  else if(m.t==='l'){const n=names.get(m.id);if(n)sys(n+' se fue');names.delete(m.id);drop(m.id)}
  else if(m.t==='u'){for(const id in m.d)upd(+id,m.d[id])}
  else if(m.t==='c')chat(m.n,m.m);
  else if(m.t==='k'){sync(m.tod);count=m.n;hud();stat('En línea: '+count+(count==1?' jugador':' jugadores'))}}
function connect(){
  try{ws=new WebSocket(url())}catch(e){return later()}
  ws.onopen=()=>{retry=0;tx({t:'hi',n:myName()})};
  ws.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(_){return}on(m)};
  ws.onclose=()=>{ws=null;myId=0;for(const id of[...R.keys()])drop(id);stat('Sin conexión: podés jugar solo. Reintentando…');hud();later()};
  ws.onerror=()=>{}}
const later=()=>setTimeout(connect,Math.min(15000,1500*(++retry)));
setInterval(()=>{if(!started||!myId)return;const a=window.HEROAPI,S=a?a.snap():{},
  s=[P.position.x,P.position.y,P.position.z,P.rotation.y,P.rotation.x,shield.visible?1:0];
  for(const q of K)s.push(S[q]||0);if(typeof EN!=='undefined')for(const q of EN)s.push(q.on?q.g.position.x:0,q.on?q.g.position.z:0,q.on?q.g.rotation.y:99);tx({t:'s',s:s.map(v=>Math.round(v*100)/100)})},66);

/* ---------- jugadores remotos ---------- */
function tagTex(txt){const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');
  x.font='600 30px system-ui,sans-serif';x.textAlign='center';x.textBaseline='middle';x.lineWidth=6;x.strokeStyle='rgba(10,12,28,.85)';
  x.strokeText(txt,128,32);x.fillStyle='#ffc36b';x.fillText(txt,128,32);return new THREE.CanvasTexture(c)}
function label(r){const n=names.get(r.id)||'Viajero';if(r.nm===n)return;r.nm=n;if(r.tag.material.map)r.tag.material.map.dispose();r.tag.material.map=tagTex(n);r.tag.material.needsUpdate=true}
function mk(id){const g=new THREE.Group();g.rotation.order='YXZ';
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,2.6,10),new THREE.MeshStandardMaterial({color:0x6a7fb0}));cap.position.y=1.3;g.add(cap);
  const tag=new THREE.Sprite(new THREE.SpriteMaterial({transparent:true,fog:false,depthWrite:false}));tag.scale.set(3.2,.8,1);tag.position.y=3.7;g.add(tag);
  const r={id,g,tag,cap,model:null,bones:null,sh:null,t:null,c:null,nm:'',en:[]};label(r);scene.add(g);R.set(id,r);return r}
function drop(id){const r=R.get(id);if(!r)return;scene.remove(r.g);r.en.forEach(e=>scene.remove(e.m));if(r.tag.material.map)r.tag.material.map.dispose();R.delete(id)}
function upd(id,s){const r=R.get(id)||mk(id);r.t=s;if(!r.c)r.c=s.slice()}
function model(r){const a=window.HEROAPI;if(r.model||!a||!a.HQ.ready)return;
  const m=THREE.SkeletonUtils.clone(a.root);r.bones={};
  m.traverse(o=>{if(o.isBone)r.bones[o.name]=o;if(o.userData&&o.userData.tvShield)r.sh=o});
  r.g.add(m);r.model=m;r.g.remove(r.cap);r.cap=null}
let lt=performance.now();
(function tick(){requestAnimationFrame(tick);const n=performance.now(),dt=Math.min(.1,(n-lt)/1000),a=window.HEROAPI,k=1-Math.exp(-12*dt);lt=n;
  for(const r of R.values()){const c=r.c,t=r.t;if(!t)continue;model(r);
    for(let i=0;i<20;i++){if(i===3){const d=Math.atan2(Math.sin(t[3]-c[3]),Math.cos(t[3]-c[3]));c[3]+=d*k}else if(i!==5)c[i]+=(t[i]-c[i])*k}
    c[5]=t[5];r.g.position.set(c[0],c[1],c[2]);r.g.rotation.set(c[4],c[3],0);
    if(r.bones&&a){const S={};K.forEach((q,i)=>S[q]=c[6+i]);const p=a.pose(S);
      for(const q in p){const b=r.bones[q];if(b)b.quaternion.set(p[q][0],p[q][1],p[q][2],p[q][3])}
      if(r.sh)r.sh.visible=!!(c[5]&1)}
    if(typeof EN!=='undefined')for(let i=0;i<8;i++){let e=r.en[i];const x=t[20+i*3],z=t[21+i*3],y=t[22+i*3];
      if(y===99||y===undefined){if(e)e.m.visible=false;continue}
      if(!e){const m=EN[0].g.clone(true);scene.add(m);e=r.en[i]={m,x,z}}
      if(!e.m.visible){e.x=x;e.z=z}else{e.x+=(x-e.x)*k;e.z+=(z-e.z)*k}
      e.m.visible=true;e.m.position.set(e.x,Hg(e.x,e.z),e.z);e.m.rotation.y=y}
    r.tag.visible=Math.hypot(c[0]-P.position.x,c[2]-P.position.z)<70}})();

/* ---------- chat: Enter abre, Enter envía, Esc cancela ---------- */
const canChat=()=>started&&!panel&&ws&&ws.readyState===1&&myId;
function openC(){open=true;for(const k in down)delete down[k];blk=false;setLook(false);ci.style.display='block';[...cl.children].forEach(d=>d.style.display='');ci.focus()}
function closeC(send){open=false;const v=ci.value.trim();ci.value='';ci.style.display='none';ci.blur();if(send&&v)tx({t:'c',m:v});grab()}
addEventListener('keydown',e=>{
  if(open){e.stopImmediatePropagation();if(e.key==='Enter'){e.preventDefault();closeC(true)}else if(e.key==='Escape'){e.preventDefault();closeC(false)}}
  else if(e.key==='Enter'&&!e.repeat&&canChat()){e.preventDefault();e.stopImmediatePropagation();openC()}},true);

hud();connect();
})();
