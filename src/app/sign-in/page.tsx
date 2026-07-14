// /* eslint-disable @typescript-eslint/no-explicit-any */
// 'use client';

// import { useEffect, useState } from 'react';
// import { useRouter, useSearchParams } from 'next/navigation';
// import Link from 'next/link';
// import { toast } from 'sonner';
// // import env from '@/co';
// // import env from '@/co';

// import { useAuth } from '@/context/AuthContext';
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
//   DialogFooter,
// } from '@/components/ui/dialog';
// import { useAxios } from '@/hooks/useAxios';

// export default function SignInPage() {
//   const router = useRouter();
//   const { login } = useAuth(); // import this
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);
//   const [forgotOpen, setForgotOpen] = useState(false);
//   const [forgotEmail, setForgotEmail] = useState('');
//   const [sendingReset, setSendingReset] = useState(false);
//   const [resetOpen, setResetOpen] = useState(false);

//   const [newPassword, setNewPassword] = useState('');
//   const [confirmPassword, setConfirmPassword] = useState('');

//   const [showNewPassword, setShowNewPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);

//   const [resetLoading, setResetLoading] = useState(false);

//   const searchParams = useSearchParams();

//   const resetToken = searchParams.get('resetToken');

//   const axios = useAxios();

//   useEffect(() => {
//     if (resetToken) {
//       setResetOpen(true);
//     }
//   }, [resetToken]);

//   async function handleSubmit(e: React.FormEvent) {
//     e.preventDefault();
//     if (!email || !password) {
//       toast.error('Please fill in all fields');
//       return;
//     }

//     setIsLoading(true);
//     try {
//       // const res = await fetch(`${env.NEXT_PUBLIC_API_URL}/core/api/auth/login`, {
//       //   method: 'POST',
//       //   headers: { 'Content-Type': 'application/json' },
//       //   body: JSON.stringify({ email, password }),
//       // });

//       // const data = await res.json();

//       // if (!res.ok) {
//       //   toast.error(data.message ?? 'Invalid credentials');
//       //   return;
//       // }

//       // Hand off to AuthContext — it will store user + tokens
//       await login(email, password);
//       toast.success('Welcome back!');
//       router.push('/dashboard');
//     } catch {
//       toast.error('Something went wrong. Please try again.');
//     } finally {
//       setIsLoading(false);
//     }
//   }

//   const handleForgotPassword = async () => {
//     if (!forgotEmail) {
//       toast.error('Please enter your email.');
//       return;
//     }

//     setSendingReset(true);

//     try {
//       await axios.post('/auth/forgot-password', {
//         email: forgotEmail,
//       });

//       toast.success('If an account exists, a password reset link has been sent to your email.');

//       setForgotOpen(false);
//       setForgotEmail('');
//     } catch (error: any) {
//       toast.error(error?.response?.data?.message ?? 'Network error. Please try again.');
//     } finally {
//       setSendingReset(false);
//     }
//   };

//   const handleResetPassword = async () => {
//     if (!newPassword || !confirmPassword) {
//       toast.error('Please fill in all fields.');
//       return;
//     }

//     if (newPassword !== confirmPassword) {
//       toast.error('Passwords do not match.');
//       return;
//     }

//     setResetLoading(true);

//     try {
//       await axios.post('/auth/reset-password', {
//         token: resetToken,
//         password: newPassword,
//       });

//       toast.success('Password reset successfully.');

//       setResetOpen(false);
//       setNewPassword('');
//       setConfirmPassword('');

//       // Removes ?resetToken=... from URL
//       router.replace('/login');
//     } catch (error: any) {
//       toast.error(error?.response?.data?.message ?? 'Unable to reset password.');
//     } finally {
//       setResetLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-[calc(100vh-73px)] flex items-center justify-center px-4">
//       {/* Ambient glows */}
//       <div className="fixed inset-0 pointer-events-none overflow-hidden">
//         <div
//           className="absolute top-[-10%] left-[20%] w-125 h-125 rounded-full opacity-[0.07]"
//           style={{
//             background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)',
//             filter: 'blur(80px)',
//           }}
//         />
//         <div
//           className="absolute bottom-[-5%] right-[10%] w-100 h-100 rounded-full opacity-[0.06]"
//           style={{
//             background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)',
//             filter: 'blur(100px)',
//           }}
//         />
//       </div>

