'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../server/core.js');
const {create,join,rooms,applyAction,snapshot,server}=require('../server.js');
function seated(n){const x=create('Ana');const people=[x];for(let i=1;i<n;i++)people.push(join(x.room,'Persona '+(i+1)));const r=rooms.get(x.room);return {r,people};}
function step(r){const g=r.game,phase=g.phase;
 if(phase==='cambio'){for(const p of g.players)if(!r.cambios.has(p.id))applyAction(r,r.seats[p.id],'cambio',{cardId:E.botCambio(p)});}
 else if(phase==='turn')applyAction(r,r.seats[g.turn],'draw',{});
 else if(phase==='forced')applyAction(r,r.seats[g.forced.pid],'force',{decline:false});
 else if(phase==='pending'){
  const move=E.botMove(g,g.turn);
  if(move)applyAction(r,r.seats[g.turn],'play',move);
  else {assert.equal(g.pendingSource,'deck');applyAction(r,r.seats[g.turn],'discard',{});}
 }
 else if(phase==='pay'){
  const id=g.turn,m=E.getHandMeldMoves(g,id,150).find(m=>m.newOnTable===10);
  if(m)applyAction(r,r.seats[id],'handmeld',m);
  else {const idCard=E.botDiscard(g,id);assert.ok(idCard,'payable card');applyAction(r,r.seats[id],'pay',{cardId:idCard});}
 }
 else if(phase==='claim'){
  const claims=E.claimCandidates(g).filter(c=>!r.skips.has(c.pid));
  if(claims.length)applyAction(r,r.seats[claims[0].pid],'claim',{});
  else E.noClaim(g);
 }else assert.fail('Unknown phase '+phase);
 // Same server post-action normalization for tests.
 if(g.phase==='claim'&&!E.claimCandidates(g).filter(c=>!r.skips.has(c.pid)).length){E.noClaim(g);r.skips.clear();}
 E.checkIntegrity(g);
}
test('Las salas son independientes, privadas y requieren de 2 a 4 jugadores',()=>{
 const {r,people}=seated(4);assert.equal(r.seats.length,4);assert.throws(()=>join(r.code,'Extra'),/completa/);
 assert.throws(()=>join('XXXXXX','Intruso'),/encontramos/);
 assert.throws(()=>applyAction(r,{token:'false',id:1},'start',{}),/creó la sala/);
 const m=create('Otra');assert.notEqual(m.room,people[0].room);
});
test('El servidor no revela cartas del mazo ni las manos ajenas',()=>{
 const {r}=seated(3);applyAction(r,r.seats[0],'start',{});const snap=snapshot(r,r.seats[1]);
 assert.equal(snap.players[1].hand.length,9);assert.equal(snap.players[0].hand,undefined);assert.equal(snap.players[2].hand,undefined);
 assert.equal(snap.deck,undefined);assert.equal(snap.deckCount,25);
 assert.equal(snap.players[1].name,'Persona 2');assert.equal(snap.players[0].name,'Ana');
});
test('Cambio simultáneo mantiene 9 cartas y los estados separados',()=>{
 const {r}=seated(3);applyAction(r,r.seats[0],'start',{});if(r.game.phase==='end')return;
 const before=r.game.players.map(p=>new Set(p.hand.map(c=>c.id)));
 const chosen=r.game.players.map(p=>p.hand[0].id);
 for(let i=0;i<3;i++)applyAction(r,r.seats[i],'cambio',{cardId:chosen[i]});
 assert.equal(r.game.phase,'turn');assert(r.game.players.every(p=>p.hand.length===9));
 for(let i=0;i<3;i++)assert(r.game.players[(i+1)%3].hand.some(c=>c.id===chosen[i]));
 assert.equal(r.cambios.size,0);
});
test('Cada participante sólo puede ejecutar acciones en su turno',()=>{
 const {r}=seated(2);applyAction(r,r.seats[0],'start',{});if(r.game.phase==='end')return;
 r.game.players.forEach(p=>applyAction(r,r.seats[p.id],'cambio',{cardId:p.hand[0].id}));if(r.game.phase==='end')return;
 const other=(r.game.turn+1)%2;
 assert.throws(()=>applyAction(r,r.seats[other],'draw',{}),/Todavía no te toca/);
 const original=r.game.deck.length;applyAction(r,r.seats[r.game.turn],'draw',{});
 assert.equal(r.game.deck.length,original-1);assert.equal(r.game.pending?.id?.length>=2,true);
});
test('90 rondas multijugador simuladas sin corrupción de baraja',()=>{
 let finished=0,maximum=0;
 for(const n of [2,3,4])for(let i=0;i<30;i++){
  const {r}=seated(n);applyAction(r,r.seats[0],'start',{});let k=0;
  while(r.game.phase!=='end'&&k++<230)step(r);
  assert.equal(r.game.phase,'end',`Ronda n=${n}, steps=${k}, phase=${r.game.phase} deck=${r.game.deck.length} discard=${r.game.discard.length} passed=${r.game.players.map(p=>p.passed)} dq=${r.game.players.map(p=>p.disqualified)}`);
  maximum=Math.max(maximum,k);finished++;E.checkIntegrity(r.game);
 }
 console.log('Simulaciones',finished,'máximo de etapas',maximum);
});
test('HTTP crea, une y mantiene SSE con estados privados',async(t)=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>server.close());const host=`http://127.0.0.1:${server.address().port}`;
 const post=async(route,body)=>{const r=await fetch(host+'/api/'+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return r.json();};
 const a=await post('create',{name:'María'});const b=await post('join',{room:a.room,name:'José'});
 assert.equal(b.seat,1);assert.equal((await(await fetch(host+'/api/state?room='+a.room+'&token='+a.token)).json()).players.length,2);
 const bad=await fetch(host+'/api/state?room='+a.room+'&token=falso');assert.equal(bad.status,400);
 const controller=new AbortController();const live=await fetch(host+'/api/events?room='+a.room+'&token='+b.token,{signal:controller.signal});assert.equal(live.status,200);assert(live.headers.get('content-type').includes('text/event-stream'));
 const reader=live.body.getReader();const initial=await reader.read();assert(new TextDecoder().decode(initial.value).includes('event: state'));
 controller.abort();await post('action',{room:a.room,token:a.token,action:'start'});const view=await(await fetch(host+'/api/state?room='+a.room+'&token='+b.token)).json();assert.equal(view.players[0].hand,undefined);
});
