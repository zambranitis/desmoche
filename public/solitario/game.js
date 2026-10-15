/* Desmoche Nica — interfaz táctil. Realizado por Ricardo Zambrana. */
(function(){
'use strict';
const E=window.DesmocheCore;const $=id=>document.getElementById(id);
let game=null, opponentsCount=2, selected=new Set(), borrowed=new Set(),targetId=null,declinedClaim=false,scheduled=null,toastTimer=null,modalOpen=false,stagedPending=false,drag=null,suppressClickUntil=0,aiPaused=false;
let settings={colorAuto:true,colorSameSuit:false,bonuses:true,sound:true,aiPace:6000};
try{settings={...settings,...JSON.parse(localStorage.getItem('dn-options')||'{}')};}catch(e){}
const suitColors={S:'#1a2b38',C:'#1a2b38',H:'#b13e43',D:'#b13e43'};
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function notify(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2500);}
function playSfx(type='tap'){
 if(!settings.sound)return;
 try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
   window.dnAudio=window.dnAudio||new C();let a=window.dnAudio,osc=a.createOscillator(),gain=a.createGain(),t=a.currentTime;
   osc.type='sine';osc.frequency.setValueAtTime(type==='win'?660:type==='card'?300:490,t);
   if(type==='win')osc.frequency.exponentialRampToValueAtTime(990,t+.14);
   gain.gain.setValueAtTime(.025,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.13);
   osc.connect(gain);gain.connect(a.destination);osc.start(t);osc.stop(t+.15);
 }catch(e){}
}
function artCard(c,down=false,extra='',role=''){
  const a=down?backArt():faceArt(c);
  return `<div class="playing-card ${extra}" ${c?'data-card-id="'+esc(c.id)+'"':''} ${role?'data-role="'+role+'"':''} aria-label="${down?'Carta boca abajo':c?esc(E.cardName(c)):'Carta'}">${a}</div>`;
}
function pip(cx,cy,suit,size=23,flip=false){return `<text x="${cx}" y="${cy}" font-family="Georgia,serif" font-size="${size}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${flip?180:0} ${cx} ${cy})">${E.SUIT_SIGNS[suit]}</text>`;}
function faceArt(c){
 const color=suitColors[c.suit],rank=E.rankName(c.rank),sign=E.SUIT_SIGNS[c.suit];
 let center='';
 if(c.rank===1){center=`<g fill="${color}">${pip(90,129,c.suit,102)}</g><path d="M43 216Q90 233 137 216" fill="none" stroke="#ad9a73" stroke-width="1.4"/><text x="90" y="219" fill="#ac9064" font-size="9" text-anchor="middle" font-family="Georgia">N I C A</text>`;}
 else if(c.rank>=11){
   const face=c.rank===13?'REY':c.rank===12?'REINA':'JOTA';
   const motifs={S:'✦',H:'✧',D:'◆',C:'✣'};
   center=`<rect x="43" y="43" width="94" height="164" rx="3" fill="#f5e9d4" stroke="#c6b188" stroke-width="1.6"/><rect x="48" y="48" width="84" height="154" rx="1" fill="#f8f1e2" stroke="#d8c8a4" stroke-width=".8"/>
      <g transform="translate(90,123)"><path d="M-30 66L-35 10Q-28 -5 -12 -10L-9 -29L9 -29L12 -10Q29 -5 35 10L30 66Z" fill="${color}" opacity=".90"/>
      <path d="M-35 10L-17 19L-3 7L14 20L35 10" fill="none" stroke="#d2af72" stroke-width="5"/>
      <ellipse cy="-43" rx="21" ry="26" fill="#e2bd9f"/><path d="M-23 -50Q-21 -76 0 -76Q21 -76 22 -50Q12 -59 0 -54Q-14 -61 -23 -50" fill="#332e37"/>
      <path d="M-21 -65L-24 -82L-12 -78L0 -91L12 -78L24 -82L21 -65Z" fill="#cba761" stroke="#90703d" stroke-width="2"/>
      <path d="M-11 -44l8 0m6 0l8 0" stroke="#463934" stroke-width="2"/><path d="M-5 -28q6 4 12 -1" stroke="#8b5c4b" fill="none" stroke-width="1.5"/>
      <path d="M-13 33l13 -12 13 12 -13 12Z" fill="#c6a969" opacity=".85"/><text x="0" y="58" text-anchor="middle" font-size="10" fill="#edd4a0" font-family="Georgia">${face}</text></g>
      <text x="90" y="187" fill="${color}" font-size="24" text-anchor="middle" font-family="Georgia">${motifs[c.suit]}</text>`;
 }else{
 const places={2:[[90,69],[90,189]],3:[[90,62],[90,129],[90,195]],4:[[58,70],[122,70],[58,187],[122,187]],5:[[58,70],[122,70],[90,129],[58,187],[122,187]],6:[[58,61],[122,61],[58,129],[122,129],[58,195],[122,195]],7:[[58,61],[122,61],[90,93],[58,129],[122,129],[58,195],[122,195]],8:[[58,61],[122,61],[90,93],[58,129],[122,129],[90,160],[58,195],[122,195]],9:[[58,61],[122,61],[58,105],[122,105],[90,129],[58,154],[122,154],[58,195],[122,195]],10:[[58,52],[122,52],[90,78],[58,108],[122,108],[58,150],[122,150],[90,178],[58,203],[122,203]]};
 center=`<g fill="${color}">${places[c.rank].map(([x,y],i)=>pip(x,y,c.suit,26,i>=Math.ceil(c.rank/2))).join('')}</g>`;
 }
 return `<svg viewBox="0 0 180 252" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="178" height="250" rx="11" fill="#fdfbf3" stroke="#e0d7c6" stroke-width="2"/><rect x="8" y="8" width="164" height="236" rx="5" fill="none" stroke="#d7c6a8" stroke-width="1.1"/><g fill="${color}" font-family="Georgia,serif" font-weight="bold"><text x="16" y="32" font-size="26">${rank}</text><text x="20" y="55" font-size="25">${sign}</text><g transform="translate(180 252) rotate(180)"><text x="16" y="32" font-size="26">${rank}</text><text x="20" y="55" font-size="25">${sign}</text></g></g>${center}</svg>`;
}
function backArt(){return `<svg viewBox="0 0 180 252" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><rect width="180" height="252" rx="10" fill="#fff8e8"/><rect x="8" y="8" width="164" height="236" rx="6" fill="#923946" stroke="#7b2d36" stroke-width="1"/><rect x="15" y="15" width="150" height="222" rx="3" fill="none" stroke="#f5e8d5" stroke-width="2"/><rect x="21" y="21" width="138" height="210" rx="2" fill="none" stroke="#f4dcb7" stroke-width=".8"/><g stroke="#f1dcb9" fill="none" opacity=".85"><path d="M90 34Q118 76 90 117Q62 76 90 34ZM90 218Q118 176 90 135Q62 176 90 218Z" stroke-width="1.7"/><path d="M35 126Q65 85 90 126Q115 167 145 126Q115 85 90 126Q65 167 35 126Z" stroke-width="2"/><circle cx="90" cy="126" r="30" stroke-width="2"/><circle cx="90" cy="126" r="23" stroke-width=".6"/><path d="M31 32L149 220M149 32L31 220" opacity=".3"/><path d="M30 30q60 42 120 0m-120 192q60 -42 120 0" opacity=".8"/></g><g fill="#fff0cf"><text x="90" y="131" font-size="25" font-family="Georgia,serif" font-weight="bold" text-anchor="middle">DN</text><text x="90" y="152" font-size="6.5" font-family="Georgia,serif" text-anchor="middle" letter-spacing="2">NICARAGUA</text><text x="90" y="53" font-size="18" text-anchor="middle">✦</text><text x="90" y="213" font-size="18" text-anchor="middle">✦</text></g></svg>`;}
function noCardsText(msg){return `<span class="action-msg">${esc(msg)}</span>`;}
function playerLabel(id){return id===0?'Vos':'Rival '+id;}
function closeModal(){modalOpen=false;$('modalShade').classList.add('hidden');}
function openModal(html){modalOpen=true;$('modalContent').innerHTML=html;$('modalShade').classList.remove('hidden');}
function button(text,action,type='ghost',disabled=false){return `<button class="game-btn ${type}" data-action="${action}" ${disabled?'disabled':''}>${text}</button>`;}
function inspectCard(card,description='Carta a la vista'){
 if(!card)return;
 clearSchedule();
 openModal(`<button class="modal-close" data-action="close" aria-label="Cerrar">×</button>
  <p class="inspection-eyebrow">DESMOCHE NICA · OBSERVAR</p>
  <h2>${esc(E.cardName(card))}</h2><div class="inspection-card">${artCard(card)}</div>
  <p class="sub">${esc(description)}. Los rivales permanecen en pausa mientras observás esta carta.</p>
  <button class="game-btn primary" data-action="close" style="width:100%">VOLVER A LA MESA</button>`);
}
function seatOf(id,n){if(n===2)return 'top';if(n===3)return id===1?'right':'left';return id===1?'right':id===2?'top':'left';}
function render(){
 if(!game)return;
 const g=game,p=g.players[0];$('roundText').textContent='RONDA '+String(g.round).padStart(2,'0')+' · '+g.pot+' FICHAS';
 $('deckText').textContent='MAZO · '+g.deck.length;
 $('deckPile').innerHTML=g.deck.length?artCard(null,true):'<div class="pile-empty">Vacío</div>';
 $('deckPile').classList.toggle('can-draw',g.phase==='turn'&&g.turn===0);
 $('game').classList.toggle('ai-paused',aiPaused);$('game').classList.toggle('ai-showcase',g.phase==='pending'&&g.turn!==0||g.phase==='forced');
 $('pauseAi').textContent=aiPaused?'▶':'Ⅱ';$('pauseAi').setAttribute('aria-label',aiPaused?'Reanudar computadora':'Pausar computadora');
 $('drawnPile').innerHTML=g.pending&&(!stagedPending||g.phase==='forced')?artCard(g.pending,false,'clickable'):(g.pending?'<div class="pile-empty pending-moved">EN TU MESA ↘</div>':'<div class="pile-empty">—</div>');
 $('discardPile').innerHTML=g.discard.length?artCard(g.discard[g.discard.length-1]):'<div class="pile-empty">—</div>';
 const opponents=g.players.slice(1);
 $('opponents').innerHTML=opponents.map(q=>`<div class="opponent ${g.turn===q.id?'is-turn':''} ${q.disqualified?'is-disqualified':''}"><span class="avatar">${q.id===1?'J':q.id===2?'C':'M'}</span><span class="opponent-name">${playerLabel(q.id)}</span><div class="opponent-info">${q.disqualified?'DESCALIFICADO · ':''}${q.hand.length} en mano · ${E.totalMelds(q)} en mesa</div></div>`).join('');
 $('opponentMelds').innerHTML=opponents.map(q=>`<div class="opponent-seat seat-${seatOf(q.id,g.players.length)} ${q.disqualified?'dq':''}"><div class="seat-owner">${playerLabel(q.id)} · J${q.id+1}${q.disqualified?' · DESC.':''}</div><div class="seat-melds">${q.melds.length?q.melds.map(m=>`<div class="opp-meld">${m.cards.map(c=>q.passed?artCard(null,true,'mini-card'):artCard(c,false,'mini-card','opp')).join('')}</div>`).join(''):'<span class="seat-empty">Aún sin bajar</span>'}</div></div>`).join('');
 const stage=g.pending&&g.turn===0&&g.phase==='pending'&&stagedPending;
 const preview=stage?[g.pending,...p.hand.filter(c=>selected.has(c.id)),...p.melds.flatMap(m=>m.cards.filter(c=>borrowed.has(c.id)))]:[];
 const stagedHtml=stage?`<div class="staging-meld" aria-label="Carta que estás armando en tu mesa"><span class="staging-tag">ARMANDO</span>${[...preview].sort((a,b)=>a.rank-b.rank).map((c,i)=>artCard(c,false,i?'stage-part':'stage-primary')).join('')}</div>`:'';
 const meldHtml=p.melds.map(m=>`<div class="my-meld ${targetId===m.id?'targeted':''}" data-meld-id="${m.id}"><button class="meld-target ${targetId===m.id?'active':''}" data-target="${m.id}" title="Seleccionar jugada para extender">${targetId===m.id?'✦':'+'}</button>${m.cards.map(c=>artCard(c,false,borrowed.has(c.id)?'selected':'','borrow')).join('')}</div>`).join('');
 const canReceive=['turn','pending','claim','pay'].includes(g.phase)&&g.turn===0||g.phase==='claim';
 $('playerMeldArea').classList.toggle('can-stage',canReceive);
 $('myMelds').innerHTML=stagedHtml+meldHtml||'<span class="empty-melds">Arrastrá aquí la carta que tomés del mazo o del descarte</span>';
 $('progressText').textContent=E.totalMelds(p)+' / 10 CARTAS';$('handCount').textContent=p.hand.length+' en mano · '+p.chips+' fichas';
 const count=p.hand.length;const area=$('myHand');const width=Math.min(area.clientWidth||360,460);
 const cw=window.innerWidth<371?57:64;const available=Math.max(0,width-cw-3);
 const step=count>1?Math.min(39,available/(count-1)):0;const total=cw+(count-1)*step;const offset=(width-total)/2;
 area.innerHTML=p.hand.map((c,i)=>{
   const curve=Math.abs(i-(count-1)/2);let x=offset+i*step;let rot=(i-(count-1)/2)*1.4;
   return `<div class="playing-card hand-card ${selected.has(c.id)?'selected':''}" data-card-id="${c.id}" data-role="hand" style="--tx:${x}px;--ty:${curve*1.3}px;--rot:${rot}deg;z-index:${i+1}">${faceArt(c)}</div>`;
 }).join('');
 let kicker='',title='',help='',controls='';
 switch(g.phase){
  case 'cambio':kicker='ETAPA 01 · CAMBIO';title='Elegí una carta para pasar';help='Tocá una carta de tu mano. Todos pasaremos una carta a la derecha al mismo tiempo.';controls=button('Confirmar Cambio →','cambio','primary',selected.size!==1);break;
  case 'turn':
    kicker='ETAPA 02 · TOMAR DEL MAZO';
    if(g.turn===0){title='Es tu turno';help='Arrastrá la carta del mazo hasta TU MESA, o tocá «Tomar del mazo». Nunca entra a tu mano.';
      controls=button('Tomar del mazo','draw','primary')+(E.canPass(g,0)?button('Pasar la mano','pass'):'');
      if(targetId&&selected.size)controls+=button('Agregar a mi jugada','layoff');}
    else{title='Le toca a '+playerLabel(g.turn);help='Esperando que tome una carta…';controls=noCardsText('Los rivales están pensando su jugada.');}break;
  case 'forced':{
    const f=g.forced,q=g.players[f.pid];
    kicker='REGLA OBLIGATORIA · CARTA COMPATIBLE';
    if(f.pid===0&&!q.disqualified){
      title='¡Debés incorporar '+E.cardName(g.pending)+'!';
      help='La carta continúa una combinación tuya ya bajada. Debés incorporarla y luego pagar. Si la rechazás quedás descalificado, pero igualmente se incorpora y se paga.';
      controls=button('Incorporar obligatoriamente','force','primary')+button('Rechazar · descalificación','refuse','danger');
    }else{
      title=playerLabel(f.pid)+' debe incorporar '+E.cardName(g.pending);
      help=q.disqualified?'Aunque está descalificado, su juego bajado sigue recibiendo cartas obligatorias.':'La combinación ya bajada recibe esta carta antes de que continúe la ronda.';
      controls=noCardsText('Podés tocar la carta ampliada para observarla.');
    }
    break;
  }
  case 'pending':kicker='ETAPA 03 · CARTA EN JUEGO';
    if(g.turn===0){title='Jugá '+E.cardName(g.pending);help='Arrastrá la carta a TU MESA y añadí las de tu mano tocándolas o arrastrándolas. Al completar la combinación, tocá «Bajar». También podés usar el + de una jugada.';
      const canPlay=E.getMoves(g,0,1).length>0;
      controls=button('Bajar / Extender','play','primary')+button('Sugerir','hint','ghost',!canPlay)+(g.pendingSource==='deck'?button('Descartar','discard','danger'):'');
    }else{title=playerLabel(g.turn)+' está jugando';help='Observá la carta que apareció. La computadora espera antes de decidir; tocá la carta para ampliarla o pausá los rivales.';controls=noCardsText('Resolviendo su jugada…');}break;
  case 'pay':kicker='ETAPA 04 · PAGAR';
    if(g.turn===0&&!p.disqualified){title='Ahora debés pagar';const wins=E.getHandMeldMoves(g,0).some(m=>m.newOnTable===10);
      if(wins){kicker='ETAPA 04 · PAGAR O GANAR';title='¡Ya podés ganar!';help='Tenés diez cartas para completar la mesa. Podés declarar victoria sin pagar ni descartar. También podés seguir jugando si querés.';}
      else{help='Antes de pagar, podés bajar una NUEVA terna o escalera de tu mano. Arrastrá las cartas hacia TU MESA o seleccionálas. Si completás diez, ganás sin descartar.';}
      controls=(wins?button('✦ ¡GANAR CON 10 CARTAS!','win','primary'):'')+button('Bajar nueva combinación','handmeld','ghost',selected.size<3)+button('Pagar con descarte','pay',wins?'ghost':'primary',selected.size!==1)+button('Agregar a jugada','layoff','ghost',!targetId||selected.size===0);
    }else if(g.turn===0){kicker='DESCALIFICADO · PAGO OBLIGATORIO';title='Debés entregar una carta';help='Aunque ya no podés ganar, tus combinaciones siguen recibiendo cartas. Elegí vos qué carta de tu mano querés pagar.';controls=button('Pagar con descarte','pay','primary',selected.size!==1);}
    else{title=playerLabel(g.turn)+' está pagando';help='Incluso un rival descalificado debe entregar una carta cuando amplía su juego.';controls=noCardsText('Esperando el descarte…');}break;
  case 'claim':{
    const claims=E.claimCandidates(g).filter(c=>!(declinedClaim&&c.pid===0));
    kicker='ETAPA 05 · DESCARTE';
    if(claims.length&&claims[0].pid===0){title='¡Podés tomar el descarte!';help='Esa carta te sirve para una combinación. Tenés prioridad; podés tomarla o dejarla pasar.';controls=button('Tomar para jugar','claim','primary')+button('Dejar pasar','decline');}
    else{title='Revisando el descarte';help=claims.length?playerLabel(claims[0].pid)+' puede aprovechar esta carta.':'Nadie aprovecha esta carta; sigue el siguiente turno.';controls=noCardsText('Determinando quién continúa…');}
    break;
  }
  case 'end':kicker='FIN DE LA RONDA';title=g.result?.winner===null?'No hubo ganador':g.result?.winner===0?'¡Ganaste la ronda!':playerLabel(g.result?.winner)+' ganó';help=g.result?.reason||'';controls=button('Ver resultado','result','primary');break;
 }
 $('statusKicker').textContent=kicker;$('statusTitle').textContent=title;$('statusHelp').textContent=help;$('actionArea').innerHTML=controls;
 if(!modalOpen)scheduleBot();
}
function clearSelection(){selected.clear();borrowed.clear();targetId=null;}
function resetClaim(){declinedClaim=false;}
function clearSchedule(){if(scheduled){clearTimeout(scheduled);scheduled=null;}}
function scheduleBot(){
 if(!game||modalOpen||scheduled||game.phase==='end'||aiPaused)return;
 const g=game,pace=Number(settings.aiPace)||6000;
 const later=(fn,delay)=>scheduled=setTimeout(()=>{
   scheduled=null;if(game!==g||modalOpen||aiPaused)return;
   fn();
 },delay);
 if(g.phase==='turn'&&g.turn!==0){later(()=>{E.drawFromDeck(g);playSfx('card');onState();},950);}
 else if(g.phase==='forced'){
   const f=g.forced;
   if(f.pid!==0||g.players[0].disqualified){later(()=>{
      E.settleForced(g,false);clearSelection();playSfx('card');onState();
   },pace);}
 }
 else if(g.phase==='pending'&&g.turn!==0){later(()=>{
   const move=E.botMove(g,g.turn);
   if(move){E.playPending(g,g.turn,move);playSfx('card');if(g.phase==='pay')E.botLayoffs(g,g.turn);}
   else if(g.pendingSource==='deck')E.discardPending(g);
   if(g.phase==='pay'){const drop=E.botDiscard(g,g.turn);if(drop)E.pay(g,g.turn,drop);}
   if(g.phase==='claim')resetClaim();onState();
 },pace);}
 else if(g.phase==='pay'&&g.turn!==0){
   later(()=>{
      if(!g.players[g.turn].disqualified)E.botLayoffs(g,g.turn);
      if(g.phase==='pay'){const drop=E.botDiscard(g,g.turn);if(drop)E.pay(g,g.turn,drop);resetClaim();}
      onState();
   },Math.max(900,Math.round(pace*.48)));
 }
 else if(g.phase==='claim'){
   const opts=E.claimCandidates(g).filter(c=>!(declinedClaim&&c.pid===0));
   if(opts.length&&opts[0].pid===0)return;
   later(()=>{
     const latest=E.claimCandidates(g).filter(c=>!(declinedClaim&&c.pid===0));
     if(latest.length){E.acceptClaim(g,latest[0].pid);clearSelection();playSfx('card');}
     else E.noClaim(g);
     onState();
   },opts.length?pace:Math.max(1500,Math.round(pace*.65)));
 }
}
function onState(){
 if(!game)return;
 if(game.phase==='end'){stagedPending=false;clearSelection();render();showResults();return;}
 render();
}
function chooseHand(id){
 if(!game)return;const phase=game.phase;if(!['cambio','pending','pay','turn'].includes(phase))return;
 if(game.turn!==0&&phase!=='cambio')return;
 if(phase==='cambio'){if(selected.has(id))selected.clear();else{selected.clear();selected.add(id);}}
 else{if(selected.has(id))selected.delete(id);else selected.add(id);}
 playSfx();render();
}
function borrowCard(id){
 if(!game||game.phase!=='pending'||game.turn!==0)return;
 const p=game.players[0];const parent=p.melds.find(m=>m.cards.some(c=>c.id===id));
 if(!parent)return;
 if(!E.meldCheck(parent.cards.filter(c=>c.id!==id))){notify('Esta carta dejaría inválida la combinación.');return;}
 if(borrowed.has(id))borrowed.delete(id);else{borrowed.clear();borrowed.add(id);targetId=null;}
 playSfx();render();
}
function tryPlay(){
 const p=game.players[0],move={kind:targetId?'extend':'new',targetId,handIds:[...selected],borrowed:[...borrowed].map(id=>{const m=p.melds.find(m=>m.cards.some(c=>c.id===id));return {fromId:m.id,cardId:id};})};
 if(E.playPending(game,0,move)){clearSelection();stagedPending=false;playSfx('card');onState();}
 else notify('Esa selección no forma una jugada válida. Probá con «Sugerir».');
}
function hint(){const m=E.botMove(game,0);if(!m){notify('Esta carta no permite una combinación válida.');return;}
 clearSelection();m.handIds.forEach(id=>selected.add(id));(m.borrowed||[]).forEach(b=>borrowed.add(b.cardId));targetId=m.targetId||null;notify('Jugadas seleccionadas. Tocá «Bajar / Extender».');render();}
