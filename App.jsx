import { useState, useEffect, useMemo } from "react";
// Import Supabase client builder
import { createClient } from "@supabase/supabase-js";

// ── constants ──────────────────────────────────────────────────────────────
const SERVICES = ["Steam","Epic Games","Microsoft Store","Battle.net","GOG","Ubisoft Connect","EA App","Rockstar","Other"];
const SVC_COLOR = {"Steam":"#1b9af5","Epic Games":"#4a90d9","Microsoft Store":"#0078d4","Battle.net":"#009ae4","GOG":"#8a2be2","Ubisoft Connect":"#0078ff","EA App":"#f04e23","Rockstar":"#fcaf17","Other":"#6b7280"};
const SVC_ICON  = {"Steam":"⚙","Epic Games":"◈","Microsoft Store":"⊞","Battle.net":"⚔","GOG":"☽","Ubisoft Connect":"◎","EA App":"◉","Rockstar":"★","Other":"◆"};
const EMPTY_FORM = { game:"", service:"Steam", svcUser:"", svcPass:"", mailSite:"", mailUser:"", mailPass:"" };

// ── RENDER SUPABASE DATABASE INTEGRATION ────────────────────────────────────
const SUPABASE_URL = (typeof process !== 'undefined' && process.env?.SUPABASE_URL) || import.meta.env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = (typeof process !== 'undefined' && process.env?.SUPABASE_ANON_KEY) || import.meta.env?.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const GLOBAL_DB_ID = "gamevault_master_data";

// ── tiny hash (not crypto, just obfuscation for demo) ──────────────────────
function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}
function gid() { 
  return Math.random().toString(36).slice(2,9) + Date.now().toString(36);
}

// ── Supabase Database Helpers ──────────────────────────────────────────────
async function fetchCloudDatabase() {
  try {
    const { data, error } = await supabase
      .from("vault_system")
      .select("data_blob")
      .eq("id", GLOBAL_DB_ID)
      .maybeSingle();

    if (error) throw error;
    if (data && data.data_blob) {
      return data.data_blob;
    }
  } catch (e) {
    console.error("Error reading data from Supabase cloud database:", e);
  }
  return { users: {}, accs: {} };
}

async function saveCloudDatabase(currentDbState) {
  try {
    const { error } = await supabase
      .from("vault_system")
      .upsert({ id: GLOBAL_DB_ID, data_blob: currentDbState });

    if (error) throw error;
  } catch (e) {
    console.error("Error writing data to Supabase cloud database:", e);
  }
}

// ── small UI atoms ──────────────────────────────────────────────────────────
const C = {
  bg:"#0a0a0f", surf:"#111118", surf2:"#18181f", surf3:"#1e1e28",
  b1:"#2a2a38", b2:"#353545", acc:"#e8ff5a", acc2:"#c8e000",
  tx:"#f0f0f8", tx2:"#9090a8", tx3:"#5a5a70",
  danger:"#ff4458", ok:"#3ddc84"
};

function useHover() {
  const [h,setH] = useState(false);
  return [h, { onMouseEnter:()=>setH(true), onMouseLeave:()=>setH(false) }];
}

function Btn({ children, onClick, variant="primary", full, sm, style={}, type="button", disabled }) {
  const [h, hov] = useHover();
  const base = { display:"inline-flex",alignItems:"center",justifyContent:"center",gap:7,fontFamily:"'Syne',sans-serif",fontWeight:700,cursor:disabled?"not-allowed":"pointer",border:"none",transition:"all .15s",letterSpacing:.2,opacity:disabled?.6:1,borderRadius:8 };
  const size = sm ? { padding:"6px 12px",fontSize:12 } : { padding:"11px 20px",fontSize:13 };
  const styles = {
    primary: { background:h?C.acc2:C.acc, color:"#000", transform:h&&!disabled?"translateY(-1px)":"none" },
    ghost:   { background:h?C.surf2:"transparent", color:h?C.tx:C.tx2, border:`1px solid ${C.b1}` },
    danger:  { background:h?"rgba(255,68,88,.22)":"rgba(255,68,88,.1)", color:C.danger, border:"1px solid rgba(255,68,88,.22)" },
  };
  return <button type={type} onClick={!disabled?onClick:undefined} disabled={disabled} style={{...base,...size,...styles[variant],...(full?{width:"100%"}:{}),...style}} {...hov}>{children}</button>;
}