//       <div className="relative w-full max-w-sm">
//         {/* Card */}
//         <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
//           {/* Logo mark */}
//           <div className="flex items-center gap-2.5 mb-8">
//             <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-br from-primary to-accent">
//               <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
//                 <path
//                   d="M3 12L8 4L13 12"
//                   stroke="white"
//                   strokeWidth="1.8"
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                 />
//                 <path d="M5 9H11" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
//               </svg>
//             </div>
//             <span
//               className="text-sm font-semibold text-foreground/80 tracking-tight"
//               style={{ letterSpacing: '-0.02em' }}
//             >
//               TalentOS
//             </span>
//           </div>

//           {/* Heading */}
//           <div className="mb-7">
//             <h1
//               className="text-[22px] font-bold text-foreground tracking-tight mb-1"
//               style={{ letterSpacing: '-0.025em' }}
//             >
//               Welcome back!!!!!!!
//             </h1>
//             <p className="text-sm text-muted-foreground">Sign in to your workspace</p>
//           </div>

//           {/* Form */}
//           <form onSubmit={handleSubmit} className="space-y-4">
//             {/* Email */}
//             <div className="space-y-1.5">
//               <label className="text-xs font-medium text-foreground/60 uppercase tracking-wider">
//                 Email
//               </label>
//               <input
//                 type="email"
//                 value={email}
//                 onChange={e => setEmail(e.target.value)}
//                 placeholder="you@company.com"
//                 autoComplete="email"
//                 disabled={isLoading}
//                 className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-150 disabled:opacity-50"
//               />
//             </div>

//             {/* Password */}
//             <div className="space-y-1.5">
//               <div className="flex items-center justify-between">
//                 <label className="text-xs font-medium text-foreground/60 uppercase tracking-wider">
//                   Password
//                 </label>

//                 <button
//                   type="button"
//                   onClick={() => {
//                     setForgotEmail(email);
//                     setForgotOpen(true);
//                   }}
//                   className="text-xs text-primary hover:text-primary/80 transition-colors"
//                 >
//                   Forgot password?
//                 </button>
//               </div>
//               <div className="relative">
//                 <input
//                   type={showPassword ? 'text' : 'password'}
//                   value={password}
//                   onChange={e => setPassword(e.target.value)}
//                   placeholder="••••••••"
//                   autoComplete="current-password"
//                   disabled={isLoading}
//                   className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-150 disabled:opacity-50"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPassword(v => !v)}
//                   className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
//                   tabIndex={-1}
//                 >
//                   {showPassword ? (
//                     // Eye-off
//                     <svg
//                       width="15"
//                       height="15"
//                       viewBox="0 0 24 24"
//                       fill="none"
//                       stroke="currentColor"
//                       strokeWidth="2"
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                     >
//                       <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
//                       <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
//                       <line x1="1" y1="1" x2="23" y2="23" />
//                     </svg>
//                   ) : (
//                     // Eye
//                     <svg
//                       width="15"
//                       height="15"
//                       viewBox="0 0 24 24"
//                       fill="none"
//                       stroke="currentColor"
//                       strokeWidth="2"
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                     >
//                       <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
//                       <circle cx="12" cy="12" r="3" />
//                     </svg>
//                   )}
//                 </button>
//               </div>
//             </div>

