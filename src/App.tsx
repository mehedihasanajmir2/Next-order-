import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User, updateProfile } from 'firebase/auth';
import { auth } from './firebase';
import AuthScreens from './components/AuthScreens';
import Dashboard from './components/Dashboard';
import { UserSession } from './types';
import { motion, AnimatePresence } from 'motion/react';
import NextOrderLogo from './components/NextOrderLogo';
import { Sparkles, Building2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [splashLoading, setSplashLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [customDisplayName, setCustomDisplayName] = useState<string | null>(() => {
    return localStorage.getItem('nextorder_custom_shop_name');
  });

  // Splash timeout to ensure minimum 2-second loader experience as requested by user
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
      // Automatically disable demo mode if real login is detected
      if (firebaseUser) {
        setDemoMode(false);
        setCustomDisplayName(firebaseUser.displayName || null);
      } else {
        const savedDemoName = localStorage.getItem('nextorder_custom_shop_name');
        setCustomDisplayName(savedDemoName || null);
      }
    });

    return () => unsubscribe();
  }, []);

  if (authLoading || splashLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans tracking-tight text-slate-800">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <div className="animate-pulse mb-2">
            <NextOrderLogo size={54} />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-bold font-mono tracking-widest uppercase">Loading Business Workspace...</p>
          </div>
          <div className="w-20 h-1 bg-slate-200 rounded-full mt-2 overflow-hidden relative">
            <div className="absolute left-0 top-0 bottom-0 bg-indigo-600 rounded-full w-1/3 animate-infinite" style={{
              animation: 'loadingProgress 1.4s ease-in-out infinite'
            }} />
          </div>
        </motion.div>
        
        {/* Progress animation keyframe injection */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes loadingProgress {
            0% { left: -30%; width: 30%; }
            50% { left: 40%; width: 60%; }
            100% { left: 100%; width: 30%; }
          }
        `}} />
      </div>
    );
  }

  // Session construction logic
  const getSession = (): UserSession => {
    if (user) {
      return {
        uid: user.uid,
        email: user.email,
        displayName: customDisplayName || user.displayName || 'Honored Merchant',
        isDemo: false
      };
    }
    return {
      uid: 'demo',
      email: 'guest@nextorder.live',
      displayName: customDisplayName || 'Demo Merchant',
      isDemo: true
    };
  };

  const handleUpdateShopName = async (newName: string) => {
    if (user) {
      await updateProfile(user, { displayName: newName });
    } else {
      localStorage.setItem('nextorder_custom_shop_name', newName);
    }
    setCustomDisplayName(newName);
  };

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">
      <AnimatePresence mode="wait">
        
        {/* Real Authenticated Dashboard or Activated NextOrder demo mode */}
        {(user || demoMode) ? (
          <motion.div
            key="dashboard-view"
            initial={{ opacity: 0, scale: 1.01 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.35, ease: 'easeInOut' }}
          >
            <Dashboard 
              userSession={getSession()} 
              onExitDemo={() => setDemoMode(false)} 
              onUpdateShopName={handleUpdateShopName}
            />
          </motion.div>
        ) : (
          /* Sign Up and SignIn Authentication screens */
          <motion.div
            key="auth-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <AuthScreens onEnterDemo={() => setDemoMode(true)} />
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
