import { useState, useEffect, useRef, useCallback } from "react";

// ── DATA ───────────────────────────────────────────────────────────────
const INITIAL_STATE = {
  user: { name: "Alex Chen", initials: "AC", kyc: "approved", tier: "Premium" },
  balances: {
    ETH:  { amount: 1.842,   weight: 0.90, color: "#627EEA", icon: "Ξ" },
    BTC:  { amount: 0.0512,  weight: 0.85, color: "#F7931A", icon: "₿" },
    USDM: { amount: 2341.80, weight: 1.00, color: "#ADFA1D", icon: "◈" },
    SOL:  { amount: 12.4,    weight: 0.80, color: "#9945FF", icon: "◎" },
  },
  savingsData: {
    apy: 5.42, saved: 7800.00, earnedToday: 1.156, earnedMonth: 32.44,
    plans: [
      { name: "High Yield Savings", apy: 5.2, allocation: 65, balance: 5070, risk: "Low" },
      { name: "Stable Growth",      apy: 6.8, allocation: 25, balance: 1950, risk: "Low" },
      { name: "Core Savings",       apy: 4.9, allocation: 10, balance: 780,  risk: "Lowest" },
    ],
  },
  credit: { outstandingDebt: 1240.00, dailySpent: 87.50, dailyLimit: 500.00 },
  transactions: [
    { id:1, merchant:"Whole Foods",      amount:-42.80,  status:"settled", time:"Today · 2m ago",   icon:"🛒", category:"Grocery"   },
    { id:2, merchant:"Uber",             amount:-18.20,  status:"settled", time:"Today · 1h ago",   icon:"🚗", category:"Transport"  },
    { id:3, merchant:"Netflix",          amount:-15.99,  status:"pending", time:"Today · 3h ago",   icon:"🎬", category:"Streaming"  },
    { id:4, merchant:"Interest Earned",  amount:+1.156,  status:"credited",time:"Today · auto",     icon:"💰", category:"Interest"   },
    { id:5, merchant:"Amazon",           amount:-89.99,  status:"settled", time:"Yesterday",        icon:"📦", category:"Shopping"   },
  ],
  contacts: [
    { id:1, name:"Jone",  color:"#F59E0B", bg:"#FEF3C7", emoji:"😎" },
    { id:2, name:"Mojo",  color:"#EC4899", bg:"#FCE7F3", emoji:"🤩" },
    { id:3, name:"Emie",  color:"#8B5CF6", bg:"#EDE9FE", emoji:"🦊" },
    { id:4, name:"Smith", color:"#06B6D4", bg:"#CFFAFE", emoji:"🐻" },
    { id:5, name:"Emy",   color:"#EF4444", bg:"#FEE2E2", emoji:"🎭" },
  ],
  card: { number:"4831 •••• •••• 7294", expiry:"09/28", type:"Visa", frozen:false, name:"ALEX CHEN" },
};

const CHAIN_ADDRESSES = {
  USDM: "0x7Ff3a9b...c4E2", ETH: "0x3dA84B9...f71C",
  BTC: "bc1qxy2k...vw3k",   SOL: "7EcDhSY...vvw3",
};
const INITIAL_PRICES = { ETH: 2487.50, BTC: 94250.00, USDM: 1.0002, SOL: 152.30 };

// ── ACCOUNT SETUP ──────────────────────────────────────────────────────
// Wallet creation happens server-side with secure key management.
// Users never interact with blockchain complexity directly.

// ── HELPERS ────────────────────────────────────────────────────────────
const fmt  = (n, d=2) => (n == null || !isFinite(n)) ? "0.00"
  : n.toLocaleString("en-US", { minimumFractionDigits:d, maximumFractionDigits:d });
const lerp = (a, b, t) => a + (b - a) * t;
const splitFmt = (n) => {
  const s = fmt(n, 2);
  const [int, dec] = s.split(".");
  return { int, dec };
};

// ── DESIGN TOKENS ──────────────────────────────────────────────────────
const T = {
  bg:        "#0B0B14",
  surface:   "#13131F",
  surfaceB:  "#1A1A2A",
  border:    "rgba(255,255,255,0.07)",
  lime:      "#ADFA1D",
  violet:    "#7C3AED",
  violetL:   "#9D4EDD",
  white:     "#FFFFFF",
  text:      "#FFFFFF",
  textMuted: "rgba(255,255,255,0.45)",
  textDim:   "rgba(255,255,255,0.25)",
  green:     "#22C55E",
  red:       "#EF4444",
  amber:     "#F59E0B",
  card1:     "linear-gradient(135deg, #72B01D 0%, #ADFA1D 100%)",
  card2:     "linear-gradient(135deg, #EA580C 0%, #FBBF24 100%)",
  card3:     "linear-gradient(135deg, #4F46E5 0%, #9D4EDD 100%)",
};

