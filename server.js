'use strict';
// Servidor de La torre de Vela: sirve el juego y sincroniza jugadores por WebSocket. Sin dependencias (solo Node 18+).
const http=require('http'),fs=require('fs'),path=require('path'),zlib=require('zlib'),crypto=require('crypto');
const PORT=+process.env.PORT||8000,MAX=+process.env.MAX_PLAYERS||20,T0=Date.now();
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.glb':'model/gltf-binary'};
const OK=/^\/(index\.html|multiplayer\.js|models\/[\w.\-]+\.glb)$/;
const tod=()=>(.72+(Date.now()-T0)/420000)%1; // mismo ritmo que el juego: 420 s por día

const server=http.createServer((req,res)=>{
  let u='/';try{u=decodeURIComponent((req.url||'/').split('?')[0])}catch(e){}
  if(u==='/')u='/index.html';
  if(u==='/health'){res.end('ok');return}
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

const players=new Map();let nextId=1;
const clean=(s,n)=>String(s==null?'':s).replace(/[\u0000-\u001f\u007f<>]/g,'').trim().slice(0,n);
function frame(str){const b=Buffer.from(str),n=b.length;let h;
  if(n<126)h=Buffer.from([0x81,n]);
  else if(n<65536){h=Buffer.alloc(4);h[0]=0x81;h[1]=126;h.writeUInt16BE(n,2)}
  else{h=Buffer.alloc(10);h[0]=0x81;h[1]=127;h.writeBigUInt64BE(BigInt(n),2)}
  return Buffer.concat([h,b])}
const can=p=>!p.sock.destroyed&&p.sock.writableLength<1e6;
const raw=(p,buf)=>{if(can(p))p.sock.write(buf)};
const bcast=(o,except)=>{const m=frame(JSON.stringify(o));for(const p of players.values())if(p!==except)raw(p,m)};

function msg(p,s){let m;try{m=JSON.parse(s)}catch(e){return}if(!m||typeof m!=='object')return;const now=Date.now();
  if(m.t==='hi'){p.name=clean(m.n,16)||'Viajero';bcast({t:'j',id:p.id,n:p.name},p)}
  else if(m.t==='s'){
    if(now-p.ls<40)return;const a=m.s;
    if(!Array.isArray(a)||a.length!==44||!a.every(Number.isFinite))return;
    if(Math.abs(a[0])>700||Math.abs(a[2])>700||Math.abs(a[1])>300)return;
    p.ls=now;p.st=a.map(v=>Math.round(v*100)/100);p.dirty=true}
  else if(m.t==='c'){
    const t=clean(m.m,140);if(!t||now-p.lc<800)return;p.lc=now;
    bcast({t:'c',id:p.id,n:p.name,m:t})}}

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
  const key=req.headers['sec-websocket-key'];
  if((req.url||'').split('?')[0]!=='/ws'||!key||players.size>=MAX){sock.end('HTTP/1.1 503 Service Unavailable\r\n\r\n');return}
  const acc=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+acc+'\r\n\r\n');
  sock.setNoDelay(true);
  const p={id:nextId++,sock,buf:Buffer.alloc(0),name:'Viajero',st:null,dirty:false,alive:true,ls:0,lc:0};
  players.set(p.id,p);
  raw(p,frame(JSON.stringify({t:'w',id:p.id,tod:tod(),n:players.size,players:[...players.values()].filter(q=>q!==p&&q.st).map(q=>({id:q.id,n:q.name,s:q.st}))})));
  sock.on('data',c=>onData(p,c));
  const bye=()=>{if(players.delete(p.id))bcast({t:'l',id:p.id})};
  sock.on('close',bye);sock.on('error',()=>{sock.destroy();bye()});
});

setInterval(()=>{ // 15 veces por segundo: manda a cada uno los estados nuevos de los demás
  const ent=[];for(const p of players.values())if(p.dirty&&p.st){p.dirty=false;ent.push([p.id,'"'+p.id+'":'+JSON.stringify(p.st)])}
  if(!ent.length)return;
  for(const p of players.values()){const l=ent.filter(e=>e[0]!==p.id).map(e=>e[1]);if(l.length)raw(p,frame('{"t":"u","d":{'+l.join(',')+'}}'))}
},66);
setInterval(()=>bcast({t:'k',tod:tod(),n:players.size}),5000);
setInterval(()=>{for(const p of players.values()){if(!p.alive){p.sock.destroy();continue}p.alive=false;raw(p,Buffer.from([0x89,0]))}},20000);

server.listen(PORT,()=>console.log('La torre de Vela online -> http://localhost:'+PORT+'  (máx. '+MAX+' jugadores)'));
