import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ── PRICE ENGINE ──────────────────────────────────────────────────────
// Prices are live. Everything — deposit values, spending power, risk —
// derives from them. This is the heartbeat of the app.
const BASE_PRICES = { ETH: 2490.00, BTC: 94250.00, USDC: 1.00, SOL: 152.30 };

// Risk thresholds: how much of deposit value can be borrowed
const ASSET_FACTORS = { ETH: 0.65, BTC: 0.60, USDC: 0.95, SOL: 0.55 };

const INITIAL_STATE = {
  user: { name: "Alex Chen", initials: "AC" },
  deposits: {
    ETH:  { amount: 1.842,  label: "Ethereum", color: "#627EEA", icon: "Ξ" },
    BTC:  { amount: 0.0512, label: "Bitcoin",  color: "#F7931A", icon: "₿" },
    USDC: { amount: 2341.80,label: "USD Coin", color: "#2775CA", icon: "$" },
    SOL:  { amount: 12.4,   label: "Solana",   color: "#9945FF", icon: "◎" },
  },
  balanceOwed: 1240.00,
  dailySpent: 87.50,
  dailyLimit: 500.00,
  earningsRate: 5.42,
  earnedThisMonth: 32.44,
  transactions: [
    { id:1, merchant:"Whole Foods",    amount:-42.80,  status:"settled",  time:"Today · 2m ago",  icon:"🛒" },
    { id:2, merchant:"Uber",           amount:-18.20,  status:"settled",  time:"Today · 1h ago",  icon:"🚗" },
    { id:3, merchant:"Netflix",        amount:-15.99,  status:"pending",  time:"Today · 3h ago",  icon:"🎬" },
    { id:4, merchant:"Interest Earned",amount:+1.16,   status:"earned",   time:"Today · auto",    icon:"✦"  },
    { id:5, merchant:"Amazon",         amount:-89.99,  status:"settled",  time:"Yesterday",       icon:"📦" },
    { id:6, merchant:"Starbucks",      amount:-6.45,   status:"settled",  time:"Yesterday",       icon:"☕" },
  ],
  contacts: [
    { id:1, name:"Jone",  bg:"#FEF3C7", emoji:"😎" },
    { id:2, name:"Mojo",  bg:"#FCE7F3", emoji:"🤩" },
    { id:3, name:"Emie",  bg:"#EDE9FE", emoji:"🦊" },
    { id:4, name:"Smith", bg:"#CFFAFE", emoji:"🐻" },
    { id:5, name:"Emy",   bg:"#FEE2E2", emoji:"🎭" },
  ],
  card: { number:"4831 •••• •••• 7294", expiry:"09/28", type:"Visa", frozen:false, name:"ALEX CHEN" },
};

// ── HELPERS ──
const fmt = (n, d=2) => (n==null||!isFinite(n)) ? "0.00"
  : n.toLocaleString("en-US",{minimumFractionDigits:d,maximumFractionDigits:d});

// ── DESIGN TOKENS ──
const T = {
  bg:"#08080F", surface:"#101018", surfaceB:"#161624", surfaceC:"#1C1C30",
  border:"rgba(255,255,255,0.06)", borderL:"rgba(255,255,255,0.10)",
  lime:"#ADFA1D", limeD:"rgba(173,250,29,0.7)",
  violet:"#7C3AED", violetL:"#A855F7",
  blue:"#3B82F6", white:"#FFF", text:"#FFF",
  t70:"rgba(255,255,255,0.70)", t42:"rgba(255,255,255,0.42)",
  t22:"rgba(255,255,255,0.22)", t10:"rgba(255,255,255,0.10)",
  green:"#22C55E", red:"#EF4444", amber:"#F59E0B",
};

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;margin:0;padding:0}
  body{font-family:'Plus Jakarta Sans',system-ui,sans-serif}
  ::-webkit-scrollbar{width:0;height:0}
  @keyframes slideUp{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes scaleIn{from{transform:scale(.93);opacity:0}to{transform:scale(1);opacity:1}}
  @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
  @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
  @keyframes float0{0%,100%{transform:translateY(0) rotate(-8deg)}50%{transform:translateY(-14px) rotate(-6deg)}}
  @keyframes float1{0%,100%{transform:translateY(-8px) rotate(4deg)}50%{transform:translateY(4px) rotate(6deg)}}
  @keyframes float2{0%,100%{transform:translateY(-4px) rotate(12deg)}50%{transform:translateY(-18px) rotate(10deg)}}
  @keyframes sparkle{0%,100%{opacity:0;transform:scale(0)}50%{opacity:1;transform:scale(1)}}
  @keyframes glow{0%,100%{box-shadow:0 0 20px rgba(173,250,29,.12)}50%{box-shadow:0 0 40px rgba(173,250,29,.25)}}
  @keyframes sheetIn{from{transform:translateY(100%)}to{transform:translateY(0)}}
  @keyframes overlayIn{from{opacity:0}to{opacity:1}}
  .press:active{transform:scale(.97)}.press{transition:transform .1s}
  input{font-family:'Plus Jakarta Sans',system-ui,sans-serif}
  input[type=range]{-webkit-appearance:none;appearance:none;height:8px;border-radius:4px;outline:none;background:rgba(255,255,255,.08)}
  input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:26px;height:26px;border-radius:50%;background:${T.lime};cursor:pointer;box-shadow:0 0 0 5px rgba(173,250,29,.15),0 4px 12px rgba(0,0,0,.4)}
