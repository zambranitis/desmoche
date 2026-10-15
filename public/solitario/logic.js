/* Desmoche Nica — motor independiente de reglas, © 2026 Ricardo Zambrana.
   Cartas tomadas del mazo/descarte nunca ingresan a la mano: se juegan o descartan. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.DesmocheCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const SUITS=['S','H','D','C'];const SUIT_SIGNS={S:'♠',H:'♥',D:'♦',C:'♣'};
 const isRed=(s)=>s==='H'||s==='D';
 const rankName=(r)=>({1:'A',11:'J',12:'Q',13:'K'}[r]||''+r);
 const cardName=(c)=>rankName(c.rank)+SUIT_SIGNS[c.suit];
 const copy=(o)=>JSON.parse(JSON.stringify(o));
 const next=(id,n)=>(id+1)%n;
 const value=(rank)=>rank===1?14:rank;
 function shuffledDeck(rng=Math.random){let a=[];for(let s of SUITS)for(let r=1;r<=13;r++)a.push({id:s+r,rank:r,suit:s});for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
 function meldCheck(list){
   if(list.length<3||list.length>10)return null;
   const a=[...list].sort((x,y)=>x.rank-y.rank);const ids=a.map(c=>c.id);if(new Set(ids).size!==a.length)return null;
   if(a.length<=4&&a.every(c=>c.rank===a[0].rank)&&new Set(a.map(c=>c.suit)).size===a.length){
     let black=a.filter(c=>!isRed(c.suit));let red=a.filter(c=>isRed(c.suit));let ordered=[];
     let side=black.length>=red.length?black:red;
     for(let i=0;i<a.length;i++){let source=side===black?black:red, other=source===black?red:black;ordered.push((i%2===0?source:other).shift()||source.shift()||other.shift());}
     return {kind:'set',cards:ordered};
   }
   if(a.every(c=>c.suit===a[0].suit)&&a.every((c,i)=>!i||c.rank===a[i-1].rank+1))return {kind:'run',cards:a};
   return null;
 }
 function totalMelds(p){return p.melds.reduce((sum,m)=>sum+m.cards.length,0);}
 function checkIntegrity(g){
   const all=[];for(let p of g.players){all.push(...p.hand);for(let m of p.melds){if(!meldCheck(m.cards))throw Error('Combinación inválida '+m.id);all.push(...m.cards);}const n=p.hand.length+totalMelds(p);if(n!==9&&!(g.phase==='pay'&&g.turn===p.id&&n===10)&&!(p.disqualified&&n===10&&p.hand.length===0)&&!(g.phase==='end'&&g.winner===p.id&&n===10))throw Error('Cuenta incorrecta para '+p.id+': '+n+' ('+g.phase+')');}
   all.push(...g.deck,...g.discard);if(g.pending)all.push(g.pending);
   if(all.length!==52||new Set(all.map(c=>c.id)).size!==52)throw Error('Baraja corrupta '+all.length);
   return true;
 }
 function bestAutoFor(hand,opt){
   const byRank=new Map();for(let c of hand)byRank.set(c.rank,(byRank.get(c.rank)||0)+1);
   const quadruples=[...byRank].filter(([r,n])=>n===4).map(([r])=>r).sort((a,b)=>value(b)-value(a));
   const peladilla=[...byRank.values()].every(x=>x===1)&&!hand.some(c=>hand.some(d=>d.id!==c.id&&d.suit===c.suit&&Math.abs(d.rank-c.rank)===1));
   const monoColor=hand.every(c=>isRed(c.suit)===isRed(hand[0].suit));
   const sameSuit=hand.every(c=>c.suit===hand[0].suit);
   let candidates=[];
   if(peladilla)candidates.push({type:'Peladilla',priority:2,strength:Math.max(...hand.map(c=>value(c.rank)))});
   if(quadruples.length)candidates.push({type:'Cuatro cuerpos',priority:3,strength:value(quadruples[0])});
   if(opt.colorAuto&&(opt.colorSameSuit? sameSuit:monoColor))candidates.push({type:'Color',priority:1,strength:Math.max(...hand.map(c=>value(c.rank)))});
   return candidates.sort((a,b)=>b.priority-a.priority||b.strength-a.strength)[0]||null;
 }
 function automaticWinner(g){
   let found=[];for(let p of g.players){const a=bestAutoFor(p.hand,g.options);if(a)found.push({...a,player:p.id});}
   found.sort((a,b)=>b.priority-a.priority||b.strength-a.strength||a.player-b.player);
   return found[0]||null;
 }
 function evaluateCard(c,hand){
   const partners=hand.filter(d=>d.id!==c.id&&d.rank===c.rank).length;
   const neighbors=hand.filter(d=>d.id!==c.id&&d.suit===c.suit&&Math.abs(c.rank-d.rank)<=2).reduce((x,d)=>x+(Math.abs(c.rank-d.rank)===1?2:1),0);
   return partners*5+neighbors*3+(c.rank===1?-0.3:0)+Math.random()*.5;
 }
 function botCambio(p){return [...p.hand].sort((a,b)=>evaluateCard(a,p.hand)-evaluateCard(b,p.hand))[0].id;}
 function createGame(playerCount=2,opts={},prior=null){
   const n=Math.min(4,Math.max(2,Number(playerCount)||2));
   const options={colorAuto:true,colorSameSuit:false,bonuses:true,...opts};
   const round=prior?prior.round+1:1;const dealer=prior?next(prior.dealer,n):Math.floor(Math.random()*n);
   let g={round,dealer,turn:next(dealer,n),players:Array.from({length:n},(_,id)=>({id,name:id?'Rival '+id:'Vos',hand:[],melds:[],passed:false,disqualified:false,disqualificationReason:null,chips:(prior?prior.players[id].chips:100)-10})),deck:shuffledDeck(),discard:[],pending:null,pendingSource:null,phase:'cambio',winner:null,result:null,options,stake:10,pot:(prior?prior.pot:0)+10*n,nextMeldId:1,openingAvailable:true,firstOpenDiscard:false,claimFrom:null,forced:null,log:[]};
   for(let x=0;x<9;x++)for(let k=1;k<=n;k++)g.players[(dealer+k)%n].hand.push(g.deck.pop());
   const instant=automaticWinner(g);if(instant)finish(g,instant.player,instant.type+' (antes del cambio)');
   return g;
 }
 function applyCambio(g,humanId){
   if(g.phase!=='cambio')return false;
   if(!g.players[0].hand.some(c=>c.id===humanId))return false;
   const choices=g.players.map((p)=>p.id?botCambio(p):humanId);
   const selected=g.players.map((p,i)=>p.hand.find(c=>c.id===choices[i]));
   g.players.forEach((p,i)=>p.hand=p.hand.filter(c=>c.id!==choices[i]));
   selected.forEach((card,i)=>g.players[next(i,g.players.length)].hand.push(card));
   g.phase='turn';let a=automaticWinner(g);if(a)finish(g,a.player,a.type+' (después del cambio)');
   g.log.push('Cambio completado');return true;
 }
 function removable(p){let ret=[];for(const meld of p.melds)for(const c of meld.cards){if(meldCheck(meld.cards.filter(d=>d.id!==c.id)))ret.push({fromId:meld.id,card:c});}return ret;}
 function subsets(cards,min=0,max=cards.length){const out=[];const n=cards.length;for(let mask=0;mask<(1<<n);mask++){let size=0;for(let j=0;j<n;j++)if(mask&(1<<j))size++;if(size<min||size>max)continue;let arr=[];for(let j=0;j<n;j++)if(mask&(1<<j))arr.push(cards[j]);out.push(arr);}return out;}
 function validateMove(g,pid,move){
   if(!g.pending||g.turn!==pid||g.phase!=='pending'||g.players[pid].disqualified)return null;
   const p=g.players[pid],own=new Map(p.hand.map(c=>[c.id,c]));
   const chosen=move.handIds||[];if(new Set(chosen).size!==chosen.length||chosen.some(id=>!own.has(id)))return null;
   const pulled=chosen.map(id=>own.get(id));const borrowed=move.borrowed||[];
   if(borrowed.length>1)return null;
   const sourceCards=[];
   for(let b of borrowed){let m=p.melds.find(m=>m.id===b.fromId);if(!m||(!m.cards.some(c=>c.id===b.cardId)))return null;
     if(move.kind==='extend'&&move.targetId===m.id)return null;
     const rest=m.cards.filter(c=>c.id!==b.cardId);if(!meldCheck(rest))return null;
     sourceCards.push(m.cards.find(c=>c.id===b.cardId));}
   let dest=[];if(move.kind==='extend'){let m=p.melds.find(m=>m.id===move.targetId);if(!m)return null;dest=m.cards;}
   else if(move.kind!=='new')return null;
   const result=meldCheck([...dest,g.pending,...pulled,...sourceCards]);if(!result)return null;
   const onTable=totalMelds(p)+1+pulled.length;
   if(onTable>10||(onTable<10&&p.hand.length-chosen.length===0))return null;
   return {check:result,onTable};
 }
 function getMoves(g,pid,limit=500){
   if(!g.pending||g.phase!=='pending'||g.turn!==pid)return [];
   const p=g.players[pid];const result=[];const seen=new Set();const sources=[null,...removable(p)];
   const maybe=(m)=>{const validated=validateMove(g,pid,m);if(!validated)return;const key=[m.kind,m.targetId||'',m.handIds.slice().sort().join(','),m.borrowed?.[0]?.cardId||''].join(':');if(seen.has(key))return;seen.add(key);result.push({...m,newOnTable:validated.onTable,kindOfMeld:validated.check.kind,moveSize:m.handIds.length+1+(m.borrowed?.length||0)});};
   const whole=subsets(p.hand,0,Math.min(p.hand.length,9));
   for(const handCards of whole){const ids=handCards.map(c=>c.id);for(const src of sources){
     const borrowed=src?[{fromId:src.fromId,cardId:src.card.id}]:[];
     if(handCards.length+(src?1:0)>=2)maybe({kind:'new',handIds:ids,borrowed});
     for(const target of p.melds){if(src&&target.id===src.fromId)continue;
       if(target.cards.length+handCards.length+(src?1:0)+1<=10)maybe({kind:'extend',targetId:target.id,handIds:ids,borrowed});}
   }}
   result.sort((a,b)=>(b.newOnTable===10?100:0)-(a.newOnTable===10?100:0)||b.moveSize-a.moveSize||a.handIds.length-b.handIds.length);
   return result.slice(0,limit);
 }
 function playPending(g,pid,move){
   const test=validateMove(g,pid,move);if(!test)return false;
   const p=g.players[pid],chosen=move.handIds||[];const cards=chosen.map(id=>p.hand.find(c=>c.id===id));
   p.hand=p.hand.filter(c=>!chosen.includes(c.id));
   const borrowed=[];
   for(const b of(move.borrowed||[])){
     const src=p.melds.find(m=>m.id===b.fromId);borrowed.push(src.cards.find(c=>c.id===b.cardId));src.cards=meldCheck(src.cards.filter(c=>c.id!==b.cardId)).cards;
   }
   if(move.kind==='new')p.melds.push({id:g.nextMeldId++,cards:meldCheck([g.pending,...cards,...borrowed]).cards});
   else {const dest=p.melds.find(m=>m.id===move.targetId);dest.cards=meldCheck([...dest.cards,g.pending,...cards,...borrowed]).cards;}
   g.log.push(p.name+' jugó '+cardName(g.pending));g.pending=null;g.pendingSource=null;g.openingAvailable=false;g.firstOpenDiscard=false;
   if(totalMelds(p)===10&&!p.disqualified)finish(g,pid,'Desmoche: diez cartas');else g.phase='pay';
   return true;
 }
 function layoffFromHand(g,pid,cardIds,targetId){
   if(g.phase!=='pay'&&g.phase!=='turn')return false;
   if(g.turn!==pid||g.players[pid].disqualified)return false;
   const p=g.players[pid],target=p.melds.find(m=>m.id===targetId);if(!target)return false;
   if(!cardIds.length||new Set(cardIds).size!==cardIds.length)return false;
   const chosen=cardIds.map(id=>p.hand.find(c=>c.id===id));if(chosen.some(c=>!c))return false;
   const normalized=meldCheck([...target.cards,...chosen]);if(!normalized||totalMelds(p)+chosen.length>10)return false;
   if(g.phase==='pay'&&p.hand.length-chosen.length===0&&totalMelds(p)+chosen.length<10)return false;
   p.hand=p.hand.filter(c=>!cardIds.includes(c.id));target.cards=normalized.cards;
   if(totalMelds(p)===10&&!p.disqualified)finish(g,pid,'Diez cartas en la mesa');return true;
 }
 // Combinaciones de cartas que ya están en la mano. Es indispensable durante
 // el pago: una combinación adicional puede completar diez cartas SIN descartar.
 function validateHandMeld(g,pid,move){
   if(!['pay','turn'].includes(g.phase)||g.turn!==pid||g.players[pid].disqualified)return null;
   const p=g.players[pid],chosen=move.handIds||[];
   if(!chosen.length||new Set(chosen).size!==chosen.length)return null;
   const cards=chosen.map(id=>p.hand.find(c=>c.id===id));if(cards.some(c=>!c))return null;
   const borrowed=move.borrowed||[];if(borrowed.length>1)return null;
   let borrowedCards=[];
   for(const b of borrowed){
     const src=p.melds.find(m=>m.id===b.fromId);if(!src||!src.cards.some(c=>c.id===b.cardId))return null;
     if(move.kind==='extend'&&move.targetId===src.id)return null;
     if(!meldCheck(src.cards.filter(c=>c.id!==b.cardId)))return null;
     borrowedCards.push(src.cards.find(c=>c.id===b.cardId));
   }
   let dest=[];
   if(move.kind==='extend'){
     const m=p.melds.find(m=>m.id===move.targetId);if(!m)return null;
     dest=m.cards;
   }else if(move.kind!=='new')return null;
   const check=meldCheck([...dest,...cards,...borrowedCards]);if(!check)return null;
   const onTable=totalMelds(p)+cards.length;
   if(onTable>10)return null;
   if(g.phase==='pay'&&p.hand.length===cards.length&&onTable!==10)return null;
   return {check,onTable};
 }
 function getHandMeldMoves(g,pid,limit=400){
   if(!['pay','turn'].includes(g.phase)||g.turn!==pid)return [];
   const p=g.players[pid],result=[],seen=new Set();
   const sources=[null,...removable(p)];
   const choices=subsets(p.hand,1,Math.min(p.hand.length,9));
   for(const handCards of choices){
     const ids=handCards.map(c=>c.id);
     for(const src of sources){
       const borrowed=src?[{fromId:src.fromId,cardId:src.card.id}]:[];
       const add=(move)=>{const check=validateHandMeld(g,pid,move);if(!check)return;
         const key=[move.kind,move.targetId||'',ids.join(','),src?.card.id||''].join(':');
         if(seen.has(key))return;seen.add(key);
         result.push({...move,newOnTable:check.onTable,kindOfMeld:check.check.kind,moveSize:ids.length});};
       if(ids.length+(src?1:0)>=3)add({kind:'new',handIds:ids,borrowed});
       for(const target of p.melds){if(src&&target.id===src.fromId)continue;
         if(target.cards.length+ids.length+(src?1:0)<=10)add({kind:'extend',targetId:target.id,handIds:ids,borrowed});}
     }
   }
   result.sort((a,b)=>Number(b.newOnTable===10)-Number(a.newOnTable===10)||b.moveSize-a.moveSize);
   return result.slice(0,limit);
 }
 function playHandMeld(g,pid,move){
   const test=validateHandMeld(g,pid,move);if(!test)return false;
   const p=g.players[pid],chosen=move.handIds;
   const used=chosen.map(id=>p.hand.find(c=>c.id===id));
   const borrowedCards=[];
   for(const b of move.borrowed||[]){
     const src=p.melds.find(m=>m.id===b.fromId);
     borrowedCards.push(src.cards.find(c=>c.id===b.cardId));
     src.cards=meldCheck(src.cards.filter(c=>c.id!==b.cardId)).cards;
   }
   p.hand=p.hand.filter(c=>!chosen.includes(c.id));
   if(move.kind==='new')p.melds.push({id:g.nextMeldId++,cards:meldCheck([...used,...borrowedCards]).cards});
   else{
     const target=p.melds.find(m=>m.id===move.targetId);
     target.cards=meldCheck([...target.cards,...used,...borrowedCards]).cards;
   }
   g.log.push(p.name+' bajó cartas de la mano');
   if(totalMelds(p)===10&&!p.disqualified)finish(g,pid,'Diez cartas en la mesa · sin pagar');
   return true;
 }
 function finishWithHand(g,pid){
   const win=getHandMeldMoves(g,pid).find(m=>m.newOnTable===10);
   return win?playHandMeld(g,pid,win):false;
 }
 // Regla local: una carta visible que prolonga un juego YA BAJADO
 // debe incorporarse al juego de su dueño, aun si quedó descalificado.
 // La prioridad se calcula desde quien hizo aparecer la carta y luego a su derecha.
 function forcedTargets(g,card,fromPlayer=g.turn){
   if(!card)return [];
   const n=g.players.length,out=[];
   for(let offset=0;offset<n;offset++){
     const pid=(fromPlayer+offset)%n,p=g.players[pid];
     for(const m of p.melds){
       if(totalMelds(p)>=10)continue;
       if(meldCheck([...m.cards,card]))out.push({pid,targetId:m.id,cardId:card.id});
     }
   }
   return out;
 }
 function beginForced(g,origin){
   if(!g.pending)return false;
   const choices=forcedTargets(g,g.pending,origin.fromPlayer);
   if(!choices.length)return false;
   g.forced={...choices[0],origin,declined:false};g.phase='forced';
   g.log.push('Carta obligatoria: '+cardName(g.pending)+' para '+g.players[g.forced.pid].name);
   return true;
 }
 function settleForced(g,decline=false){
   if(g.phase!=='forced'||!g.pending||!g.forced)return false;
   const f=g.forced,p=g.players[f.pid],m=p.melds.find(x=>x.id===f.targetId);
   if(!m||!meldCheck([...m.cards,g.pending]))return false;
   const forcedCard=g.pending;
   m.cards=meldCheck([...m.cards,forcedCard]).cards;
   if(decline){p.disqualified=true;p.disqualificationReason='Rechazó una carta obligatoria: '+cardName(forcedCard);g.log.push(p.name+' descalificado por rechazo');}
   g.log.push(cardName(forcedCard)+' incorporado obligatoriamente a '+p.name);
   g.turn=p.id;g.pending=null;g.pendingSource=null;g.forced=null;
   g.openingAvailable=false;g.firstOpenDiscard=false;
   if(!p.disqualified&&totalMelds(p)===10){finish(g,p.id,'Diez cartas con incorporación obligatoria');return true;}
   if(!p.hand.length){ // Un descalificado con nueve bajadas no tiene carta para pagar.
     if(g.deck.length===0){finish(g,null,'Mazo agotado');return true;}
     g.phase='turn';const live=g.players.filter(q=>!q.disqualified&&!q.passed);
     if(!live.length){finish(g,null,'No quedan jugadores habilitados');return true;}
     let n=next(p.id,g.players.length);while(g.players[n].passed||g.players[n].disqualified)n=next(n,g.players.length);
     g.turn=n;return true;
   }
   g.phase='pay';return true;
 }
 function disqualify(g,pid,reason){
   const p=g.players[pid];if(!p)return false;
   p.disqualified=true;p.disqualificationReason=reason||'Carta obligatoria no jugada';
   g.log.push(p.name+' quedó descalificado');return true;
 }
 function startForcedDiscard(g,sourcePlayer){
   if(g.phase!=='claim'||!g.discard.length)return false;
   const top=g.discard[g.discard.length-1];
   const choices=forcedTargets(g,top,sourcePlayer);
   if(!choices.length)return false;
   g.pending=g.discard.pop();g.pendingSource='discard';
   g.forced={...choices[0],origin:{type:'discard',fromPlayer:sourcePlayer},declined:false};
   g.phase='forced';g.log.push('Descarte obligatorio: '+cardName(top));return true;
 }
 function drawFromDeck(g){
   if(g.phase!=='turn'||g.deck.length===0||g.players[g.turn].passed||g.players[g.turn].disqualified)return false;
   g.pending=g.deck.pop();g.pendingSource='deck';g.phase='pending';beginForced(g,{type:'deck',fromPlayer:g.turn});return true;
 }
 function discardPending(g){
   if(g.phase!=='pending'||g.pendingSource!=='deck')return false;
   if(g.openingAvailable)g.firstOpenDiscard=true;
   g.discard.push(g.pending);g.pending=null;g.pendingSource=null;g.phase='claim';g.claimFrom=g.turn;
   startForcedDiscard(g,g.claimFrom);return true;
 }
 function pay(g,pid,cardId){
   if(g.phase!=='pay'||g.turn!==pid)return false;
   const p=g.players[pid];const c=p.hand.find(c=>c.id===cardId);if(!c)return false;
   p.hand=p.hand.filter(x=>x.id!==cardId);g.discard.push(c);g.phase='claim';g.claimFrom=pid;
   startForcedDiscard(g,g.claimFrom);return true;
 }
 function claimCandidates(g){
   if(g.phase!=='claim'||!g.discard.length)return [];
   const top=g.discard[g.discard.length-1],old=g.pending,phase=g.phase,turn=g.turn,source=g.pendingSource;
   let result=[];for(let k=1;k<g.players.length;k++){
     const pid=(g.claimFrom+k)%g.players.length;if(g.players[pid].passed||g.players[pid].disqualified)continue;
     g.pending=top;g.phase='pending';g.turn=pid;g.pendingSource='discard';
     const m=getMoves(g,pid,15);if(m.length)result.push({pid,moves:m});
   }
   g.pending=old;g.phase=phase;g.turn=turn;g.pendingSource=source;return result;
 }
 function acceptClaim(g,pid){
   if(g.phase!=='claim'||!g.discard.length)return false;
   const options=claimCandidates(g);const possible=options.find(p=>p.pid===pid);if(!possible)return false;
   g.pending=g.discard.pop();g.pendingSource='discard';g.phase='pending';g.turn=pid;g.openingAvailable=false;g.firstOpenDiscard=false;
   return true;
 }
 function noClaim(g){
   if(g.phase!=='claim')return false;
   if(g.firstOpenDiscard){g.firstOpenDiscard=false;g.openingAvailable=false;g.phase='turn';return true;}
   if(g.deck.length===0){finish(g,null,'Mazo agotado');return true;}
   const n=g.players.length;let to=next(g.claimFrom,n);let count=0;
   while((g.players[to].passed||g.players[to].disqualified)&&count<n){to=next(to,n);count++;}
   if(count===n||g.players.every(p=>p.passed||p.disqualified)){finish(g,null,'Todos los jugadores pasaron');return true;}
   g.turn=to;g.phase='turn';return true;
 }
 function canPass(g,pid){
   if(g.phase!=='turn'||g.turn!==pid||g.players[pid].disqualified)return false;
   const p=g.players[pid];if(p.melds.length===0)return false;
   for(const c of g.deck){
     const oldPend=g.pending,oldPhase=g.phase,oldOwner=g.turn;
     g.pending=c;g.phase='pending';g.turn=pid;
     const possible=getMoves(g,pid,1).length>0;
     g.pending=oldPend;g.phase=oldPhase;g.turn=oldOwner;
     if(possible)return false;
   }
   return true;
 }
 function pass(g,pid){if(!canPass(g,pid))return false;g.players[pid].passed=true;let target=next(pid,g.players.length),loops=0;while((g.players[target].passed||g.players[target].disqualified)&&loops<g.players.length){target=next(target,g.players.length);loops++;}if(g.players.every(p=>p.passed||p.disqualified))finish(g,null,'Todos pasaron');else g.turn=target;return true;}
 function countMico(p){let count=0;for(const m of p.melds)if(meldCheck(m.cards)?.kind==='run')if([1,2,3].every(r=>m.cards.some(c=>c.rank===r)))count++;return count;}
 function finish(g,winner,reason){
   if(winner!==null&&winner!==undefined&&g.players[winner].disqualified)return null;
   g.phase='end';g.winner=winner;const bon=[];let winAmount=0;
   if(winner!==null&&winner!==undefined){
     const p=g.players[winner];winAmount=g.pot;p.chips+=g.pot;g.pot=0;
     if(g.options.bonuses){
       const micos=countMico(p);const monoSuit=totalMelds(p)===10&&p.melds.every(m=>m.cards.every(c=>c.suit===p.melds[0].cards[0].suit));
       for(let q of g.players)if(q.id!==winner){
         let bonusCount=micos+(monoSuit?1:0)+(totalMelds(q)===0?1:0);
         const points=bonusCount*g.stake;q.chips-=points;p.chips+=points;winAmount+=points;
         if(totalMelds(q)===0)bon.push(q.name+': arriba del palo');
       }
       if(micos)bon.unshift('Mico'+(micos>1?' ×'+micos:''));if(monoSuit)bon.unshift('Color: un solo palo');
     }
   }
   g.result={winner,reason,bonuses:[...new Set(bon)],winAmount,pot:g.pot};
   return g.result;
 }
 function botMove(g,pid){
   const moves=getMoves(g,pid);if(!moves.length)return null;
   // La IA prioriza cerrar la mano, bajar nuevas combinaciones y evitar romper cartas útiles.
   const p=g.players[pid];const valued=moves.map(m=>{
     const handUsed=m.handIds.map(id=>p.hand.find(c=>c.id===id));const rest=p.hand.filter(c=>!m.handIds.includes(c.id));
     let score=(m.newOnTable===10?1000:0)+m.moveSize*1.5+(m.kind==='new'?5:0)+Math.random()*.5;
     if(m.borrowed?.length)score-=1;
     score+=rest.reduce((v,c)=>v+evaluateCard(c,rest),0)*.08;
     if(m.newOnTable<10&&rest.length===1)score-=4;
     return {m,score};
   });valued.sort((a,b)=>b.score-a.score);return valued[0].m;
 }
 function botDiscard(g,pid){const p=g.players[pid];return [...p.hand].sort((a,b)=>evaluateCard(a,p.hand)-evaluateCard(b,p.hand))[0]?.id;}
 function botLayoffs(g,pid){
   if(g.phase!=='pay')return;
   let guard=0;
   while(g.phase==='pay'&&guard++<12){
     // La computadora también debe aprovechar las combinaciones que completan
     // diez cartas ANTES de pagar. Tiene las mismas reglas que el humano.
     const handMoves=getHandMeldMoves(g,pid);
     const immediateWin=handMoves.find(m=>m.newOnTable===10);
     if(immediateWin){playHandMeld(g,pid,immediateWin);break;}
     let applied=false;
     const useful=handMoves.find(m=>m.kind==='new'&&m.handIds.length>=3&&m.newOnTable<10);
     if(useful){applied=playHandMeld(g,pid,useful);if(applied)continue;}
     const p=g.players[pid];
     for(const target of p.melds){
       for(const c of [...p.hand]){
         if(p.hand.length===1&&totalMelds(p)+1<10)continue;
         if(layoffFromHand(g,pid,[c.id],target.id)){applied=true;break;}
       }
       if(applied)break;
     }
     if(!applied)break;
   }
 }

 return {forcedTargets,beginForced,settleForced,disqualify,startForcedDiscard,SUITS,SUIT_SIGNS,isRed,rankName,cardName,shuffledDeck,meldCheck,totalMelds,checkIntegrity,bestAutoFor,automaticWinner,createGame,applyCambio,getMoves,validateMove,playPending,layoffFromHand,validateHandMeld,getHandMeldMoves,playHandMeld,finishWithHand,drawFromDeck,discardPending,pay,claimCandidates,acceptClaim,noClaim,canPass,pass,finish,botMove,botCambio,botDiscard,botLayoffs,next};
});
