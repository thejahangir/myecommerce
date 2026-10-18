"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Zap,
  User,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/src/utils/supabase/client";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/profile";

  const [mode, setMode] = useState<"login" | "register">("register");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if already authenticated
  useEffect(() => {
    async function checkExistingAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          router.replace(redirectUrl);
        }
      } catch {
        // Continue to show login
      }
    }
    checkExistingAuth();
  }, [redirectUrl, router]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim() || !password.trim()) {
      setError("Please provide both email and password.");
      return;
    }

    if (mode === "register" && !fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "register") {
        // 1. Authenticate / Sign Up with Supabase
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        if (signUpError) {
          throw signUpError;
        }

        const newUser = data.user;
        if (newUser) {
          // 2. Immediately insert / upsert profile row into the profiles table
          try {
            await supabase.from("profiles").upsert({
              id: newUser.id,
              full_name: fullName.trim(),
              updated_at: new Date().toISOString(),
            });
          } catch (profileInsertError) {
            console.warn("Notice updating profile row:", profileInsertError);
          }

          // Cache in local storage for instant state hydration
          const cachedProfile = {
            id: newUser.id,
            email: newUser.email || email.trim(),
            full_name: fullName.trim(),
            phone: "",
            shipping_address: "",
            city: "",
            postal_code: "",
          };
          localStorage.setItem("apex_user_profile", JSON.stringify(cachedProfile));

          // If session is active right away, redirect
          if (data.session) {
            setSuccessMessage("Account created successfully! Redirecting...");
            setTimeout(() => {
              router.push(redirectUrl);
            }, 800);
            return;
          }

          // If Supabase requires email verification
          setSuccessMessage(
            "Account registered! You can now log in or check your email for a confirmation link."
          );
          setMode("login");
        }
      } else {
        // Sign In Existing User
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (signInError) {
          throw signInError;
        }

        if (data.user) {
          // Fetch user profile from Supabase
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", data.user.id)
              .single();

            if (profile) {
              localStorage.setItem("apex_user_profile", JSON.stringify(profile));
            } else {
              localStorage.setItem(
                "apex_user_profile",
                JSON.stringify({
                  id: data.user.id,
                  email: data.user.email,
                  full_name: data.user.user_metadata?.full_name || "Customer",
                })
              );
            }
          } catch {
            localStorage.setItem(
              "apex_user_profile",
              JSON.stringify({
                id: data.user.id,
                email: data.user.email,
                full_name: data.user.user_metadata?.full_name || "Customer",
              })
            );
          }

          setSuccessMessage("Signed in successfully! Redirecting...");
          setTimeout(() => {
            router.push(redirectUrl);
          }, 600);
        }
      }
    } catch (err: unknown) {
      console.error("Auth error:", err);
      const msg = err instanceof Error ? err.message : "Authentication failed";
      
      // Provide friendly advice if network / placeholder URL issue
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        setError(
          "Could not reach Supabase. Ensure your NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are valid in .env.local, or use the Demo Account below to test immediately."
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Instant Demo Account Login for sandbox testing
  const handleDemoLogin = () => {
    const demoProfile = {
      id: "demo-user-123",
      email: "sarah.j@example.com",
      full_name: "Sarah Jenkins",
      phone: "+91 98765 43210",
      shipping_address: "Flat 402, Skyline Residency, Bandra West",
      city: "Mumbai",
      postal_code: "400050",
    };
    localStorage.setItem("apex_user_profile", JSON.stringify(demoProfile));
    setSuccessMessage("Logged in as Demo Customer! Redirecting...");
    setTimeout(() => {
      router.push(redirectUrl);
    }, 500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12 sm:px-6 lg:px-8">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="absolute top-1/2 -right-40 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
              <Zap className="h-6 w-6 fill-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white">
              ApexStore<span className="text-indigo-400">.</span>
            </span>
          </Link>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-white sm:text-2xl">
            {mode === "register" ? "Create your customer account" : "Welcome back"}
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            {mode === "register"
              ? "Sign up in seconds to save shipping addresses & track orders"
              : "Sign in to manage your profile, delivery addresses & tracking"}
          </p>
        </div>

        {/* Auth Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-900/90 p-1 mb-6 border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setError(null);
                setSuccessMessage(null);
              }}
              className={`rounded-xl py-2 text-xs font-bold transition-all ${
                mode === "register"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
                setSuccessMessage(null);
              }}
              className={`rounded-xl py-2 text-xs font-bold transition-all ${
                mode === "login"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name Field (Register Mode Only) */}
            {mode === "register" && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                    <User className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-2.5 pl-10 pr-4 text-xs font-medium text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-2.5 pl-10 pr-4 text-xs font-medium text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                {mode === "register" && (
                  <span className="text-[10px] text-slate-500">Min. 6 characters</span>
                )}
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/90 py-2.5 pl-10 pr-10 text-xs font-medium text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <span>{mode === "register" ? "Create Account & Continue" : "Sign In"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Test Option */}
          <div className="mt-6 border-t border-slate-800/80 pt-5">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
              <span>Sandbox / Fast Testing?</span>
              <span className="flex items-center gap-1 text-[11px] text-indigo-400 font-semibold">
                <Sparkles className="h-3 w-3" /> 1-Click
              </span>
            </div>
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
            >
              <User className="h-3.5 w-3.5 text-indigo-400" />
              <span>Continue as Demo Customer (Sarah Jenkins)</span>
            </button>
          </div>

          {/* Security Assurance */}
          <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Secured with Supabase Auth & JWT encryption</span>
          </div>
        </div>

        {/* Back to Storefront */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            ← Return to ApexStore Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-400 text-xs">
          Loading authentication...
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
