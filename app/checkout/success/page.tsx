"use client";

import React, { Suspense, useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Package,
  Truck,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  Clock,
  Printer,
  Copy,
  Check,
  RefreshCw,
  Home,
} from "lucide-react";
import { useCart } from "@/src/context/CartContext";

const STAGES = [
  { id: "Pending", label: "Pending", description: "Order received & logged", icon: Clock },
  { id: "Processing", label: "Processing", description: "Packaging at facility", icon: Package },
  { id: "Shipped", label: "Shipped", description: "In transit with courier", icon: Truck },
  { id: "Delivered", label: "Delivered", description: "Delivered to address", icon: Home },
] as const;

function SuccessContent() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("payment_id");
  const orderIdParam = searchParams.get("order_id");
  const sessionId = searchParams.get("session_id");
  const { clearCart } = useCart();

  const [copied, setCopied] = useState(false);
  const [orderStatus, setOrderStatus] = useState<string>("Pending");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<{
    id?: string;
    customer_name?: string;
    customer_email?: string;
    customer_phone?: string;
    total_price?: number;
    created_at?: string;
    status?: string;
    order_items?: {
      id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
    }[];
  } | null>(null);

  // Derive readable order tracking ID
  const displayOrderId = useMemo(() => {
    if (orderIdParam) {
      return orderIdParam;
    }
    if (sessionId) {
      const hash = sessionId.slice(-8).toUpperCase();
      return `APX-${hash}-IN`;
    }
    return "ORD-849201";
  }, [orderIdParam, sessionId]);

  const activeLookupId = orderIdParam || paymentId || sessionId || displayOrderId;

  // Manual refresh handler
  const refreshStatus = useCallback(async () => {
    setIsRefreshing(true);
    setStatusNotice(null);
    try {
      const res = await fetch(`/api/orders?id=${encodeURIComponent(activeLookupId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.order) {
          setOrderStatus(data.order.status || "Pending");
          setOrderDetails(data.order);
          setStatusNotice(`Status synced: ${data.order.status || "Pending"}`);
          setTimeout(() => setStatusNotice(null), 2500);
        }
      }
    } catch (err) {
      console.warn("Status fetch notice:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [activeLookupId]);

  // Interactive Live Status Stage updater (for testing customer tracking transitions)
  const handleUpdateStage = async (newStage: string) => {
    setOrderStatus(newStage);
    setStatusNotice(`Updating to ${newStage}...`);
    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: activeLookupId, status: newStage }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.order) {
          setOrderStatus(data.order.status);
          setOrderDetails((prev) => (prev ? { ...prev, status: data.order.status } : data.order));
          setStatusNotice(`Fulfillment updated to ${data.order.status}`);
          setTimeout(() => setStatusNotice(null), 2500);
        }
      }
    } catch (err) {
      console.warn("Stage update notice:", err);
    }
  };

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  // Real-time automatic synchronization: polls every 2.5 seconds so admin changes reflect immediately
  useEffect(() => {
    let ignore = false;

    async function loadStatus() {
      try {
        const res = await fetch(`/api/orders?id=${encodeURIComponent(activeLookupId)}`);
        if (res.ok && !ignore) {
          const data = await res.json();
          if (data.order) {
            setOrderStatus(data.order.status || "Pending");
            setOrderDetails(data.order);
          }
        }
      } catch (err) {
        console.warn("Status fetch notice:", err);
      }
    }

    loadStatus();

    // Auto-poll every 2.5 seconds
    const interval = setInterval(loadStatus, 2500);

    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [activeLookupId]);

  const handleCopyOrderId = () => {
    navigator.clipboard.writeText(displayOrderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentStageIndex = useMemo(() => {
    const idx = STAGES.findIndex(
      (s) => s.id.toLowerCase() === orderStatus.toLowerCase()
    );
    return idx >= 0 ? idx : 0;
  }, [orderStatus]);

  return (
    <div className="min-h-screen bg-slate-50 py-12 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {/* Main Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-6 py-12 text-center text-white sm:px-12">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/20 text-emerald-400 ring-8 ring-emerald-500/10 mb-6 animate-in zoom-in-75">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <span className="inline-block rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/30 mb-3">
              Payment Confirmed
            </span>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Thank you for your purchase!
            </h1>

            <p className="mt-3 text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              We&apos;ve logged your order into our system. Real-time fulfillment status is synchronized below.
            </p>
          </div>

          {/* Order Details Body */}
          <div className="p-6 sm:p-10 space-y-8">
            
            {/* Tracking ID Strip */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-2xl bg-slate-50 border border-slate-200 p-5 gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Order Tracking Reference
                </p>
                <p className="text-lg font-black text-slate-950 mt-0.5 tracking-tight break-all font-mono">
                  {displayOrderId}
                </p>
                {paymentId && (
                  <p className="text-xs font-semibold text-indigo-600 mt-1 font-mono">
                    Payment ID: {paymentId}
                  </p>
                )}
                {orderDetails?.total_price && (
                  <p className="text-xs font-medium text-slate-500 mt-0.5">
                    Amount Paid: ₹{Number(orderDetails.total_price).toFixed(2)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyOrderId}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-sm cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy ID</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-sm cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print</span>
                </button>
              </div>
            </div>

            {/* STEP-BY-STEP VISUAL PROGRESS TRACKING BAR: Pending -> Processing -> Shipped -> Delivered */}
            <div className="space-y-6 rounded-3xl border border-slate-200 bg-slate-50/70 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Live Shipment Status
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-black text-slate-900">
                      {orderStatus}
                    </span>
                    <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                  </div>
                </div>

                <button
                  onClick={refreshStatus}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-sm cursor-pointer"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
                  <span>{isRefreshing ? "Checking..." : "Refresh Status"}</span>
                </button>
              </div>

              {/* Progress Steps Visualizer */}
              <div className="relative">
                {/* Connecting Track Line */}
                <div className="absolute top-5 left-6 right-6 h-1 bg-slate-200 -z-0">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-500"
                    style={{
                      width: `${(currentStageIndex / (STAGES.length - 1)) * 100}%`,
                    }}
                  />
                </div>

                {/* Stages List */}
                <div className="relative z-10 grid grid-cols-4 gap-2">
                  {STAGES.map((stage, index) => {
                    const isCompleted = index < currentStageIndex;
                    const isCurrent = index === currentStageIndex;
                    const IconComponent = stage.icon;

                    return (
                      <div key={stage.id} className="flex flex-col items-center text-center">
                        {/* Stage Node Icon */}
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                            isCompleted
                              ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                              : isCurrent
                              ? "border-indigo-600 bg-white text-indigo-600 ring-4 ring-indigo-500/20 shadow-md"
                              : "border-slate-200 bg-white text-slate-400"
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="h-5 w-5 stroke-[2.5]" />
                          ) : (
                            <IconComponent className="h-4 w-4" />
                          )}
                        </div>

                        {/* Stage Label */}
                        <p
                          className={`mt-2.5 text-xs font-bold ${
                            isCurrent
                              ? "text-indigo-600"
                              : isCompleted
                              ? "text-slate-900"
                              : "text-slate-400"
                          }`}
                        >
                          {stage.label}
                        </p>

                        <p className="hidden sm:block text-[10px] text-slate-500 mt-0.5 leading-tight max-w-[100px]">
                          {stage.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Notice Toast / Indicator */}
              {statusNotice && (
                <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 animate-in fade-in">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{statusNotice}</span>
                  </div>
                  <span className="text-[10px] text-emerald-600">Synced Real-Time</span>
                </div>
              )}

              {/* Live Tracking Status Simulator Bar */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-indigo-950">
                      Live Tracking Simulator & Verification
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider bg-indigo-100/70 px-2 py-0.5 rounded-full">
                    Auto-Sync (2.5s)
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">
                  Click any stage below to test the live tracking animation, or update it directly from the{" "}
                  <Link href="/admin" target="_blank" className="font-semibold text-indigo-600 underline">
                    Admin Dashboard
                  </Link>:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {STAGES.map((s) => {
                    const isActive = orderStatus.toLowerCase() === s.id.toLowerCase();
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleUpdateStage(s.id)}
                        className={`rounded-xl py-2 px-3 text-xs font-bold transition-all cursor-pointer shadow-xs ${
                          isActive
                            ? "bg-indigo-600 text-white ring-2 ring-indigo-500/30 scale-[1.02]"
                            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Purchased Items & Delivery Summary Card */}
            {orderDetails && orderDetails.order_items && orderDetails.order_items.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-indigo-600" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Items In This Order
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-indigo-600">
                    {orderDetails.order_items.length} {orderDetails.order_items.length === 1 ? "Item" : "Items"}
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {orderDetails.order_items.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between text-xs first:pt-0 last:pb-0">
                      <div>
                        <p className="font-bold text-slate-900">{item.product_name}</p>
                        <p className="text-slate-500 text-[11px]">Quantity: {item.quantity}</p>
                      </div>
                      <span className="font-bold text-slate-950 font-mono">
                        ₹{(Number(item.unit_price) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-600">Total Order Value:</span>
                  <span className="text-base font-black text-indigo-600">
                    ₹{Number(orderDetails.total_price || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Guarantees Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">2-Year Comprehensive Warranty</h4>
                  <p className="text-[11px] text-slate-500">Every piece is protected against manufacturing defects.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Carbon-Neutral Delivery</h4>
                  <p className="text-[11px] text-slate-500">All transit emissions are 100% offset through certified forestry.</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link
                href="/"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3.5 text-xs font-bold text-white hover:bg-indigo-600 transition-all shadow-md active:scale-95"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Return to Storefront</span>
              </Link>

              <Link
                href="/admin"
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/50 px-6 py-3.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                <span>Admin Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-xs font-bold text-slate-500 animate-pulse">
            Loading order tracking...
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
