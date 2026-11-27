'use strict';
// Servidor de La torre de Vela: sirve el juego y sincroniza jugadores por WebSocket (salas). Sin dependencias (solo Node 18+).
const http=require('http'),fs=require('fs'),path=require('path'),zlib=require('zlib'),crypto=require('crypto');
const PORT=+process.env.PORT||8000,MAX=+process.env.MAX_PLAYERS||20,MAXROOMS=+process.env.MAX_ROOMS||200,T0=Date.now();
const BOSS_SCALE=.6,BOSS_ACTIVE_MS=25000,BOSS_RESET_MS=90000,STATE_LEN=45;
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.glb':'model/gltf-binary'};
const OK=/^\/(index\.html|multiplayer\.js|combat\.js|ui\.js|mobile\.js|models\/[\w.\-]+\.glb)$/;
const tod=()=>(.72+(Date.now()-T0)/420000)%1; // mismo ritmo que el juego: 420 s por día

const server=http.createServer((req,res)=>{
  let u='/';try{u=decodeURIComponent((req.url||'/').split('?')[0])}catch(e){}
  if(u==='/')u='/index.html';
  if(u==='/health'){res.end('ok');return}
  if(u==='/favicon.ico'){res.writeHead(204);res.end();return}
  if(!OK.test(u)){res.writeHead(404);res.end('404');return}
  const f=path.join(__dirname,u);
  fs.stat(f,(e,st)=>{
    if(e||!st.isFile()){res.writeHead(404);res.end('404');return}
    const ext=path.extname(f),h={'Content-Type':MIME[ext],'Cache-Control':ext==='.glb'?'public, max-age=86400':'no-cache'};
    if(ext!=='.glb'&&/gzip/.test(req.headers['accept-encoding']||'')){
      fs.readFile(f,(e2,b)=>{if(e2){res.writeHead(500);res.end();return}h['Content-Encoding']='gzip';res.writeHead(200,h);res.end(zlib.gzipSync(b))});return}
    h['Content-Length']=st.size;res.writeHead(200,h);
    if(req.method==='HEAD')res.end();else fs.createReadStream(f).pipe(res);
  });
});

/* ---------- salas: cada grupo de amigos juega en la suya (por ?room=nombre) ---------- */
const rooms=new Map();let nextId=1;
const cleanRoom=s=>String(s||'').toLowerCase().replace(/[^\w\-]/g,'').slice(0,16)||'publica';
function getRoom(id){let r=rooms.get(id);if(!r){if(rooms.size>=MAXROOMS)return null;
  r={id,players:new Map(),boss:{r:1,dead:false,dirty:false,lastB:0,resetAt:0},board:new Map()};rooms.set(id,r)}return r}
const clean=(s,n)=>String(s==null?'':s).replace(/[\u0000-\u001f\u007f<>]/g,'').trim().slice(0,n);
function frame(str){const b=Buffer.from(str),n=b.length;let h;
  if(n<126)h=Buffer.from([0x81,n]);
  else if(n<65536){h=Buffer.alloc(4);h[0]=0x81;h[1]=126;h.writeUInt16BE(n,2)}
  else{h=Buffer.alloc(10);h[0]=0x81;h[1]=127;h.writeBigUInt64BE(BigInt(n),2)}
  return Buffer.concat([h,b])}
const can=p=>!p.sock.destroyed&&p.sock.writableLength<1e6;
const raw=(p,buf)=>{if(can(p))p.sock.write(buf)};
const bcast=(room,o,except)=>{const m=frame(JSON.stringify(o));for(const p of room.players.values())if(p!==except)raw(p,m)};

/* ---------- jefe final cooperativo: una sola barra de vida para toda la sala ---------- */
// Cada golpe llega como fracción de la vida del dragón. Cuantos más jugadores peleen (los que golpearon en los últimos 25 s),
// menos le quita cada golpe: con 1 jugador el dragón tiene su vida normal, con 20 tiene ~12 veces más.
function bossInfo(room,now){const a=Math.max(1,[...room.players.values()].filter(q=>now-q.lh<BOSS_ACTIVE_MS).length);
  return{r:Math.max(0,Math.round(room.boss.r*1e4)/1e4),s:1+BOSS_SCALE*(a-1),a,dead:room.boss.dead}}
function bossHit(room,p,f,now){
  const b=room.boss;if(b.dead||!(f>0)||now-p.lb<90)return;
  f=Math.min(.08,f);p.lb=p.lh=now;
  const s=bossInfo(room,now).s,d=Math.min(b.r,f/s);b.r-=d;b.dirty=true;
  const e=room.board.get(p.id)||{n:p.name,v:0};e.n=p.name;e.v+=d;room.board.set(p.id,e);
  if(b.r<=1e-6){b.r=0;b.dead=true;b.resetAt=now+BOSS_RESET_MS;
    const tot=[...room.board.values()].reduce((a,x)=>a+x.v,0)||1;
    const board=[...room.board.values()].sort((x,y)=>y.v-x.v).map(x=>({n:x.n,p:Math.round(x.v/tot*100)}));
    bcast(room,{t:'win',board,n:room.players.size,r:0,dead:true})}}