//             {/* Submit */}
//             <button
//               type="submit"
//               disabled={isLoading}
//               className="w-full py-2.5 rounded-lg text-sm font-medium text-primary-foreground transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
//               style={{
//                 background:
//                   'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)',
//                 boxShadow: '0 0 20px color-mix(in oklch, var(--color-primary) 25%, transparent)',
//               }}
//             >
//               {isLoading ? (
//                 <span className="flex items-center justify-center gap-2">
//                   <svg
//                     className="animate-spin"
//                     width="14"
//                     height="14"
//                     viewBox="0 0 24 24"
//                     fill="none"
//                     stroke="currentColor"
//                     strokeWidth="2.5"
//                   >
//                     <path d="M21 12a9 9 0 1 1-6.219-8.56" />
//                   </svg>
//                   Signing in…
//                 </span>
//               ) : (
//                 'Sign in'
//               )}
//             </button>
//           </form>

//           {/* Divider */}
//           <div className="flex items-center gap-3 my-6">
//             <div className="flex-1 h-px bg-border" />
//             <span className="text-xs text-muted-foreground">or</span>
//             <div className="flex-1 h-px bg-border" />
//           </div>

//           {/* SSO stub — wire up when ready */}
//           <button
//             type="button"
//             disabled
//             className="w-full py-2.5 rounded-lg text-sm font-medium text-foreground/40 border border-border bg-muted/30 cursor-not-allowed"
//           >
//             Continue with SSO
//           </button>
//         </div>

//         {/* Footer */}
//         <p className="text-center text-xs text-muted-foreground mt-5">
//           Internal platform &mdash;{' '}
//           <Link href="/" className="text-primary hover:text-primary/80 transition-colors">
//             Back to home
//           </Link>
//         </p>
//       </div>

//       <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
//         <DialogContent className="sm:max-w-md">
//           <DialogHeader>
//             <DialogTitle>Forgot Password</DialogTitle>

//             <DialogDescription>
//               Enter your email address and we&apos;ll send you a password reset link.
//             </DialogDescription>
//           </DialogHeader>

//           <div className="space-y-2">
//             <label className="text-sm font-medium">Email</label>

//             <input
//               type="email"
//               value={forgotEmail}
//               onChange={e => setForgotEmail(e.target.value)}
//               placeholder="you@company.com"
//               className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
//             />
//           </div>

//           <DialogFooter>
//             <button
//               type="button"
//               onClick={() => setForgotOpen(false)}
//               className="rounded-md border px-4 py-2 text-sm"
//             >
//               Cancel
//             </button>

//             <button
//               type="button"
//               disabled={sendingReset}
//               onClick={handleForgotPassword}
//               className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm"
//             >
//               {sendingReset ? 'Sending...' : 'Send Reset Link'}
//             </button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//       <Dialog open={resetOpen} onOpenChange={setResetOpen}>
//         <DialogContent className="sm:max-w-md">
//           <DialogHeader>
//             <DialogTitle>Reset Password</DialogTitle>

//             <DialogDescription>Enter your new password below.</DialogDescription>
//           </DialogHeader>

//           <div className="space-y-4">
//             <div className="space-y-2">
//               <label className="text-sm font-medium">New Password</label>

//               {/* <input
//                 type={showNewPassword ? 'text' : 'password'}
//                 value={newPassword}
//                 onChange={e => setNewPassword(e.target.value)}
//                 placeholder="Enter new password"
//                 className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
//               /> */}
//               <div className="relative">
//                 <input
//                   type={showNewPassword ? 'text' : 'password'}
//                   value={newPassword}
//                   onChange={e => setNewPassword(e.target.value)}
//                   className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm"
//                 />

//                 <button
//                   type="button"
//                   onClick={() => setShowNewPassword(v => !v)}
//                   className="absolute right-3 top-1/2 -translate-y-1/2"
//                 >
//                   👁
//                 </button>
//               </div>
//             </div>

//             <div className="space-y-2">
//               <label className="text-sm font-medium">Confirm Password</label>

//               <input
//                 type={showConfirmPassword ? 'text' : 'password'}
//                 value={confirmPassword}
//                 onChange={e => setConfirmPassword(e.target.value)}
//                 placeholder="Confirm password"
//                 className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
//               />
//             </div>
//           </div>

