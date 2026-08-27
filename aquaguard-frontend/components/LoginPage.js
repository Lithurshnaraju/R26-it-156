'use client';
import { useState } from 'react';

const USERS = [
  { username:'admin', password:'admin123', name:'Dr. Perera', role:'Monitoring Officer' },
  { username:'officer', password:'officer123', name:'Kamal Silva', role:'Field Worker' },
];

export default function LoginPage({ onLogin }) {
  const [tab, setTab] = useState('login');
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [sn, setSn] = useState('');
  const [su, setSu] = useState('');
  const [sp, setSp] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');

  const login = e => {
    e.preventDefault(); setErr('');
    const user = USERS.find(x => x.username===u && x.password===p);
    if (user) onLogin(user);
    else setErr('Invalid credentials. Try admin / admin123');
  };

  const signup = e => {
    e.preventDefault(); setErr('');
    if (!sn||!su||!sp) { setErr('Fill all fields'); return; }
    USERS.push({ username:su, password:sp, name:sn, role:'Field Worker' });
    setOk('Account created! Sign in now.');
    setTab('login'); setU(su); setP('');
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-icon">🌊</div>
          <h1>AquaGuard</h1>
        </div>
        <p className="login-sub">River garbage detection and pollution monitoring system for Sri Lanka</p>
        <div className="login-tabs">
          <button className={`login-tab ${tab==='login'?'active':''}`} onClick={()=>{setTab('login');setErr('');setOk('')}}>Sign In</button>
          <button className={`login-tab ${tab==='signup'?'active':''}`} onClick={()=>{setTab('signup');setErr('');setOk('')}}>Sign Up</button>
        </div>
        {err && <div className="msg-err">{err}</div>}
        {ok && <div className="msg-ok">{ok}</div>}
        {tab==='login' ? (
          <form onSubmit={login}>
            <div className="fg"><label className="fl">Username</label><input className="fi" placeholder="Enter username" value={u} onChange={e=>setU(e.target.value)}/></div>
            <div className="fg"><label className="fl">Password</label><input className="fi" type="password" placeholder="Enter password" value={p} onChange={e=>setP(e.target.value)}/></div>
            <button type="submit" className="btn-primary">Sign In</button>
            <p style={{fontSize:'11px',color:'var(--text-3)',marginTop:'14px',textAlign:'center'}}>Demo: admin / admin123</p>
          </form>
        ) : (
          <form onSubmit={signup}>
            <div className="fg"><label className="fl">Full name</label><input className="fi" placeholder="Your name" value={sn} onChange={e=>setSn(e.target.value)}/></div>
            <div className="fg"><label className="fl">Username</label><input className="fi" placeholder="Choose username" value={su} onChange={e=>setSu(e.target.value)}/></div>
            <div className="fg"><label className="fl">Password</label><input className="fi" type="password" placeholder="Choose password" value={sp} onChange={e=>setSp(e.target.value)}/></div>
            <button type="submit" className="btn-primary">Create Account</button>
          </form>
        )}
      </div>
    </div>
  );
}
