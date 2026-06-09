import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { auth } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import NextOrderLogo from './NextOrderLogo';
import { 
  Building2, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Sparkles,
  Phone,
  AlertCircle
} from 'lucide-react';

interface AuthScreensProps {
  onEnterDemo: () => void;
}

export default function AuthScreens({ onEnterDemo }: AuthScreensProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both your email address and password.');
      return;
    }
    if (!isLogin && !businessName) {
      setError('Please enter your business or shop name.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        // Sign In
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Sign Up
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Set business name as displayName
        if (userCredential.user) {
          await updateProfile(userCredential.user, {
            displayName: businessName,
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      let errorMsg = 'An error occurred. Please try again.';
      if (err.code === 'auth/email-already-in-use') {
        errorMsg = 'This email is already registered. Please login instead.';
      } else if (err.code === 'auth/weak-password') {
        errorMsg = 'Password must be at least 6 characters.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        errorMsg = 'Incorrect email or password.';
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMsg = 'Email/Password sign-up is not enabled. Please enable it in Firebase Console.';
      } else {
        errorMsg = err.message || errorMsg;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800 selection:bg-indigo-500 selection:text-white">
      
      {/* Visual Left Info Pane */}
      <div className="w-full md:w-5/12 bg-indigo-950 text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden md:min-h-screen">
        
        {/* Subtle geometric background glowing bubbles */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-800 rounded-full blur-3xl opacity-30 pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-700 rounded-full blur-3xl opacity-30 pointer-events-none" />

        {/* Branding Title */}
        <div className="relative z-10">
          <NextOrderLogo size={52} lightText={true} />
        </div>

        {/* Hero Features List */}
        <div className="relative z-10 my-12 md:my-auto space-y-8">
          <div>
            <h2 className="text-2xl md:text-3.5xl font-vincendo font-bold leading-tight tracking-wide text-indigo-100">
              Your Entire Order Flow <br />
              <span className="text-indigo-400 font-vincendo">In One Elegant Place</span>
            </h2>
            <p className="mt-4 text-slate-300 text-sm md:text-base leading-relaxed">
              NextOrder is a beautifully crafted tracking platform designed to manage your store, customer details, exact product sizes, colors, and order processing seamlessly.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-900/80 border border-indigo-700 flex items-center justify-center text-xs font-bold text-indigo-300 mt-0.5">1</span>
              <div>
                <h4 className="font-semibold text-slate-200">Secure Vault & Storage Isolation</h4>
                <p className="text-xs text-slate-400 mt-1">Each store has its own dedicated Firebase NextOrder setup. Your data is strictly yours and securely protected.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-900/80 border border-indigo-700 flex items-center justify-center text-xs font-bold text-indigo-300 mt-0.5">2</span>
              <div>
                <h4 className="font-semibold text-slate-200">Granular Attributes Tracker</h4>
                <p className="text-xs text-slate-400 mt-1">Keep track of the selected sizes, color configurations, product unit values, and custom delivery codes effortlessly.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-900/80 border border-indigo-700 flex items-center justify-center text-xs font-bold text-indigo-300 mt-0.5">3</span>
              <div>
                <h4 className="font-semibold text-slate-200">Zero-Config NextOrder Preview</h4>
                <p className="text-xs text-slate-400 mt-1">Instantly run and test the complete suite in live NextOrder mode without any prior account signup.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-slate-400 text-xs flex justify-between items-center border-t border-indigo-900/60 pt-4">
          <span>&copy; {new Date().getFullYear()} NextOrder Software</span>
          <span className="font-mono text-[10px] tracking-wider text-indigo-400/80 uppercase">v1.2 Secure Real-time</span>
        </div>
      </div>

      {/* Forms and Interaction Right Pane */}
      <div className="w-full md:w-7/12 flex items-center justify-center p-6 md:p-12 lg:p-16 bg-slate-50">
        <div className="w-full max-w-md">
          
          {/* Main Form container with entrance animation */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 shadow-2xl shadow-indigo-900/5 border border-slate-100"
          >
            
            {/* Header switcher tabs */}
            <div className="flex bg-slate-100 p-1.5 rounded-xl mb-8">
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(null); }}
                className={`flex-1 py-2.5 text-center text-sm font-semibold rounded-lg transition-all ${
                  isLogin 
                    ? 'bg-white text-indigo-950 shadow-md shadow-indigo-950/5' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(null); }}
                className={`flex-1 py-2.5 text-center text-sm font-semibold rounded-lg transition-all ${
                  !isLogin 
                    ? 'bg-white text-indigo-950 shadow-md shadow-indigo-950/5' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Message */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-xl mb-6 text-xs flex gap-2.5 items-start"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-semibold">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Introductory Text */}
            <div className="mb-6">
              <h3 className="text-xl font-vincendo tracking-wide font-black text-indigo-950">
                {isLogin ? 'Sign In' : 'Get Started'}
              </h3>
              <p className="text-xs text-slate-500 mt-1.5">
                {isLogin 
                  ? 'Access your unified orders workspace dashboard.' 
                  : 'Start cataloging and status-tracking with your store parameters today.'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              
              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600 block">Business / Shop Name</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g., Elegance Fashion BD"
                      className="w-full text-sm pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500/80 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-800 font-medium"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 block">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@business.com"
                    className="w-full text-sm pl-11 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500/80 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-800 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 block">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-sm pl-11 pr-11 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 focus:border-indigo-500/80 rounded-xl focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-800 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1 pointer-events-auto"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold text-xs md:text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/10 active:scale-[0.99] transition-all uppercase tracking-wider"
              >
                {loading ? 'Processing Workspace...' : (isLogin ? 'Login to Dashboard' : 'Register Shop Account')}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

          </motion.div>

          {/* Bypass view for visitors */}
          <div className="mt-8 text-center bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <span className="text-xs text-slate-500 font-medium">Just want to explore the application?</span>
            <button
              type="button"
              onClick={onEnterDemo}
              className="mt-3.5 w-full bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold text-xs md:text-sm py-3 px-5 rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] transition-all uppercase tracking-wider"
            >
              <Sparkles className="w-4 h-4 text-indigo-600 animate-pulse" />
              Enter NextOrder Demo
            </button>
            <p className="text-[10px] text-slate-400 mt-2.5 leading-relaxed font-mono">
              *The NextOrder mode loads complete mocks locally so you can preview the active dashboard instantly.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
