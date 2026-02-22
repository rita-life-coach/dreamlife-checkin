import { useState, useEffect } from "react";

// ⚠️ 部署 Apps Script 後把網址貼在這裡
const API_URL = "https://script.google.com/macros/s/AKfycbxfzlCG_C2Q9_b912tXkE55CbGG7aGE2GFC7IULtyNq3Uz8Fo3w61cPOMDDs1iDotZM/exec";

// ── 週次工具 ────────────────────────────────────
function getWeekNum(d) {
  const u = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = u.getUTCDay() || 7;
  u.setUTCDate(u.getUTCDate() + 4 - day);
  const y1 = new Date(Date.UTC(u.getUTCFullYear(), 0, 1));
  return Math.ceil((((u - y1) / 86400000) + 1) / 7);
}
function weekKey(d = new Date()) {
  return `${d.getFullYear()}-W${String(getWeekNum(d)).padStart(2, "0")}`;
}
function weekLabel(wk) {
  const [, w] = wk.split("-W");
  return `第 ${parseInt(w)} 週`;
}

const CAT_COLOR = { 飲食: "#f97316", 訓練: "#22d3ee", 恢復: "#a3e635", 習慣: "#c084fc" };

// ── API helpers ─────────────────────────────────
async function apiGet(params) {
  const url = new URL(API_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  return res.json();
}
async function apiPost(body) {
  const res = await fetch(API_URL, { method: "POST", body: JSON.stringify(body) });
  return res.json();
}

// ── App ─────────────────────────────────────────
export default function StudentApp() {
  const [view, setView]       = useState("checkin");
  const [tasks, setTasks]     = useState([]);
  const [checkins, setCheckins] = useState({});
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [justDone, setJustDone] = useState(null);

  const week = weekKey();

  // 初始載入
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [t, c, m] = await Promise.all([
        apiGet({ action: "getTasks",    week }),
        apiGet({ action: "getCheckins", week }),
        apiGet({ action: "getMessage"       }),
      ]);
      setTasks(t.tasks || []);
      setCheckins(c.checkins || {});
      setMessage(m.message || "");
      setLoading(false);
    })();
  }, []);

  // 切到歷史時才載入
  useEffect(() => {
    if (view !== "history") return;
    apiGet({ action: "getHistory" }).then(r => setHistory(r.history || []));
  }, [view]);

  const toggle = async (taskId) => {
    const next = !checkins[taskId];
    setCheckins(p => ({ ...p, [taskId]: next }));
    setJustDone(taskId);
    setTimeout(() => setJustDone(null), 500);
    await apiPost({ action: "saveCheckin", week, taskId, done: next });
  };

  const done  = tasks.filter(t => checkins[t.id]).length;
  const rate  = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const R = 54, C = 64, circ = 2 * Math.PI * R;

  // ── Render ──────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:"#080808", color:"#f5f5f5",
      fontFamily:"'DM Sans','Noto Sans TC',sans-serif", paddingBottom:60 }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet"/>

      {/* Header */}
      <div style={{ padding:"32px 24px 0", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontSize:10, letterSpacing:4, color:"#333", fontWeight:700, marginBottom:6 }}>DREAM LIFE</div>
          <div style={{ fontSize:26, fontWeight:800, lineHeight:1.1 }}>每週打卡<br/>任務</div>
        </div>
        <div style={{ textAlign:"right", paddingTop:4 }}>
          <div style={{ fontSize:11, color:"#333", letterSpacing:2 }}>{weekLabel(week)}</div>
          <div style={{ fontSize:11, color:"#222", marginTop:3 }}>{new Date().getFullYear()}</div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ display:"flex", gap:6, padding:"20px 24px 0" }}>
        {[["checkin","打卡"],["history","歷史"]].map(([v,label]) => (
          <button key={v} onClick={() => setView(v)} style={{
            padding:"7px 18px", borderRadius:999, border:"none", cursor:"pointer",
            background: view===v ? "#f5f5f5" : "rgba(255,255,255,0.06)",
            color: view===v ? "#080808" : "#666",
            fontWeight:700, fontSize:12, letterSpacing:0.5,
          }}>{label}</button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign:"center", color:"#333", fontSize:13, padding:"60px 0" }}>載入中...</div>
      )}

      {!loading && view === "checkin" && (
        <>
          {/* 進度圓環 */}
          <div style={{ display:"flex", alignItems:"center", gap:20, padding:"28px 24px 16px" }}>
            <svg width={C*2} height={C*2} style={{ transform:"rotate(-90deg)", flexShrink:0 }}>
              <circle cx={C} cy={C} r={R} fill="none" stroke="#161616" strokeWidth={8}/>
              <circle cx={C} cy={C} r={R} fill="none"
                stroke={rate>=80?"#a3e635":rate>=50?"#22d3ee":"#f97316"}
                strokeWidth={8} strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ - (rate/100)*circ}
                style={{ transition:"stroke-dashoffset 0.7s cubic-bezier(0.34,1.56,0.64,1), stroke 0.4s" }}
              />
            </svg>
            <div>
              <div style={{ fontSize:52, fontWeight:800, lineHeight:1,
                color:rate>=80?"#a3e635":rate>=50?"#22d3ee":"#f97316" }}>
                {rate}<span style={{ fontSize:20, color:"#444", fontWeight:500 }}>%</span>
              </div>
              <div style={{ fontSize:13, color:"#444", marginTop:6 }}>完成 {done} / {tasks.length} 項</div>
            </div>
            {rate===100 && <div style={{ marginLeft:"auto", fontSize:34 }}>🎉</div>}
          </div>

          {/* 教練留言 */}
          {message && (
            <div style={{ margin:"0 24px 16px", padding:"14px 18px",
              background:"rgba(34,211,238,0.05)", border:"1px solid rgba(34,211,238,0.15)", borderRadius:14 }}>
              <div style={{ fontSize:10, letterSpacing:3, color:"#22d3ee", marginBottom:7, fontWeight:700 }}>教練留言</div>
              <div style={{ fontSize:14, color:"#bbb", lineHeight:1.7 }}>{message}</div>
            </div>
          )}

          {/* 任務清單 */}
          <div style={{ padding:"0 24px" }}>
            {tasks.map(task => {
              const isDone = !!checkins[task.id];
              const isNew  = justDone === task.id;
              return (
                <div key={task.id} onClick={() => toggle(task.id)} style={{
                  display:"flex", alignItems:"center", gap:14, padding:"15px 16px",
                  borderRadius:14, marginBottom:8, cursor:"pointer",
                  background: isDone ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
                  border: isDone ? "1px solid rgba(255,255,255,0.09)" : "1px solid rgba(255,255,255,0.04)",
                  transform: isNew ? "scale(0.97)" : "scale(1)",
                  transition:"all 0.2s ease",
                }}>
                  {/* Checkbox */}
                  <div style={{
                    width:24, height:24, borderRadius:7, flexShrink:0,
                    background: isDone ? (CAT_COLOR[task.category]||"#fff") : "transparent",
                    border: isDone ? "none" : `2px solid ${CAT_COLOR[task.category]||"#444"}55`,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    transition:"all 0.2s",
                  }}>
                    {isDone && <span style={{ fontSize:12, color:"#000", fontWeight:800 }}>✓</span>}
                  </div>
                  <span style={{ fontSize:18 }}>{task.emoji}</span>
                  <div style={{ flex:1, fontSize:14, fontWeight:500, lineHeight:1.4,
                    color: isDone?"#555":"#e5e5e5",
                    textDecoration: isDone?"line-through":"none" }}>
                    {task.text}
                  </div>
                  <div style={{ fontSize:10, padding:"3px 9px", borderRadius:999, flexShrink:0,
                    background:`${CAT_COLOR[task.category]||"#555"}18`,
                    color: CAT_COLOR[task.category]||"#888", fontWeight:600, letterSpacing:0.5 }}>
                    {task.category}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loading && view === "history" && (
        <div style={{ padding:"20px 24px 0" }}>
          <div style={{ fontSize:10, letterSpacing:3, color:"#333", marginBottom:18, fontWeight:700 }}>HISTORY</div>
          {history.length === 0
            ? <div style={{ color:"#333", fontSize:13, textAlign:"center", padding:"50px 0" }}>還沒有打卡紀錄</div>
            : [...history].reverse().map(h => (
              <div key={h.week} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 0", borderBottom:"1px solid #111" }}>
                <div style={{ width:72 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#ddd" }}>{weekLabel(h.week)}</div>
                  <div style={{ fontSize:10, color:"#333", marginTop:2 }}>{h.week}</div>
                </div>
                <div style={{ flex:1, height:5, background:"#161616", borderRadius:999, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${h.rate}%`, borderRadius:999,
                    background: h.rate>=80?"#a3e635":h.rate>=50?"#22d3ee":"#f97316" }}/>
                </div>
                <div style={{ fontSize:16, fontWeight:800, minWidth:44, textAlign:"right",
                  color: h.rate>=80?"#a3e635":h.rate>=50?"#22d3ee":"#f97316" }}>
                  {h.rate}%
                </div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}