//           <DialogFooter>
//             <button
//               type="button"
//               onClick={() => setResetOpen(false)}
//               className="rounded-md border px-4 py-2 text-sm"
//             >
//               Cancel
//             </button>

//             <button
//               type="button"
//               disabled={resetLoading}
//               onClick={handleResetPassword}
//               className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm"
//             >
//               {resetLoading ? 'Resetting...' : 'Reset Password'}
//             </button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </div>
//   );
// }

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Suspense, useEffect, useState } from 'react'; // ← add Suspense
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

import { useAuth } from '@/context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAxios } from '@/hooks/useAxios';

// ─── All the real logic lives here ───────────────────────────────────────────
function SignInForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [sendingReset, setSendingReset] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const searchParams = useSearchParams(); // ← safe inside Suspense now
  const resetToken = searchParams.get('token');
  const axios = useAxios();

  useEffect(() => {
    if (resetToken) setResetOpen(true);
  }, [resetToken]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      toast.error('Please enter your email.');
      return;
    }
    setSendingReset(true);
    try {
      await axios.post('/auth/forgot-password', { email: forgotEmail });
      toast.success('If an account exists, a password reset link has been sent to your email.');
      setForgotOpen(false);
      setForgotEmail('');
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Network error. Please try again.');
    } finally {
      setSendingReset(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    setResetLoading(true);
    try {
      await axios.post('/auth/reset-password', { token: resetToken, password: newPassword });
      toast.success('Password reset successfully.');
      setResetOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      router.replace('/sign-in');
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Unable to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-73px)] flex items-center justify-center px-4">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-10%] left-[20%] w-125 h-125 rounded-full opacity-[0.07]"
          style={{
            background: 'radial-gradient(circle, var(--color-primary) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute bottom-[-5%] right-[10%] w-100 h-100 rounded-full opacity-[0.06]"
          style={{
            background: 'radial-gradient(circle, var(--color-accent) 0%, transparent 70%)',
            filter: 'blur(100px)',
          }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="bg-card border border-border rounded-2xl p-8 shadow-2xl">
          {/* Logo mark */}
          <div className="flex items-center gap-2.5 mb-8">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-linear-to-br from-primary to-accent">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3 12L8 4L13 12"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path d="M5 9H11" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <span
              className="text-sm font-semibold text-foreground/80 tracking-tight"
              style={{ letterSpacing: '-0.02em' }}
            >
              TalentOS
            </span>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h1
              className="text-[22px] font-bold text-foreground tracking-tight mb-1"
              style={{ letterSpacing: '-0.025em' }}
            >
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground">Sign in to your workspace</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground/60 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                disabled={isLoading}
                className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-150 disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground/60 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotOpen(true);
                  }}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-150 disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg text-sm font-medium text-primary-foreground transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              style={{
                background:
                  'linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 100%)',
                boxShadow: '0 0 20px color-mix(in oklch, var(--color-primary) 25%, transparent)',
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            type="button"
            disabled
            className="w-full py-2.5 rounded-lg text-sm font-medium text-foreground/40 border border-border bg-muted/30 cursor-not-allowed"
          >
            Continue with SSO
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">
          Internal platform &mdash;{' '}
          <Link href="/" className="text-primary hover:text-primary/80 transition-colors">
            Back to home
          </Link>
        </p>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Forgot Password</DialogTitle>
            <DialogDescription>
              Enter your email address and we&apos;ll send you a password reset link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={forgotEmail}
              onChange={e => setForgotEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setForgotOpen(false)}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={sendingReset}
              onClick={handleForgotPassword}
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm"
            >
              {sendingReset ? 'Sending...' : 'Send Reset Link'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Enter your new password below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  👁
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  👁
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setResetOpen(false)}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={resetLoading}
              onClick={handleResetPassword}
              className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm"
            >
              {resetLoading ? 'Resetting...' : 'Reset Password'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Page export wraps the form in Suspense ───────────────────────────────────
export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
