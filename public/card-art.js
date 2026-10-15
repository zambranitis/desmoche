/* Cartas originales Desmoche Nica */
(function(){ const E=window.DesmocheCore; const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); const suitColors={S:'#1a2b38',C:'#1a2b38',H:'#b13e43',D:'#b13e43'};
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
window.DNCardArt={artCard,faceArt,backArt};
})();