// ── GLOBAL STYLES ──────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; margin:0; padding:0; }
  body { font-family: 'Outfit', sans-serif; }
  ::-webkit-scrollbar { width: 0; height: 0; }

  @keyframes pulse    { 0%,100%{opacity:1}    50%{opacity:0.4} }
  @keyframes slideUp  { from{transform:translateY(18px);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
  @keyframes shimmer  { 0%{background-position:-200% center} 100%{background-position:200% center} }
  @keyframes cardIn   { from{transform:translateY(30px) scale(0.95);opacity:0} to{transform:translateY(0) scale(1);opacity:1} }
  @keyframes scaleIn  { from{transform:scale(0.92);opacity:0} to{transform:scale(1);opacity:1} }
  @keyframes spin     { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes float0   { 0%,100%{transform:translateY(0px)   rotate(-8deg)}  50%{transform:translateY(-14px) rotate(-6deg)}  }
  @keyframes float1   { 0%,100%{transform:translateY(-8px)  rotate(4deg)}   50%{transform:translateY(4px)   rotate(6deg)}   }
  @keyframes float2   { 0%,100%{transform:translateY(-4px)  rotate(12deg)}  50%{transform:translateY(-18px) rotate(10deg)}  }
  @keyframes progressBar { from{width:0%} to{width:100%} }
  @keyframes wordPop  { 0%{transform:scale(0.8);opacity:0} 60%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
  @keyframes sparkle  { 0%,100%{opacity:0;transform:scale(0)} 50%{opacity:1;transform:scale(1)} }
  @keyframes checkDraw{ from{stroke-dashoffset:100} to{stroke-dashoffset:0} }

  .btn-press:active { transform: scale(0.96); }
  .btn-press { transition: transform 0.12s ease; }
  .hover-lift:hover { transform: translateY(-2px); transition: transform 0.2s ease; }

  input { font-family: 'Outfit', sans-serif; }
  input[type=range] {
    -webkit-appearance: none; appearance: none;
    height: 6px; border-radius: 3px; outline: none;
    background: rgba(255,255,255,0.12);
  }
  input[type=range]::-webkit-slider-thumb {
    -webkit-appearance: none; appearance: none;
    width: 20px; height: 20px; border-radius: 50%;
    background: ${T.lime}; cursor: pointer;
    box-shadow: 0 0 0 4px rgba(173,250,29,0.2);
  }
`;

// ── SHARED COMPONENTS ──────────────────────────────────────────────────

function Ticker({ value, color = T.lime, sizePx = 40, decSizePx = 24 }) {
  const [disp, setDisp] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (Math.abs(value - prev.current) < 0.0001) return;
    const start = prev.current;
    let i = 0; const steps = 20;
    const tid = setInterval(() => {
      i++;
      const next = lerp(start, value, i / steps);
      setDisp(next);
      prev.current = next;
      if (i >= steps) clearInterval(tid);
    }, 16);
    return () => clearInterval(tid);
  }, [value]);
  const { int, dec } = splitFmt(disp);
  return (
    <span style={{ display:"inline-flex", alignItems:"baseline", gap:2 }}>
      <span style={{ fontSize:sizePx, fontWeight:800, color, lineHeight:1, fontFamily:"'Outfit',sans-serif" }}>
        ${int}
      </span>
      <span style={{ fontSize:decSizePx, fontWeight:700, color, lineHeight:1, opacity:0.7 }}>
        .{dec}
      </span>
    </span>
  );
}

function Ring({ pct, size=100, stroke=8, color=T.lime, label="" }) {
  const safePct = isNaN(pct) || !isFinite(pct) ? 0 : Math.max(0, Math.min(pct, 100));
  const r    = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * safePct / 100;
  const c    = size / 2;
  const col  = safePct > 80 ? T.red : safePct > 65 ? T.amber : color;
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke}/>
      <circle cx={c} cy={c} r={r} fill="none" stroke={col} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition:"stroke-dasharray 0.9s ease, stroke 0.4s" }}/>
      <text x={c} y={c-6} textAnchor="middle" fill={T.white} fontSize="18" fontWeight="800"
        transform={`rotate(90,${c},${c})`} style={{ fontFamily:"Outfit,sans-serif" }}>
        {fmt(safePct,0)}%
      </text>
      {label && (
        <text x={c} y={c+12} textAnchor="middle" fill={T.textMuted} fontSize="9"
          transform={`rotate(90,${c},${c})`} style={{ fontFamily:"Outfit,sans-serif", letterSpacing:1 }}>
          {label}
        </text>
      )}
    </svg>
  );
}

function PillBtn({ children, onClick, variant="lime", style={}, className="" }) {
  const bg   = variant==="lime" ? T.lime : variant==="violet" ? T.violet : "rgba(255,255,255,0.08)";
  const text = variant==="lime" ? "#0B0B14" : T.white;
  return (
    <button onClick={onClick} className={`btn-press ${className}`} style={{
      background: bg, color: text,
      border: "none", borderRadius: 50,
      padding: "14px 24px", fontWeight: 700, fontSize: 15,
      cursor: "pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6,
      fontFamily:"'Outfit',sans-serif", ...style
    }}>
      {children}
    </button>
  );
}

function StatCard({ label, value, delta, icon }) {
  const pos = !delta || delta >= 0;
  return (
    <div style={{
      background: T.surfaceB, borderRadius: 20, padding: "20px",
      border: `1px solid ${T.border}`, flex:1
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
        <span style={{ color: T.textMuted, fontSize:13, fontWeight:500 }}>{label}</span>
        <span style={{ fontSize:16 }}>{icon}</span>
      </div>
      <div style={{ fontSize:22, fontWeight:800, color: T.white, fontFamily:"'Outfit',sans-serif" }}>
        ${fmt(value)}
      </div>
      {delta !== undefined && (
        <div style={{ marginTop:6, fontSize:12, fontWeight:600, color: pos ? T.green : T.red }}>
          {pos ? "+" : ""}{fmt(delta)}%
        </div>
      )}
    </div>
  );
}

function DebitCard({ gradient, name, number, expiry, cardType, frozen, style={} }) {
  return (
    <div style={{
      background: gradient, borderRadius: 24, padding: "28px 28px 24px",
      width: "100%", aspectRatio:"1.586", position:"relative", overflow:"hidden",
      boxShadow:"0 20px 60px rgba(0,0,0,0.5)", ...style
    }}>
      {/* Decorative circles */}
      <div style={{ position:"absolute", top:-40, right:-40, width:160, height:160,
        borderRadius:"50%", background:"rgba(255,255,255,0.12)" }}/>
      <div style={{ position:"absolute", top:20, right:20, width:80, height:80,
        borderRadius:"50%", background:"rgba(255,255,255,0.08)" }}/>
      <div style={{ position:"absolute", bottom:-30, left:60, width:120, height:120,
        borderRadius:"50%", background:"rgba(0,0,0,0.1)" }}/>

      {/* Chip */}
      <div style={{
        width:44, height:34, borderRadius:8, marginBottom:24,
        background:"linear-gradient(135deg,rgba(255,255,255,0.9),rgba(255,255,255,0.5))",
        display:"flex", alignItems:"center", justifyContent:"center"
      }}>
        <div style={{ width:28, height:20, borderRadius:3, border:"1.5px solid rgba(0,0,0,0.3)",
          background:"linear-gradient(135deg,rgba(255,200,0,0.6),rgba(255,150,0,0.4))" }}/>
      </div>

      {/* Contactless icon */}
      <div style={{ position:"absolute", top:28, right:28, fontSize:20, color:"rgba(255,255,255,0.7)" }}>
        📶
      </div>

      {/* Card number */}
      <div style={{ fontSize:16, fontWeight:600, color:"rgba(255,255,255,0.85)", letterSpacing:3,
        fontFamily:"'Outfit',monospace", marginBottom:20 }}>
        {number}
      </div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
        <div>
          <div style={{ color:"rgba(255,255,255,0.5)", fontSize:9, letterSpacing:2, marginBottom:3 }}>CARD HOLDER</div>
          <div style={{ color:"rgba(255,255,255,0.9)", fontSize:13, fontWeight:700, letterSpacing:1 }}>{name}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ color:"rgba(255,255,255,0.5)", fontSize:9, letterSpacing:2, marginBottom:3 }}>EXPIRES</div>
          <div style={{ color:"rgba(255,255,255,0.9)", fontSize:13, fontWeight:700 }}>{expiry}</div>
        </div>
        <div style={{ color:"rgba(255,255,255,0.6)", fontWeight:800, fontSize:14, letterSpacing:1 }}>
          {cardType}
        </div>
      </div>

      {frozen && (
        <div style={{ position:"absolute", inset:0, borderRadius:24, backdropFilter:"blur(6px)",
          background:"rgba(11,11,20,0.75)", display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", gap:8 }}>
          <div style={{ fontSize:36 }}>🔒</div>
          <div style={{ color:T.red, fontWeight:800, fontSize:14, letterSpacing:2 }}>CARD FROZEN</div>
        </div>
      )}
    </div>
  );
}

// ── SCREENS ────────────────────────────────────────────────────────────

function HomeScreen({ state, prices, yieldAccum, totalBalance, spendingPower, notify }) {
  const { int, dec } = splitFmt(totalBalance);
  const incomeTotal  = 20450;
  const expenseTotal = 22450;

  return (
    <div style={{ padding:"0 20px 110px", animation:"slideUp 0.4s ease" }}>

      {/* ── Balance Hero ── */}
      <div style={{
        background: T.surfaceB, borderRadius:28, padding:"28px 24px",
        marginBottom:16, border:`1px solid ${T.border}`, position:"relative", overflow:"hidden"
      }}>
        {/* BG glow */}
        <div style={{ position:"absolute", bottom:-80, right:-60, width:220, height:220,
          borderRadius:"50%", background:"radial-gradient(circle,rgba(124,58,237,0.18),transparent)",
          pointerEvents:"none" }}/>
        <div style={{ position:"absolute", top:-40, left:40, width:160, height:160,
          borderRadius:"50%", background:"radial-gradient(circle,rgba(173,250,29,0.08),transparent)",
          pointerEvents:"none" }}/>

        <div style={{ color:T.textMuted, fontSize:13, fontWeight:500, marginBottom:8 }}>Total balance</div>

        {/* Big split number */}
        <div style={{ display:"flex", alignItems:"baseline", gap:2, marginBottom:20 }}>
          <span style={{ fontSize:48, fontWeight:900, color:T.white, lineHeight:1 }}>${int}</span>
          <span style={{ fontSize:28, fontWeight:700, color:"rgba(255,255,255,0.55)", lineHeight:1 }}>.{dec}</span>
          {/* Currency badge */}
          <div style={{
            marginLeft:10, display:"flex", alignItems:"center", gap:6,
            background:"rgba(255,255,255,0.08)", borderRadius:50, padding:"5px 12px",
            border:`1px solid ${T.border}`, alignSelf:"center"
          }}>
            <span style={{ fontSize:14 }}>🇺🇸</span>
            <span style={{ color:T.white, fontSize:13, fontWeight:600 }}>USD</span>
            <span style={{ color:T.textMuted, fontSize:11 }}>▾</span>
          </div>
        </div>

        {/* CTA buttons */}
        <div style={{ display:"flex", gap:10, marginBottom:20 }}>
          <PillBtn variant="lime" style={{ flex:1, fontSize:14 }}
            onClick={()=>notify("Top up coming soon!")}>
            <span style={{ fontSize:16, fontWeight:800 }}>+</span> Top up
          </PillBtn>
          <PillBtn variant="violet" style={{ flex:1, fontSize:14 }}
            onClick={()=>notify("Transfer coming soon!")}>
            <span style={{ fontSize:14 }}>⇄</span> Transfer
          </PillBtn>
        </div>

        {/* Income / Expense */}
        <div style={{ display:"flex", gap:10 }}>
          <StatCard label="Income" value={incomeTotal} delta={12.06} icon="↙"/>
          <StatCard label="Expense" value={expenseTotal} delta={-12.06} icon="↗"/>
        </div>
      </div>

      {/* ── Yield Live Banner ── */}
      <div style={{
        background:`linear-gradient(135deg, rgba(173,250,29,0.12), rgba(173,250,29,0.04))`,
        border:`1px solid rgba(173,250,29,0.25)`, borderRadius:20, padding:"16px 20px",
        marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between"
      }}>
        <div>
          <div style={{ color:"rgba(173,250,29,0.7)", fontSize:11, fontWeight:600, letterSpacing:2, marginBottom:4 }}>
            EARNING NOW
          </div>
          <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
            <span style={{ fontSize:28, fontWeight:800, color:T.lime }}>
              ${fmt(yieldAccum + state.savingsData.earnedToday, 4)}
            </span>
            <span style={{ color:"rgba(173,250,29,0.5)", fontSize:12 }}>today</span>
          </div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ color:"rgba(173,250,29,0.5)", fontSize:11, fontWeight:600, marginBottom:4 }}>RATE</div>
          <div style={{ fontSize:28, fontWeight:800, color:T.lime }}>{fmt(state.savingsData.apy)}%</div>
        </div>
        <div style={{ position:"absolute", right:20, top:"50%", transform:"translateY(-50%)" }}/>
      </div>

      {/* ── Quick Transfer ── */}
      <div style={{
        background: T.white, borderRadius:24, padding:"20px",
        marginBottom:16, boxShadow:"0 4px 30px rgba(0,0,0,0.25)"
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <span style={{ color:"#0B0B14", fontWeight:800, fontSize:17 }}>Quick Transfer</span>
          <span style={{ color:T.violet, fontSize:18 }}>↗</span>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between" }}>
          {state.contacts.map(c => (
            <div key={c.id} onClick={()=>notify(`Sending to ${c.name}...`)}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6, cursor:"pointer" }}
              className="btn-press">
              <div style={{
                width:52, height:52, borderRadius:"50%", background:c.bg,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:24, boxShadow:`0 4px 12px ${c.color}33`
              }}>
                {c.emoji}
              </div>
              <span style={{ color:"#0B0B14", fontSize:11, fontWeight:600 }}>{c.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Transactions ── */}
      <div style={{
        background: T.white, borderRadius:24, padding:"20px",
        boxShadow:"0 4px 30px rgba(0,0,0,0.25)"
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <span style={{ color:"#0B0B14", fontWeight:800, fontSize:17 }}>Transactions</span>
          <span style={{ color:T.violet, fontSize:18, cursor:"pointer" }}>⚌</span>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
          {state.transactions.map(tx => (
            <div key={tx.id} style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"12px 0",
              borderBottom:"1px solid rgba(0,0,0,0.05)"
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{
                  width:44, height:44, borderRadius:14, background:"rgba(0,0,0,0.05)",
                  display:"flex", alignItems:"center", justifyContent:"center", fontSize:20
                }}>{tx.icon}</div>
                <div>
                  <div style={{ color:"#0B0B14", fontWeight:700, fontSize:14 }}>{tx.merchant}</div>
                  <div style={{ color:"rgba(0,0,0,0.4)", fontSize:12, marginTop:1 }}>{tx.time}</div>
                </div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontWeight:700, fontSize:14,
                  color: tx.amount > 0 ? "#16A34A" : "#0B0B14" }}>
                  {tx.amount > 0 ? "+" : ""}${fmt(Math.abs(tx.amount))} USD
                </div>
                <div style={{ fontSize:11, fontWeight:600, marginTop:2,
                  color: tx.status==="settled"?"#16A34A":tx.status==="pending"?"#F59E0B":"#3B82F6" }}>
                  {tx.status==="settled"?"Paid":tx.status==="pending"?"Pending":"Credited"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CardsScreen({ state, setState, notify }) {
  const [activeCard, setActiveCard] = useState(0);
  const [frozen, setFrozen] = useState(state.card.frozen);
  const cards = [
    { gradient:T.card1, label:"MegaBank Earn",    type:"Debit Card"   },
    { gradient:T.card2, label:"MegaBank Spend",   type:"Credit Card"  },
    { gradient:T.card3, label:"MegaBank Premium", type:"Premium Card" },
  ];
  const toggleFreeze = () => {
    const next = !frozen;
    setFrozen(next);
    notify(next ? "Card frozen 🔒" : "Card unfrozen ✓");
  };

  return (
    <div style={{ animation:"slideUp 0.4s ease" }}>
      {/* ── Light top section ── */}
      <div style={{ background:T.white, borderRadius:"0 0 32px 32px", padding:"8px 20px 28px" }}>
        {/* Available funds */}
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ fontSize:40, fontWeight:900, color:"#0B0B14" }}>
            ${fmt(3200)}
          </div>
          <div style={{ color:"rgba(0,0,0,0.45)", fontSize:13, fontWeight:500, marginTop:2 }}>
            Your Available Funds <span style={{ fontSize:11 }}>ⓘ</span>
          </div>
        </div>

        {/* Card carousel */}
        <div style={{ position:"relative", marginBottom:16 }}>
          <div style={{ display:"flex", gap:12, overflowX:"auto", paddingBottom:4 }}>
            {cards.map((c, i) => (
              <div key={i} onClick={()=>setActiveCard(i)}
                style={{
                  minWidth:"85%", cursor:"pointer",
                  transform: i===activeCard ? "scale(1)" : "scale(0.95)",
                  opacity: i===activeCard ? 1 : 0.7,
                  transition:"all 0.3s ease"
                }}>
                <DebitCard
                  gradient={c.gradient}
                  name={state.card.name}
                  number={state.card.number}
                  expiry={state.card.expiry}
                  cardType={c.type}
                  frozen={i===0 && frozen}
                />
              </div>
            ))}
          </div>
          {/* Dot indicators */}
          <div style={{ display:"flex", justifyContent:"center", gap:6, marginTop:12 }}>
            {cards.map((_,i)=>(
              <div key={i} onClick={()=>setActiveCard(i)} style={{
                width: i===activeCard ? 20 : 6, height:6, borderRadius:3,
                background: i===activeCard ? "#0B0B14" : "rgba(0,0,0,0.2)",
                transition:"all 0.3s", cursor:"pointer"
              }}/>
            ))}
          </div>
        </div>

        <div style={{ color:"rgba(0,0,0,0.5)", fontSize:13, fontWeight:500, textAlign:"center" }}>
          {cards[activeCard].label} ••••
        </div>
      </div>

      {/* ── Dark bottom section ── */}
      <div style={{ padding:"20px 20px 110px" }}>
        {/* Action row */}
        <div style={{
          display:"flex", justifyContent:"space-around",
          background: T.surfaceB, borderRadius:24, padding:"20px 10px",
          marginBottom:16, border:`1px solid ${T.border}`
        }}>
          {[
            { icon:"＋", label:"Top up",  color:T.violet, bg:"rgba(124,58,237,0.15)" },
            { icon:"❄",  label:"Freeze",  color:"#38BDF8", bg:"rgba(56,189,248,0.12)" },
            { icon:"⊞",  label:"Details", color:T.lime,   bg:"rgba(173,250,29,0.12)" },
            { icon:"⚙",  label:"Settings",color:T.amber,  bg:"rgba(245,158,11,0.12)" },
          ].map(a => (
            <div key={a.label} onClick={()=>{
              if(a.label==="Freeze") toggleFreeze();
              else notify(`${a.label} coming soon!`);
            }} className="btn-press" style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, cursor:"pointer" }}>
              <div style={{
                width:50, height:50, borderRadius:16, background:a.bg,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:20, color:a.color
              }}>{a.icon}</div>
              <span style={{ color:T.textMuted, fontSize:11, fontWeight:600 }}>{a.label}</span>
            </div>
          ))}
        </div>

        {/* Apple Pay row */}
        <div onClick={()=>notify("Added to Apple Wallet!")} className="btn-press" style={{
          background:T.surfaceB, borderRadius:18, padding:"16px 20px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          border:`1px solid ${T.border}`, cursor:"pointer", marginBottom:16
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:22 }}>🍎</span>
            <span style={{ color:T.white, fontWeight:700, fontSize:15 }}>Add to Apple Wallet</span>
          </div>
          <span style={{ color:T.textMuted, fontSize:18 }}>›</span>
        </div>

        {/* Spend usage */}
        <div style={{
          background:T.surfaceB, borderRadius:20, padding:"20px",
          border:`1px solid ${T.border}`
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
            <span style={{ color:T.textMuted, fontSize:13, fontWeight:500 }}>Daily Spend</span>
            <span style={{ color:T.white, fontWeight:700, fontSize:13 }}>
              ${fmt(state.credit.dailySpent)} / ${fmt(state.credit.dailyLimit)}
            </span>
          </div>
          <div style={{ height:8, borderRadius:4, background:"rgba(255,255,255,0.08)" }}>
            <div style={{
              height:"100%", borderRadius:4, transition:"width 0.6s ease",
              width:`${Math.min(100, (state.credit.dailySpent/state.credit.dailyLimit)*100)}%`,
              background:`linear-gradient(90deg, ${T.violet}, ${T.lime})`
            }}/>
          </div>
          <div style={{ color:T.textDim, fontSize:11, marginTop:8, textAlign:"right" }}>
            ${fmt(state.credit.dailyLimit - state.credit.dailySpent)} remaining
          </div>
          {state.credit.outstandingDebt > 0 && (
            <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${T.border}`,
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ color:T.red, fontSize:12, fontWeight:600, letterSpacing:1 }}>OUTSTANDING</div>
                <div style={{ color:T.red, fontWeight:800, fontSize:20 }}>${fmt(state.credit.outstandingDebt)}</div>
              </div>
              <PillBtn variant="ghost" style={{
                background:"rgba(239,68,68,0.15)", color:T.red,
                border:"1px solid rgba(239,68,68,0.3)", padding:"10px 18px", fontSize:13
              }} onClick={()=>{
                setState(s=>({...s,credit:{...s.credit,outstandingDebt:0}}));
                notify("Balance repaid from savings! ✓");
              }}>Repay</PillBtn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DepositScreen({ state, setState, notify }) {
  const chains = {
    USDM:{ name:"USDm",     time:"~10ms",   color:T.lime,   min:"$10"        },
    ETH: { name:"Ethereum", time:"~15 sec", color:"#627EEA",min:"0.005 ETH"  },
    BTC: { name:"Bitcoin",  time:"~10 min", color:"#F7931A",min:"0.0001 BTC" },
    SOL: { name:"Solana",   time:"~5 sec",  color:"#9945FF",min:"0.1 SOL"    },
  };
  const [sel, setSel]           = useState("USDM");
  const [amt, setAmt]           = useState("");
  const [step, setStep]         = useState(0);
  const isMountedRef            = useRef(true);
  useEffect(()=>{isMountedRef.current=true; return()=>{isMountedRef.current=false;};},[]);
  const chain = chains[sel];

  const handleDeposit = () => {
    const n = parseFloat(amt);
    if (!amt || isNaN(n) || n <= 0 || step!==0) return;
    setStep(1);
    setTimeout(()=>{
      if(!isMountedRef.current) return;
      setStep(2);
      setState(s=>({...s,balances:{...s.balances,[sel]:{...s.balances[sel],amount:s.balances[sel].amount+n}}}));
      notify(`+${n} ${sel} deposited ✓`);
      setTimeout(()=>{ if(!isMountedRef.current)return; setStep(0); setAmt(""); },2500);
    },2000);
  };

  return (
    <div style={{ padding:"0 20px 110px", animation:"slideUp 0.4s ease" }}>
      <div style={{ color:T.textMuted, fontSize:12, fontWeight:600, letterSpacing:2, marginBottom:16 }}>
        ADD FUNDS
      </div>

      {/* Chain tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {Object.entries(chains).map(([sym,c])=>(
          <button key={sym} onClick={()=>{setSel(sym); setStep(0);}} className="btn-press" style={{
            padding:"9px 18px", borderRadius:50, border:"1px solid",
            fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Outfit',sans-serif",
            transition:"all 0.2s",
            borderColor: sel===sym ? c.color : T.border,
            background:  sel===sym ? `${c.color}18` : "transparent",
            color:       sel===sym ? c.color : T.textMuted,
          }}>{sym}</button>
        ))}
      </div>

      {/* Main deposit card */}
      <div style={{
        background:T.surfaceB, borderRadius:24, padding:"24px",
        border:`1px solid ${chain.color}30`, marginBottom:16
      }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div>
            <div style={{ color:chain.color, fontWeight:800, fontSize:16 }}>{chain.name}</div>
            <div style={{ color:T.textMuted, fontSize:12, marginTop:3 }}>
              Min: {chain.min} · {chain.time}
            </div>
          </div>
          <div style={{
            width:48, height:48, borderRadius:16, background:`${chain.color}18`,
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:22, color:chain.color
          }}>
            {state.balances[sel]?.icon || "◈"}
          </div>
        </div>

        {/* Address box */}
        <div style={{
          background:"rgba(255,255,255,0.04)", borderRadius:16, padding:"18px",
          textAlign:"center", marginBottom:18, border:`1px solid ${T.border}`
        }}>
          <div style={{
            width:100, height:100, margin:"0 auto 12px",
            background:"rgba(255,255,255,0.06)", borderRadius:12,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:36
          }}>⊞</div>
          <div style={{ color:T.textDim, fontSize:10, letterSpacing:2, marginBottom:6 }}>DEPOSIT ADDRESS</div>
          <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12, fontFamily:"monospace", wordBreak:"break-all" }}>
            {CHAIN_ADDRESSES[sel]}
          </div>
          <PillBtn variant="ghost" style={{
            marginTop:12, fontSize:12, padding:"8px 20px",
            background:"rgba(255,255,255,0.06)", color:T.textMuted,
            border:`1px solid ${T.border}`
          }} onClick={()=>notify("Address copied! 📋")}>
            Copy Address
          </PillBtn>
        </div>

        {/* Quick amounts */}
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          {[100,500,1000,5000].map(v=>(
            <button key={v} onClick={()=>setAmt(String(v))} className="btn-press" style={{
              flex:1, padding:"10px 4px", borderRadius:12, cursor:"pointer",
              fontSize:12, fontWeight:700, fontFamily:"'Outfit',sans-serif",
              border:`1px solid ${amt===String(v) ? chain.color : T.border}`,
              background: amt===String(v) ? `${chain.color}18` : "transparent",
              color: amt===String(v) ? chain.color : T.textMuted,
            }}>${v}</button>
          ))}
        </div>

        <div style={{ display:"flex", gap:10 }}>
          <input value={amt} onChange={e=>setAmt(e.target.value)} placeholder="Custom amount"
            style={{
              flex:1, background:"rgba(255,255,255,0.05)", border:`1px solid ${T.border}`,
              borderRadius:14, padding:"14px 16px", color:T.white, fontSize:15,
              outline:"none"
            }}/>
          <PillBtn variant="lime" onClick={handleDeposit} style={{
            opacity: step>0 ? 0.6 : 1, minWidth:100,
            background: step>0 ? "rgba(173,250,29,0.4)" : T.lime
          }}>
            {step===0?"Deposit":step===1?"Sending…":"Done ✓"}
          </PillBtn>
        </div>
      </div>

      {/* Fiat ramps */}
      <div style={{ color:T.textMuted, fontSize:12, fontWeight:600, letterSpacing:2, marginBottom:12 }}>
        FIAT ON-RAMPS
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {[
          {name:"Apple Pay", icon:"🍎", fee:"1.5%", time:"Instant"},
          {name:"Google Pay",icon:"🟦", fee:"1.5%", time:"Instant"},
          {name:"Bank Wire", icon:"🏦", fee:"Free", time:"1-2 days"},
        ].map(r=>(
          <div key={r.name} onClick={()=>notify(`${r.name} flow coming soon!`)}
            className="btn-press" style={{
            background:T.surfaceB, border:`1px solid ${T.border}`, borderRadius:18,
            padding:"16px 18px", display:"flex", alignItems:"center", justifyContent:"space-between",
            cursor:"pointer"
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:22 }}>{r.icon}</span>
              <div>
                <div style={{ color:T.white, fontWeight:700, fontSize:14 }}>{r.name}</div>
                <div style={{ color:T.textMuted, fontSize:12 }}>Fee: {r.fee} · {r.time}</div>
              </div>
            </div>
            <span style={{ color:T.textDim, fontSize:18 }}>›</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EarnScreen({ state, yieldAccum }) {
  const perHour    = state.savingsData.saved * (state.savingsData.apy/100) / (365*24);
  const monthTotal = state.savingsData.earnedMonth + yieldAccum + state.savingsData.earnedToday;

  return (
    <div style={{ padding:"0 20px 110px", animation:"slideUp 0.4s ease" }}>

      {/* Hero */}
      <div style={{
        background:`linear-gradient(160deg, #081F12, #0A2318)`,
        border:`1px solid rgba(173,250,29,0.2)`, borderRadius:28, padding:"28px",
        marginBottom:16, position:"relative", overflow:"hidden"
      }}>
        <div style={{ position:"absolute", top:-60, right:-60, width:200, height:200,
          borderRadius:"50%", background:"radial-gradient(circle, rgba(173,250,29,0.12), transparent)" }}/>
        <div style={{ color:"rgba(173,250,29,0.6)", fontSize:12, fontWeight:600, letterSpacing:2, marginBottom:6 }}>
          TOTAL SAVINGS
        </div>
        <div style={{ fontSize:44, fontWeight:900, color:T.lime, lineHeight:1, marginBottom:4 }}>
          ${fmt(state.savingsData.saved)}
        </div>
        <div style={{ color:"rgba(173,250,29,0.5)", fontSize:13, marginBottom:20 }}>
          Earning competitive rates on your balance
        </div>
        <div style={{ display:"flex", gap:24 }}>
          {[
            { l:"Interest Rate", v:`${fmt(state.savingsData.apy)}%`    },
            { l:"Per Hour",      v:`$${fmt(perHour,4)}`                },
            { l:"This Month",    v:`$${fmt(monthTotal,2)}`             },
          ].map(s=>(
            <div key={s.l}>
              <div style={{ color:"rgba(173,250,29,0.4)", fontSize:10, fontWeight:600, letterSpacing:1, marginBottom:4 }}>
                {s.l.toUpperCase()}
              </div>
              <div style={{ color:T.lime, fontWeight:800, fontSize:18 }}>{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Live earning */}
      <div style={{
        background:"rgba(173,250,29,0.06)", border:`1px solid rgba(173,250,29,0.18)`,
        borderRadius:18, padding:"14px 18px", marginBottom:16,
        display:"flex", alignItems:"center", gap:12
      }}>
        <div style={{ width:10, height:10, borderRadius:"50%", background:T.lime, animation:"pulse 2s infinite", flexShrink:0 }}/>
        <span style={{ color:T.white, fontWeight:600 }}>Earning </span>
        <span style={{ color:T.lime, fontWeight:800, fontSize:18 }}>
          ${fmt(yieldAccum + state.savingsData.earnedToday, 4)}
        </span>
        <span style={{ color:T.textMuted, fontSize:12 }}>since open</span>
      </div>

      {/* Savings Plans */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ color:T.textMuted, fontSize:12, fontWeight:600, letterSpacing:2 }}>SAVINGS PLANS</div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:16 }}>
        {state.savingsData.plans.map(s=>{
          const col = s.apy > 6 ? T.amber : T.lime;
          return (
            <div key={s.name} style={{
              background:T.surfaceB, border:`1px solid ${T.border}`, borderRadius:20, padding:"18px"
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div>
                  <div style={{ color:T.white, fontWeight:700, fontSize:15 }}>{s.name}</div>
                  <div style={{ color:T.textMuted, fontSize:12, marginTop:2 }}>
                    <span style={{ color: s.risk==="Lowest"?T.lime : s.risk==="Low"?"#60A5FA":T.amber, fontWeight:600 }}>
                      {s.risk} Risk
                    </span>
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ color:col, fontWeight:900, fontSize:22 }}>{fmt(s.apy)}%</div>
                  <div style={{ color:T.textDim, fontSize:10, letterSpacing:1 }}>APY</div>
                </div>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ color:T.textMuted, fontSize:12 }}>${fmt(s.balance)} saved</span>
                <span style={{ color:T.textMuted, fontSize:12 }}>{s.allocation}%</span>
              </div>
              <div style={{ height:6, borderRadius:3, background:"rgba(255,255,255,0.06)" }}>
                <div style={{
                  height:"100%", borderRadius:3, width:`${s.allocation}%`, background:col,
                  transition:"width 0.8s ease"
                }}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats grid */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        {[
          { l:"Today",           v:`$${fmt(yieldAccum+state.savingsData.earnedToday,4)}`, c:T.lime  },
          { l:"This Month",      v:`$${fmt(monthTotal,2)}`,                               c:T.lime  },
          { l:"Total Saved",     v:`$${fmt(state.savingsData.saved)}`,                    c:"#60A5FA"},
          { l:"Projected Annual",v:`$${fmt(state.savingsData.saved*state.savingsData.apy/100)}`, c:T.amber },
        ].map(item=>(
          <div key={item.l} style={{ background:T.surfaceB, border:`1px solid ${T.border}`, borderRadius:18, padding:"16px" }}>
            <div style={{ color:T.textMuted, fontSize:10, letterSpacing:1, marginBottom:8 }}>{item.l.toUpperCase()}</div>
            <div style={{ color:item.c, fontWeight:800, fontSize:19 }}>{item.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreditScreen({ state, setState, notify, totalBalance, creditLimit, riskLevel, spendingPower }) {
  const riskColor = riskLevel === "Low" ? T.lime : riskLevel === "Medium" ? T.amber : T.red;
  const riskPct   = riskLevel === "Low" ? 25 : riskLevel === "Medium" ? 60 : 85;
  const [borrowAmt, setBorrowAmt] = useState(500);

  return (
    <div style={{ padding:"0 20px 110px", animation:"slideUp 0.4s ease" }}>

      {/* Spending Power Hero */}
      <div style={{
        background:T.surfaceB, border:`1px solid ${T.border}`, borderRadius:28,
        padding:"28px", marginBottom:16, textAlign:"center"
      }}>
        <div style={{ color:T.textMuted, fontSize:12, fontWeight:600, letterSpacing:2, marginBottom:16 }}>
          SPENDING POWER
        </div>
        <div style={{ fontSize:48, fontWeight:900, color:T.lime, lineHeight:1, marginBottom:8 }}>
          ${fmt(Math.max(0, spendingPower))}
        </div>
        <div style={{ color:T.textMuted, fontSize:13, marginBottom:20 }}>
          Available to spend or withdraw
        </div>

        {/* Risk Level Indicator */}
        <div style={{
          display:"inline-flex", alignItems:"center", gap:10, padding:"10px 24px", borderRadius:50,
          background:`${riskColor}18`, border:`1px solid ${riskColor}30`
        }}>
          <div style={{ width:10, height:10, borderRadius:"50%", background:riskColor,
            boxShadow:`0 0 8px ${riskColor}60` }}/>
          <span style={{ color:riskColor, fontWeight:800, fontSize:14, letterSpacing:1 }}>
            {riskLevel.toUpperCase()} RISK
          </span>
        </div>
      </div>

      {/* Account Summary */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
        {[
          { l:"Total Balance",     v:`$${fmt(totalBalance)}`,     c:"#60A5FA" },
          { l:"Available Credit",  v:`$${fmt(creditLimit)}`,      c:"#60A5FA" },
          { l:"Amount Borrowed",   v:`$${fmt(state.credit.outstandingDebt)}`, c: state.credit.outstandingDebt > 0 ? T.amber : T.textMuted },
          { l:"Spending Power",    v:`$${fmt(Math.max(0, spendingPower))}`,   c:T.lime },
        ].map(item=>(
          <div key={item.l} style={{ background:T.surfaceB, border:`1px solid ${T.border}`, borderRadius:18, padding:"16px" }}>
            <div style={{ color:T.textMuted, fontSize:10, letterSpacing:1, marginBottom:8 }}>{item.l.toUpperCase()}</div>
            <div style={{ color:item.c, fontWeight:800, fontSize:18 }}>{item.v}</div>
          </div>
        ))}
      </div>

      {/* Borrow / Unlock Spending Power */}
      <div style={{
        background:`rgba(124,58,237,0.08)`, border:`1px solid rgba(124,58,237,0.2)`,
        borderRadius:24, padding:"20px", marginBottom:16
      }}>
        <div style={{ color:T.textMuted, fontSize:12, fontWeight:600, letterSpacing:2, marginBottom:16 }}>
          UNLOCK MORE SPENDING POWER
        </div>
        <div style={{ color:T.white, fontSize:14, marginBottom:16, lineHeight:1.6 }}>
          Borrow against your deposited assets without selling them. Funds are instantly available on your card.
        </div>

        {/* Borrow slider */}
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
          <span style={{ color:T.textMuted, fontSize:13 }}>Borrow amount</span>
          <span style={{ color:T.violet, fontWeight:800, fontSize:18 }}>${fmt(borrowAmt, 0)}</span>
        </div>
        <input type="range" min="100" max={Math.max(100, Math.floor(creditLimit))}
          value={borrowAmt} onChange={e=>setBorrowAmt(parseInt(e.target.value))}
          style={{ width:"100%", accentColor:T.violet }}/>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:T.textDim, marginTop:6, marginBottom:16 }}>
          <span>$100</span><span>${fmt(creditLimit, 0)} max</span>
        </div>

        <PillBtn variant="violet" onClick={()=>{
          setState(s=>({...s, credit:{...s.credit, outstandingDebt: s.credit.outstandingDebt + borrowAmt }}));
          notify(`$${fmt(borrowAmt, 0)} added to your spending power!`);
        }} style={{ width:"100%", fontSize:15, padding:"16px" }}>
          Unlock ${fmt(borrowAmt, 0)} Spending Power
        </PillBtn>
      </div>

      {/* Repay section */}
      {state.credit.outstandingDebt > 0 && (
        <div style={{
          background:T.surfaceB, border:`1px solid ${T.border}`, borderRadius:24, padding:"20px", marginBottom:16
        }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ color:T.textMuted, fontSize:12, fontWeight:600, letterSpacing:2, marginBottom:6 }}>
                OUTSTANDING BALANCE
              </div>
              <div style={{ color:T.amber, fontWeight:900, fontSize:28 }}>
                ${fmt(state.credit.outstandingDebt)}
              </div>
            </div>
            <PillBtn variant="lime" style={{ padding:"12px 24px", fontSize:14 }} onClick={()=>{
              setState(s=>({...s, credit:{...s.credit, outstandingDebt:0}}));
              notify("Balance repaid successfully!");
            }}>
              Repay All
            </PillBtn>
          </div>
        </div>
      )}

      {/* Risk Alert (only if Medium or High) */}
      {riskLevel !== "Low" && (
        <div style={{
          background: riskLevel === "High" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)",
          border: `1px solid ${riskLevel === "High" ? "rgba(239,68,68,0.3)" : "rgba(245,158,11,0.3)"}`,
          borderRadius:20, padding:"18px", display:"flex", gap:12, alignItems:"flex-start"
        }}>
          <span style={{ fontSize:24, flexShrink:0 }}>{riskLevel === "High" ? "⚠️" : "💡"}</span>
          <div>
            <div style={{ color: riskColor, fontWeight:700, fontSize:14, marginBottom:4 }}>
              {riskLevel === "High" ? "Action recommended" : "Keep an eye on this"}
            </div>
            <div style={{ color:T.textMuted, fontSize:13, lineHeight:1.6 }}>
              {riskLevel === "High"
                ? "Your borrowed amount is close to your limit. Consider repaying some or depositing more funds to avoid automatic adjustments."
                : "Your balance is healthy, but depositing more or repaying part of your balance will give you more flexibility."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ── ONBOARDING FLOW ────────────────────────────────────────────────────
// 4 steps: splash → signup → verify → generating → ready
// No blockchain complexity exposed. Account creation handled server-side.
// ═══════════════════════════════════════════════════════════════════════

/* ── Step 1: Splash ── */
function SplashScreen({ onNext }) {
  const cards = [
    { gradient:T.card1, rot:"-14deg", top:"8%",  left:"4%",  delay:"0s",  anim:"float0" },
    { gradient:T.card3, rot:"6deg",   top:"12%", left:"22%", delay:"0.3s",anim:"float1" },
    { gradient:T.card2, rot:"18deg",  top:"4%",  left:"44%", delay:"0.6s",anim:"float2" },
  ];
  return (
    <div style={{
      height:"100%", display:"flex", flexDirection:"column", justifyContent:"flex-end",
      padding:"0 0 40px", position:"relative", overflow:"hidden",
      background:`linear-gradient(180deg, #0D0820 0%, ${T.bg} 65%)`,
      animation:"fadeIn 0.5s ease"
    }}>
      {/* Ambient glow */}
      <div style={{ position:"absolute", top:-80, left:"50%", transform:"translateX(-50%)",
        width:340, height:340, borderRadius:"50%",
        background:"radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)",
        pointerEvents:"none" }}/>

      {/* Floating cards */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:"55%", pointerEvents:"none" }}>
        {cards.map((c,i) => (
          <div key={i} style={{
            position:"absolute", top:c.top, left:c.left,
            width:200, height:126, borderRadius:18,
            background:c.gradient,
            transform:`rotate(${c.rot})`,
            animation:`${c.anim} ${3.5+i*0.4}s ease-in-out ${c.delay} infinite`,
            boxShadow:"0 16px 40px rgba(0,0,0,0.5)",
            overflow:"hidden"
          }}>
            {/* Card shine */}
            <div style={{ position:"absolute", inset:0,
              background:"linear-gradient(135deg,rgba(255,255,255,0.2) 0%,transparent 50%)" }}/>
            <div style={{ position:"absolute", top:14, left:14 }}>
              <div style={{ width:30, height:22, borderRadius:5,
                background:"rgba(255,255,255,0.7)", marginBottom:24 }}/>
            </div>
            <div style={{ position:"absolute", bottom:12, left:14, right:14,
              fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.7)", letterSpacing:2 }}>
              {["DEBIT CARD","CREDIT","SAVINGS"][i]}
            </div>
          </div>
        ))}
        {/* Sparkles */}
        {[{top:"18%",left:"72%",d:"0s"},{top:"44%",left:"8%",d:"0.8s"},{top:"8%",left:"62%",d:"1.4s"}].map((s,i)=>(
          <div key={i} style={{
            position:"absolute", top:s.top, left:s.left, fontSize:22,
            animation:`sparkle 2.5s ease-in-out ${s.d} infinite`,
            pointerEvents:"none"
          }}>✦</div>
        ))}
      </div>

      {/* Bottom text block */}
      <div style={{ padding:"0 28px", animation:"slideUp 0.7s ease 0.2s both" }}>
        <div style={{ fontSize:38, fontWeight:900, color:T.white, lineHeight:1.15, marginBottom:14 }}>
          Smarter Finance.<br/>
          <span style={{ color:T.lime }}>Brighter Future.</span>
        </div>
        <div style={{ color:T.textMuted, fontSize:15, lineHeight:1.6, marginBottom:36 }}>
          Seamless money management, effortless transactions
          and intelligent savings — all in one app.
        </div>
        <PillBtn variant="violet" onClick={onNext} style={{
          width:"100%", fontSize:17, fontWeight:800, padding:"18px",
          background:`linear-gradient(135deg, ${T.violet}, #9D4EDD)`,
          boxShadow:"0 8px 28px rgba(124,58,237,0.55)"
        }}>
          Get Started
        </PillBtn>
        <div style={{ textAlign:"center", marginTop:18, color:T.textDim, fontSize:12 }}>
          Bank-grade security · No fees on transfers
        </div>
      </div>
    </div>
  );
}

/* ── Step 2: Sign Up ── */
function SignupScreen({ onNext }) {
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [mode,  setMode]  = useState("email"); // "email" | "phone"
  const valid = name.trim().length > 1 && (mode==="email" ? email.includes("@") : phone.length >= 7);

  const inputStyle = {
    width:"100%", background:"rgba(255,255,255,0.05)",
    border:`1px solid ${T.border}`, borderRadius:16,
    padding:"16px 18px", color:T.white, fontSize:15,
    outline:"none", fontFamily:"'Outfit',sans-serif",
    transition:"border-color 0.2s"
  };

  return (
    <div style={{
      height:"100%", display:"flex", flexDirection:"column",
      padding:"28px 28px 40px", animation:"slideUp 0.4s ease"
    }}>
      {/* Logo */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:36 }}>
        <span style={{ color:T.lime, fontWeight:900, fontSize:20 }}>MEGA</span>
        <span style={{ color:T.white, fontWeight:900, fontSize:20 }}>BANK</span>
      </div>

      <div style={{ flex:1 }}>
        <div style={{ fontSize:28, fontWeight:900, color:T.white, lineHeight:1.2, marginBottom:8 }}>
          Create your account
        </div>
        <div style={{ color:T.textMuted, fontSize:14, marginBottom:32 }}>
          Set up takes less than 2 minutes.
        </div>

        {/* Name */}
        <div style={{ marginBottom:14 }}>
          <div style={{ color:T.textMuted, fontSize:12, fontWeight:600, letterSpacing:1, marginBottom:8 }}>
            FULL NAME
          </div>
          <input value={name} onChange={e=>setName(e.target.value)}
            placeholder="Alex Chen" style={inputStyle}/>
        </div>

        {/* Toggle email / phone */}
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          {["email","phone"].map(m=>(
            <button key={m} onClick={()=>setMode(m)} className="btn-press" style={{
              flex:1, padding:"9px", borderRadius:12, border:"1px solid",
              borderColor: mode===m ? T.lime : T.border,
              background:  mode===m ? "rgba(173,250,29,0.1)" : "transparent",
              color: mode===m ? T.lime : T.textMuted,
              fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"'Outfit',sans-serif"
            }}>{m==="email"?"📧 Email":"📱 Phone"}</button>
          ))}
        </div>

        {mode==="email" ? (
          <div style={{ marginBottom:14 }}>
            <div style={{ color:T.textMuted, fontSize:12, fontWeight:600, letterSpacing:1, marginBottom:8 }}>
              EMAIL ADDRESS
            </div>
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email"
              placeholder="alex@example.com" style={inputStyle}/>
          </div>
        ) : (
          <div style={{ marginBottom:14 }}>
            <div style={{ color:T.textMuted, fontSize:12, fontWeight:600, letterSpacing:1, marginBottom:8 }}>
              PHONE NUMBER
            </div>
            <input value={phone} onChange={e=>setPhone(e.target.value)} type="tel"
              placeholder="+44 7700 900123" style={inputStyle}/>
          </div>
        )}

        {/* Trust badge */}
        <div style={{
          background:"rgba(173,250,29,0.07)", border:"1px solid rgba(173,250,29,0.2)",
          borderRadius:14, padding:"14px 16px", marginTop:8,
          display:"flex", alignItems:"flex-start", gap:10
        }}>
          <span style={{ fontSize:18, flexShrink:0 }}>🔐</span>
          <div style={{ color:"rgba(173,250,29,0.75)", fontSize:12, lineHeight:1.5 }}>
            <strong style={{ display:"block", marginBottom:2 }}>Bank-grade security</strong>
            Your account is protected by encryption, fraud monitoring, and multi-factor authentication.
          </div>
        </div>
      </div>

      <PillBtn variant="lime" onClick={()=>{ if(valid) onNext(name); }} style={{
        width:"100%", fontSize:16, padding:"18px",
        opacity: valid ? 1 : 0.38
      }}>
        Continue →
      </PillBtn>

      <div style={{ textAlign:"center", marginTop:14, color:T.textDim, fontSize:12 }}>
        By continuing you agree to our Terms &amp; Privacy Policy
      </div>
    </div>
  );
}

/* ── Step 3: Verify OTP ── */
function VerifyScreen({ onNext }) {
  const [otp, setOtp]         = useState(["","","","","",""]);
  const [seconds, setSeconds] = useState(30);
  const refs = Array.from({length:6}, ()=>useRef(null));

  useEffect(()=>{
    if(seconds<=0) return;
    const id = setInterval(()=>setSeconds(s=>s-1),1000);
    return ()=>clearInterval(id);
  },[seconds]);

  const handleKey = (i, val) => {
    if(!/^\d?$/.test(val)) return;
    const next = [...otp]; next[i] = val;
    setOtp(next);
    if(val && i<5) refs[i+1].current?.focus();
    if(!val && i>0) refs[i-1].current?.focus();
  };

  const complete = otp.every(d=>d!=="");

  return (
    <div style={{
      height:"100%", display:"flex", flexDirection:"column",
      padding:"28px 28px 40px", animation:"slideUp 0.4s ease"
    }}>
      <button onClick={onNext} style={{
        background:"none", border:"none", color:T.textMuted, fontSize:22,
        cursor:"pointer", alignSelf:"flex-start", marginBottom:28, padding:0
      }}>←</button>

      <div style={{ flex:1 }}>
        <div style={{ fontSize:32, marginBottom:12 }}>📩</div>
        <div style={{ fontSize:28, fontWeight:900, color:T.white, lineHeight:1.2, marginBottom:10 }}>
          Verify it's you
        </div>
        <div style={{ color:T.textMuted, fontSize:14, marginBottom:36, lineHeight:1.6 }}>
          We sent a 6-digit code to your email / phone. Enter it below to continue.
        </div>

        {/* OTP boxes */}
        <div style={{ display:"flex", gap:10, justifyContent:"center", marginBottom:32 }}>
          {otp.map((d,i)=>(
            <input key={i} ref={refs[i]} value={d} maxLength={1} inputMode="numeric"
              onChange={e=>handleKey(i,e.target.value)}
              onKeyDown={e=>{ if(e.key==="Backspace"&&!d&&i>0) refs[i-1].current?.focus(); }}
              style={{
                width:48, height:58, textAlign:"center", fontSize:24, fontWeight:800,
                background: d ? "rgba(173,250,29,0.12)" : "rgba(255,255,255,0.05)",
                border:`2px solid ${d ? T.lime : T.border}`, borderRadius:14,
                color:T.white, outline:"none", fontFamily:"'Outfit',sans-serif",
                transition:"all 0.15s"
              }}/>
          ))}
        </div>

        {/* Demo helper */}
        <div style={{
          background:"rgba(124,58,237,0.1)", border:"1px solid rgba(124,58,237,0.2)",
          borderRadius:12, padding:"12px 16px", textAlign:"center"
        }}>
          <span style={{ color:T.textMuted, fontSize:12 }}>Demo: tap </span>
          <button onClick={()=>setOtp(["1","2","3","4","5","6"])} style={{
            background:"none", border:"none", color:T.lime, fontSize:12,
            fontWeight:700, cursor:"pointer", fontFamily:"'Outfit',sans-serif"
          }}>Auto-fill 123456</button>
        </div>

        <div style={{ textAlign:"center", marginTop:20, color:T.textMuted, fontSize:13 }}>
          {seconds>0
            ? <>Resend code in <strong style={{color:T.white}}>{seconds}s</strong></>
            : <button onClick={()=>setSeconds(30)} style={{
                background:"none", border:"none", color:T.lime,
                fontWeight:700, cursor:"pointer", fontSize:13, fontFamily:"'Outfit',sans-serif"
              }}>Resend code</button>
          }
        </div>
      </div>

      <PillBtn variant="lime" onClick={()=>{ if(complete) onNext(); }} style={{
        width:"100%", fontSize:16, padding:"18px",
        opacity: complete ? 1 : 0.38
      }}>
        Verify &amp; Continue
      </PillBtn>
    </div>
  );
}

/* ── Step 4: Setting Up Account ── */
function GeneratingScreen({ onDone }) {
  const steps = [
    { label:"Verifying your identity…",       detail:"Secure identity check",                   icon:"🔐" },
    { label:"Setting up your account…",        detail:"Creating your personal account",          icon:"📋" },
    { label:"Enabling bank-grade security…",   detail:"Multi-factor authentication & encryption",icon:"🛡" },
    { label:"Connecting your card…",           detail:"Virtual card ready for instant use",      icon:"💳" },
    { label:"Account ready!",                  detail:"You're all set to start",                 icon:"✅" },
  ];
  const [activeStep, setActiveStep] = useState(0);
  const [done, setDone]             = useState(false);

  useEffect(()=>{
    if(activeStep >= steps.length - 1){ setDone(true); return; }
    const id = setTimeout(()=>setActiveStep(s=>s+1), 900);
    return ()=>clearTimeout(id);
  },[activeStep]);

  useEffect(()=>{
    if(!done) return;
    const id = setTimeout(onDone, 1200);
    return ()=>clearTimeout(id);
  },[done]);

  const progress = ((activeStep+1)/steps.length)*100;

  return (
    <div style={{
      height:"100%", display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:"28px", animation:"fadeIn 0.4s ease"
    }}>
      {/* Spinning ring */}
      <div style={{ position:"relative", width:120, height:120, marginBottom:36 }}>
        <svg width="120" height="120" style={{ position:"absolute", inset:0 }}>
          <circle cx="60" cy="60" r="52" fill="none"
            stroke="rgba(255,255,255,0.07)" strokeWidth="8"/>
          <circle cx="60" cy="60" r="52" fill="none"
            stroke={T.lime} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${2*Math.PI*52*progress/100} ${2*Math.PI*52}`}
            transform="rotate(-90 60 60)"
            style={{ transition:"stroke-dasharray 0.8s ease" }}/>
        </svg>
        <div style={{
          position:"absolute", inset:0, display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center"
        }}>
          <span style={{ fontSize:32 }}>{done?"🎉": steps[activeStep].icon}</span>
        </div>
      </div>

      <div style={{ fontSize:22, fontWeight:900, color:T.white, marginBottom:6, textAlign:"center" }}>
        {done ? "Account Created!" : "Setting up your account"}
      </div>
      <div style={{ color:T.textMuted, fontSize:13, marginBottom:40, textAlign:"center" }}>
        {done ? "Your account is ready to use" : "This only takes a moment…"}
      </div>

      {/* Step list */}
      <div style={{
        width:"100%", background:T.surfaceB, borderRadius:24,
        border:`1px solid ${T.border}`, padding:"20px", display:"flex", flexDirection:"column", gap:0
      }}>
        {steps.map((s, i)=>{
          const isActive  = i === activeStep && !done;
          const isPast    = i < activeStep || done;
          return (
            <div key={i} style={{
              display:"flex", alignItems:"flex-start", gap:14,
              padding:"12px 0",
              borderBottom: i < steps.length-1 ? `1px solid ${T.border}` : "none",
              opacity: isPast||isActive ? 1 : 0.25,
              transition:"opacity 0.4s ease",
              animation: isActive ? "slideUp 0.3s ease" : "none"
            }}>
              <div style={{
                width:32, height:32, borderRadius:10, flexShrink:0,
                background: isPast ? "rgba(173,250,29,0.15)" : isActive ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.05)",
                border:`1px solid ${isPast ? T.lime : isActive ? T.violet : T.border}`,
                display:"flex", alignItems:"center", justifyContent:"center", fontSize:14,
                transition:"all 0.4s"
              }}>
                {isPast ? "✓" : s.icon}
              </div>
              <div>
                <div style={{
                  color: isPast ? T.lime : isActive ? T.white : T.textMuted,
                  fontSize:13, fontWeight:700, lineHeight:1.3, transition:"color 0.4s"
                }}>{s.label}</div>
                <div style={{ color:T.textDim, fontSize:11, marginTop:2 }}>{s.detail}</div>
              </div>
              {isActive && (
                <div style={{
                  marginLeft:"auto", width:16, height:16, borderRadius:"50%", flexShrink:0,
                  border:`2px solid ${T.violet}`, borderTopColor:"transparent",
                  animation:"spin 0.8s linear infinite"
                }}/>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── SeedScreen and ConfirmSeedScreen removed ── */
/* Seed phrase backup is now accessible only via Settings > Advanced Security */

/* ── Step 5: Account Ready ── */
function AccountReadyScreen({ userName, onEnter }) {
  return (
    <div style={{
      height:"100%", display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:"28px", animation:"scaleIn 0.6s ease",
      textAlign:"center"
    }}>
      {/* Checkmark ring */}
      <div style={{ position:"relative", width:140, height:140, marginBottom:28 }}>
        <div style={{
          position:"absolute", inset:0, borderRadius:"50%",
          background:"radial-gradient(circle, rgba(173,250,29,0.18), transparent)",
          animation:"pulse 2.5s ease-in-out infinite"
        }}/>
        <svg width="140" height="140" style={{ position:"absolute", inset:0 }}>
          <circle cx="70" cy="70" r="60" fill="none"
            stroke="rgba(173,250,29,0.2)" strokeWidth="2"/>
          <circle cx="70" cy="70" r="60" fill="none"
            stroke={T.lime} strokeWidth="3" strokeLinecap="round"
            strokeDasharray="377" strokeDashoffset="0"
            style={{ animation:"none" }}/>
        </svg>
        <div style={{
          position:"absolute", inset:0, display:"flex",
          alignItems:"center", justifyContent:"center", fontSize:56
        }}>🏦</div>
      </div>

      <div style={{ fontSize:30, fontWeight:900, color:T.white, lineHeight:1.2, marginBottom:10 }}>
        Your account<br/>
        <span style={{ color:T.lime }}>is ready!</span>
      </div>
      <div style={{ color:T.textMuted, fontSize:14, lineHeight:1.6, marginBottom:36 }}>
        Welcome, <strong style={{color:T.white}}>{userName}</strong>. Your MegaBank account is set up
        and ready to go. Start depositing, earning, and spending.
      </div>

      {/* What's next */}
      <div style={{
        width:"100%", background:T.surfaceB, border:`1px solid ${T.border}`,
        borderRadius:20, padding:"18px 20px", marginBottom:32, textAlign:"left"
      }}>
        {[
          ["💰 Earn interest",  "Your balance earns competitive interest rates automatically"],
          ["💳 Spend anywhere", "Use your virtual card at millions of merchants worldwide"],
          ["📲 Send money",     "Transfer funds to friends and family instantly"],
        ].map(([title,desc])=>(
          <div key={title} style={{ display:"flex", gap:12, marginBottom:12, alignItems:"flex-start" }}>
            <div style={{
              background:"rgba(173,250,29,0.12)", border:`1px solid rgba(173,250,29,0.2)`,
              borderRadius:8, padding:"4px 8px", flexShrink:0, marginTop:1
            }}>
              <span style={{ color:T.lime, fontSize:12, fontWeight:700 }}>{title.split(" ")[0]}</span>
            </div>
            <div>
              <div style={{ color:T.white, fontWeight:700, fontSize:13 }}>{title.split(" ").slice(1).join(" ")}</div>
              <div style={{ color:T.textMuted, fontSize:12, marginTop:2 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>

      <PillBtn variant="lime" onClick={onEnter} style={{
        width:"100%", fontSize:17, fontWeight:800, padding:"18px",
        boxShadow:"0 8px 28px rgba(173,250,29,0.3)"
      }}>
        Enter MegaBank →
      </PillBtn>
    </div>
  );
}

// ── END ONBOARDING ─────────────────────────────────────────────────────

// ── MAIN APP ───────────────────────────────────────────────────────────
export default function MegaBank() {
  // ── Onboarding state ──
  // "splash" → "signup" → "verify" → "generating" → "ready" → null (main app)
  const [onboardStep, setOnboardStep] = useState("splash");
  const [userName,    setUserName]    = useState("");

  // Advance through onboarding
  const goSignup     = ()                => setOnboardStep("signup");
  const goVerify     = (name)            => { setUserName(name); setOnboardStep("verify"); };
  const goGenerating = ()                => setOnboardStep("generating");
  const goReady      = ()                => setOnboardStep("ready");
  const enterApp     = ()                => setOnboardStep(null);

  // ── Main app state ──
  // ── Main app state ──
  const [screen, setScreen]         = useState("home");
  const [state, setState]           = useState(INITIAL_STATE);
  const [yieldAccum, setYieldAccum] = useState(0);
  const [prices, setPrices]         = useState(INITIAL_PRICES);
  const [notification, setNotification] = useState(null);
  const notifyTimerRef = useRef(null);

  // Interest ticker
  useEffect(()=>{
    const rate = state.savingsData.saved * (state.savingsData.apy/100) / (365*24*3600);
    const id = setInterval(()=>setYieldAccum(v=>v+rate), 1000);
    return ()=>clearInterval(id);
  }, [state.savingsData.saved, state.savingsData.apy]);

  // Price simulation
  useEffect(()=>{
    const id = setInterval(()=>setPrices(p=>({
      ETH:  p.ETH  * (1+(Math.random()-0.5)*0.002),
      BTC:  p.BTC  * (1+(Math.random()-0.5)*0.001),
      USDM: 1.0002 + (Math.random()-0.5)*0.00004,
      SOL:  p.SOL  * (1+(Math.random()-0.5)*0.003),
    })), 3000);
    return ()=>clearInterval(id);
  }, []);

  const notify = useCallback((msg, type="success")=>{
    if(notifyTimerRef.current) clearTimeout(notifyTimerRef.current);
    setNotification({msg, type});
    notifyTimerRef.current = setTimeout(()=>setNotification(null), 3000);
  }, []);

  // Derived values
  const totalBalance   = Object.entries(state.balances).reduce((s,[k,v])=>s+v.amount*prices[k], 0);
  const weightedFactor = Object.entries(state.balances).reduce((s,[k,v])=>s+(v.amount*prices[k])*v.weight, 0) / totalBalance;
  const creditLimit    = totalBalance * weightedFactor * 0.70;
  const spendingPower  = creditLimit - state.credit.outstandingDebt;
  const riskPct        = totalBalance > 0 ? (state.credit.outstandingDebt / creditLimit) * 100 : 0;
  const riskLevel      = riskPct < 50 ? "Low" : riskPct < 80 ? "Medium" : "High";

  const sharedProps = { state, setState, notify, totalBalance, creditLimit, spendingPower, riskLevel };

  const nav = [
    { id:"home",    icon:"⌂",  label:"Home"    },
    { id:"cards",   icon:"▭",  label:"Cards"   },
    { id:"earn",    icon:"◈",  label:"Earn"    },
    { id:"deposit", icon:"⬇",  label:"Deposit" },
    { id:"credit",  icon:"◎",  label:"Credit"  },
  ];

  return (
    <div style={{
      minHeight:"100vh",
      background:`radial-gradient(ellipse at top left, rgba(124,58,237,0.12) 0%, transparent 50%),
                  radial-gradient(ellipse at bottom right, rgba(173,250,29,0.06) 0%, transparent 50%),
                  ${T.bg}`,
      display:"flex", justifyContent:"center", alignItems:"flex-start",
      padding:"24px 0 0", fontFamily:"'Outfit',sans-serif"
    }}>
      <style>{GLOBAL_CSS}</style>

      <div style={{
        width:"100%", maxWidth:430,
        background: T.bg,
        borderRadius:44,
        border:`1px solid rgba(255,255,255,0.08)`,
        boxShadow:`0 40px 100px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.06)`,
        overflow:"hidden", position:"relative", minHeight:860
      }}>
        {/* Status bar — always visible */}
        <div style={{
          display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"14px 28px 0", fontSize:13, fontWeight:600, color:T.white
        }}>
          <span>9:41</span>
          <div style={{ display:"flex", gap:6, fontSize:12 }}>
            <span>●●●●</span><span>WiFi</span><span>🔋</span>
          </div>
        </div>

        {/* ── ONBOARDING FLOW ── */}
        {onboardStep !== null && (
          <div key={onboardStep} style={{ height:800, overflowY:"auto" }}>
            {onboardStep==="splash"     && <SplashScreen onNext={goSignup}/>}
            {onboardStep==="signup"     && <SignupScreen onNext={goVerify}/>}
            {onboardStep==="verify"     && <VerifyScreen onNext={goGenerating}/>}
            {onboardStep==="generating" && <GeneratingScreen onDone={goReady}/>}
            {onboardStep==="ready"      && (
              <AccountReadyScreen userName={userName} onEnter={enterApp}/>
            )}
          </div>
        )}

        {/* ── MAIN APP (after onboarding) ── */}
        {onboardStep === null && (<>
          {/* Header */}
          <div style={{
            padding:"12px 24px 16px",
            display:"flex", justifyContent:"space-between", alignItems:"center"
          }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ color:T.lime, fontWeight:900, fontSize:22, letterSpacing:0.5 }}>MEGA</span>
                <span style={{ color:T.white, fontWeight:900, fontSize:22 }}>BANK</span>
                <div style={{
                  background:"rgba(173,250,29,0.15)", border:`1px solid rgba(173,250,29,0.3)`,
                  color:T.lime, fontSize:9, fontWeight:700, padding:"3px 8px", borderRadius:50, letterSpacing:1
                }}>BETA</div>
              </div>
              <div style={{ color:T.textMuted, fontSize:12, fontWeight:500, marginTop:1 }}>
                Welcome back, {(userName || state.user.name).split(" ")[0]} 👋
              </div>
            </div>
            <div style={{
              width:42, height:42, borderRadius:14,
              background:`linear-gradient(135deg, ${T.violet}, #9D4EDD)`,
              display:"flex", alignItems:"center", justifyContent:"center",
              color:T.white, fontWeight:800, fontSize:16,
              boxShadow:"0 4px 16px rgba(124,58,237,0.5)"
            }}>
              {(userName || state.user.name).slice(0,2).toUpperCase()}
            </div>
          </div>

          {/* Screen content */}
          <div key={screen} style={{ height:640, overflowY:"auto", paddingTop:4 }}>
            {screen==="home"    && <HomeScreen    {...sharedProps} prices={prices} yieldAccum={yieldAccum}/>}
            {screen==="cards"   && <CardsScreen   {...sharedProps}/>}
            {screen==="earn"    && <EarnScreen    state={state} yieldAccum={yieldAccum}/>}
            {screen==="deposit" && <DepositScreen {...sharedProps}/>}
            {screen==="credit"  && <CreditScreen  {...sharedProps}/>}
          </div>

          {/* Toast */}
          {notification && (
            <div style={{
              position:"absolute", top:24, left:"50%", transform:"translateX(-50%)",
              background: notification.type==="info"
                ? "rgba(124,58,237,0.95)" : "rgba(22,163,74,0.95)",
              color:T.white, padding:"11px 24px", borderRadius:50,
              fontSize:13, fontWeight:700, letterSpacing:0.3,
              boxShadow:"0 8px 32px rgba(0,0,0,0.6)",
              animation:"slideUp 0.3s ease",
              zIndex:100, whiteSpace:"nowrap", maxWidth:"88%", textAlign:"center"
            }}>
              {notification.msg}
            </div>
          )}

          {/* Bottom Nav */}
          <div style={{
            position:"absolute", bottom:0, left:0, right:0,
            padding:"10px 16px 24px",
            borderTop:`1px solid ${T.border}`,
            background:`linear-gradient(0deg, ${T.bg} 70%, transparent)`,
            display:"flex", justifyContent:"space-around", alignItems:"center"
          }}>
            {nav.map(n=>(
              <button key={n.id} onClick={()=>setScreen(n.id)} className="btn-press" style={{
                display:"flex", flexDirection:"column", alignItems:"center", gap:4,
                padding:"8px 16px", borderRadius:20, border:"none", cursor:"pointer",
                background: screen===n.id
                  ? `linear-gradient(135deg, ${T.violet}30, ${T.violet}18)`
                  : "transparent",
                transition:"all 0.25s ease"
              }}>
                <span style={{
                  fontSize:18,
                  filter: screen===n.id ? "none" : "grayscale(1) opacity(0.35)",
                  transition:"filter 0.2s"
                }}>{n.icon}</span>
                <span style={{
                  fontSize:9, fontWeight:700, letterSpacing:0.8,
                  color: screen===n.id ? T.lime : T.textDim,
                  transition:"color 0.2s"
                }}>
                  {n.label.toUpperCase()}
                </span>
              </button>
            ))}
          </div>
        </>)}
      </div>
    </div>
  );
}