function tryHandMeld(){
 const move={kind:targetId?'extend':'new',targetId,handIds:[...selected],borrowed:[...borrowed].map(id=>{const m=game.players[0].melds.find(m=>m.cards.some(c=>c.id===id));return {fromId:m.id,cardId:id};})};
 if(E.playHandMeld(game,0,move)){clearSelection();playSfx('card');onState();}
 else notify('Estas cartas no forman una nueva combinación válida.');
}
function tryLayoff(){if(!targetId||!selected.size){notify('Seleccioná una jugada (+) y las cartas que vas a agregar.');return;}
 if(E.layoffFromHand(game,0,[...selected],targetId)){clearSelection();playSfx('card');onState();}
 else notify('Esas cartas no continúan la combinación seleccionada.');}
function beginGame(){
 stagedPending=false;aiPaused=false;clearSchedule();clearSelection();closeModal();$('home').classList.add('hidden');$('game').classList.remove('hidden');
 game=E.createGame(opponentsCount,settings);resetClaim();onState();}
function newRound(){
 const old=game;stagedPending=false;aiPaused=false;clearSchedule();clearSelection();closeModal();game=E.createGame(old.players.length,settings,old);resetClaim();onState();}
function goHome(){stagedPending=false;aiPaused=false;clearSchedule();closeModal();game=null;clearSelection();$('game').classList.add('hidden');$('home').classList.remove('hidden');}
function showResults(){
 if(!game||game.phase!=='end')return;
 const g=game,r=g.result,w=r.winner===null?'SIN GANADOR':r.winner===0?'¡GANASTE!':playerLabel(r.winner).toUpperCase();
 const detail=r.winner===null?`El mazo se agotó sin que nadie completara diez cartas. El bote de <b>${g.pot} fichas</b> se acumula para la siguiente ronda.`:`El premio de esta ronda fue de <b>${r.winAmount} fichas</b> (bote y bonificaciones).`;
 openModal(`<div class="result-medal">${r.winner===null?'↻':'✦'}</div><h2>${w}</h2><p class="sub">${esc(r.reason)}. ${detail}</p>
  <div class="summary-grid"><div class="summary-box"><b>${String(g.round).padStart(2,'0')}</b><span>RONDA</span></div><div class="summary-box"><b>${g.pot||r.winAmount}</b><span>${r.winner===null?'BOTE ACUMULADO':'PREMIO'}</span></div></div>
  ${r.bonuses.length?`<h3>Bonificaciones</h3><p>${r.bonuses.map(esc).join(' · ')}</p>`:''}
  <h3>Marcador</h3>${g.players.map(p=>`<div class="leaderboard"><span>${p.id===0?'Vos':p.name} · ${E.totalMelds(p)} en mesa</span><b>${p.chips} fichas ${p.disqualified?'· DESCALIFICADO':''}</b></div>`).join('')}
  <div class="modal-actions"><button class="game-btn ghost" data-action="home">MENÚ</button><button class="game-btn primary" data-action="next">OTRA RONDA →</button></div>`);
 playSfx('win');
}
function showRules(){
 openModal(`<button class="modal-close" data-action="close" aria-label="Cerrar">×</button><h2>Cómo se juega <em>Desmoche</em></h2><p class="sub">Las reglas tradicionales nicaragüenses, adaptadas para una partida individual contra la computadora.</p>
 <ul class="rules-list">
 <li><strong>1 · Objetivo:</strong> completar exactamente <b>10 cartas en la mesa</b>, organizadas en combinaciones de tres o más cartas.</li>
 <li><strong>2 · Reparto:</strong> cada jugador recibe nueve cartas. Antes de jugar, todos realizan el <b>Cambio</b>, pasando una a su derecha.</li>
 <li><strong>3 · Carta en juego:</strong> tomás una del mazo y se muestra en el centro. <b>Nunca entra a tu mano.</b> Debés jugarla de inmediato en una combinación o descartarla.</li>
 <li><strong>4 · Ternas:</strong> tres o cuatro cartas del mismo valor, de distintos palos (por ejemplo, 7♠ 7♥ 7♣).</li>
 <li><strong>5 · Escaleras:</strong> tres a diez cartas consecutivas del mismo palo. A-2-3 y J-Q-K valen, Q-K-A no.</li>
 <li><strong>6 · Pagar o ganar:</strong> tras aprovechar una carta, podés bajar otra combinación formada con cartas de tu mano. Si completás <b>diez en la mesa, ganás sin pagar</b>. De lo contrario debés descartar una carta de la mano.</li>
 <li><strong>7 · Reclamar:</strong> otro jugador puede aprovechar el último descarte si lo convierte inmediatamente en una combinación. Se respeta el orden hacia la derecha del descartador.</li>
 <li><strong>8 · Desmoche:</strong> podés reutilizar una carta de una combinación tuya siempre que la combinación original siga siendo válida.</li>
 <li><strong>9 · Incorporación obligatoria:</strong> una carta que continúa una combinación ya bajada debe incorporarse y pagarse. Rechazarla descalifica, pero el jugador sigue pagando cartas obligatorias mientras la ronda continúa.</li>
 <li><strong>10 · Inspección:</strong> tocá cualquier carta boca arriba para ampliarla. Ajustá el tiempo de espera de rivales a 2.5, 6 o 10 segundos, o usá pausa.</li>
 <li><strong>11 · Primera carta:</strong> si la primera carta de la mano se descarta y nadie la aprovecha, el jugador inicial toma una segunda.</li>
 <li><strong>12 · Victorias automáticas:</strong> Peladilla, Cuatro cuerpos y Color, según las opciones elegidas antes de jugar.</li>
 <li><strong>13 · Bonificaciones:</strong> Mico (A-2-3), Color (diez del mismo palo) y Arriba del Palo. Son fichas virtuales, no apuestas con dinero real.</li>
 </ul><p class="sub"><b>Control táctil:</b> arrastrá la carta del mazo o descarte hacia TU MESA para prepararla, y arrastrá tus cartas dentro de TU MANO para cambiar su orden. También podés tocar las cartas para seleccionarlas.</p><p class="sub">Esta edición incluye rivales automáticos, la mecánica esencial y las bonificaciones. Los juegos paralelos de apuestas («oro», «par rojo», etc.) quedan para otra edición.</p><button class="game-btn primary" data-action="close" style="width:100%;margin-top:12px">ENTENDIDO</button>`);
}
function showSettings(){
 const toggler=(label,sub,setting)=>`<div class="option-row"><div><strong>${label}</strong><small>${sub}</small></div><button class="switch ${settings[setting]?'on':''}" data-toggle="${setting}" aria-label="Cambiar ${label}" aria-pressed="${settings[setting]}"></button></div>`;
 openModal(`<button class="modal-close" data-action="close">×</button><h2>Preferencias <em>de juego</em></h2><p class="sub">Configurá las variantes antes de repartir.</p>
  ${toggler('Color automático','Nueve cartas de un mismo color ganan.', 'colorAuto')}
  ${toggler('Color por palo','Requiere nueve cartas del mismo palo.', 'colorSameSuit')}
  ${toggler('Jugar todo','Activar Mico, Color y Arriba del Palo.', 'bonuses')}
  ${toggler('Sonidos','Señales suaves durante las jugadas.', 'sound')}
  <div class="option-row"><div><strong>Tiempo para observar cartas</strong><small>La computadora espera antes de decidir.</small></div>
  <select class="pace-select" data-pace aria-label="Velocidad de la computadora"><option value="2500" ${settings.aiPace==2500?'selected':''}>2.5 s</option><option value="6000" ${settings.aiPace==6000?'selected':''}>6 s</option><option value="10000" ${settings.aiPace==10000?'selected':''}>10 s</option></select></div>
  <h3>Acerca de esta edición</h3><p>Baraja e identidad visual originales de <b>Desmoche Nica</b>. Esta es una experiencia local contra rivales automáticos, no una sala multijugador en línea.</p><p>Realizado por Ricardo Zambrana.</p>
  <button class="game-btn primary" data-action="close" style="width:100%;margin-top:15px">GUARDAR Y VOLVER</button>`);
}
function confirmExit(){openModal(`<button class="modal-close" data-action="close">×</button><h2>¿Salir de la <em>mesa</em>?</h2><p class="sub">Volver al menú finalizará la partida actual.</p><div class="modal-actions"><button class="game-btn ghost" data-action="close">SEGUIR JUGANDO</button><button class="game-btn primary" data-action="home">SALIR AL MENÚ</button></div>`);}
function action(which){
 if(which==='rules'){showRules();return;}if(which==='settings'){showSettings();return;}if(which==='close'){closeModal();if(game)render();return;}if(which==='exit'){confirmExit();return;}
 if(which==='start'){beginGame();return;}if(which==='home'){goHome();return;}if(which==='next'){newRound();return;}
 if(!game)return;
 switch(which){
  case 'force':if(game.phase==='forced'&&game.forced.pid===0){if(E.settleForced(game,false)){clearSelection();stagedPending=false;playSfx('card');onState();}}break;
  case 'refuse':if(game.phase==='forced'&&game.forced.pid===0){if(E.settleForced(game,true)){clearSelection();stagedPending=false;notify('Descalificado: la carta se incorpora y deberás pagar.');onState();}}break;
  case 'pauseai':aiPaused=!aiPaused;clearSchedule();if(game)render();break;
  case 'draw':if(game.phase==='turn'&&game.turn===0&&E.drawFromDeck(game)){stagedPending=false;clearSelection();playSfx('card');onState();}break;
  case 'cambio':if(selected.size===1&&E.applyCambio(game,[...selected][0])){clearSelection();playSfx('card');onState();}break;
  case 'stage':if(game.phase==='pending'&&game.turn===0){stagedPending=true;render();}break;
  case 'hint':if(game.phase==='pending'&&game.turn===0){stagedPending=true;hint();}break;
  case 'play':if(game.phase==='pending'&&game.turn===0)tryPlay();break;
  case 'layoff':if(['pay','turn'].includes(game.phase)&&game.turn===0)tryLayoff();break;
  case 'handmeld':if(game.phase==='pay'&&game.turn===0)tryHandMeld();break;
  case 'win':if(game.phase==='pay'&&game.turn===0){if(E.finishWithHand(game,0)){clearSelection();playSfx('win');onState();}else notify('Todavía falta completar una combinación válida.');}break;
  case 'discard':if(game.phase==='pending'&&game.turn===0&&E.discardPending(game)){stagedPending=false;resetClaim();clearSelection();playSfx('card');onState();}break;
  case 'pay':if(game.phase==='pay'&&game.turn===0&&selected.size===1){if(E.pay(game,0,[...selected][0])){resetClaim();clearSelection();playSfx('card');onState();}}break;
  case 'claim':if(game.phase==='claim'&&E.claimCandidates(game)[0]?.pid===0&&E.acceptClaim(game,0)){stagedPending=false;clearSelection();playSfx('card');onState();}break;
  case 'decline':if(game.phase==='claim'){declinedClaim=true;clearSelection();onState();}break;
  case 'pass':if(E.pass(game,0)){clearSelection();onState();}else notify('Todavía podés aprovechar alguna carta disponible.');break;
  case 'result':showResults();break;
 }
}
// Gestos Pointer Events: táctil (iPhone/Android) y mouse, sin dependencia externa.
function inYourTable(x,y){return Boolean(document.elementFromPoint(x,y)?.closest('#playerMeldArea'));}
function handOrderDrop(cardId,x){
 const p=game.players[0],arr=p.hand,from=arr.findIndex(c=>c.id===cardId),nodes=[...$('myHand').querySelectorAll('.hand-card')];
 if(from<0||!nodes.length)return false;
 const center=el=>{const r=el.getBoundingClientRect();return r.left+r.width/2;};
 const a=nodes.map(center),gap=a.length>1?Math.max(1,a[1]-a[0]):38;
 const dest=Math.max(0,Math.min(arr.length-1,Math.round((x-a[0])/gap)));
 if(from===dest)return true;
 const [c]=arr.splice(from,1);arr.splice(dest,0,c);return true;
}
function pointerCanStart(el){
 if(!game||modalOpen||$('game').classList.contains('hidden'))return null;
 if(el.closest('[data-role="hand"]')&&(game.phase==='cambio'||game.turn===0&&['pending','pay','turn'].includes(game.phase)))
  return {kind:'hand',id:el.closest('[data-role="hand"]').dataset.cardId};
 if(el.closest('#deckPile')&&game.phase==='turn'&&game.turn===0)return {kind:'deck'};
 if(el.closest('#drawnPile')&&game.phase==='pending'&&game.turn===0&&!stagedPending)return {kind:'pending'};
 if(el.closest('#discardPile')&&game.phase==='claim'&&E.claimCandidates(game)[0]?.pid===0)return {kind:'discard'};
 return null;
}
function positionGhost(x,y){if(!drag?.ghost)return;drag.ghost.style.left=x+'px';drag.ghost.style.top=y+'px';}
document.addEventListener('pointerdown',e=>{
 if(e.button!==undefined&&e.button!==0)return;
 const spec=pointerCanStart(e.target);if(!spec)return;
 drag={...spec,pointerId:e.pointerId,x:e.clientX,y:e.clientY,moved:false,ghost:null};
},{passive:true});
document.addEventListener('pointermove',e=>{
 if(!drag||drag.pointerId!==e.pointerId)return;
 if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)<9)return;
 if(!drag.moved){
   drag.moved=true;
   const id=drag.id;const source=id?document.querySelector(`.hand-card[data-card-id="${id}"]`):
      drag.kind==='deck'?$('deckPile'):drag.kind==='pending'?$('drawnPile'):$('discardPile');
   const card=source?.querySelector('.playing-card')||source;
   if(card){drag.ghost=card.cloneNode(true);drag.ghost.className='playing-card drag-ghost';document.body.appendChild(drag.ghost);}
 }
 if(e.cancelable)e.preventDefault();positionGhost(e.clientX,e.clientY);
 $('playerMeldArea').classList.toggle('drop-ready',inYourTable(e.clientX,e.clientY));
 $('myHand').classList.toggle('drop-ready',!!document.elementFromPoint(e.clientX,e.clientY)?.closest('#myHand'));
},{passive:false});
function endDrag(e){
 if(!drag||drag.pointerId!==e.pointerId)return;
 const d=drag;drag=null;d.ghost?.remove();
 $('playerMeldArea').classList.remove('drop-ready');$('myHand').classList.remove('drop-ready');
 if(!d.moved||!game)return;
 suppressClickUntil=Date.now()+650;
 const x=e.clientX,y=e.clientY,over=document.elementFromPoint(x,y);
 if(d.kind==='hand'){
   if(over?.closest('#myHand')){handOrderDrop(d.id,x);render();return;}
   if(over?.closest('#discardPile')&&game.phase==='pay'&&game.turn===0){
     if(E.pay(game,0,d.id)){resetClaim();clearSelection();playSfx('card');onState();}return;
   }
   if(inYourTable(x,y)&&game.phase!=='cambio'){
     const target=over?.closest('[data-meld-id]');if(target){targetId=Number(target.dataset.meldId);borrowed.clear();}
     if(selected.has(d.id))selected.delete(d.id);else selected.add(d.id);
     stagedPending=game.phase==='pending'?true:stagedPending;
     playSfx('card');render();return;
   }
 }else if(inYourTable(x,y)){
   if(d.kind==='deck'&&E.drawFromDeck(game)){stagedPending=true;clearSelection();playSfx('card');onState();}
   else if(d.kind==='discard'&&E.claimCandidates(game)[0]?.pid===0&&E.acceptClaim(game,0)){stagedPending=true;clearSelection();playSfx('card');onState();}
   else if(d.kind==='pending'){stagedPending=true;playSfx('card');render();}
 }
}
document.addEventListener('pointerup',endDrag);
document.addEventListener('pointercancel',e=>{if(drag?.pointerId===e.pointerId){drag.ghost?.remove();drag=null;$('playerMeldArea').classList.remove('drop-ready');$('myHand').classList.remove('drop-ready');}});
document.addEventListener('click',e=>{if(Date.now()<suppressClickUntil){e.preventDefault();e.stopImmediatePropagation();}},{capture:true});
document.addEventListener('change',e=>{if(e.target.matches('[data-pace]')){settings.aiPace=Number(e.target.value);try{localStorage.setItem('dn-options',JSON.stringify(settings));}catch(e){};clearSchedule();}});
document.addEventListener('click',e=>{
 const toggle=e.target.closest('[data-toggle]');if(toggle){let name=toggle.dataset.toggle;settings[name]=!settings[name];try{localStorage.setItem('dn-options',JSON.stringify(settings));}catch(e){}showSettings();return;}
 const players=e.target.closest('[data-players]');if(players){opponentsCount=Number(players.dataset.players);document.querySelectorAll('[data-players]').forEach(b=>b.classList.toggle('on',b===players));playSfx();return;}
 const cmd=e.target.closest('[data-action]');if(cmd){action(cmd.dataset.action);return;}
 if(e.target.closest('#drawnPile')&&game?.pending){inspectCard(game.pending,'Carta en juego');return;}
 if(e.target.closest('#discardPile')&&game?.discard.length){inspectCard(game.discard[game.discard.length-1],'Último descarte');return;}
 const face=e.target.closest('[data-role="hand"]');if(face){chooseHand(face.dataset.cardId);return;}
 const card=e.target.closest('[data-role="borrow"]');if(card){if(game.phase==='pending'&&game.turn===0)borrowCard(card.dataset.cardId);else {const found=game.players[0].melds.flatMap(m=>m.cards).find(c=>c.id===card.dataset.cardId);inspectCard(found,'Una de tus combinaciones');}return;}
 const opp=e.target.closest('[data-role="opp"]');if(opp){const found=game.players.slice(1).flatMap(p=>p.melds.flatMap(m=>m.cards)).find(c=>c.id===opp.dataset.cardId);inspectCard(found,'Combinación de otro jugador');return;}
 const meld=e.target.closest('[data-target]');if(meld){targetId=targetId===Number(meld.dataset.target)?null:Number(meld.dataset.target);if(targetId)borrowed.clear();playSfx();render();}
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modalOpen){closeModal();if(game)render();}});
window.addEventListener('resize',()=>{if(game&&!$('game').classList.contains('hidden'))render();});
// Funciones de diagnóstico accesibles durante las pruebas de esta edición.
window.DesmocheDebug={get state(){return game;},engine:E,start:(n=2)=>{opponentsCount=n;beginGame();},action,forceRender:render};
})();
