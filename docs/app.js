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
 const cash=Number(state.live_myr_available ?? state.live_myr_balance ?? 0);
  const equity=cash+openValue;
 $("totalEquity").textContent=money(equity,4);$("cashBalance").textContent=money(cash,2);
 $("openExposure").textContent=money(openValue,2);
 $("positionCount").textContent=`${Object.keys(positions).length} / ${state.last_scan?.max_open_positions||3}`;
 $("floatingPnl").textContent=money(floating,4);$("floatingPnl").className=`value ${floating>0?"good-text":floating<0?"bad-text":""}`;
 $("realizedPnl").textContent=money(state.live_realized_profit_myr||0,4);
 $("lastAction").textContent=String(state.last_action||"—").replaceAll("_"," ");
 const liveTradesForRate=(window.__maxxLiveTrades||[]);
  const liveWins=liveTradesForRate.filter(t=>Number(t.profit_myr||0)>0).length;
  const liveWinRate=liveTradesForRate.length ? liveWins/liveTradesForRate.length*100 : 0;
  $("winRate").textContent=`${liveWinRate.toFixed(1)}%`;

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

const WORKER_API_URL = "https://maxxcrypto-luno.cs9aevolution.workers.dev";


function renderLiveAudit(state, trades) {
  const summary = state.live_accounting_summary || state.last_scan?.live_accounting_summary || {};
  const transactions = state.live_transaction_audit || state.last_scan?.live_transaction_audit || state.recent_live_trade_audit || [];
  const dustAudit = state.live_dust_audit || state.last_scan?.live_dust_audit || [];
  const partialEvents = transactions.filter(e => String(e.event_type || "").toUpperCase() === "PARTIAL_EXIT");

  const closedCount = Number(summary.closed_trades_current_epoch ?? trades.length);
  const partialCount = Number(summary.partial_exit_events_current_epoch ?? partialEvents.length);
  const dustCount = Number(summary.dust_positions ?? dustAudit.length);
  $("auditClosedTrades").textContent = String(closedCount);
  $("auditPartialExits").textContent = String(partialCount);
  $("auditDustCount").textContent = String(dustCount);

  const livePnl = Number(summary.total_live_accounting_pnl_myr ?? state.live_realized_profit_myr ?? 0);
  const dustPartialPnl = Number(summary.dust_partial_realized_profit_myr ?? 0);
  const dustCost = Number(summary.dust_cost_basis_myr ?? state.last_scan?.dust_cost_basis_myr ?? 0);

  $("auditLivePnl").textContent = money(livePnl,4);
  $("auditLivePnl").className = livePnl>0?"good-text":livePnl<0?"bad-text":"";
  $("auditDustPartialPnl").textContent = money(dustPartialPnl,4);
  $("auditDustPartialPnl").className = dustPartialPnl>0?"good-text":dustPartialPnl<0?"bad-text":"";
  $("auditDustCost").textContent = money(dustCost,4);

  badge($("auditBadge"),`${transactions.length} EVENTS`,transactions.length?"good":"neutral");
  badge($("dustAuditBadge"),`${dustCount} DUST`,dustCount?"bad":"neutral");

  const ordered = transactions.slice().sort((x,y)=>new Date(y.time||y.closed_at||0)-new Date(x.time||x.closed_at||0)).slice(0,50);
  $("liveAuditBody").innerHTML = ordered.length ? ordered.map(event=>{
    const type=String(event.event_type||"CLOSED_TRADE").toUpperCase();
    const pnl=Number(event.realized_profit_myr??event.profit_myr??0);
    const proceeds=event.net_proceeds_myr??event.gross_counter_fill_myr??null;
    const remaining=event.remaining_tracked_volume??event.remaining_volume??null;
    const status=event.transaction_status||event.lifecycle_status_after_exit||(type==="CLOSED_TRADE"?"CLOSED":"PARTIAL_EXIT");
    return `<tr><td>${dateMY(event.time||event.closed_at)}</td><td><b>${event.pair||"—"}</b></td><td><span class="event-pill ${type==="PARTIAL_EXIT"?"partial":"closed"}">${type.replaceAll("_"," ")}</span></td><td>${String(event.exit_reason||event.reason||"—").replaceAll("_"," ")}</td><td>${proceeds==null?"—":money(proceeds,4)}</td><td class="${pnl>=0?"good-text":"bad-text"}">${money(pnl,4)}</td><td>${remaining==null?"—":num(remaining,8)}</td><td>${String(status).replaceAll("_"," ")}</td></tr>`;
  }).join("") : '<tr><td colspan="8" class="empty-row">Belum ada audit event daripada Worker V18.3.24.</td></tr>';

  $("dustAuditBody").innerHTML = dustAudit.length ? dustAudit.slice().reverse().map(dust=>{
    const pnl=Number(dust.partial_realized_profit_myr||0);
    return `<tr><td><b>${dust.pair||"—"}</b></td><td>${num(dust.tracked_dust_volume,8)}</td><td>${num(dust.current_min_volume,8)}</td><td>${money(dust.original_principal_myr,4)}</td><td class="${pnl>=0?"good-text":"bad-text"}">${money(pnl,4)}</td><td>${money(dust.remaining_cost_basis_myr,4)}</td><td>${String(dust.dust_reconciliation_status||dust.dust_status||"DUST").replaceAll("_"," ")}</td><td>${dateMY(dust.last_dust_check_at||dust.dust_classified_at)}</td></tr>`;
  }).join("") : '<tr><td colspan="8" class="empty-row">Tiada dust position.</td></tr>';
}