function Input({ label, type="text", value, onChange, placeholder, autoFocus, autoComplete, mono }) {
  const [f, setF] = useState(false);
  return (
    <div style={{marginBottom:14}}>
      {label && <div style={{fontSize:11,fontWeight:700,color:C.tx2,letterSpacing:.6,textTransform:"uppercase",marginBottom:6,fontFamily:"'Syne',sans-serif"}}>{label}</div>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus} autoComplete={autoComplete}
        onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{width:"100%",background:f?C.surf3:C.surf2,border:`1px solid ${f?C.acc:C.b1}`,borderRadius:8,padding:"11px 13px",color:C.tx,fontFamily:mono||type==="password"?"'JetBrains Mono',monospace":"'Syne',sans-serif",fontSize:type==="password"?13:14,letterSpacing:type==="password"?2:0,outline:"none",transition:"border-color .2s,background .2s",boxSizing:"border-box"}}
      />
    </div>
  );
}

function Sel({ label, value, onChange, options }) {
  const [f, setF] = useState(false);
  return (
    <div style={{marginBottom:14}}>
      {label && <div style={{fontSize:11,fontWeight:700,color:C.tx2,letterSpacing:.6,textTransform:"uppercase",marginBottom:6,fontFamily:"'Syne',sans-serif"}}>{label}</div>}
      <select value={value} onChange={onChange} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{width:"100%",background:f?C.surf3:C.surf2,border:`1px solid ${f?C.acc:C.b1}`,borderRadius:8,padding:"11px 13px",color:C.tx,fontFamily:"'Syne',sans-serif",fontSize:14,outline:"none",appearance:"none",cursor:"pointer",boxSizing:"border-box"}}>
        {options.map(o=><option key={o} value={o} style={{background:C.surf2}}>{o}</option>)}
      </select>
    </div>
  );
}

function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, []);
  const col = type==="ok" ? C.ok : C.danger;
  return (
    <div style={{position:"fixed",bottom:22,right:22,zIndex:9999,background:C.surf2,border:`1px solid ${C.b2}`,borderLeft:`3px solid ${col}`,borderRadius:12,padding:"13px 18px",display:"flex",alignItems:"center",gap:9,fontSize:13,fontWeight:600,fontFamily:"'Syne',sans-serif",color:C.tx,boxShadow:"0 8px 28px rgba(0,0,0,.55)",animation:"gvFadeUp .3s ease"}}>
      <span style={{color:col}}>{type==="ok"?"✓":"✕"}</span>{msg}
    </div>
  );
}

function hl(text, q) {
  if (!q||!text) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i===-1) return text;
  return <>{text.slice(0,i)}<mark style={{background:"rgba(232,255,90,.2)",color:C.acc,borderRadius:2,padding:"0 2px"}}>{text.slice(i,i+q.length)}</mark>{text.slice(i+q.length)}</>;
}

// ── NavItem ─────────────────────────────────────────────────────────────────
function NavItem({ icon, label, count, active, onClick }) {
  const [h, hov] = useHover();
  return (
    <div onClick={onClick} {...hov} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 10px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600,marginBottom:2,border:`1px solid ${active?"rgba(232,255,90,.15)":"transparent"}`,background:active?"rgba(232,255,90,.1)":h?C.surf2:"transparent",color:active?C.acc:h?C.tx:C.tx2,transition:"all .15s"}}>
      <span style={{fontSize:13,width:17,textAlign:"center"}}>{icon}</span>
      <span style={{flex:1}}>{label}</span>
      <span style={{background:active?"rgba(232,255,90,.18)":C.surf3,color:active?C.acc:C.tx2,fontSize:10,fontWeight:700,padding:"2px 6px",borderRadius:20,fontFamily:"'JetBrains Mono',monospace"}}>{count}</span>
    </div>
  );
}

