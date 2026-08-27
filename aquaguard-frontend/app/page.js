'use client';
import { useState } from 'react';
import LoginPage from '../components/LoginPage';
import AppLayout from '../components/AppLayout';

export default function Home() {
  const [user, setUser] = useState(null);
  if (!user) return <LoginPage onLogin={setUser} />;
  return <AppLayout user={user} onLogout={() => setUser(null)} />;
}
