'use strict';
/* Desmoche Nica Online, servidor sin dependencias externas. © 2026 Ricardo Zambrana. */
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const E=require('./server/core.js');
const HOST='0.0.0.0',PORT=Number(process.env.PORT||3000);
const ROOT=path.join(__dirname,'public');
const rooms=new Map();
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode=()=>Array.from(crypto.randomBytes(6),x=>alphabet[x%alphabet.length]).join('');
const token=()=>crypto.randomBytes(24).toString('base64url');
const cleanName=s=>String(s||'').normalize('NFKC').replace(/[<>\r\n\t]/g,'').trim().slice(0,24)||'Jugador';
const now=()=>Date.now();
function json(res,status,payload){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(payload));}
function err(message){throw new Error(message);}
function requireSeat(code,tok){const r=rooms.get(String(code||'').toUpperCase());if(!r)err('No existe esa sala o ya expiró.');const seat=r.seats.find(s=>s.token===tok);if(!seat)err('No estás autorizado para usar ese asiento.');return {r,seat};}
function create(name){if(rooms.size>=1200)err('Todas las mesas están ocupadas. Probá nuevamente más tarde.');let code;do{code=randomCode();}while(rooms.has(code));const seat={id:0,name:cleanName(name),token:token(),joined:now()};const r={code,seats:[seat],hostToken:seat.token,game:null,cambios:new Map(),skips:new Set(),listeners:new Map(),roundEndedAt:null,updated:now(),created:now(),message:'Sala creada. Invitá a tus amigos.'};rooms.set(code,r);return {room:code,token:seat.token,seat:0};}
function join(code,name,reconnect){const r=rooms.get(String(code||'').trim().toUpperCase());if(!r)err('No encontramos esa sala. Revisá el enlace o código.');if(reconnect){const s=r.seats.find(p=>p.token===reconnect);if(s)return {room:r.code,token:s.token,seat:s.id};}
 if(r.game)err('Esta partida ya comenzó. Pedí al anfitrión que cree otra sala.');if(r.seats.length>=4)err('Esta mesa ya está completa (máximo 4 personas).');
 const s={id:r.seats.length,name:cleanName(name),token:token(),joined:now()};r.seats.push(s);r.updated=now();r.message=s.name+' entró a la mesa.';broadcast(r);return {room:r.code,token:s.token,seat:s.id};}
function presence(r,id){return (r.listeners.get(id)?.size||0)>0;}
function snapshot(r,seat){const g=r.game;if(!g)return {room:r.code,me:seat.id,host:r.hostToken===seat.token,phase:'lobby',online:true,message:r.message,players:r.seats.map(s=>({id:s.id,name:s.name,connected:presence(r,s.id)})),maxPlayers:4};
 const phase=g.phase;const claims=phase==='claim'?E.claimCandidates(g).filter(c=>!r.skips.has(c.pid)):[];
 return {room:r.code,me:seat.id,host:r.hostToken===seat.token,phase,round:g.round,dealer:g.dealer,turn:g.turn,deckCount:g.deck.length,discard:g.discard.length?g.discard[g.discard.length-1]:null,discardCount:g.discard.length,pending:g.pending,source:g.pendingSource,opening:g.openingAvailable,pot:g.pot,stake:g.stake,claimFrom:g.claimFrom,claimNext:claims.length?claims[0].pid:null,forced:g.forced?{pid:g.forced.pid,targetId:g.forced.targetId}:null,hasCambio:r.cambios.has(seat.id),cambioCount:r.cambios.size,message:r.message,players:g.players.map((p)=>({id:p.id,name:p.name,connected:presence(r,p.id),hand:p.id===seat.id?p.hand:undefined,handCount:p.hand.length,melds:p.melds,passed:p.passed,disqualified:p.disqualified,disqualificationReason:p.disqualificationReason,chips:p.chips,tableCount:E.totalMelds(p)})),canPass:phase==='turn'&&g.turn===seat.id?E.canPass(g,seat.id):false,canWin:phase==='pay'&&g.turn===seat.id&&!g.players[seat.id].disqualified?E.getHandMeldMoves(g,seat.id,200).some(m=>m.newOnTable===10):false,result:phase==='end'?g.result:null,revealedWin:phase==='end'&&g.winner!==null&&g.result?.reason?.includes('cambio')?g.players[g.winner].hand:null};}