// ── AccCard ─────────────────────────────────────────────────────────────────
function AccCard({ acc, q, showPass, onToggle, onEdit, onDel }) {
  const [h, hov] = useHover();
  const color = SVC_COLOR[acc.service]||C.tx3;
  return (
    <div {...hov} style={{background:C.surf,border:`1px solid ${h?C.b2:C.b1}`,borderRadius:12,overflow:"hidden",transform:h?"translateY(-2px)":"none",boxShadow:h?"0 8px 28px rgba(0,0,0,.4)":"none",transition:"all .2s",animation:"gvFadeUp .3s ease"}}>
      <div style={{padding:"14px 16px 11px",display:"flex",alignItems:"flex-start",gap:11,borderBottom:`1px solid ${C.b1}`}}>
        <div style={{width:36,height:36,borderRadius:9,background:`${color}22`,color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{SVC_ICON[acc.service]||"◆"}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{hl(acc.game,q)}</div>
          <div style={{fontSize:11,color:C.tx2,marginTop:3,display:"flex",alignItems:"center",gap:5,fontWeight:600}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:color,flexShrink:0}}/>
            {hl(acc.service,q)}
          </div>
        </div>
        <div style={{display:"flex",gap:5}}>
          <IBtn onClick={onEdit}>✎</IBtn>
          <IBtn onClick={onDel} danger>✕</IBtn>
        </div>
      </div>
      <div style={{padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
        <CRow label="User">{hl(acc.svcUser,q)}</CRow>
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <span style={{fontSize:10,color:C.tx3,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",width:44,flexShrink:0}}>Pass</span>
          <span style={{fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:showPass?C.tx:C.tx3,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",letterSpacing:showPass?0:3}}>
            {showPass ? acc.svcPass : "••••••••"}
          </span>
          <button onClick={onToggle} style={{background:"none",border:"none",cursor:"pointer",color:C.tx3,fontSize:10,padding:"2px 5px",borderRadius:4,fontFamily:"'JetBrains Mono',monospace",transition:"color .15s"}}>{showPass?"hide":"show"}</button>
        </div>
      </div>
      {acc.mailUser && (
        <div style={{padding:"9px 16px",borderTop:`1px solid ${C.b1}`,background:"rgba(255,255,255,.015)",display:"flex",alignItems:"center",gap:9}}>
          <span style={{fontSize:12,color:C.tx3}}>✉</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:10,color:C.tx3,fontWeight:600}}>{acc.mailSite||"Mail"}</div>
            <div style={{fontSize:11,color:C.tx2,fontFamily:"'JetBrains Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{hl(acc.mailUser,q)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
function CRow({ label, children }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:9}}>
      <span style={{fontSize:10,color:C.tx3,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",width:44,flexShrink:0}}>{label}</span>
      <span style={{fontSize:12,fontFamily:"'JetBrains Mono',monospace",color:C.tx2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{children}</span>
    </div>
  );
}
function IBtn({ children, onClick, danger }) {
  const [h, hov] = useHover();
  return (
    <button onClick={onClick} {...hov} style={{background:h?(danger?"rgba(255,68,88,.22)":C.surf3):(danger?"rgba(255,68,88,.08)":C.surf2),border:`1px solid ${danger?"rgba(255,68,88,.22)":C.b1}`,borderRadius:7,width:27,height:27,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:danger?C.danger:C.tx2,fontSize:12,transition:"all .15s"}}>
      {children}
    </button>
  );
}

// ── GLOBAL STYLES injected once ─────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Syne',sans-serif;background:#0a0a0f;color:#f0f0f8;min-height:100vh}
input::placeholder,textarea::placeholder{color:#5a5a70}
select{appearance:none}
::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:#353545;border-radius:3px}
@keyframes gvFadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes gvFadeIn{from{opacity:0}to{opacity:1}}
@keyframes gvScale{from{opacity:0;transform:scale(.94) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
`;

// ════════════════════════════════════════════════════════════════════════════
//  ROOT
// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [page,    setPage]    = useState("login"); // login | register | app
  const [loading, setLoading] = useState(false);
  const [authU,   setAuthU]   = useState("");
  const [authP,   setAuthP]   = useState("");
  const [authErr, setAuthErr] = useState("");
  const [session, setSession] = useState(null); // { uid, username }
  const [accs,    setAccs]    = useState([]);
  const [filter,  setFilter]  = useState("all");
  const [search,  setSearch]  = useState("");
  const [srchFoc, setSrchFoc] = useState(false);
  const [modal,   setModal]   = useState(false);
  const [editId,  setEditId]  = useState(null);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [rev,     setRev]     = useState({});
  const [toast,   setToast]   = useState(null);
  
  const [dbState, setDbState] = useState({ users: {}, accs: {} });

  // Load database dynamically from Supabase on mount
  useEffect(() => {
    async function initDB() {
      const cloudData = await fetchCloudDatabase();
      setDbState(cloudData);
    }
    initDB();
  }, []);

  const notify = (msg, type="ok") => setToast({ msg, type, k: gid() });

  // ── AUTH ──────────────────────────────────────────────────────────────────
  async function doAuth(e) {
    e.preventDefault();
    const u = authU.trim();
    const p = authP;
    const key = u.toLowerCase();
    setAuthErr("");

    if (!u || !p) { 
      setAuthErr("Fill in both fields."); 
      return;
    }

    setLoading(true);

    try {
      const freshDb = await fetchCloudDatabase();

      if (page === "register") {
        if (u.length < 3)  { setAuthErr("Username needs 3+ characters."); return; }
        if (p.length < 6)  { setAuthErr("Password needs 6+ characters."); return; }
        if (freshDb.users[key]){ setAuthErr("Username already taken."); return; }
        
        const id = gid();
        const updatedDB = {
          users: {
            ...freshDb.users,
            [key]: { username: u, hash: hash(p), uid: id }
          },
          accs: {
            ...freshDb.accs,
            [id]: []
          }
        };

        await saveCloudDatabase(updatedDB);
        setDbState(updatedDB);
        setSession({ uid: id, username: u });
        setAccs([]);
        setPage("app");
        notify(`Welcome, ${u}!`);
      } else {
        const rec = freshDb.users[key];
        if (!rec || rec.hash !== hash(p)) { 
          setAuthErr("Wrong username or password."); 
          return;
        }
        setDbState(freshDb);
        setSession({ uid: rec.uid, username: rec.username });
        setAccs(freshDb.accs[rec.uid] || []);
        setPage("app");
        notify(`Welcome back, ${rec.username}!`);
      }
      setAuthU(""); setAuthP("");
    } catch (err) {
      setAuthErr("Cloud authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setSession(null); setAccs([]); setPage("login");
    setSearch(""); setFilter("all"); setRev({});
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  async function saveAcc() {
    if (!form.game.trim()||!form.svcUser.trim()||!form.svcPass.trim()) {
      notify("Game, username & password are required.", "err");
      return;
    }
    
    let next;
    if (editId) {
      next = accs.map(a => a.id===editId ? {...form,id:editId} : a);
      notify("Account updated!");
    } else {
      next = [...accs, {...form, id:gid()}];
      notify("Account added!");
    }
    
    setAccs(next);

    const currentFreshDb = await fetchCloudDatabase();
    const updatedDB = {
      ...currentFreshDb,
      accs: {
        ...currentFreshDb.accs,
        [session.uid]: next
      }
    };

    await saveCloudDatabase(updatedDB);
    setDbState(updatedDB);
    setModal(false); setEditId(null); setForm(EMPTY_FORM);
  }

  async function delAcc(id) {
    const next = accs.filter(a=>a.id!==id);
    setAccs(next);

    const currentFreshDb = await fetchCloudDatabase();
    const updatedDB = {
      ...currentFreshDb,
      accs: {
        ...currentFreshDb.accs,
        [session.uid]: next
      }
    };

    await saveCloudDatabase(updatedDB);
    setDbState(updatedDB);
    notify("Deleted.");
  }

  function openEdit(acc){ setForm({...acc}); setEditId(acc.id); setModal(true); }
  function openAdd()    { setForm(EMPTY_FORM); setEditId(null); setModal(true); }
  const f = k => v => setForm(p=>({...p,[k]:v}));

  // ── DERIVED ───────────────────────────────────────────────────────────────
  const filtered = useMemo(()=>{
    let list = accs;
    if (filter!=="all") list=list.filter(a=>a.service===filter);
    if (search.trim()){
      const q=search.toLowerCase();
      list=list.filter(a=>[a.game,a.svcUser,a.mailUser,a.service,a.mailSite].some(v=>v?.toLowerCase().includes(q)));
    }
    return list;
  },[accs,search,filter]);

  const grouped = useMemo(()=>{
    const m={};
    filtered.forEach(a=>{(m[a.game||"Unknown"]??=[]).push(a);});
    return m;
  },[filtered]);

  const svcCnt = useMemo(()=>{
    const m={};
    accs.forEach(a=>{m[a.service]=(m[a.service]||0)+1;});
    return m;
  },[accs]);

  const usedSvcs = Object.keys(svcCnt).sort();

  // ════════════════════════════
  //  AUTH SCREEN
  // ════════════════════════════
  if (page !== "app") return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",width:700,height:700,borderRadius:"50%",background:"radial-gradient(circle,rgba(232,255,90,.07) 0%,transparent 65%)",top:-180,left:-180,pointerEvents:"none"}}/>
        <div style={{position:"absolute",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(61,220,132,.04) 0%,transparent 65%)",bottom:-80,right:-80,pointerEvents:"none"}}/>

        <div style={{width:420,background:C.surf,border:`1px solid ${C.b1}`,borderRadius:20,padding:44,position:"relative",zIndex:1,animation:"gvFadeUp .4s ease"}}>
          {/* logo */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:36}}>
            <div style={{width:38,height:38,background:C.acc,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,color:"#000",fontWeight:900}}>V</div>
            <div style={{fontSize:20,fontWeight:800,letterSpacing:-.5}}>Game<span style={{color:C.acc}}>Vault</span></div>
          </div>

          <div style={{fontSize:26,fontWeight:800,marginBottom:6,letterSpacing:-.5}}>
            {page==="login" ? "Sign in" : "Create account"}
          </div>
          <div style={{color:C.tx2,fontSize:14,marginBottom:32}}>
            {page==="login" ? "Access your private account vault." : "Your own private vault — just for you."}
          </div>

          <form onSubmit={doAuth} noValidate>
            <Input label="Username" value={authU} onChange={e=>setAuthU(e.target.value)} placeholder="your_username" autoFocus autoComplete="username"/>
            <Input label="Password" type="password" value={authP} onChange={e=>setAuthP(e.target.value)} placeholder="••••••••" autoComplete={page==="login"?"current-password":"new-password"}/>
            {authErr && <div style={{color:C.danger,fontSize:12,marginBottom:12,display:"flex",alignItems:"center",gap:6}}>⚠ {authErr}</div>}
            <Btn type="submit" full disabled={loading} style={{marginTop:8}}>
              {loading ? "Please wait…"
