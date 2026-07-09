'use client';

import { useState } from 'react';

// Hardcoded credentials for demo
const DEMO_USERS = [
  { username: 'admin', password: 'admin123', name: 'Dr. Perera', role: 'Monitoring Officer' },
  { username: 'officer', password: 'officer123', name: 'Kamal Silva', role: 'Field Worker' },
];

export default function LoginPage({ onLogin }) {
  const [activeTab, setActiveTab] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    const user = DEMO_USERS.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      onLogin(user);
    } else {
      setError('Invalid credentials. Try admin / admin123');
    }
  };

  const handleSignup = (e) => {
    e.preventDefault();
    setError('');

    if (!signupName || !signupUsername || !signupPassword) {
      setError('Please fill in all fields');
      return;
    }

    // For demo, just switch to login tab with success message
    DEMO_USERS.push({
      username: signupUsername,
      password: signupPassword,
      name: signupName,
      role: 'Field Worker',
    });

    setSuccess('Account created! You can now sign in.');
    setActiveTab('login');
    setUsername(signupUsername);
    setPassword('');
    setSignupName('');
    setSignupUsername('');
    setSignupPassword('');
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">🌊</div>
          <h1>AquaGuard</h1>
        </div>
        <p className="login-subtitle">
          River garbage detection and drowning risk assessment system for Sri Lanka
        </p>

        <div className="login-tabs">
          <button
            className={`login-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => { setActiveTab('login'); setError(''); setSuccess(''); }}
          >
            Sign In
          </button>
          <button
            className={`login-tab ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => { setActiveTab('signup'); setError(''); setSuccess(''); }}
          >
            Sign Up
          </button>
        </div>

        {error && <div className="login-error">{error}</div>}
        {success && <div className="login-success">{success}</div>}

        {activeTab === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="login-btn">
              Sign In
            </button>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '16px', textAlign: 'center' }}>
              Demo credentials: admin / admin123
            </p>
          </form>
        ) : (
          <form onSubmit={handleSignup}>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter your full name"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="Choose a username"
                value={signupUsername}
                onChange={(e) => setSignupUsername(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Choose a password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="login-btn">
              Create Account
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