function sendEvent(res,obj){if(res.destroyed)return;res.write('event: state\ndata: '+JSON.stringify(obj)+'\n\n');}
function broadcast(r){r.updated=now();for(const [id,clientSet] of r.listeners){const seat=r.seats[id];if(!seat)continue;const state=snapshot(r,seat);for(const res of clientSet)try{sendEvent(res,state);}catch(e){clientSet.delete(res);}}
}
function renamePlayers(g,r){g.players.forEach((p,i)=>p.name=r.seats[i].name);}
function allCambios(r){const g=r.game;const choice=r.seats.map(s=>r.cambios.get(s.id));if(!choice.every(Boolean))return;const chosen=g.players.map((p,i)=>p.hand.find(c=>c.id===choice[i]));if(chosen.some(c=>!c))err('Una carta de Cambio ya no está disponible.');g.players.forEach((p,i)=>p.hand=p.hand.filter(c=>c.id!==choice[i]));chosen.forEach((c,i)=>g.players[E.next(i,g.players.length)].hand.push(c));r.cambios.clear();g.phase='turn';let a=E.automaticWinner(g);if(a)E.finish(g,a.player,a.type+' (después del cambio)');g.log.push('Cambio completo');}
function applyAction(r,seat,action,data){const pid=seat.id;const g=r.game;const needs=(valid,reason)=>{if(!valid)err(reason||'La jugada no es válida en este momento.');};
 if(action==='start'){
  needs(r.hostToken===seat.token,'Sólo quien creó la sala puede iniciar.');needs(!g,'La partida ya comenzó.');needs(r.seats.length>=2,'Se necesitan al menos dos personas para jugar.');
  r.game=E.createGame(r.seats.length,{colorAuto:true,colorSameSuit:false,bonuses:true});renamePlayers(r.game,r);r.message='Comenzó la partida. ¡Suerte!';r.cambios.clear();r.skips.clear();return;
 }
 needs(!!g,'La partida todavía no empezó.');
 if(action==='next'){
  needs(g.phase==='end','La ronda todavía no ha terminado.');needs(r.hostToken===seat.token,'Sólo quien creó la sala puede iniciar otra ronda.');
  r.game=E.createGame(r.seats.length,g.options,g);renamePlayers(r.game,r);r.cambios.clear();r.skips.clear();r.message='Comenzó una nueva ronda.';return;
 }
 if(action==='cambio'){
  needs(g.phase==='cambio','El Cambio ya terminó.');needs(!r.cambios.has(pid),'Ya confirmaste tu Cambio.');needs(g.players[pid].hand.some(c=>c.id===data.cardId),'Elegí una carta de tu mano.');r.cambios.set(pid,data.cardId);r.message=seat.name+' confirmó su Cambio.';allCambios(r);return;
 }
 if(action==='draw'){needs(g.phase==='turn'&&g.turn===pid,'Todavía no te toca tomar del mazo.');needs(E.drawFromDeck(g),'No se puede tomar del mazo.');r.skips.clear();r.message=seat.name+' tomó una carta del mazo.';return;}
 if(action==='play'){needs(g.phase==='pending'&&g.turn===pid,'No es tu turno para bajar esa carta.');needs(E.playPending(g,pid,{kind:data.kind,targetId:data.targetId,handIds:data.handIds||[],borrowed:data.borrowed||[]}), 'Esa selección no forma una combinación válida.');r.message=seat.name+' bajó una combinación.';return;}
 if(action==='discard'){needs(g.phase==='pending'&&g.turn===pid&&g.pendingSource==='deck','Esta carta no puede descartarse.');needs(E.discardPending(g),'No se puede descartar.');r.skips.clear();r.message=seat.name+' descartó la carta.';return;}
 if(action==='handmeld'){needs(g.turn===pid,'No te toca jugar.');needs(E.playHandMeld(g,pid,{kind:data.kind,targetId:data.targetId,handIds:data.handIds||[],borrowed:data.borrowed||[]}), 'Las cartas seleccionadas no forman una combinación.');r.message=seat.name+' bajó cartas de su mano.';return;}
 if(action==='win'){needs(g.turn===pid&&E.finishWithHand(g,pid),'Todavía no podés ganar con esas cartas.');r.message=seat.name+' ¡ganó con diez cartas!';return;}
 if(action==='pay'){needs(g.phase==='pay'&&g.turn===pid,'No te toca pagar.');needs(E.pay(g,pid,data.cardId),'Elegí una carta válida de tu mano para pagar.');r.skips.clear();r.message=seat.name+' pagó una carta.';return;}
 if(action==='force'){needs(g.phase==='forced'&&g.forced.pid===pid,'Esa incorporación no te corresponde.');needs(E.settleForced(g,!!data.decline),'No se puede incorporar la carta.');r.message=data.decline?seat.name+' quedó descalificado; la carta se incorporó.':seat.name+' incorporó una carta obligatoria.';return;}
 if(action==='claim'){needs(g.phase==='claim','El descarte ya se resolvió.');const options=E.claimCandidates(g).filter(c=>!r.skips.has(c.pid));needs(options.length&&options[0].pid===pid,'Otro jugador tiene prioridad para reclamar.');needs(E.acceptClaim(g,pid),'No podés reclamar esta carta.');r.skips.clear();r.message=seat.name+' tomó el descarte para jugar.';return;}
 if(action==='decline'){needs(g.phase==='claim','Ya se cerró la oportunidad de reclamar.');const options=E.claimCandidates(g).filter(c=>!r.skips.has(c.pid));needs(options.length&&options[0].pid===pid,'No te toca decidir sobre esta carta.');r.skips.add(pid);const remain=E.claimCandidates(g).filter(c=>!r.skips.has(c.pid));if(!remain.length){E.noClaim(g);r.skips.clear();}r.message=seat.name+' dejó pasar el descarte.';return;}
 if(action==='pass'){needs(g.turn===pid&&E.pass(g,pid),'No podés pasar todavía.');r.message=seat.name+' pasó el resto de la ronda.';return;}
 err('Acción desconocida.');
}
// Si nadie puede usar el descarte, el turno debe avanzar sin pedir un clic inexistente.
function normalizeRoom(r){
 const g=r.game;if(!g)return;
 let guard=0;
 while(g.phase==='claim'&&guard++<8){
  const claims=E.claimCandidates(g).filter(c=>!r.skips.has(c.pid));
  if(claims.length)break;
  E.noClaim(g);r.skips.clear();
 }
}
const TYPES={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.ico':'image/x-icon','.txt':'text/plain; charset=utf-8'};
function serve(res,pathname,req){let relative=decodeURIComponent(pathname);if(relative==='/'||relative==='/sala')relative='/index.html';const file=path.resolve(ROOT,'.'+relative);if(!file.startsWith(ROOT+path.sep)){json(res,403,{error:'Prohibido'});return;}fs.stat(file,(e,stat)=>{if(e||!stat.isFile()){json(res,404,{error:'Archivo no encontrado'});return;}if(file===path.join(ROOT,'index.html')){let html=fs.readFileSync(file,'utf8');const proto=req.headers['x-forwarded-proto']==='https'?'https': 'http';const host=String(req.headers.host||'localhost').replace(/[^a-zA-Z0-9.:-]/g,'');html=html.replace('content="/preview.png"','content="'+proto+'://'+host+'/preview.png"');res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);return;}res.writeHead(200,{'Content-Type':TYPES[path.extname(file)]||'application/octet-stream','Cache-Control':file.endsWith('index.html')||file.endsWith('.js')?'no-cache':'public,max-age=3600','X-Content-Type-Options':'nosniff'});fs.createReadStream(file).pipe(res);});}
async function readBody(req){let body='';for await(const chunk of req){body+=chunk;if(body.length>12000)err('La solicitud es demasiado grande.');}try{return JSON.parse(body||'{}');}catch{err('Solicitud inválida.');}}
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');const p=url.pathname;
 if(req.method==='GET'&&p==='/health'){json(res,200,{ok:true,rooms:rooms.size,version:'2.0'});return;}
 if(req.method==='POST'&&p==='/api/create'){const d=await readBody(req);const reply=create(d.name);json(res,200,reply);return;}
 if(req.method==='POST'&&p==='/api/join'){const d=await readBody(req);const reply=join(d.room,d.name,d.token);json(res,200,reply);return;}
 if(req.method==='POST'&&p==='/api/action'){const d=await readBody(req);const {r,seat}=requireSeat(d.room,d.token);applyAction(r,seat,String(d.action),d.data||{});normalizeRoom(r);broadcast(r);json(res,200,{ok:true});return;}
 if(req.method==='GET'&&p==='/api/state'){const {r,seat}=requireSeat(url.searchParams.get('room'),url.searchParams.get('token'));json(res,200,snapshot(r,seat));return;}
 if(req.method==='GET'&&p==='/api/events'){
  const {r,seat}=requireSeat(url.searchParams.get('room'),url.searchParams.get('token'));
  res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no','Access-Control-Allow-Origin':'same-origin'});
  res.write(': connected\n\n');if(!r.listeners.has(seat.id))r.listeners.set(seat.id,new Set());r.listeners.get(seat.id).add(res);broadcast(r);
  const heart=setInterval(()=>{if(!res.destroyed)res.write(': keepalive\n\n');},15000);
  req.on('close',()=>{clearInterval(heart);r.listeners.get(seat.id)?.delete(res);broadcast(r);});return;
 }
 if(req.method==='GET'||req.method==='HEAD'){serve(res,p,req);return;}json(res,405,{error:'Método no permitido.'});
 }catch(e){json(res,400,{error:e.message||'No se pudo completar la solicitud.'});}});
const cleaner=setInterval(()=>{const t=now();for(const [code,r] of rooms)if(t-r.updated>8*3600*1000){for(const ls of r.listeners.values())for(const res of ls)res.end();rooms.delete(code);}},3600*1000);cleaner.unref();
if(require.main===module)server.listen(PORT,HOST,()=>console.log('Desmoche Nica online en http://localhost:'+PORT));
module.exports={server,rooms,create,join,applyAction,snapshot,allCambios};
