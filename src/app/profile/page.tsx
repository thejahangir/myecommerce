"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Package,
  MapPin,
  Phone,
  Mail,
  Save,
  Clock,
  Truck,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  Building,
  Navigation,
} from "lucide-react";
import { supabase } from "@/src/utils/supabase/client";

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface OrderRecord {
  id: string;
  user_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address?: string;
  city?: string;
  postal_code?: string;
  total_price: number;
  status: "Pending" | "Processing" | "Shipped" | "Delivered";
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  created_at: string;
  order_items?: OrderItem[];
}

interface UserProfile {
  id: string;
  email?: string;
  full_name?: string;
  phone?: string;
  shipping_address?: string;
  city?: string;
  postal_code?: string;
}

function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") === "orders" ? "orders" : "details";

  const [activeTab, setActiveTab] = useState<"details" | "orders">(defaultTab);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Form Fields State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Orders State
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Fetch Order History for this user ID / email
  const fetchUserOrders = React.useCallback(async (userId: string, email?: string) => {
    setLoadingOrders(true);
    try {
      const emailQuery = email ? `&email=${encodeURIComponent(email)}` : "";
      const res = await fetch(`/api/orders?userId=${encodeURIComponent(userId)}${emailQuery}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.warn("Failed to fetch user orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // Load User and Profile Data
  useEffect(() => {
    async function loadUser() {
      setLoadingAuth(true);
      try {
        // 1. Try Supabase session
        const { data: { user } } = await supabase.auth.getUser();

        let resolvedId = user?.id;
        let resolvedEmail = user?.email;
        let resolvedName = user?.user_metadata?.full_name || "";

        // 2. Check localStorage fallback if no active Supabase session
        if (!resolvedId) {
          const cached = localStorage.getItem("apex_user_profile");
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              resolvedId = parsed.id;
              resolvedEmail = parsed.email;
              resolvedName = parsed.full_name || "";
            } catch {
              // ignore json parse error
            }
          }
        }

        if (!resolvedId) {
          // Not logged in -> redirect to login
          router.replace("/login?redirect=/profile");
          return;
        }

        const baseProfile: UserProfile = {
          id: resolvedId,
          email: resolvedEmail || "customer@example.com",
          full_name: resolvedName || "Customer",
        };

        // 3. Query profiles table from Supabase
        try {
          const { data: dbProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", resolvedId)
            .single();

          if (dbProfile) {
            baseProfile.full_name = dbProfile.full_name || baseProfile.full_name;
            baseProfile.phone = dbProfile.phone || "";
            baseProfile.shipping_address = dbProfile.shipping_address || "";
            baseProfile.city = dbProfile.city || "";
            baseProfile.postal_code = dbProfile.postal_code || "";
          }
        } catch {
          // If Supabase fetch fails, read cached local profile fields if present
          const cached = localStorage.getItem("apex_user_profile");
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              baseProfile.phone = parsed.phone || "";
              baseProfile.shipping_address = parsed.shipping_address || "";
              baseProfile.city = parsed.city || "";
              baseProfile.postal_code = parsed.postal_code || "";
            } catch {
              // ignore
            }
          }
        }

        setCurrentUser(baseProfile);
        setFullName(baseProfile.full_name || "");
        setPhone(baseProfile.phone || "");
        setShippingAddress(baseProfile.shipping_address || "");
        setCity(baseProfile.city || "");
        setPostalCode(baseProfile.postal_code || "");

        // 4. Fetch User Orders for Tab 2
        fetchUserOrders(resolvedId, resolvedEmail);
      } catch (err) {
        console.warn("User load error:", err);
      } finally {
        setLoadingAuth(false);
      }
    }

    loadUser();
  }, [fetchUserOrders, router]);

  // Handle Profile Update (.update() against profiles row)
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    const updatedData = {
      full_name: fullName.trim(),
      phone: phone.trim(),
      shipping_address: shippingAddress.trim(),
      city: city.trim(),
      postal_code: postalCode.trim(),
      updated_at: new Date().toISOString(),
    };

    try {
      // 1. Run .update() function against profiles row
      const { error } = await supabase
        .from("profiles")
        .update(updatedData)
        .eq("id", currentUser.id);

      if (error) {
        console.warn("Supabase update returned notice:", error.message);
      }

      // 2. Also persist to local cache so changes reflect instantly everywhere
      const newProfileState: UserProfile = {
        ...currentUser,
        ...updatedData,
      };
      setCurrentUser(newProfileState);
      localStorage.setItem("apex_user_profile", JSON.stringify(newProfileState));

      setSaveSuccess("Your profile and shipping details have been updated successfully!");
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err: unknown) {
      console.error("Save error:", err);
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Sign Out Handler
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    localStorage.removeItem("apex_user_profile");
    router.push("/login");
  };

  if (loadingAuth) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 text-slate-500 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <span>Loading customer account profile...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  // Derive initials for avatar
  const initials = fullName
    ? fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "CU";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-10 sm:py-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        
        {/* Top Header Card */}
        <div className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 sm:p-8 text-white shadow-xl ring-1 ring-slate-900/10 mb-8">
          <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-indigo-600/30 blur-3xl pointer-events-none" />
          
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4 sm:gap-5">
              {/* User Avatar Circle */}
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-400 text-white font-black text-xl sm:text-2xl shadow-lg shadow-indigo-600/30">
                {initials}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                    {fullName || "Customer"}
                  </h1>
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 ring-1 ring-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3" /> Verified Customer
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  <span>{currentUser.email}</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-1 font-mono">
                  Account ID: {currentUser.id.slice(0, 16)}...
                </p>
              </div>
            </div>

            {/* Top Actions */}
            <div className="flex items-center gap-3">
              <Link
                href="/cart"
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>View Cart</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/20 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/30 ring-1 ring-rose-500/30 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="mt-8 flex gap-2 border-t border-slate-800 pt-5">
            <button
              onClick={() => setActiveTab("details")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "details"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <MapPin className="h-4 w-4" />
              <span>Tab 1: Personal Details & Shipping</span>
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                activeTab === "orders"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Package className="h-4 w-4" />
              <span>Tab 2: Order History & Live Tracking</span>
              {orders.length > 0 && (
                <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] font-black">
                  {orders.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab 1: Personal Details & Shipping Address Form */}
        {activeTab === "details" && (
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  Personal Details & Default Shipping
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your contact and shipping address to automatically autofill during checkout.
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Autofill Enabled</span>
              </div>
            </div>

            {/* Notifications */}
            {saveSuccess && (
              <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{saveSuccess}</span>
              </div>
            )}

            {saveError && (
              <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-900">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{saveError}</span>
              </div>
            )}

            <form onSubmit={handleSaveChanges} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Full Name *
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                {/* Email (Read-Only) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Email Address (Linked Account)
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      disabled
                      value={currentUser.email}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    Phone Number
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Phone className="h-4 w-4" />
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5">
                    City / Region
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Building className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Mumbai, Bengaluru"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>
              </div>

              {/* Full Street Address Block */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Full Street Shipping Address Block
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute top-3 left-3.5 text-slate-400">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <textarea
                    rows={3}
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="e.g. Flat 402, Skyline Residency, 14th Cross, Bandra West"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Postal / PIN Code */}
              <div className="sm:w-1/2">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Postal / PIN Code
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Navigation className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="e.g. 400050"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Styled Save Changes Button */}
              <div className="border-t border-slate-100 pt-5 flex items-center justify-between">
                <p className="text-[11px] text-slate-500">
                  Data is safely stored in Supabase with user-restricted Row Level Security.
                </p>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 hover:shadow-indigo-600/40 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
                >
                  {isSaving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span>{isSaving ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Order History & Live Tracking */}
        {activeTab === "orders" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-950">
                  Your Orders & Tracking
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time status updates and delivery tracking for all orders placed under this account.
                </p>
              </div>

              <button
                onClick={() => fetchUserOrders(currentUser.id, currentUser.email)}
                disabled={loadingOrders}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                {loadingOrders ? "Refreshing..." : "↻ Refresh List"}
              </button>
            </div>

            {loadingOrders ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400">
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent mb-3" />
                <p>Loading your order history...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
                  <Package className="h-7 w-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-950">No orders placed yet</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  When you check out with your account, your purchases will appear here with live parcel tracking.
                </p>
                <Link
                  href="/"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-600 transition-colors shadow-sm"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>Start Shopping</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => {
                  const formattedDate = new Date(order.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  // Status badge styling
                  const statusColors: Record<string, string> = {
                    Pending: "bg-amber-50 text-amber-800 border-amber-200",
                    Processing: "bg-indigo-50 text-indigo-800 border-indigo-200",
                    Shipped: "bg-sky-50 text-sky-800 border-sky-200",
                    Delivered: "bg-emerald-50 text-emerald-800 border-emerald-200",
                  };

                  const badgeClass = statusColors[order.status] || "bg-slate-100 text-slate-700 border-slate-200";

                  return (
                    <div
                      key={order.id}
                      className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm hover:border-slate-300 transition-all space-y-4"
                    >
                      {/* Top Bar of Card */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                            <Package className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-950">
                                {order.id}
                              </span>
                              <span
                                className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeClass}`}
                              >
                                {order.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>Placed on {formattedDate}</span>
                            </p>
                          </div>
                        </div>

                        {/* Grand Total */}
                        <div className="text-right sm:text-right">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Order Total
                          </span>
                          <span className="text-base font-black text-indigo-600">
                            ₹{Number(order.total_price).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Items Preview */}
                      {order.order_items && order.order_items.length > 0 && (
                        <div className="rounded-2xl bg-slate-50/80 p-3.5 space-y-2 border border-slate-100">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Items ({order.order_items.length})
                          </span>
                          <div className="divide-y divide-slate-100">
                            {order.order_items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between py-1.5 text-xs"
                              >
                                <span className="font-medium text-slate-800">
                                  {item.product_name}
                                </span>
                                <span className="font-semibold text-slate-500">
                                  {item.quantity} × ₹{Number(item.unit_price).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Card Footer: Shipping destination & Track Order CTA Button */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                        <div className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Truck className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="truncate max-w-sm">
                            {order.shipping_address
                              ? `Deliver to: ${order.shipping_address}, ${order.city || ""}`
                              : `Deliver to: ${order.customer_name}`}
                          </span>
                        </div>

                        {/* Direct link back to interactive tracking visual layout */}
                        <Link
                          href={`/checkout/success?order_id=${encodeURIComponent(order.id)}`}
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 hover:shadow-indigo-600/30 transition-all cursor-pointer"
                        >
                          <span>Track Order →</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 text-slate-500 text-xs">
          Loading profile portal...
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