function calculatePerformance(trades, startingBalance = 100) {
  const ordered = trades
    .slice()
    .sort((a, b) => new Date(a.closed_at) - new Date(b.closed_at));

  const wins = ordered.filter(t => Number(t.profit_myr || 0) > 0);
  const losses = ordered.filter(t => Number(t.profit_myr || 0) <= 0);

  const grossProfit = wins.reduce((s,t) => s + Number(t.profit_myr || 0), 0);
  const grossLossAbs = Math.abs(
    losses.reduce((s,t) => s + Number(t.profit_myr || 0), 0)
  );

  const totalProfit = grossProfit - grossLossAbs;
  const expectancy = ordered.length ? totalProfit / ordered.length : 0;
  const avgWin = wins.length ? grossProfit / wins.length : 0;
  const avgLoss = losses.length ? grossLossAbs / losses.length : 0;
  const profitFactor = grossLossAbs > 0
    ? grossProfit / grossLossAbs
    : grossProfit > 0 ? Infinity : 0;

  let equity = startingBalance;
  let peak = startingBalance;
  let maxDrawdown = 0;
  const equityPoints = [{ index: 0, equity: startingBalance }];

  ordered.forEach((trade, index) => {
    equity += Number(trade.profit_myr || 0);
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
    equityPoints.push({ index: index + 1, equity });
  });

  const recent = ordered.slice(-50);
  const recentWins = recent.filter(t => Number(t.profit_myr || 0) > 0).length;
  const recentWinRate = recent.length ? recentWins / recent.length * 100 : 0;

  return {
    ordered,
    grossProfit,
    grossLossAbs,
    totalProfit,
    expectancy,
    avgWin,
    avgLoss,
    profitFactor,
    maxDrawdown,
    recentWinRate,
    equityPoints,
    endingEquity: equity
  };
}

function groupTradeStats(trades, keyFn) {
  const groups = {};

  for (const trade of trades) {
    const key = keyFn(trade) || "UNKNOWN";
    groups[key] ||= [];
    groups[key].push(trade);
  }

  return Object.entries(groups).map(([name, items]) => {
    const wins = items.filter(t => Number(t.profit_myr || 0) > 0).length;
    const profit = items.reduce((s,t) => s + Number(t.profit_myr || 0), 0);

    return {
      name,
      trades: items.length,
      wins,
      winRate: items.length ? wins / items.length * 100 : 0,
      profit
    };
  });
}

function malaysiaSession(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "UNKNOWN";

  const hour = Number(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    hourCycle: "h23"
  }).format(date));

  if (hour < 6) return "MIDNIGHT";
  if (hour < 12) return "MORNING";
  if (hour < 18) return "AFTERNOON";
  return "EVENING";
}

