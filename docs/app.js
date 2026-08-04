const $=id=>document.getElementById(id);
const money=(v,d=2)=>Number.isFinite(Number(v))?`RM${Number(v).toLocaleString("ms-MY",{minimumFractionDigits:d,maximumFractionDigits:d})}`:"RM—";
const num=(v,d=4)=>Number.isFinite(Number(v))?Number(v).toFixed(d):"—";
function dateMY(v){if(!v)return"—";const d=new Date(v);return d.toLocaleString("ms-MY",{timeZone:"Asia/Kuala_Lumpur",day:"numeric",month:"short",year:"numeric",hour:"numeric",minute:"2-digit",hour12:true})}
function badge(el,text,type="neutral"){el.className=`badge ${type}`;el.textContent=text}
function tradePeriod(trades,days){const cutoff=Date.now()-days*86400000;return trades.filter(t=>new Date(t.closed_at).getTime()>=cutoff)}
function currentMonthTrades(trades){const now=new Date();return trades.filter(t=>{const d=new Date(t.closed_at);return d.getUTCFullYear()===now.getUTCFullYear()&&d.getUTCMonth()===now.getUTCMonth()})}
function profitOf(trades){return trades.reduce((s,t)=>s+Number(t.profit_myr||0),0)}
function render(state,trades){
 const positions=state.positions||{};
 const markets=(state.last_scan&&state.last_scan.markets)||[];
 let floating=0,openValue=0;
 for(const [pair,p] of Object.entries(positions)){
   const market=markets.find(m=>m.pair===pair);
   const bid=Number(market?.metrics?.bid||p.entry_price);
   const gross=Number(p.volume)*bid;
   const exitFee=gross*0.006;
   const net=gross-exitFee;
   const cost=Number(p.principal_myr)+Number(p.entry_fee_myr||0);
   floating+=net-cost; openValue+=net;
 }
 const cash=Number(state.paper_myr||0),equity=cash+openValue;
 $("totalEquity").textContent=money(equity,4);$("cashBalance").textContent=money(cash,2);
 $("openExposure").textContent=money(state.last_scan?.current_exposure_myr||0,2);
 $("positionCount").textContent=`${Object.keys(positions).length} / ${state.last_scan?.max_open_positions||0}`;
 $("floatingPnl").textContent=money(floating,4);$("floatingPnl").className=`value ${floating>0?"good-text":floating<0?"bad-text":""}`;
 $("realizedPnl").textContent=money(state.realized_profit_myr||0,4);
 $("lastAction").textContent=String(state.last_action||"—").replaceAll("_"," ");
 $("winRate").textContent=`${Number(state.win_rate_pct||0).toFixed(1)}%`;

 const age=(Date.now()-new Date(state.updated_at).getTime())/60000;
 $("botBadge").className=`badge ${age<90?"good":"bad"}`;
 $("botBadge").innerHTML=`<span class="dot"></span>${age<90?"BOT ACTIVE":"DATA STALE"}`;

 const pg=$("positionsGrid");
 if(!Object.keys(positions).length){pg.innerHTML='<div class="empty-row">Tiada posisi terbuka.</div>'}
 else{
   pg.innerHTML=Object.entries(positions).map(([pair,p])=>{
     const market=markets.find(m=>m.pair===pair),bid=Number(market?.metrics?.bid||p.entry_price);
     const gross=Number(p.volume)*bid,net=gross-gross*.006,cost=Number(p.principal_myr)+Number(p.entry_fee_myr||0),pnl=net-cost,pct=cost? pnl/cost*100:0;
     return `<div class="position-card"><div class="position-top"><span class="position-pair">${pair}</span><span class="position-pnl ${pnl>=0?"good-text":"bad-text"}">${money(pnl,4)} (${pct.toFixed(2)}%)</span></div><div class="position-meta"><div>Entry<b>${num(p.entry_price,5)}</b></div><div>Bid<b>${num(bid,5)}</b></div><div>Modal<b>${money(p.principal_myr)}</b></div><div>Score<b>${p.entry_score??"—"}</b></div><div>Highest<b>${num(p.highest_price,5)}</b></div><div>Opened<b>${dateMY(p.opened_at)}</b></div></div></div>`
   }).join("")
 }
 badge($("activeBadge"),`${Object.keys(positions).length} OPEN`,Object.keys(positions).length?"good":"neutral");

 $("rankingList").innerHTML=markets.length?markets.map((m,i)=>`<div class="rank-item"><div class="rank-left"><span class="rank-number">${i+1}</span><div><b>${m.pair}</b><div class="muted">${(m.reasons||[]).join(", ")||"Tiada signal"}</div></div></div><div class="rank-score">${m.score}</div></div>`).join(""):'<div class="empty-row">Belum ada market scan.</div>';
 badge($("bestPairBadge"),state.last_scan?.best_pair||"WAITING",state.last_scan?.best_pair?"good":"neutral");

 const today=tradePeriod(trades,1),week=tradePeriod(trades,7),month=currentMonthTrades(trades);
 [["today",today],["week",week],["month",month]].forEach(([k,list])=>{$(`${k}Profit`).textContent=money(profitOf(list),4);$(`${k}Profit`).className=`stat-value ${profitOf(list)>0?"good-text":profitOf(list)<0?"bad-text":""}`;$(`${k}Trades`).textContent=`${list.length} trade`});

 const monthProfit=profitOf(month),target=1000,remain=Math.max(0,target-monthProfit),progress=Math.max(0,Math.min(100,monthProfit/target*100));
 $("targetCurrent").textContent=money(monthProfit,2);$("targetRemaining").textContent=money(remain,2);$("targetBar").style.width=`${progress}%`;badge($("targetBadge"),`${progress.toFixed(1)}%`,monthProfit>=target?"good":"neutral");
 const d=new Date(),daysInMonth=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(),remainingDays=Math.max(1,daysInMonth-d.getDate()+1);
 $("dailyRequired").textContent=money(remain/remainingDays,2);
 $("targetMessage").textContent=month.length?`${month.length} trade selesai bulan ini.`:"Belum ada trade selesai bulan ini.";

 $("historyBadge").textContent=`${trades.length} RECORDS`;
 $("tradeBody").innerHTML=trades.length?trades.slice().reverse().map(t=>`<tr><td>${dateMY(t.closed_at)}</td><td>${t.pair}</td><td>${num(t.entry_price,5)}</td><td>${num(t.exit_price,5)}</td><td>${String(t.exit_reason||"—").replaceAll("_"," ")}</td><td class="${Number(t.profit_myr)>=0?"good-text":"bad-text"}">${money(t.profit_myr,4)}</td></tr>`).join(""):'<tr><td colspan="6" class="empty-row">Belum ada trade selesai.</td></tr>';
 $("updatedAt").textContent=`Kemaskini: ${dateMY(state.updated_at)}`;
 $("runInfo").textContent=`GitHub Actions: ${state.github_action?.event||"unknown"} #${state.github_action?.run_number||"—"}`;
}
async function load(){
 $("refreshBtn").disabled=true;$("refreshBtn").textContent="Loading…";$("errorBox").classList.add("hidden");
 try{
  const s=await fetch(`data/state.json?t=${Date.now()}`,{cache:"no-store"});if(!s.ok)throw new Error(`state.json HTTP ${s.status}`);
  const state=await s.json();let trades=[];const t=await fetch(`data/trades.jsonl?t=${Date.now()}`,{cache:"no-store"});
  if(t.ok){trades=(await t.text()).split("\n").map(x=>x.trim()).filter(Boolean).map(JSON.parse)}
  render(state,trades);
 }catch(e){$("errorBox").textContent=`Dashboard gagal membaca data: ${e.message}`;$("errorBox").classList.remove("hidden")}
 finally{$("refreshBtn").disabled=false;$("refreshBtn").textContent="Refresh"}
}
$("refreshBtn").onclick=load;load();setInterval(load,60000);