`;

// ═══════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

function Btn({children,onClick,v="lime",disabled,style={},full}){
  const bg=v==="lime"?T.lime:v==="violet"?`linear-gradient(135deg,${T.violet},${T.violetL})`:v==="red"?"rgba(239,68,68,.15)":"rgba(255,255,255,.06)";
  const c=v==="lime"?"#08080F":v==="red"?T.red:T.white;
  return <button onClick={disabled?undefined:onClick} className="press" style={{
    background:bg,color:c,border:v==="red"?`1px solid rgba(239,68,68,.3)`:v==="ghost"?`1px solid ${T.borderL}`:"none",
    borderRadius:14,padding:"15px 22px",fontWeight:700,fontSize:15,cursor:disabled?"default":"pointer",
    display:"flex",alignItems:"center",justifyContent:"center",gap:8,
    fontFamily:"inherit",opacity:disabled?.35:1,transition:"opacity .2s,transform .1s",
    width:full?"100%":undefined,...style
  }}>{children}</button>;
}

function RiskBadge({level,size="md"}){
  const m={Low:{c:T.green,bg:"rgba(34,197,94,.12)",b:"rgba(34,197,94,.25)"},
    Medium:{c:T.amber,bg:"rgba(245,158,11,.12)",b:"rgba(245,158,11,.25)"},
    High:{c:T.red,bg:"rgba(239,68,68,.12)",b:"rgba(239,68,68,.25)"}};
  const x=m[level]||m.Low;
  return <div style={{display:"inline-flex",alignItems:"center",gap:5,background:x.bg,
    border:`1px solid ${x.b}`,borderRadius:50,padding:size==="sm"?"4px 10px":"7px 16px",
    fontWeight:700,fontSize:size==="sm"?10:12,color:x.c,letterSpacing:.4}}>
    <span style={{width:6,height:6,borderRadius:"50%",background:x.c}}/>{level} Risk
  </div>;
}

function Sheet({open,onClose,title,children}){
  if(!open) return null;
  return <div style={{position:"absolute",inset:0,zIndex:200,animation:"overlayIn .2s ease"}}>
    <div onClick={onClose} style={{position:"absolute",inset:0,background:"rgba(0,0,0,.6)",backdropFilter:"blur(4px)"}}/>
    <div style={{position:"absolute",bottom:0,left:0,right:0,background:T.surface,
      borderRadius:"24px 24px 0 0",padding:"8px 22px 32px",maxHeight:"85%",overflowY:"auto",
      animation:"sheetIn .3s ease",border:`1px solid ${T.borderL}`,borderBottom:"none"}}>
      <div style={{width:36,height:4,borderRadius:2,background:T.t22,margin:"0 auto 16px"}}/>
      {title && <div style={{fontSize:18,fontWeight:800,color:T.white,marginBottom:18}}>{title}</div>}
      {children}
    </div>
  </div>;
}

function DebitCard({gradient,name,number,expiry,cardType,frozen,style={}}){
  return <div style={{background:gradient,borderRadius:20,padding:"22px 22px 20px",width:"100%",
    aspectRatio:"1.62",position:"relative",overflow:"hidden",
    boxShadow:"0 20px 60px rgba(0,0,0,.5)",border:"1px solid rgba(255,255,255,.08)",...style}}>
    <div style={{position:"absolute",top:-30,right:-30,width:140,height:140,borderRadius:"50%",background:"rgba(255,255,255,.04)"}}/>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
      <div style={{display:"flex",alignItems:"center",gap:5}}>
        <span style={{color:T.lime,fontWeight:900,fontSize:13,letterSpacing:.5}}>MEGA</span>
        <span style={{color:"rgba(255,255,255,.85)",fontWeight:900,fontSize:13}}>BANK</span>
      </div>
      <span style={{fontSize:14,color:"rgba(255,255,255,.4)"}}>📶</span>
    </div>
    <div style={{width:38,height:28,borderRadius:5,marginBottom:18,
      background:"linear-gradient(135deg,rgba(255,255,255,.8),rgba(255,255,255,.4))",
      display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{width:24,height:16,borderRadius:3,border:"1.5px solid rgba(0,0,0,.2)",
        background:"linear-gradient(135deg,rgba(255,200,0,.5),rgba(255,150,0,.3))"}}/>
    </div>
    <div style={{fontSize:14,fontWeight:500,color:"rgba(255,255,255,.7)",letterSpacing:2.5,marginBottom:16}}>{number}</div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
      <div><div style={{color:"rgba(255,255,255,.3)",fontSize:8,letterSpacing:1.5,marginBottom:1}}>CARD HOLDER</div>
        <div style={{color:"rgba(255,255,255,.8)",fontSize:11,fontWeight:700}}>{name}</div></div>
      <div style={{textAlign:"right"}}><div style={{color:"rgba(255,255,255,.3)",fontSize:8,letterSpacing:1.5,marginBottom:1}}>EXPIRES</div>
        <div style={{color:"rgba(255,255,255,.8)",fontSize:11,fontWeight:700}}>{expiry}</div></div>
      <div style={{color:"rgba(255,255,255,.4)",fontWeight:800,fontSize:12}}>{cardType}</div>
    </div>
    {frozen && <div style={{position:"absolute",inset:0,borderRadius:20,backdropFilter:"blur(6px)",
      background:"rgba(8,8,15,.85)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6}}>
      <span style={{fontSize:28}}>🔒</span>
      <span style={{color:T.red,fontWeight:800,fontSize:12,letterSpacing:2}}>CARD FROZEN</span>
    </div>}
  </div>;
}

// ═══════════════════════════════════════════════════════════════════════
// DERIVED STATE HOOK — the single source of truth
// ═══════════════════════════════════════════════════════════════════════
function useDerivedState(state, prices) {
  return useMemo(() => {
    const depositValues = {};
    let totalDeposits = 0;
    Object.entries(state.deposits).forEach(([sym, d]) => {
      const val = d.amount * (prices[sym] || 0);
      depositValues[sym] = val;
      totalDeposits += val;
    });

    let spendingPower = 0;
    Object.entries(state.deposits).forEach(([sym, d]) => {
      spendingPower += d.amount * (prices[sym] || 0) * (ASSET_FACTORS[sym] || 0.5);
    });

    const availableCredit = Math.max(0, spendingPower - state.balanceOwed);
    const utilization = spendingPower > 0 ? (state.balanceOwed / spendingPower) * 100 : 0;

    let riskLevel = "Low";
    if (utilization >= 75) riskLevel = "High";
    else if (utilization >= 50) riskLevel = "Medium";

    const earningBalance = totalDeposits;

    return { depositValues, totalDeposits, spendingPower, availableCredit, utilization, riskLevel, earningBalance };
  }, [state, prices]);
}

// ═══════════════════════════════════════════════════════════════════════
// SCREENS
// ═══════════════════════════════════════════════════════════════════════

function HomeScreen({ state, setState, prices, derived, notify, earningsAccum, setSheet }) {
  const { totalDeposits, spendingPower, availableCredit, riskLevel } = derived;
  const [showExplainer, setShowExplainer] = useState(true);
  const intPart = fmt(totalDeposits,2).split(".")[0];
  const decPart = fmt(totalDeposits,2).split(".")[1];

  return <div style={{padding:"0 20px 120px",animation:"slideUp .3s ease"}}>

    {/* ── Balance Hero ── */}
    <div style={{background:`linear-gradient(160deg,${T.surfaceB},${T.surfaceC})`,
      borderRadius:22,padding:"24px 20px",marginBottom:12,border:`1px solid ${T.border}`,
      position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",bottom:-70,right:-40,width:180,height:180,borderRadius:"50%",
        background:"radial-gradient(circle,rgba(173,250,29,.05),transparent)",pointerEvents:"none"}}/>

      <div style={{color:T.t42,fontSize:11,fontWeight:600,marginBottom:5,letterSpacing:.5}}>Total Balance</div>
      <div style={{display:"flex",alignItems:"baseline",gap:2,marginBottom:4}}>
        <span style={{fontSize:40,fontWeight:900,color:T.white,lineHeight:1}}>${intPart}</span>
        <span style={{fontSize:22,fontWeight:700,color:"rgba(255,255,255,.35)",lineHeight:1}}>.{decPart}</span>
      </div>

      {/* Live earnings ticker */}
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:20}}>
        <div style={{width:5,height:5,borderRadius:"50%",background:T.green,animation:"pulse 2s infinite"}}/>
        <span style={{color:T.green,fontSize:11,fontWeight:600}}>
          +${fmt(earningsAccum,4)} earned today
        </span>
        <span style={{color:T.t22,fontSize:10}}>·</span>
        <span style={{color:T.t42,fontSize:10}}>{fmt(state.earningsRate)}% APY on all deposits</span>
      </div>

      <div style={{display:"flex",gap:8}}>
        <Btn v="lime" style={{flex:1,fontSize:13,padding:"13px",borderRadius:12}} onClick={()=>setSheet("deposit")}>
          + Deposit</Btn>
        <Btn v="violet" style={{flex:1,fontSize:13,padding:"13px",borderRadius:12}} onClick={()=>setSheet("send")}>
          ↗ Send</Btn>
        <Btn v="ghost" style={{flex:1,fontSize:13,padding:"13px",borderRadius:12}} onClick={()=>setSheet("withdraw")}>
          ↙ Withdraw</Btn>
      </div>
    </div>

    {/* ── How Your Money Works — the value prop ── */}
    {showExplainer && <div style={{background:`linear-gradient(135deg,rgba(124,58,237,.08),rgba(173,250,29,.04))`,
      border:`1px solid rgba(124,58,237,.18)`,borderRadius:20,padding:"18px",marginBottom:12,
      position:"relative"}}>
      <button onClick={()=>setShowExplainer(false)} style={{position:"absolute",top:12,right:14,
        background:"none",border:"none",color:T.t42,fontSize:16,cursor:"pointer",padding:4}}>✕</button>
      <div style={{fontSize:14,fontWeight:800,color:T.white,marginBottom:12}}>How MegaBank Works</div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {[
          {n:"1",t:"Your deposits",v:`$${fmt(totalDeposits)}`,d:"Crypto you've deposited. It stays yours and earns interest.",c:T.blue},
          {n:"2",t:"Spending power",v:`$${fmt(spendingPower)}`,d:"Credit we unlock based on your deposit value. This is how much you can borrow.",c:T.violet},
          {n:"3",t:"You've used",v:`$${fmt(state.balanceOwed)}`,d:"What you've borrowed and spent. You owe this back.",c:state.balanceOwed>0?T.amber:T.green},
          {n:"4",t:"Still available",v:`$${fmt(availableCredit)}`,d:"Credit you can still draw on your card or borrow.",c:T.lime},
        ].map(s=><div key={s.n} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
          <div style={{width:22,height:22,borderRadius:7,background:`${s.c}18`,border:`1px solid ${s.c}30`,
            display:"flex",alignItems:"center",justifyContent:"center",
            color:s.c,fontSize:10,fontWeight:800,flexShrink:0}}>{s.n}</div>
          <div style={{flex:1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{color:T.t70,fontSize:12,fontWeight:600}}>{s.t}</span>
              <span style={{color:s.c,fontSize:13,fontWeight:800}}>{s.v}</span>
            </div>
            <div style={{color:T.t42,fontSize:11,marginTop:1,lineHeight:1.4}}>{s.d}</div>
          </div>
        </div>)}
      </div>
      <div style={{marginTop:12,padding:"10px 14px",background:"rgba(255,255,255,.03)",borderRadius:12,
        color:T.t42,fontSize:11,lineHeight:1.6}}>
        <strong style={{color:T.t70}}>The key idea:</strong> You never sell your crypto. You borrow against it, 
        spend with your card, and repay later. Your deposits keep earning {fmt(state.earningsRate)}% while you spend. 
        If prices drop too far, we protect your account automatically.
      </div>
    </div>}

    {/* ── Spending Power (compact) ── */}
    <div style={{background:"rgba(173,250,29,.05)",border:`1px solid rgba(173,250,29,.14)`,
      borderRadius:16,padding:"16px 18px",marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <div style={{color:T.t42,fontSize:10,fontWeight:600,letterSpacing:1,marginBottom:3}}>AVAILABLE TO SPEND</div>
        <div style={{fontSize:26,fontWeight:900,color:T.lime}}>${fmt(availableCredit)}</div>
      </div>
      <div style={{textAlign:"right"}}>
        <RiskBadge level={riskLevel} size="sm"/>
        {state.balanceOwed>0 && <div style={{color:T.t42,fontSize:10,marginTop:4,cursor:"pointer"}}
          onClick={()=>setSheet("repay")}>${fmt(state.balanceOwed)} owed · <span style={{color:T.lime}}>Repay</span></div>}
      </div>
    </div>

    {/* ── Send Money ── */}
    <div style={{background:T.surfaceB,borderRadius:18,padding:"16px 18px",marginBottom:12,border:`1px solid ${T.border}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{color:T.white,fontWeight:700,fontSize:14}}>Send Money</span>
        <span style={{color:T.t42,fontSize:11,cursor:"pointer"}}>See all →</span>
      </div>
      <div style={{display:"flex",justifyContent:"space-between"}}>
        {state.contacts.map(c=><div key={c.id} onClick={()=>setSheet({type:"send",contact:c})}
          style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,cursor:"pointer"}} className="press">
          <div style={{width:44,height:44,borderRadius:"50%",background:c.bg,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{c.emoji}</div>
          <span style={{color:T.t70,fontSize:10,fontWeight:600}}>{c.name}</span>
        </div>)}
      </div>
    </div>

    {/* ── Recent Activity ── */}
    <div style={{background:T.surfaceB,borderRadius:18,padding:"16px 18px",border:`1px solid ${T.border}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{color:T.white,fontWeight:700,fontSize:14}}>Recent Activity</span>
        <span style={{color:T.t42,fontSize:11,cursor:"pointer"}}>View all →</span>
      </div>
      {state.transactions.slice(0,5).map(tx=><div key={tx.id} style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:38,height:38,borderRadius:11,background:"rgba(255,255,255,.03)",
            border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:16}}>{tx.icon}</div>
          <div><div style={{color:T.white,fontWeight:600,fontSize:13}}>{tx.merchant}</div>
            <div style={{color:T.t42,fontSize:10,marginTop:1}}>{tx.time}</div></div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontWeight:700,fontSize:13,color:tx.amount>0?T.green:T.white}}>
            {tx.amount>0?"+":"-"}${fmt(Math.abs(tx.amount))}</div>
          <div style={{fontSize:9,fontWeight:600,marginTop:1,
            color:tx.status==="settled"?T.green:tx.status==="pending"?T.amber:T.blue}}>
            {tx.status==="settled"?"Completed":tx.status==="pending"?"Pending":"Earned"}</div>
        </div>
      </div>)}
    </div>
  </div>;
}


function CardsScreen({state,setState,derived,notify,setSheet}){
  const [frozen,setFrozen]=useState(state.card.frozen);
  const cards=[
    {gradient:"linear-gradient(135deg,#1A1A2E,#16213E,#0F3460)",label:"MegaBank Debit"},
    {gradient:"linear-gradient(135deg,#2D1B69,#11998E)",label:"MegaBank Credit"}];
  const [ac,setAc]=useState(0);

  return <div style={{animation:"slideUp .3s ease"}}>
    <div style={{padding:"0 20px 24px"}}>
      <div style={{textAlign:"center",marginBottom:18}}>
        <div style={{color:T.t42,fontSize:11,fontWeight:500,marginBottom:4}}>Available to Spend</div>
        <div style={{fontSize:36,fontWeight:900,color:T.white}}>${fmt(derived.availableCredit)}</div>
      </div>
      <DebitCard gradient={cards[ac].gradient} name={state.card.name} number={state.card.number}
        expiry={state.card.expiry} cardType={state.card.type} frozen={ac===0&&frozen}/>
      <div style={{display:"flex",justifyContent:"center",gap:6,margin:"14px 0 18px"}}>
        {cards.map((_,i)=><div key={i} onClick={()=>setAc(i)} style={{
          width:i===ac?18:6,height:5,borderRadius:3,background:i===ac?T.lime:T.t10,
          transition:"all .3s",cursor:"pointer"}}/>)}
      </div>
      <div style={{display:"flex",justifyContent:"space-around",background:T.surfaceB,borderRadius:16,
        padding:"16px 8px",border:`1px solid ${T.border}`}}>
        {[{icon:"🍎",label:"Apple Pay",fn:()=>notify("Added to Apple Wallet!")},
          {icon:frozen?"🔓":"❄️",label:frozen?"Unfreeze":"Freeze",fn:()=>{setFrozen(f=>!f);notify(frozen?"Card unfrozen":"Card frozen");}},
          {icon:"🔔",label:"Alerts",fn:()=>notify("Alert preferences saved!")},
          {icon:"⚙️",label:"Settings",fn:()=>notify("Card settings opening...")}
        ].map(a=><div key={a.label} onClick={a.fn} className="press"
          style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,cursor:"pointer"}}>
          <div style={{width:42,height:42,borderRadius:12,background:"rgba(255,255,255,.04)",
            border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>{a.icon}</div>
          <span style={{color:T.t42,fontSize:9,fontWeight:600}}>{a.label}</span>
        </div>)}
      </div>
    </div>
    <div style={{padding:"0 20px 120px"}}>
      <div style={{background:T.surfaceB,borderRadius:16,padding:"16px",border:`1px solid ${T.border}`,marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{color:T.t42,fontSize:11,fontWeight:500}}>Today's Spending</span>
          <span style={{color:T.white,fontWeight:700,fontSize:12}}>${fmt(state.dailySpent)} / ${fmt(state.dailyLimit)}</span>
        </div>
        <div style={{height:5,borderRadius:3,background:"rgba(255,255,255,.06)"}}>
          <div style={{height:"100%",borderRadius:3,transition:"width .6s",
            width:`${Math.min(100,(state.dailySpent/state.dailyLimit)*100)}%`,
            background:`linear-gradient(90deg,${T.violet},${T.violetL})`}}/>
        </div>
        <div style={{color:T.t22,fontSize:10,marginTop:5,textAlign:"right"}}>${fmt(state.dailyLimit-state.dailySpent)} left today</div>
      </div>
      {state.balanceOwed>0 && <div style={{background:T.surfaceB,borderRadius:16,padding:"16px",
        border:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div>
          <div style={{color:T.t42,fontSize:10,fontWeight:600,marginBottom:3}}>Balance Owed</div>
          <div style={{color:T.white,fontWeight:800,fontSize:20}}>${fmt(state.balanceOwed)}</div>
          <div style={{color:T.t22,fontSize:10,marginTop:3}}>Auto-payment in 23 days</div>
        </div>
        <Btn v="lime" style={{padding:"11px 18px",fontSize:12,borderRadius:11}} onClick={()=>setSheet("repay")}>Repay</Btn>
      </div>}
      <div style={{background:"rgba(59,130,246,.05)",border:`1px solid rgba(59,130,246,.12)`,
        borderRadius:14,padding:"14px",display:"flex",gap:10,alignItems:"center"}}>
        <span style={{fontSize:16}}>🌍</span>
        <div><div style={{color:T.white,fontSize:11,fontWeight:700}}>International spending enabled</div>
          <div style={{color:T.t42,fontSize:10,marginTop:1}}>Auto-converts to local currency at point of sale</div></div>
      </div>
    </div>
  </div>;
}


function BorrowScreen({state,setState,derived,notify,prices}){
  const [amt,setAmt]=useState(500);
  const [step,setStep]=useState("idle");
  const [howOpen,setHowOpen]=useState(false);
  const max=Math.max(100,derived.availableCredit);

  const getRiskAfter=(a)=>{
    const util=(state.balanceOwed+a)/derived.spendingPower*100;
    return util>=75?"High":util>=50?"Medium":"Low";
  };
  const risk=getRiskAfter(amt);
  const monthly=amt*0.04;

  const confirm=()=>{
    const newOwed=state.balanceOwed+amt;
    setState(s=>({...s,balanceOwed:newOwed,
      transactions:[{id:Date.now(),merchant:"Borrowed Funds",amount:+amt,status:"earned",
        time:"Today · just now",icon:"💰"},...s.transactions]}));
    setStep("done");
    notify(`$${fmt(amt)} added to your card`);
    setTimeout(()=>{setStep("idle");setAmt(500);},2500);
  };

  return <div style={{padding:"0 20px 120px",animation:"slideUp .3s ease"}}>
    <div style={{marginBottom:18}}>
      <div style={{fontSize:20,fontWeight:800,color:T.white,marginBottom:4}}>Unlock Spending Power</div>
      <div style={{color:T.t42,fontSize:12,lineHeight:1.6}}>
        Borrow against your deposits without selling them. Funds are available instantly on your card.
      </div>
    </div>

    <div style={{background:T.surfaceB,borderRadius:22,padding:"26px 20px",border:`1px solid ${T.border}`,marginBottom:12}}>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{color:T.t42,fontSize:11,fontWeight:500,marginBottom:6}}>Borrow Amount</div>
        <div style={{fontSize:42,fontWeight:900,color:T.white}}>${fmt(amt,0)}</div>
      </div>
      <input type="range" min={100} max={max} step={50} value={Math.min(amt,max)}
        onChange={e=>setAmt(parseInt(e.target.value))}
        style={{width:"100%",background:`linear-gradient(to right,${T.lime} 0%,${T.lime} ${(amt/max)*100}%,rgba(255,255,255,.08) ${(amt/max)*100}%,rgba(255,255,255,.08) 100%)`}}/>
      <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:10,color:T.t22}}>
        <span>$100</span><span>${fmt(max,0)} available</span>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:20}}>
        {[{l:`Available instantly on your card`,i:"⚡"},
          {l:`Est. monthly payment: $${fmt(monthly)}`,i:"📅"},
          {l:"Interest rate: 4.8% APR",i:"%"}
        ].map((x,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:13,width:20,textAlign:"center"}}>{x.i}</span>
          <span style={{color:T.t70,fontSize:12}}>{x.l}</span>
        </div>)}
      </div>
    </div>

    {/* Risk preview — DYNAMIC */}
    <div style={{background:risk==="High"?"rgba(239,68,68,.05)":risk==="Medium"?"rgba(245,158,11,.05)":"rgba(34,197,94,.05)",
      border:`1px solid ${risk==="High"?"rgba(239,68,68,.18)":risk==="Medium"?"rgba(245,158,11,.18)":"rgba(34,197,94,.18)"}`,
      borderRadius:16,padding:"16px",marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:risk==="Low"?0:10}}>
        <span style={{color:T.t70,fontSize:12,fontWeight:600}}>Account risk after borrowing</span>
        <RiskBadge level={risk} size="sm"/>
      </div>
      {risk==="High" && <div style={{color:T.red,fontSize:11,lineHeight:1.6}}>
        ⚠ Borrowing this much puts your account at high risk. If your deposit values drop, 
        we may automatically repay part of your balance to protect your account.</div>}
      {risk==="Medium" && <div style={{color:T.amber,fontSize:11,lineHeight:1.6}}>
        Your account will be at moderate risk. We'll send alerts if market conditions change.</div>}
    </div>

    {step==="confirming"?<div style={{background:T.surfaceB,borderRadius:16,padding:"18px",
      border:`1px solid ${T.borderL}`,marginBottom:12}}>
      <div style={{color:T.white,fontWeight:700,fontSize:14,marginBottom:12}}>Confirm Borrow</div>
      {[["Amount",`$${fmt(amt)}`],["Interest","4.8% APR"],["Monthly Min.",`$${fmt(monthly)}`],
        ["Funds Go To","Your MegaBank card"],["Risk Level",risk]
      ].map(([l,v])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0"}}>
        <span style={{color:T.t42,fontSize:12}}>{l}</span>
        <span style={{color:T.white,fontSize:12,fontWeight:600}}>{v}</span></div>)}
      <div style={{display:"flex",gap:10,marginTop:14}}>
        <Btn v="ghost" onClick={()=>setStep("idle")} style={{flex:1}}>Cancel</Btn>
        <Btn v="lime" onClick={confirm} style={{flex:1}}>Confirm →</Btn>
      </div>
    </div>
    :step==="done"?<div style={{background:"rgba(34,197,94,.06)",borderRadius:16,padding:"24px",
      border:`1px solid rgba(34,197,94,.18)`,textAlign:"center"}}>
      <div style={{fontSize:32,marginBottom:8}}>✓</div>
      <div style={{color:T.green,fontWeight:700,fontSize:15}}>Funds Available!</div>
      <div style={{color:T.t42,fontSize:12,marginTop:4}}>${fmt(amt)} added to your card balance</div>
    </div>
    :<Btn v="lime" full onClick={()=>setStep("confirming")} disabled={amt<=0||amt>max}
      style={{fontSize:15,padding:"16px"}}>Borrow ${fmt(amt,0)} →</Btn>}

    {/* Collapsible How It Works */}
    <div style={{marginTop:12}}>
      <div onClick={()=>setHowOpen(o=>!o)} className="press"
        style={{display:"flex",justifyContent:"space-between",alignItems:"center",
          background:T.surfaceB,borderRadius:howOpen?"14px 14px 0 0":14,padding:"14px 16px",
          border:`1px solid ${T.border}`,cursor:"pointer"}}>
        <span style={{color:T.t42,fontSize:11,fontWeight:600,letterSpacing:1}}>HOW IT WORKS</span>
        <span style={{color:T.t42,fontSize:14,transition:"transform .2s",
          transform:howOpen?"rotate(180deg)":"rotate(0)"}}
        >▾</span>
      </div>
      {howOpen && <div style={{background:T.surfaceB,borderRadius:"0 0 14px 14px",padding:"4px 16px 16px",
        borderLeft:`1px solid ${T.border}`,borderRight:`1px solid ${T.border}`,borderBottom:`1px solid ${T.border}`,
        animation:"fadeIn .2s"}}>
        {[{n:"1",t:"You deposit crypto",d:"ETH, BTC, SOL, or stablecoins"},
          {n:"2",t:"We unlock spending power",d:`Based on deposit value (e.g. ETH at ${(ASSET_FACTORS.ETH*100)}% factor)`},
          {n:"3",t:"Borrow what you need",d:"Funds appear on your card instantly"},
          {n:"4",t:"Spend anywhere",d:"Card auto-converts to local currency"},
          {n:"5",t:"Repay on your terms",d:"Manual, scheduled, or from earnings"}
        ].map((x,i)=><div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginTop:12}}>
          <div style={{width:22,height:22,borderRadius:7,background:"rgba(173,250,29,.08)",
            border:`1px solid rgba(173,250,29,.18)`,display:"flex",alignItems:"center",justifyContent:"center",
            color:T.lime,fontSize:10,fontWeight:800,flexShrink:0}}>{x.n}</div>
          <div><div style={{color:T.white,fontSize:12,fontWeight:600}}>{x.t}</div>
            <div style={{color:T.t42,fontSize:10,marginTop:1}}>{x.d}</div></div>
        </div>)}
      </div>}
    </div>
  </div>;
}


function AccountScreen({state,derived,notify,setSheet,prices,earningsAccum}){
  const {totalDeposits,spendingPower,availableCredit,utilization,riskLevel}=derived;
  const rc=riskLevel==="High"?T.red:riskLevel==="Medium"?T.amber:T.green;

  return <div style={{padding:"0 20px 120px",animation:"slideUp .3s ease"}}>
    <div style={{background:T.surfaceB,borderRadius:22,padding:"22px",border:`1px solid ${T.border}`,
      marginBottom:12,textAlign:"center"}}>
      <div style={{color:T.t42,fontSize:10,fontWeight:600,letterSpacing:1.5,marginBottom:14}}>ACCOUNT HEALTH</div>
      <div style={{position:"relative",width:130,height:130,margin:"0 auto 14px"}}>
        <svg width="130" height="130" style={{transform:"rotate(-90deg)"}}>
          <circle cx="65" cy="65" r="54" fill="none" stroke="rgba(255,255,255,.04)" strokeWidth="9"/>
          <circle cx="65" cy="65" r="54" fill="none" stroke={rc} strokeWidth="9"
            strokeDasharray={`${2*Math.PI*54*(Math.min(utilization,100)/100)} ${2*Math.PI*54}`}
            strokeLinecap="round" style={{transition:"stroke-dasharray .8s ease,stroke .3s"}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
          alignItems:"center",justifyContent:"center"}}><RiskBadge level={riskLevel} size="sm"/></div>
      </div>
      <div style={{display:"flex",height:7,borderRadius:4,overflow:"hidden",margin:"0 14px 8px",gap:2}}>
        <div style={{flex:5,background:T.green,borderRadius:3}}/>
        <div style={{flex:2.5,background:T.amber,borderRadius:3}}/>
        <div style={{flex:2.5,background:T.red,borderRadius:3}}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",margin:"0 14px",fontSize:9,color:T.t22}}>
        <span>Safe</span><span>Caution</span><span>At Risk</span>
      </div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
      {[{l:"Total Deposits",v:`$${fmt(totalDeposits)}`,c:T.blue},
        {l:"Spending Power",v:`$${fmt(spendingPower)}`,c:T.blue},
        {l:"Balance Owed",v:`$${fmt(state.balanceOwed)}`,c:state.balanceOwed>0?T.amber:T.green},
        {l:"Available Credit",v:`$${fmt(availableCredit)}`,c:T.lime}
      ].map(x=><div key={x.l} style={{background:T.surfaceB,border:`1px solid ${T.border}`,borderRadius:14,padding:"14px"}}>
        <div style={{color:T.t42,fontSize:9,letterSpacing:1,marginBottom:6}}>{x.l.toUpperCase()}</div>
        <div style={{color:x.c,fontWeight:800,fontSize:17}}>{x.v}</div>
      </div>)}
    </div>

    {/* Deposits with LIVE prices */}
    <div style={{background:T.surfaceB,borderRadius:18,padding:"16px",border:`1px solid ${T.border}`,marginBottom:12}}>
      <div style={{color:T.t42,fontSize:10,fontWeight:600,letterSpacing:1.5,marginBottom:12}}>YOUR DEPOSITS · LIVE</div>
      {Object.entries(state.deposits).map(([sym,d])=>{
        const val=d.amount*(prices[sym]||0);
        const price=prices[sym]||0;
        return <div key={sym} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"10px 0",borderBottom:`1px solid ${T.border}`}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:36,height:36,borderRadius:10,background:`${d.color}12`,border:`1px solid ${d.color}25`,
              display:"flex",alignItems:"center",justifyContent:"center",color:d.color,fontSize:15,fontWeight:800}}>{d.icon}</div>
            <div><div style={{color:T.white,fontWeight:600,fontSize:13}}>{d.label}</div>
              <div style={{color:T.t42,fontSize:10,marginTop:1}}>{d.amount} {sym} · ${fmt(price,sym==="USDC"?2:0)}/ea</div></div>
          </div>
          <div style={{color:T.white,fontWeight:700,fontSize:13}}>${fmt(val)}</div>
        </div>;
      })}
    </div>

    {/* Earnings */}
    <div style={{background:"rgba(173,250,29,.04)",border:`1px solid rgba(173,250,29,.12)`,
      borderRadius:16,padding:"16px",marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{color:T.t42,fontSize:10,fontWeight:600,letterSpacing:1}}>EARNINGS THIS MONTH</div>
          <div style={{color:T.lime,fontWeight:800,fontSize:20,marginTop:3}}>${fmt(state.earnedThisMonth)}</div>
          <div style={{color:T.t42,fontSize:11,marginTop:2}}>{fmt(state.earningsRate)}% APY · earned on ${fmt(totalDeposits,0)} in deposits</div>
        </div>
        <div style={{background:"rgba(173,250,29,.08)",border:`1px solid rgba(173,250,29,.18)`,
          borderRadius:12,padding:"8px 14px",textAlign:"center"}}>
          <div style={{color:"rgba(173,250,29,.5)",fontSize:9,fontWeight:600}}>TODAY</div>
          <div style={{color:T.lime,fontWeight:800,fontSize:15}}>${fmt(earningsAccum,3)}</div>
        </div>
      </div>
    </div>

    <div style={{background:"rgba(59,130,246,.04)",border:`1px solid rgba(59,130,246,.12)`,
      borderRadius:14,padding:"14px",marginBottom:12}}>
      <div style={{color:T.white,fontSize:12,fontWeight:700,marginBottom:6}}>Account Protection</div>
      <div style={{color:T.t42,fontSize:11,lineHeight:1.7}}>
        Your account is monitored 24/7. If market prices drop and your risk rises, we'll notify you first 
        and give you time to add deposits or repay. Automatic protection only activates as a last resort — 
        we partially repay your balance using your deposits to prevent further loss. You always keep 
        whatever's left.
      </div>
    </div>

    <div style={{background:T.surfaceB,borderRadius:16,border:`1px solid ${T.border}`,overflow:"hidden"}}>
      {[{i:"🔐",l:"Security & Privacy",d:"Biometrics, 2FA, advanced key backup"},
        {i:"💳",l:"Payment Methods",d:"Manage cards and linked banks"},
        {i:"🔔",l:"Notifications",d:"Price alerts, spending, risk warnings"},
        {i:"🌍",l:"Currency & Region",d:"USD · International enabled"},
        {i:"📋",l:"Statements",d:"Monthly reports, tax documents"},
        {i:"❓",l:"Help & Support",d:"FAQs, live chat"}
      ].map((x,i)=><div key={i} onClick={()=>notify(`${x.l} opening...`)} className="press"
        style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"14px 16px",borderBottom:i<5?`1px solid ${T.border}`:"none",cursor:"pointer"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:16}}>{x.i}</span>
          <div><div style={{color:T.white,fontSize:12,fontWeight:600}}>{x.l}</div>
            <div style={{color:T.t42,fontSize:10,marginTop:1}}>{x.d}</div></div>
        </div>
        <span style={{color:T.t22,fontSize:14}}>›</span>
      </div>)}
    </div>
  </div>;
}


// ═══════════════════════════════════════════════════════════════════════
// ACTION SHEETS — real flows
// ═══════════════════════════════════════════════════════════════════════

function DepositSheet({state,setState,prices,notify,onClose}){
  const [asset,setAsset]=useState("ETH");
  const [amt,setAmt]=useState("");
  const [step,setStep]=useState("input");
  const n=parseFloat(amt)||0;
  const val=n*(prices[asset]||0);
  const valid=n>0;

  const submit=()=>{
    if(step==="input"&&valid){setStep("confirming");return;}
    if(step==="confirming"){
      setStep("processing");
      setTimeout(()=>{
        setState(s=>({...s,
          deposits:{...s.deposits,[asset]:{...s.deposits[asset],amount:s.deposits[asset].amount+n}},
          transactions:[{id:Date.now(),merchant:`${asset} Deposit`,amount:+val,status:"earned",
            time:"Today · just now",icon:"⬇️"},...s.transactions]
        }));
        setStep("done");
        notify(`+${n} ${asset} deposited`);
      },1500);
    }
  };

  return <Sheet open title="Deposit" onClose={step==="processing"?undefined:onClose}>
    {step==="done"?<div style={{textAlign:"center",padding:"20px 0"}}>
      <div style={{fontSize:40,marginBottom:10}}>✓</div>
      <div style={{color:T.green,fontWeight:700,fontSize:16}}>Deposit Complete</div>
      <div style={{color:T.t42,fontSize:12,marginTop:4}}>{n} {asset} (${fmt(val)}) added to your account</div>
      <Btn v="lime" full onClick={onClose} style={{marginTop:20}}>Done</Btn>
    </div>
    :step==="processing"?<div style={{textAlign:"center",padding:"30px 0"}}>
      <div style={{width:32,height:32,borderRadius:"50%",border:`3px solid ${T.violet}`,borderTopColor:"transparent",
        animation:"spin .8s linear infinite",margin:"0 auto 16px"}}/>
      <div style={{color:T.white,fontWeight:600}}>Processing deposit...</div>
    </div>
    :<>
      <div style={{display:"flex",gap:6,marginBottom:18,flexWrap:"wrap"}}>
        {Object.entries(state.deposits).map(([sym,d])=><button key={sym} onClick={()=>setAsset(sym)}
          className="press" style={{padding:"8px 16px",borderRadius:10,border:"1.5px solid",
            fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
            borderColor:asset===sym?d.color:T.border,
            background:asset===sym?`${d.color}12`:"transparent",color:asset===sym?d.color:T.t42}}>{sym}</button>)}
      </div>
      <div style={{background:"rgba(255,255,255,.03)",borderRadius:14,padding:"18px",
        border:`1px solid ${T.border}`,marginBottom:8}}>
        <div style={{color:T.t42,fontSize:10,fontWeight:600,letterSpacing:1,marginBottom:8}}>AMOUNT ({asset})</div>
        <input value={amt} onChange={e=>setAmt(e.target.value)} type="number" placeholder="0.00"
          style={{width:"100%",background:"none",border:"none",color:T.white,fontSize:28,fontWeight:800,
            outline:"none",fontFamily:"inherit"}}/>
        {n>0 && <div style={{color:T.t42,fontSize:12,marginTop:6}}>≈ ${fmt(val)} USD · unlocks ~${fmt(val*(ASSET_FACTORS[asset]||.5))} spending power</div>}
      </div>
      <div style={{color:T.t42,fontSize:11,marginBottom:14}}>
        Current: {state.deposits[asset].amount} {asset}</div>
      {step==="confirming" && <div style={{background:"rgba(173,250,29,.05)",borderRadius:12,padding:"14px",
        marginBottom:14,border:`1px solid rgba(173,250,29,.15)`}}>
        {[["Asset",`${n} ${asset}`],["Value",`$${fmt(val)}`],
          ["New spending power",`+$${fmt(val*(ASSET_FACTORS[asset]||0.5))}`]
        ].map(([l,v])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0"}}>
          <span style={{color:T.t42,fontSize:11}}>{l}</span>
          <span style={{color:T.white,fontSize:11,fontWeight:600}}>{v}</span></div>)}
      </div>}
      <div style={{display:"flex",gap:10}}>
        {step==="confirming"&&<Btn v="ghost" onClick={()=>setStep("input")} style={{flex:1}}>Back</Btn>}
        <Btn v="lime" full={step!=="confirming"} disabled={!valid} onClick={submit} style={{flex:1}}>
          {step==="confirming"?"Confirm Deposit":"Continue"}</Btn>
      </div>
    </>}
  </Sheet>;
}

function WithdrawSheet({state,setState,prices,derived,notify,onClose}){
  const [asset,setAsset]=useState("ETH");
  const [amt,setAmt]=useState("");
  const [step,setStep]=useState("input");
  const n=parseFloat(amt)||0;
  const maxAmt=state.deposits[asset].amount;
  const val=n*(prices[asset]||0);
  const valid=n>0&&n<=maxAmt;

  const newPower=Object.entries(state.deposits).reduce((s,[sym,d])=>{
    const a=sym===asset?d.amount-n:d.amount;
    return s+Math.max(0,a)*(prices[sym]||0)*(ASSET_FACTORS[sym]||.5);
  },0);
  const wouldBeUnsafe=newPower<state.balanceOwed;

  const submit=()=>{
    if(step==="input"&&valid&&!wouldBeUnsafe){setStep("confirming");return;}
    if(step==="confirming"){
      setStep("processing");
      setTimeout(()=>{
        setState(s=>({...s,
          deposits:{...s.deposits,[asset]:{...s.deposits[asset],amount:s.deposits[asset].amount-n}},
          transactions:[{id:Date.now(),merchant:`${asset} Withdrawal`,amount:-val,status:"settled",
            time:"Today · just now",icon:"⬆️"},...s.transactions]
        }));
        setStep("done");
        notify(`${n} ${asset} withdrawn`);
      },1500);
    }
  };

  return <Sheet open title="Withdraw" onClose={step==="processing"?undefined:onClose}>
    {step==="done"?<div style={{textAlign:"center",padding:"20px 0"}}>
      <div style={{fontSize:40,marginBottom:10}}>✓</div>
      <div style={{color:T.green,fontWeight:700,fontSize:16}}>Withdrawal Complete</div>
      <div style={{color:T.t42,fontSize:12,marginTop:4}}>{n} {asset} sent to your external wallet</div>
      <Btn v="lime" full onClick={onClose} style={{marginTop:20}}>Done</Btn>
    </div>
    :step==="processing"?<div style={{textAlign:"center",padding:"30px 0"}}>
      <div style={{width:32,height:32,borderRadius:"50%",border:`3px solid ${T.violet}`,borderTopColor:"transparent",
        animation:"spin .8s linear infinite",margin:"0 auto 16px"}}/>
      <div style={{color:T.white,fontWeight:600}}>Processing withdrawal...</div>
    </div>
    :<>
      <div style={{display:"flex",gap:6,marginBottom:18,flexWrap:"wrap"}}>
        {Object.entries(state.deposits).map(([sym,d])=><button key={sym} onClick={()=>{setAsset(sym);setAmt("");setStep("input");}}
          className="press" style={{padding:"8px 16px",borderRadius:10,border:"1.5px solid",fontSize:12,fontWeight:700,
            cursor:"pointer",fontFamily:"inherit",borderColor:asset===sym?d.color:T.border,
            background:asset===sym?`${d.color}12`:"transparent",color:asset===sym?d.color:T.t42}}>{sym}</button>)}
      </div>
      <div style={{background:"rgba(255,255,255,.03)",borderRadius:14,padding:"18px",
        border:`1px solid ${T.border}`,marginBottom:8}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{color:T.t42,fontSize:10,fontWeight:600,letterSpacing:1}}>AMOUNT ({asset})</div>
          <button onClick={()=>setAmt(String(maxAmt))} style={{background:"none",border:"none",
            color:T.lime,fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Max</button>
        </div>
        <input value={amt} onChange={e=>setAmt(e.target.value)} type="number" placeholder="0.00"
          style={{width:"100%",background:"none",border:"none",color:T.white,fontSize:28,fontWeight:800,outline:"none",fontFamily:"inherit"}}/>
        {n>0 && <div style={{color:T.t42,fontSize:12,marginTop:6}}>≈ ${fmt(val)} USD</div>}
      </div>
      <div style={{color:T.t42,fontSize:11,marginBottom:14}}>Available: {maxAmt} {asset}</div>
      {wouldBeUnsafe&&n>0&&<div style={{background:"rgba(239,68,68,.06)",border:`1px solid rgba(239,68,68,.18)`,
        borderRadius:12,padding:"12px",marginBottom:14}}>
        <div style={{color:T.red,fontSize:11,lineHeight:1.6}}>
          ⚠ This withdrawal would drop your spending power below your balance owed (${fmt(state.balanceOwed)}). 
          Repay some of your balance first, or withdraw less.</div>
      </div>}
      {step==="confirming"&&<div style={{background:"rgba(255,255,255,.03)",borderRadius:12,padding:"14px",
        marginBottom:14,border:`1px solid ${T.border}`}}>
        {[["Withdraw",`${n} ${asset} ($${fmt(val)})`],["Remaining",`${fmt(maxAmt-n,4)} ${asset}`]
        ].map(([l,v])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0"}}>
          <span style={{color:T.t42,fontSize:11}}>{l}</span>
          <span style={{color:T.white,fontSize:11,fontWeight:600}}>{v}</span></div>)}
      </div>}
      <div style={{display:"flex",gap:10}}>
        {step==="confirming"&&<Btn v="ghost" onClick={()=>setStep("input")} style={{flex:1}}>Back</Btn>}
        <Btn v="lime" full={step!=="confirming"} disabled={!valid||wouldBeUnsafe} onClick={submit} style={{flex:1}}>
          {step==="confirming"?"Confirm Withdrawal":"Continue"}</Btn>
      </div>
    </>}
  </Sheet>;
}

function SendSheet({state,setState,notify,onClose,prefillContact}){
  const [contact,setContact]=useState(prefillContact||null);
  const [amt,setAmt]=useState("");
  const [note,setNote]=useState("");
  const [step,setStep]=useState("input");
  const n=parseFloat(amt)||0;
  const valid=n>0&&contact;

  const submit=()=>{
    if(step==="input"&&valid){setStep("confirming");return;}
    if(step==="confirming"){
      setStep("processing");
      setTimeout(()=>{
        setState(s=>({...s,
          transactions:[{id:Date.now(),merchant:`Sent to ${contact.name}`,amount:-n,status:"settled",
            time:"Today · just now",icon:"↗️"},...s.transactions]
        }));
        setStep("done");
        notify(`$${fmt(n)} sent to ${contact.name}`);
      },1200);
    }
  };

  const inp={width:"100%",background:"none",border:"none",color:T.white,outline:"none",fontFamily:"inherit"};

  return <Sheet open title="Send Money" onClose={step==="processing"?undefined:onClose}>
    {step==="done"?<div style={{textAlign:"center",padding:"20px 0"}}>
      <div style={{fontSize:40,marginBottom:10}}>✓</div>
      <div style={{color:T.green,fontWeight:700,fontSize:16}}>Money Sent!</div>
      <div style={{color:T.t42,fontSize:12,marginTop:4}}>${fmt(n)} sent to {contact?.name}</div>
      <Btn v="lime" full onClick={onClose} style={{marginTop:20}}>Done</Btn>
    </div>
    :step==="processing"?<div style={{textAlign:"center",padding:"30px 0"}}>
      <div style={{width:32,height:32,borderRadius:"50%",border:`3px solid ${T.violet}`,borderTopColor:"transparent",
        animation:"spin .8s linear infinite",margin:"0 auto 16px"}}/>
      <div style={{color:T.white,fontWeight:600}}>Sending...</div>
    </div>
    :<>
      <div style={{color:T.t42,fontSize:10,fontWeight:600,letterSpacing:1,marginBottom:10}}>TO</div>
      <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
        {state.contacts.map(c=><div key={c.id} onClick={()=>setContact(c)} className="press"
          style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:10,cursor:"pointer",
            border:`1.5px solid ${contact?.id===c.id?"rgba(173,250,29,.4)":T.border}`,
            background:contact?.id===c.id?"rgba(173,250,29,.06)":"transparent"}}>
          <span style={{fontSize:16}}>{c.emoji}</span>
          <span style={{color:contact?.id===c.id?T.lime:T.t70,fontSize:12,fontWeight:600}}>{c.name}</span>
        </div>)}
      </div>
      <div style={{background:"rgba(255,255,255,.03)",borderRadius:14,padding:"18px",
        border:`1px solid ${T.border}`,marginBottom:12}}>
        <div style={{color:T.t42,fontSize:10,fontWeight:600,letterSpacing:1,marginBottom:8}}>AMOUNT (USD)</div>
        <div style={{display:"flex",alignItems:"baseline",gap:4}}>
          <span style={{color:T.t42,fontSize:24,fontWeight:700}}>$</span>
          <input value={amt} onChange={e=>setAmt(e.target.value)} type="number" placeholder="0.00"
            style={{...inp,fontSize:28,fontWeight:800}}/>
        </div>
      </div>
      <div style={{background:"rgba(255,255,255,.03)",borderRadius:14,padding:"14px",
        border:`1px solid ${T.border}`,marginBottom:18}}>
        <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note (optional)"
          style={{...inp,fontSize:13,fontWeight:500,color:T.t70}}/>
      </div>
      {step==="confirming"&&<div style={{background:"rgba(255,255,255,.03)",borderRadius:12,padding:"14px",
        marginBottom:14,border:`1px solid ${T.border}`}}>
        {[["To",contact?.name],["Amount",`$${fmt(n)}`],["Fee","Free"],
          ...(note?[["Note",note]]:[])]
        .map(([l,v])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0"}}>
          <span style={{color:T.t42,fontSize:11}}>{l}</span>
          <span style={{color:T.white,fontSize:11,fontWeight:600}}>{v}</span></div>)}
      </div>}
      <div style={{display:"flex",gap:10}}>
        {step==="confirming"&&<Btn v="ghost" onClick={()=>setStep("input")} style={{flex:1}}>Back</Btn>}
        <Btn v="lime" full={step!=="confirming"} disabled={!valid} onClick={submit} style={{flex:1}}>
          {step==="confirming"?`Send $${fmt(n)} →`:"Continue"}</Btn>
      </div>
    </>}
  </Sheet>;
}

function RepaySheet({state,setState,notify,onClose}){
  const [amt,setAmt]=useState("");
  const [step,setStep]=useState("input");
  const n=parseFloat(amt)||0;
  const valid=n>0&&n<=state.balanceOwed;

  const submit=()=>{
    if(step==="input"&&valid){setStep("confirming");return;}
    if(step==="confirming"){
      setStep("processing");
      setTimeout(()=>{
        setState(s=>({...s,balanceOwed:Math.max(0,s.balanceOwed-n),
          transactions:[{id:Date.now(),merchant:"Repayment",amount:-n,status:"settled",
            time:"Today · just now",icon:"✓"},...s.transactions]
        }));
        setStep("done");
        notify(`$${fmt(n)} repaid`);
      },1200);
    }
  };

  return <Sheet open title="Repay Balance" onClose={step==="processing"?undefined:onClose}>
    {step==="done"?<div style={{textAlign:"center",padding:"20px 0"}}>
      <div style={{fontSize:40,marginBottom:10}}>✓</div>
      <div style={{color:T.green,fontWeight:700,fontSize:16}}>Payment Applied</div>
      <div style={{color:T.t42,fontSize:12,marginTop:4}}>${fmt(n)} paid toward your balance</div>
      <Btn v="lime" full onClick={onClose} style={{marginTop:20}}>Done</Btn>
    </div>
    :step==="processing"?<div style={{textAlign:"center",padding:"30px 0"}}>
      <div style={{width:32,height:32,borderRadius:"50%",border:`3px solid ${T.green}`,borderTopColor:"transparent",
        animation:"spin .8s linear infinite",margin:"0 auto 16px"}}/>
      <div style={{color:T.white,fontWeight:600}}>Processing payment...</div>
    </div>
    :<>
      <div style={{background:"rgba(255,255,255,.03)",borderRadius:14,padding:"16px",
        border:`1px solid ${T.border}`,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
          <span style={{color:T.t42,fontSize:11}}>Total owed</span>
          <span style={{color:T.white,fontWeight:700,fontSize:14}}>${fmt(state.balanceOwed)}</span>
        </div>
        <div style={{display:"flex",gap:8}}>
          {[{l:"Pay in full",v:state.balanceOwed},{l:"Half",v:state.balanceOwed/2},
            {l:"Minimum",v:state.balanceOwed*0.04}
          ].map(x=><button key={x.l} onClick={()=>setAmt(String(Math.round(x.v*100)/100))}
            className="press" style={{flex:1,padding:"10px 6px",borderRadius:10,
              border:`1px solid ${T.border}`,background:"rgba(255,255,255,.03)",
              color:T.t70,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
            {x.l}<br/><span style={{color:T.white,fontWeight:700}}>${fmt(x.v)}</span>
          </button>)}
        </div>
      </div>
      <div style={{background:"rgba(255,255,255,.03)",borderRadius:14,padding:"18px",
        border:`1px solid ${T.border}`,marginBottom:14}}>
        <div style={{color:T.t42,fontSize:10,fontWeight:600,letterSpacing:1,marginBottom:8}}>CUSTOM AMOUNT</div>
        <div style={{display:"flex",alignItems:"baseline",gap:4}}>
          <span style={{color:T.t42,fontSize:24,fontWeight:700}}>$</span>
          <input value={amt} onChange={e=>setAmt(e.target.value)} type="number" placeholder="0.00"
            style={{width:"100%",background:"none",border:"none",color:T.white,fontSize:28,fontWeight:800,
              outline:"none",fontFamily:"inherit"}}/>
        </div>
      </div>
      <div style={{color:T.t42,fontSize:11,marginBottom:14}}>Source: Your deposit earnings + USDC balance</div>
      {step==="confirming"&&<div style={{background:"rgba(34,197,94,.05)",borderRadius:12,padding:"14px",
        marginBottom:14,border:`1px solid rgba(34,197,94,.15)`}}>
        {[["Repay",`$${fmt(n)}`],["Remaining",`$${fmt(Math.max(0,state.balanceOwed-n))}`],
          ["Source","Earnings + USDC"]
        ].map(([l,v])=><div key={l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0"}}>
          <span style={{color:T.t42,fontSize:11}}>{l}</span>
          <span style={{color:T.white,fontSize:11,fontWeight:600}}>{v}</span></div>)}
      </div>}
      <div style={{display:"flex",gap:10}}>
        {step==="confirming"&&<Btn v="ghost" onClick={()=>setStep("input")} style={{flex:1}}>Back</Btn>}
        <Btn v="lime" full={step!=="confirming"} disabled={!valid} onClick={submit} style={{flex:1}}>
          {step==="confirming"?`Repay $${fmt(n)} →`:"Continue"}</Btn>
      </div>
    </>}
  </Sheet>;
}


// ═══════════════════════════════════════════════════════════════════════
// ONBOARDING
// ═══════════════════════════════════════════════════════════════════════

function SplashScreen({onNext}){
  const cards=[
    {gradient:"linear-gradient(135deg,#1A1A2E,#0F3460)",rot:"-14deg",top:"8%",left:"4%",delay:"0s",anim:"float0"},
    {gradient:"linear-gradient(135deg,#2D1B69,#11998E)",rot:"6deg",top:"12%",left:"22%",delay:".3s",anim:"float1"},
    {gradient:"linear-gradient(135deg,#0B0B14,#1A1A2A)",rot:"18deg",top:"4%",left:"44%",delay:".6s",anim:"float2"},
  ];
  return <div style={{height:"100%",display:"flex",flexDirection:"column",justifyContent:"flex-end",
    padding:"0 0 36px",position:"relative",overflow:"hidden",
    background:`linear-gradient(180deg,#0D0820 0%,${T.bg} 65%)`,animation:"fadeIn .5s ease"}}>
    <div style={{position:"absolute",top:-80,left:"50%",transform:"translateX(-50%)",width:340,height:340,
      borderRadius:"50%",background:"radial-gradient(circle,rgba(124,58,237,.3),transparent 70%)",pointerEvents:"none"}}/>
    <div style={{position:"absolute",top:0,left:0,right:0,height:"55%",pointerEvents:"none"}}>
      {cards.map((c,i)=><div key={i} style={{position:"absolute",top:c.top,left:c.left,
        width:200,height:126,borderRadius:18,background:c.gradient,border:"1px solid rgba(255,255,255,.08)",
        transform:`rotate(${c.rot})`,animation:`${c.anim} ${3.5+i*.4}s ease-in-out ${c.delay} infinite`,
        boxShadow:"0 16px 40px rgba(0,0,0,.5)",overflow:"hidden"}}>
        <div style={{position:"absolute",inset:0,background:"linear-gradient(135deg,rgba(255,255,255,.12),transparent 50%)"}}/>
        <div style={{position:"absolute",top:14,left:14}}>
          <div style={{width:30,height:22,borderRadius:5,background:"rgba(255,255,255,.5)"}}/>
        </div>
      </div>)}
      {[{top:"18%",left:"72%",d:"0s"},{top:"44%",left:"8%",d:".8s"},{top:"8%",left:"62%",d:"1.4s"}].map((s,i)=>
        <div key={i} style={{position:"absolute",top:s.top,left:s.left,fontSize:22,color:T.lime,
          animation:`sparkle 2.5s ease-in-out ${s.d} infinite`,pointerEvents:"none"}}>✦</div>)}
    </div>
    <div style={{padding:"0 28px",animation:"slideUp .7s ease .2s both"}}>
      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
        <span style={{color:T.lime,fontWeight:900,fontSize:24}}>MEGA</span>
        <span style={{color:T.white,fontWeight:900,fontSize:24}}>BANK</span>
      </div>
      <div style={{fontSize:26,fontWeight:800,color:T.white,lineHeight:1.3,marginBottom:8}}>
        Spend your crypto<br/><span style={{color:T.lime}}>without selling it.</span></div>
      <div style={{color:T.t42,fontSize:13,lineHeight:1.7,marginBottom:28}}>
        Deposit crypto. Borrow against it. Spend anywhere with your card. 
        Your assets keep earning while you spend. No DeFi knowledge needed.</div>
      <Btn v="lime" full onClick={onNext} style={{fontSize:15,padding:"17px",
        boxShadow:"0 8px 28px rgba(173,250,29,.2)"}}>Get Started</Btn>
      <div style={{textAlign:"center",marginTop:12,color:T.t42,fontSize:12}}>
        Already have an account? <span style={{color:T.lime,fontWeight:700,cursor:"pointer"}}>Sign in</span></div>
    </div>
  </div>;
}

function SignupScreen({onNext}){
  const [name,setName]=useState("");const [email,setEmail]=useState("");const [phone,setPhone]=useState("");
  const [mode,setMode]=useState("email");
  const valid=name.trim().length>1&&(mode==="email"?email.includes("@"):phone.length>6);
  const inp={width:"100%",padding:"15px",borderRadius:12,background:"rgba(255,255,255,.04)",
    border:`1.5px solid ${T.border}`,color:T.white,fontSize:14,fontWeight:500,outline:"none",fontFamily:"inherit"};
  return <div style={{height:"100%",display:"flex",flexDirection:"column",padding:"22px 28px 34px",animation:"slideUp .4s ease"}}>
    <div style={{flex:1}}>
      <div style={{fontSize:24,fontWeight:900,color:T.white,marginBottom:4}}>Create your account</div>
      <div style={{color:T.t42,fontSize:13,marginBottom:24}}>Set up in 60 seconds. No complicated steps.</div>
      <div style={{marginBottom:12}}>
        <div style={{color:T.t42,fontSize:10,fontWeight:600,letterSpacing:1,marginBottom:6}}>FULL NAME</div>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Alex Chen" style={inp}/></div>
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {["email","phone"].map(m=><button key={m} onClick={()=>setMode(m)} className="press" style={{
          flex:1,padding:"9px",borderRadius:10,border:"1.5px solid",fontSize:12,fontWeight:600,
          cursor:"pointer",fontFamily:"inherit",borderColor:mode===m?T.lime:T.border,
          background:mode===m?"rgba(173,250,29,.06)":"transparent",color:mode===m?T.lime:T.t42}}>
          {m==="email"?"📧 Email":"📱 Phone"}</button>)}
      </div>
      {mode==="email"?<div style={{marginBottom:12}}>
        <div style={{color:T.t42,fontSize:10,fontWeight:600,letterSpacing:1,marginBottom:6}}>EMAIL</div>
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="alex@example.com" style={inp}/></div>
      :<div style={{marginBottom:12}}>
        <div style={{color:T.t42,fontSize:10,fontWeight:600,letterSpacing:1,marginBottom:6}}>PHONE</div>
        <input value={phone} onChange={e=>setPhone(e.target.value)} type="tel" placeholder="+1 (555) 000-0000" style={inp}/></div>}
      <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:14}}>
        {[{i:"🔐",t:"Bank-grade security & encryption"},{i:"🛡️",t:"Fraud protection on every transaction"},
          {i:"💳",t:"Free virtual & physical card included"}
        ].map((b,i)=><div key={i} style={{background:"rgba(255,255,255,.02)",borderRadius:10,padding:"10px 12px",
          display:"flex",alignItems:"center",gap:8,border:`1px solid ${T.border}`}}>
          <span style={{fontSize:14}}>{b.i}</span>
          <span style={{color:T.t70,fontSize:11,fontWeight:500}}>{b.t}</span></div>)}</div>
    </div>
    <Btn v="lime" full disabled={!valid} onClick={()=>{if(valid)onNext(name)}} style={{fontSize:15,padding:"17px"}}>Continue</Btn>
    <div style={{textAlign:"center",marginTop:10,color:T.t22,fontSize:10}}>By continuing you agree to our Terms & Privacy Policy</div>
  </div>;
}