function drawEquityCurve(points, startingBalance) {
  const canvas = $("equityCanvas");
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(640, Math.floor(rect.width * dpr));
  canvas.height = Math.floor((rect.height || 280) * dpr);

  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  const width = canvas.width / dpr;
  const height = canvas.height / dpr;
  ctx.clearRect(0, 0, width, height);

  const padding = { left: 48, right: 16, top: 20, bottom: 32 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const values = points.map(p => p.equity);
  const min = Math.min(...values, startingBalance) - 0.5;
  const max = Math.max(...values, startingBalance) + 0.5;
  const range = Math.max(1, max - min);

  ctx.strokeStyle = "rgba(143,163,186,.18)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= 4; i++) {
    const y = padding.top + chartHeight * i / 4;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(143,163,186,.8)";
  ctx.font = "11px system-ui";

  for (let i = 0; i <= 4; i++) {
    const value = max - range * i / 4;
    const y = padding.top + chartHeight * i / 4;
    ctx.fillText(`RM${value.toFixed(2)}`, 4, y + 4);
  }

  const xFor = (index) =>
    padding.left + chartWidth * index / Math.max(1, points.length - 1);

  const yFor = (value) =>
    padding.top + chartHeight * (max - value) / range;

  ctx.beginPath();
  points.forEach((point, index) => {
    const x = xFor(index);
    const y = yFor(point.equity);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.strokeStyle = "#66e2ff";
  ctx.lineWidth = 2;
  ctx.stroke();

  const baselineY = yFor(startingBalance);
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = "rgba(246,200,107,.65)";
  ctx.beginPath();
  ctx.moveTo(padding.left, baselineY);
  ctx.lineTo(width - padding.right, baselineY);
  ctx.stroke();
  ctx.setLineDash([]);
}

function renderPerformance(state, trades) {
  const liveBalance = Number(state.live_myr_balance ?? state.live_myr_available ?? 0);
  const liveRealized = Number(state.live_realized_profit_myr || 0);
  const start = liveBalance - liveRealized;
  const stats = calculatePerformance(trades, start);

  $("profitFactor").textContent =
    stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2);

  $("expectancy").textContent = money(stats.expectancy, 4);
  $("averageWin").textContent = money(stats.avgWin, 4);
  $("averageLoss").textContent = money(stats.avgLoss, 4);
  $("maxDrawdown").textContent = money(stats.maxDrawdown, 4);
  $("recentWinRate").textContent = `${stats.recentWinRate.toFixed(1)}%`;

  const pairStats = groupTradeStats(trades, t => t.pair)
    .sort((a,b) => b.profit - a.profit);

  const sessionStats = groupTradeStats(
    trades,
    t => t.entry_session || malaysiaSession(t.opened_at)
  ).sort((a,b) => b.profit - a.profit);

  const setupStats = groupTradeStats(
    trades,
    t => [
      t.entry_regime || "UNKNOWN",
      ...(t.entry_reasons || [])
    ].sort().join(" + ")
  ).sort((a,b) => b.profit - a.profit);

  $("bestPairPerformance").textContent =
    pairStats.length ? `${pairStats[0].name} ${money(pairStats[0].profit, 2)}` : "—";

  $("bestSession").textContent =
    sessionStats.length ? sessionStats[0].name : "—";

  $("pairPerformanceList").innerHTML = pairStats.length
    ? pairStats.map(item => `
        <div class="performance-item">
          <div class="name">${item.name}</div>
          <div><span>Trades</span><b>${item.trades}</b></div>
          <div><span>Win rate</span><b>${item.winRate.toFixed(1)}%</b></div>
          <div><span>Profit</span><b class="${item.profit >= 0 ? "good-text" : "bad-text"}">${money(item.profit,4)}</b></div>
        </div>
      `).join("")
    : `<div class="empty-row">Belum ada data pair.</div>`;

  $("sessionPerformanceList").innerHTML = sessionStats.length
    ? sessionStats.map(item => `
        <div class="performance-item">
          <div class="name">${item.name}</div>
          <div><span>Trades</span><b>${item.trades}</b></div>
          <div><span>Win rate</span><b>${item.winRate.toFixed(1)}%</b></div>
          <div><span>Profit</span><b class="${item.profit >= 0 ? "good-text" : "bad-text"}">${money(item.profit,4)}</b></div>
        </div>
      `).join("")
    : `<div class="empty-row">Belum ada data sesi.</div>`;

  $("setupPerformanceList").innerHTML = setupStats.length
    ? setupStats.slice(0, 12).map(item => `
        <div class="setup-item">
          <div class="setup-name">${item.name || "UNKNOWN"}</div>
          <div class="setup-meta">
            <span>${item.trades} trade</span>
            <span>${item.winRate.toFixed(1)}% win</span>
            <b class="${item.profit >= 0 ? "good-text" : "bad-text"}">${money(item.profit,4)}</b>
          </div>
        </div>
      `).join("")
    : `<div class="empty-row">Belum ada data setup.</div>`;

  let validationText = "BELUM CUKUP DATA";
  let validationType = "neutral";

  if (trades.length >= 50) {
    const profitable =
      stats.totalProfit > 0 &&
      stats.profitFactor > 1.15 &&
      stats.expectancy > 0;

    validationText = profitable ? "STRATEGI POSITIF" : "PERLU TUNING";
    validationType = profitable ? "good" : "bad";
  }

  badge($("validationBadge"), validationText, validationType);

  $("equitySummary").textContent =
    `${trades.length} trade • ${money(stats.endingEquity, 2)} ending equity`;

  requestAnimationFrame(() => drawEquityCurve(stats.equityPoints, start));
}


async function load() {
  $("refreshBtn").disabled = true;
  $("refreshBtn").textContent = "Loading…";
  $("errorBox").classList.add("hidden");

  try {
    const [stateResponse, tradesResponse, liveResponse] = await Promise.all([
      fetch(`${WORKER_API_URL}/api/state?t=${Date.now()}`, {
        cache: "no-store",
      }),
      fetch(`${WORKER_API_URL}/api/trades?limit=500&t=${Date.now()}`, {
        cache: "no-store",
      }),
      fetch(`${WORKER_API_URL}/api/live-execution?t=${Date.now()}`, {
        cache: "no-store",
      }),
    ]);

    if (!stateResponse.ok) {
      throw new Error(`state API HTTP ${stateResponse.status}`);
    }

    if (!tradesResponse.ok) {
      throw new Error(`trades API HTTP ${tradesResponse.status}`);
    }

    if (!liveResponse.ok) {
      throw new Error(`live-execution API HTTP ${liveResponse.status}`);
    }

    const state = await stateResponse.json();
    const allTrades = await tradesResponse.json();
    const liveExecution = await liveResponse.json();

    // /api/live-execution is the authoritative source for real Luno MYR cash.
    state.live_myr_balance = Number(liveExecution?.balance?.balance ?? 0);
    state.live_myr_reserved = Number(liveExecution?.balance?.reserved ?? 0);
    state.live_myr_available = Number(liveExecution?.balance?.available ?? 0);
    state.live_balance_error = liveExecution?.balance_error ?? null;

    const liveVersion =
      state?.epoch?.version ||
      state?.engine_learning_version ||
      "V18_3_LIVE_2026_08_22";

    const trades = (Array.isArray(allTrades) ? allTrades : []).filter(t =>
      String(t.engine_version || "") === String(liveVersion) ||
      (
        String(t.execution_mode || "").toUpperCase() === "LIVE" &&
        String(t.engine_version || "").startsWith("V18_3_LIVE")
      )
    );

    window.__maxxLiveTrades = trades;

    render(state, trades);
    renderPerformance(state, trades);
    renderLiveAudit(state, trades);
  } catch (error) {
    $("errorBox").textContent =
      `Dashboard gagal membaca Cloudflare Worker: ${error.message}`;

    $("errorBox").classList.remove("hidden");
  } finally {
    $("refreshBtn").disabled = false;
    $("refreshBtn").textContent = "Refresh";
  }
}

$("refreshBtn").onclick=load;load();setInterval(load,60000);