function msg(p,s){let m;try{m=JSON.parse(s)}catch(e){return}if(!m||typeof m!=='object')return;const now=Date.now(),room=p.room;
  if(m.t==='hi'){p.name=clean(m.n,16)||'Viajero';bcast(room,{t:'j',id:p.id,n:p.name},p)}
  else if(m.t==='s'){
    if(now-p.ls<40)return;const a=m.s;
    if(!Array.isArray(a)||a.length!==STATE_LEN||!a.every(Number.isFinite))return;
    if(Math.abs(a[0])>700||Math.abs(a[2])>700||Math.abs(a[1])>300)return;
    p.ls=now;p.st=a.map(v=>Math.round(v*100)/100);p.dirty=true}
  else if(m.t==='c'){
    const t=clean(m.m,140);if(!t||now-p.lc<800)return;p.lc=now;
    bcast(room,{t:'c',id:p.id,n:p.name,m:t})}
  else if(m.t==='bd'){bossHit(room,p,+m.f,now)}
  else if(m.t==='ev'){if(m.e==='die'&&now-p.le>1500){p.le=now;bcast(room,{t:'e',id:p.id,e:'die'},p)}}}

function onData(p,chunk){
  p.buf=p.buf.length?Buffer.concat([p.buf,chunk]):chunk;
  for(;;){const b=p.buf;if(b.length<2)return;
    const op=b[0]&15,fin=b[0]&128,mk=b[1]&128;let n=b[1]&127,o=2;
    if(n===126){if(b.length<4)return;n=b.readUInt16BE(2);o=4}
    else if(n===127){if(b.length<10)return;const big=b.readBigUInt64BE(2);if(big>8192n)return p.sock.destroy();n=Number(big);o=10}
    if(!mk||n>8192)return p.sock.destroy();
    if(b.length<o+4+n)return;
    const mask=b.subarray(o,o+4),d=Buffer.alloc(n);for(let i=0;i<n;i++)d[i]=b[o+4+i]^mask[i&3];
    p.buf=b.subarray(o+4+n);p.alive=true;
    if(op===8){p.sock.end(Buffer.from([0x88,0]));return}
    if(op===9){raw(p,Buffer.concat([Buffer.from([0x8a,Math.min(n,125)]),d.subarray(0,125)]));continue}
    if(op===1&&fin)msg(p,d.toString());
  }}

server.on('upgrade',(req,sock)=>{
  let url;try{url=new URL(req.url||'/','http://x')}catch(e){sock.end('HTTP/1.1 400 Bad Request\r\n\r\n');return}
  const key=req.headers['sec-websocket-key'];
  const room=url.pathname==='/ws'&&key?getRoom(cleanRoom(url.searchParams.get('room'))):null;
  if(!room||room.players.size>=MAX){sock.end('HTTP/1.1 503 Service Unavailable\r\n\r\n');return}
  const acc=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+acc+'\r\n\r\n');
  sock.setNoDelay(true);
  const p={id:nextId++,sock,room,buf:Buffer.alloc(0),name:'Viajero',st:null,dirty:false,alive:true,ls:0,lc:0,lb:0,lh:0,le:0};
  room.players.set(p.id,p);
  raw(p,frame(JSON.stringify({t:'w',id:p.id,room:room.id,tod:tod(),n:room.players.size,boss:bossInfo(room,Date.now()),players:[...room.players.values()].filter(q=>q!==p&&q.st).map(q=>({id:q.id,n:q.name,s:q.st}))})));
  sock.on('data',c=>onData(p,c));
  const bye=()=>{if(room.players.delete(p.id)){bcast(room,{t:'l',id:p.id});if(!room.players.size)rooms.delete(room.id)}};
  sock.on('close',bye);sock.on('error',()=>{sock.destroy();bye()});
});

setInterval(()=>{ // 15 veces por segundo: manda a cada uno los estados nuevos de los demás
  const now=Date.now();
  for(const room of rooms.values()){
    const ent=[];for(const p of room.players.values())if(p.dirty&&p.st){p.dirty=false;ent.push([p.id,'"'+p.id+'":'+JSON.stringify(p.st)])}
    if(ent.length)for(const p of room.players.values()){const l=ent.filter(e=>e[0]!==p.id).map(e=>e[1]);if(l.length)raw(p,frame('{"t":"u","d":{'+l.join(',')+'}}'))}
    const b=room.boss;
    if(b.dead&&now>=b.resetAt){b.r=1;b.dead=false;b.dirty=false;b.lastB=now;room.board.clear();bcast(room,Object.assign({t:'boss',reset:1},bossInfo(room,now)))}
    else if(b.dirty&&now-b.lastB>200){b.dirty=false;b.lastB=now;bcast(room,Object.assign({t:'boss'},bossInfo(room,now)))}
  }
},66);
setInterval(()=>{for(const room of rooms.values())bcast(room,{t:'k',tod:tod(),n:room.players.size})},5000);
setInterval(()=>{for(const room of rooms.values())for(const p of room.players.values()){if(!p.alive){p.sock.destroy();continue}p.alive=false;raw(p,Buffer.from([0x89,0]))}},20000);

if(require.main===module)server.listen(PORT,()=>console.log('La torre de Vela online -> http://localhost:'+PORT+'  (máx. '+MAX+' jugadores por sala)'));
module.exports={server,rooms,bossInfo};