function VerifyScreen({onNext}){
  const [otp,setOtp]=useState(["","","","","",""]);const [sec,setSec]=useState(30);
  const refs=Array.from({length:6},()=>useRef(null));
  useEffect(()=>{if(sec<=0)return;const id=setInterval(()=>setSec(s=>s-1),1000);return()=>clearInterval(id);},[sec]);
  const hk=(i,v)=>{if(!/^\d?$/.test(v))return;const n=[...otp];n[i]=v;setOtp(n);
    if(v&&i<5)refs[i+1].current?.focus();if(!v&&i>0)refs[i-1].current?.focus();};
  const ok=otp.every(d=>d!=="");
  return <div style={{height:"100%",display:"flex",flexDirection:"column",padding:"28px 28px 36px",animation:"slideUp .4s ease"}}>
    <div style={{flex:1}}>
      <div style={{fontSize:28,marginBottom:10}}>📩</div>
      <div style={{fontSize:24,fontWeight:900,color:T.white,marginBottom:6}}>Verify your identity</div>
      <div style={{color:T.t42,fontSize:13,marginBottom:28}}>We sent a 6-digit code to your email.</div>
      <div style={{display:"flex",gap:7,justifyContent:"center",marginBottom:24}}>
        {otp.map((d,i)=><input key={i} ref={refs[i]} value={d} maxLength={1} inputMode="numeric"
          onChange={e=>hk(i,e.target.value)}
          onKeyDown={e=>{if(e.key==="Backspace"&&!d&&i>0)refs[i-1].current?.focus();}}
          style={{width:44,height:52,textAlign:"center",fontSize:20,fontWeight:800,
            background:d?"rgba(173,250,29,.06)":"rgba(255,255,255,.03)",
            border:`2px solid ${d?T.lime:T.border}`,borderRadius:12,
            color:T.white,outline:"none",fontFamily:"inherit"}}/>)}
      </div>
      <div style={{background:"rgba(124,58,237,.06)",border:"1px solid rgba(124,58,237,.15)",
        borderRadius:10,padding:"10px 14px",textAlign:"center"}}>
        <span style={{color:T.t42,fontSize:11}}>Demo: </span>
        <button onClick={()=>setOtp(["1","2","3","4","5","6"])} style={{background:"none",border:"none",
          color:T.lime,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Auto-fill 123456</button>
      </div>
      <div style={{textAlign:"center",marginTop:16,color:T.t42,fontSize:12}}>
        {sec>0?<>Resend in <strong style={{color:T.white}}>{sec}s</strong></>
        :<button onClick={()=>setSec(30)} style={{background:"none",border:"none",color:T.lime,
          fontWeight:700,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Resend code</button>}
      </div>
    </div>
    <Btn v="lime" full disabled={!ok} onClick={()=>{if(ok)onNext();}} style={{fontSize:15,padding:"17px"}}>Verify & Continue</Btn>
  </div>;
}

function SetupScreen({onDone}){
  const steps=[{l:"Setting up your account…",i:"⚙️"},{l:"Enabling security…",i:"🔐"},
    {l:"Preparing your card…",i:"💳"},{l:"Activating protection…",i:"🛡️"},{l:"All set!",i:"✓"}];
  const [a,setA]=useState(0);const [done,setDone]=useState(false);
  useEffect(()=>{if(a>=steps.length-1){setDone(true);return;}const id=setTimeout(()=>setA(s=>s+1),650);return()=>clearTimeout(id);},[a]);
  useEffect(()=>{if(!done)return;const id=setTimeout(onDone,900);return()=>clearTimeout(id);},[done]);
  const p=((a+1)/steps.length)*100;
  return <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",
    justifyContent:"center",padding:"28px",animation:"fadeIn .4s ease"}}>
    <div style={{position:"relative",width:110,height:110,marginBottom:28}}>
      <svg width="110" height="110" style={{position:"absolute",inset:0}}>
        <circle cx="55" cy="55" r="48" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="7"/>
        <circle cx="55" cy="55" r="48" fill="none" stroke={T.lime} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${2*Math.PI*48*p/100} ${2*Math.PI*48}`} transform="rotate(-90 55 55)"
          style={{transition:"stroke-dasharray .6s ease"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontSize:28}}>{done?"🎉":steps[a].i}</span></div>
    </div>
    <div style={{fontSize:18,fontWeight:800,color:T.white,marginBottom:4}}>{done?"Account Ready!":"Setting things up"}</div>
    <div style={{color:T.t42,fontSize:12,marginBottom:28}}>{done?"Everything's ready":"Just a moment…"}</div>
    <div style={{width:"100%",background:T.surfaceB,borderRadius:18,border:`1px solid ${T.border}`,padding:"14px"}}>
      {steps.map((s,i)=>{const past=i<a||done;const act=i===a&&!done;
        return <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",
          borderBottom:i<steps.length-1?`1px solid ${T.border}`:"none",opacity:past||act?1:.2,transition:"opacity .4s"}}>
          <div style={{width:24,height:24,borderRadius:7,flexShrink:0,
            background:past?"rgba(173,250,29,.1)":act?"rgba(124,58,237,.12)":"rgba(255,255,255,.03)",
            border:`1px solid ${past?T.lime:act?T.violet:T.border}`,
            display:"flex",alignItems:"center",justifyContent:"center",color:past?T.lime:T.t42,fontSize:10}}>
            {past?"✓":s.i}</div>
          <span style={{color:past?T.lime:act?T.white:T.t42,fontSize:12,fontWeight:600}}>{s.l}</span>
          {act&&<div style={{marginLeft:"auto",width:12,height:12,borderRadius:"50%",
            border:`2px solid ${T.violet}`,borderTopColor:"transparent",animation:"spin .8s linear infinite"}}/>}
        </div>;})}
    </div>
  </div>;
}

function ReadyScreen({userName,onEnter}){
  return <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",
    justifyContent:"center",padding:"28px",animation:"scaleIn .5s ease",textAlign:"center"}}>
    <div style={{position:"relative",width:110,height:110,marginBottom:22}}>
      <div style={{position:"absolute",inset:0,borderRadius:"50%",
        background:"radial-gradient(circle,rgba(173,250,29,.12),transparent)",animation:"glow 3s ease-in-out infinite"}}/>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:48}}>🏦</div>
    </div>
    <div style={{fontSize:26,fontWeight:900,color:T.white,lineHeight:1.2,marginBottom:6}}>
      Welcome to<br/><span style={{color:T.lime}}>MegaBank</span></div>
    <div style={{color:T.t42,fontSize:13,lineHeight:1.6,marginBottom:28,maxWidth:280}}>
      You're all set, <strong style={{color:T.white}}>{userName}</strong>. Here's what you can do:</div>
    <div style={{width:"100%",background:T.surfaceB,border:`1px solid ${T.border}`,borderRadius:16,
      padding:"16px",marginBottom:24,textAlign:"left"}}>
      {[["💰","Deposit crypto","It earns interest automatically while you hold it"],
        ["💳","Borrow & spend","Get a credit line backed by your deposits — spend anywhere"],
        ["🌍","International","Auto-converts to local currency. No fees."],
        ["🛡️","Protected","24/7 monitoring. We alert you before anything happens."]
      ].map(([icon,t,d],i)=><div key={i} style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:i<3?12:0}}>
        <div style={{width:32,height:32,borderRadius:9,background:"rgba(173,250,29,.06)",
          border:`1px solid rgba(173,250,29,.12)`,display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:14,flexShrink:0}}>{icon}</div>
        <div><div style={{color:T.white,fontWeight:700,fontSize:12}}>{t}</div>
          <div style={{color:T.t42,fontSize:11,marginTop:1}}>{d}</div></div>
      </div>)}
    </div>
    <Btn v="lime" full onClick={onEnter} style={{fontSize:15,fontWeight:800,padding:"17px",
      boxShadow:"0 8px 28px rgba(173,250,29,.2)"}}>Start Using MegaBank</Btn>
  </div>;
}


// ═══════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════
export default function MegaBank(){
  const [onboard,setOnboard]=useState("splash");
  const [userName,setUserName]=useState("");
  const [screen,setScreen]=useState("home");
  const [state,setState]=useState(INITIAL_STATE);
  const [prices,setPrices]=useState({...BASE_PRICES});
  const [earningsAccum,setEarningsAccum]=useState(0);
  const [notification,setNotification]=useState(null);
  const [sheet,setSheet]=useState(null);
  const notifyRef=useRef(null);

  // Price engine: live updates every 3s
  useEffect(()=>{
    const id=setInterval(()=>setPrices(p=>({
      ETH:  p.ETH  * (1+(Math.random()-.5)*.004),
      BTC:  p.BTC  * (1+(Math.random()-.5)*.002),
      USDC: 1.0000 + (Math.random()-.5)*.0001,
      SOL:  p.SOL  * (1+(Math.random()-.5)*.005),
    })),3000);
    return()=>clearInterval(id);
  },[]);

  // Earnings ticker
  useEffect(()=>{
    const totalDep=Object.entries(state.deposits).reduce((s,[sym,d])=>s+d.amount*(prices[sym]||0),0);
    const rate=totalDep*(state.earningsRate/100)/(365*24*3600);
    const id=setInterval(()=>setEarningsAccum(v=>v+rate),1000);
    return()=>clearInterval(id);
  },[state.deposits,state.earningsRate,prices]);

  const derived=useDerivedState(state,prices);

  const notify=useCallback((msg)=>{
    if(notifyRef.current)clearTimeout(notifyRef.current);
    setNotification(msg);
    notifyRef.current=setTimeout(()=>setNotification(null),2500);
  },[]);

  const closeSheet=()=>setSheet(null);
  const sharedProps={state,setState,prices,derived,notify,earningsAccum,setSheet};
  const nav=[{id:"home",icon:"⌂",label:"Home"},{id:"cards",icon:"▭",label:"Cards"},
    {id:"borrow",icon:"↗",label:"Borrow"},{id:"account",icon:"◉",label:"Account"}];

  return <div style={{minHeight:"100vh",
    background:`radial-gradient(ellipse at top left,rgba(124,58,237,.06),transparent 50%),
      radial-gradient(ellipse at bottom right,rgba(173,250,29,.03),transparent 50%),${T.bg}`,
    display:"flex",justifyContent:"center",alignItems:"flex-start",padding:"24px 0 0",fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif"}}>
    <style>{GLOBAL_CSS}</style>
    <div style={{width:"100%",maxWidth:430,background:T.bg,borderRadius:38,
      border:`1px solid rgba(255,255,255,.05)`,boxShadow:"0 40px 100px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.03)",
      overflow:"hidden",position:"relative",minHeight:860}}>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
        padding:"14px 28px 0",fontSize:12,fontWeight:600,color:T.white}}>
        <span>9:41</span>
        <div style={{display:"flex",gap:6,fontSize:11,color:T.t42}}>
          <span>●●●●</span><span>WiFi</span><span>🔋</span></div>
      </div>

      {onboard!==null && <div key={onboard} style={{height:800,overflowY:"auto"}}>
        {onboard==="splash"&&<SplashScreen onNext={()=>setOnboard("signup")}/>}
        {onboard==="signup"&&<SignupScreen onNext={n=>{setUserName(n);setOnboard("verify");}}/>}
        {onboard==="verify"&&<VerifyScreen onNext={()=>setOnboard("setup")}/>}
        {onboard==="setup"&&<SetupScreen onDone={()=>setOnboard("ready")}/>}
        {onboard==="ready"&&<ReadyScreen userName={userName} onEnter={()=>setOnboard(null)}/>}
      </div>}

      {onboard===null&&<>
        <div style={{padding:"8px 20px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{color:T.lime,fontWeight:900,fontSize:18}}>MEGA</span>
              <span style={{color:T.white,fontWeight:900,fontSize:18}}>BANK</span></div>
            <div style={{color:T.t42,fontSize:11,fontWeight:500,marginTop:1}}>
              Hey, {(userName||state.user.name).split(" ")[0]} 👋</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div onClick={()=>notify("Notifications")} className="press" style={{width:36,height:36,borderRadius:11,
              background:"rgba(255,255,255,.04)",border:`1px solid ${T.border}`,
              display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:14}}>🔔</div>
            <div style={{width:36,height:36,borderRadius:11,
              background:`linear-gradient(135deg,${T.violet},${T.violetL})`,
              display:"flex",alignItems:"center",justifyContent:"center",
              color:T.white,fontWeight:800,fontSize:13,boxShadow:"0 4px 12px rgba(124,58,237,.3)"}}>
              {(userName||state.user.name).slice(0,2).toUpperCase()}</div>
          </div>
        </div>

        <div key={screen} style={{height:640,overflowY:"auto",paddingTop:2}}>
          {screen==="home"&&<HomeScreen {...sharedProps}/>}
          {screen==="cards"&&<CardsScreen {...sharedProps}/>}
          {screen==="borrow"&&<BorrowScreen {...sharedProps}/>}
          {screen==="account"&&<AccountScreen {...sharedProps}/>}
        </div>

        {notification&&<div style={{position:"absolute",top:22,left:"50%",transform:"translateX(-50%)",
          background:"rgba(22,163,74,.92)",color:T.white,padding:"10px 20px",borderRadius:12,
          fontSize:12,fontWeight:700,boxShadow:"0 8px 32px rgba(0,0,0,.5)",animation:"slideUp .25s ease",
          zIndex:150,whiteSpace:"nowrap",maxWidth:"88%",textAlign:"center"}}>{notification}</div>}

        <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"6px 10px 20px",
          borderTop:`1px solid ${T.border}`,background:`linear-gradient(0deg,${T.bg} 80%,transparent)`,
          display:"flex",justifyContent:"space-around",alignItems:"center"}}>
          {nav.map(n=><button key={n.id} onClick={()=>setScreen(n.id)} className="press" style={{
            display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"7px 16px",
            borderRadius:14,border:"none",cursor:"pointer",
            background:screen===n.id?"rgba(173,250,29,.06)":"transparent",transition:"all .2s"}}>
            <span style={{fontSize:16,filter:screen===n.id?"none":"grayscale(1) opacity(.3)",transition:"filter .2s"}}>{n.icon}</span>
            <span style={{fontSize:8,fontWeight:700,letterSpacing:.8,color:screen===n.id?T.lime:T.t22,transition:"color .2s"}}>
              {n.label.toUpperCase()}</span>
          </button>)}
        </div>

        {sheet==="deposit"&&<DepositSheet {...sharedProps} onClose={closeSheet}/>}
        {sheet==="withdraw"&&<WithdrawSheet {...sharedProps} onClose={closeSheet}/>}
        {(sheet==="send"||sheet?.type==="send")&&<SendSheet {...sharedProps} onClose={closeSheet}
          prefillContact={sheet?.contact||null}/>}
        {sheet==="repay"&&<RepaySheet {...sharedProps} onClose={closeSheet}/>}
      </>}
    </div>
  </div>;
}
