"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Truck,
  ArrowLeft,
  Tag,
  Lock,
  X,
  CreditCard,
  QrCode,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Check,
  User,
  MapPin,
} from "lucide-react";
import { useCart } from "@/src/context/CartContext";
import { supabase } from "@/src/utils/supabase/client";

export default function CartPage() {
  const router = useRouter();
  const { cart, removeFromCart, updateQuantity, clearCart, totalCount, totalPrice } = useCart();
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  // Authentication & Customer Shipping Autofill State
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    email?: string;
    full_name?: string;
  } | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  // Check auth state on mount and pull saved shipping address
  React.useEffect(() => {
    async function loadUserAndProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        let resolvedId = user?.id;
        let resolvedEmail = user?.email;
        let resolvedName = user?.user_metadata?.full_name || "";

        if (!resolvedId) {
          const cached = localStorage.getItem("apex_user_profile");
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              resolvedId = parsed.id;
              resolvedEmail = parsed.email;
              resolvedName = parsed.full_name || "";
            } catch {
              // ignore
            }
          }
        }

        if (resolvedId) {
          setCurrentUser({ id: resolvedId, email: resolvedEmail, full_name: resolvedName });
          setCustomerName(resolvedName || "Customer");
          setCustomerEmail(resolvedEmail || "shopper@apexstore.com");

          // Automatically pull their saved shipping_address to autofill the billing fields
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", resolvedId)
              .single();

            if (profile) {
              if (profile.full_name) setCustomerName(profile.full_name);
              if (profile.phone) setCustomerPhone(profile.phone);
              if (profile.shipping_address) setShippingAddress(profile.shipping_address);
              if (profile.city) setCity(profile.city);
              if (profile.postal_code) setPostalCode(profile.postal_code);
              setIsProfileLoaded(true);
            }
          } catch {
            const cached = localStorage.getItem("apex_user_profile");
            if (cached) {
              try {
                const parsed = JSON.parse(cached);
                if (parsed.phone) setCustomerPhone(parsed.phone);
                if (parsed.shipping_address) setShippingAddress(parsed.shipping_address);
                if (parsed.city) setCity(parsed.city);
                if (parsed.postal_code) setPostalCode(parsed.postal_code);
                setIsProfileLoaded(true);
              } catch {
                // ignore
              }
            }
          }
        }
      } catch (err) {
        console.warn("Auth check in cart:", err);
      }
    }
    loadUserAndProfile();
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedItem(label);
      setTimeout(() => setCopiedItem(null), 2000);
    }
  };

  // Razorpay Sandbox Simulation Dialog State
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<{
    id: string;
    amount: number;
    currency: string;
    key_id: string;
    isPlaceholder?: boolean;
  } | null>(null);
  const [simulationMode, setSimulationMode] = useState<"success" | "failure">("success");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);

  // Indian Localization Calculations (Free express delivery above ₹1,999, flat delivery ₹99)
  const freeDeliveryThreshold = 1999;
  const standardDeliveryFee = 99.0;
  const shippingCost =
    totalPrice >= freeDeliveryThreshold || totalPrice === 0 ? 0 : standardDeliveryFee;
  const discountAmount = appliedPromo === "APEX2026" ? totalPrice * 0.15 : 0;
  const taxableAmount = Math.max(0, totalPrice - discountAmount);
  // Standard Indian GST rate (18%)
  const estimatedTax = taxableAmount * 0.18;
  const grandTotal = Math.max(0, taxableAmount + shippingCost + estimatedTax);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError(null);
    if (!promoCode.trim()) return;

    if (promoCode.trim().toUpperCase() === "APEX2026") {
      setAppliedPromo("APEX2026");
      setPromoCode("");
    } else {
      setPromoError("Invalid promotional code. Try APEX2026 for 15% off.");
    }
  };

  // Main Checkout Trigger: fetch order token and open Razorpay overlay
  const handleProceedToPayment = async () => {
    if (cart.length === 0) return;

    // Requirement 3: Check auth state. If not logged in, redirect directly to /login
    if (!currentUser) {
      router.push("/login?redirect=/cart");
      return;
    }

    setIsProcessing(true);
    setCheckoutError(null);

    try {
      // 1. Request Order Token from backend Razorpay API
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: grandTotal,
          currency: "INR",
          notes: {
            itemsCount: totalCount,
          },
        }),
      });

      const orderData = await res.json();

      if (!res.ok || orderData.error) {
        throw new Error(orderData.error || "Failed to initialize payment order.");
      }

      setCurrentOrder(orderData);

      // If user has a real Razorpay key (non-placeholder) and SDK is ready, we can launch native popup
      const hasRealKey =
        orderData.key_id &&
        !orderData.key_id.includes("placeholder") &&
        !orderData.isPlaceholder;

      const RazorpayConstructor = (window as unknown as { Razorpay: new (opts: unknown) => { open: () => void; on: (e: string, fn: (r: unknown) => void) => void } }).Razorpay;

      if (hasRealKey && isSdkLoaded && RazorpayConstructor) {
        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency || "INR",
          name: "ApexStore",
          description: "Premium Lifestyle & Hardware Checkout",
          order_id: orderData.id,
          handler: async function (response: { razorpay_payment_id: string; razorpay_order_id: string }) {
            try {
              const saveRes = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  cartItems: cart,
                  customerDetails: {
                    userId: currentUser?.id,
                    name: customerName || currentUser?.full_name || "Customer",
                    email: customerEmail || currentUser?.email || "shopper@apexstore.com",
                    phone: customerPhone || "9876543210",
                    shipping_address: shippingAddress,
                    city: city,
                    postal_code: postalCode,
                  },
                  userId: currentUser?.id,
                  shippingAddress,
                  city,
                  postalCode,
                  totalPrice: grandTotal,
                  paymentId: response.razorpay_payment_id,
                  orderId: response.razorpay_order_id,
                }),
              });
              const saveResult = await saveRes.json();
              const finalId = saveResult.orderId || response.razorpay_order_id;
              clearCart();
              router.push(
                `/checkout/success?order_id=${finalId}&payment_id=${response.razorpay_payment_id}`
              );
            } catch (err) {
              console.error("Order save notice:", err);
              clearCart();
              router.push(
                `/checkout/success?order_id=${response.razorpay_order_id}&payment_id=${response.razorpay_payment_id}`
              );
            }
          },
          prefill: {
            name: customerName || currentUser?.full_name || "Customer",
            email: customerEmail || currentUser?.email || "shopper@apexstore.com",
            contact: customerPhone || "9876543210",
          },
          theme: {
            color: "#4f46e5",
          },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
            },
          },
        };

        const rzp = new RazorpayConstructor(options);
        rzp.on("payment.failed", function (resp: unknown) {
          const failure = resp as { error?: { description?: string } };
          setCheckoutError(failure?.error?.description || "Payment failed. Please retry.");
          setIsProcessing(false);
        });
        rzp.open();
      } else {
        // Open the Razorpay Sandbox Developer Overlay with Success/Failure simulation checkboxes
        setIsRazorpayModalOpen(true);
      }
    } catch (err: unknown) {
      console.error("Payment error:", err);
      const msg = err instanceof Error ? err.message : "Error initiating checkout";
      setCheckoutError(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute Sandbox Simulation Test
  const handleSimulatePayment = async () => {
    if (!currentOrder) return;

    if (simulationMode === "failure") {
      setIsRazorpayModalOpen(false);
      setCheckoutError("Payment was declined or cancelled in the Razorpay sandbox simulator.");
      return;
    }

    // Success simulation: save order in Supabase & memory store
    const mockPaymentId = `pay_rzp_mock_${Date.now().toString().slice(-8)}`;
    setIsRazorpayModalOpen(false);
    setIsProcessing(true);

    try {
      const saveRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cartItems: cart,
          customerDetails: {
            userId: currentUser?.id,
            name: customerName || currentUser?.full_name || "Customer",
            email: customerEmail || currentUser?.email || "shopper@apexstore.com",
            phone: customerPhone || "9876543210",
            shipping_address: shippingAddress,
            city: city,
            postal_code: postalCode,
          },
          userId: currentUser?.id,
          shippingAddress,
          city,
          postalCode,
          totalPrice: grandTotal,
          paymentId: mockPaymentId,
          orderId: currentOrder.id,
        }),
      });

      const saveResult = await saveRes.json();
      const finalId = saveResult.orderId || currentOrder.id;
      clearCart();
      router.push(
        `/checkout/success?order_id=${finalId}&payment_id=${mockPaymentId}`
      );
    } catch (err) {
      console.error("Order save notice:", err);
      clearCart();
      router.push(
        `/checkout/success?order_id=${currentOrder.id}&payment_id=${mockPaymentId}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-10 sm:py-14">
      {/* Official Razorpay Checkout Script */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => setIsSdkLoaded(true)}
      />

      {/* Razorpay Native / Sandbox Payment Modal Window */}
      {isRazorpayModalOpen && currentOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-900/10">
            {/* Modal Header with Razorpay Branding */}
            <div className="bg-[#0c2340] px-6 py-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-sm shadow-md">
                  RZP
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base tracking-tight">ApexStore</span>
                    <span className="rounded-md bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 ring-1 ring-emerald-500/30">
                      Sandbox
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">Order: {currentOrder.id}</p>
                </div>
              </div>

              <button
                onClick={() => setIsRazorpayModalOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Total Amount Ribbon */}
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-3.5 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500">Amount Payable</span>
              <span className="text-lg font-black text-slate-900">
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Payment Methods Tabs */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2.5">
                  Choose Payment Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("upi")}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition-all ${
                      paymentMethod === "upi"
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 ring-2 ring-indigo-500/20"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <QrCode className="h-5 w-5 mb-1.5" />
                    <span>UPI / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition-all ${
                      paymentMethod === "card"
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 ring-2 ring-indigo-500/20"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <CreditCard className="h-5 w-5 mb-1.5" />
                    <span>Cards</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("netbanking")}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-semibold transition-all ${
                      paymentMethod === "netbanking"
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 ring-2 ring-indigo-500/20"
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <Building2 className="h-5 w-5 mb-1.5" />
                    <span>Netbanking</span>
                  </button>
                </div>

                {/* Selected Method Details Preview */}
                {paymentMethod === "upi" && (
                  <div className="mt-2.5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">Indian Test UPI VPA:</span>
                      <code className="font-mono text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-200 font-bold">
                        success@razorpay
                      </code>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">Instant authorization in Razorpay sandbox (No OTP needed).</p>
                  </div>
                )}

                {paymentMethod === "card" && (
                  <div className="mt-2.5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-2.5 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">RuPay (Domestic):</span>
                      <code className="font-mono text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-200 font-bold">
                        5085 0500 0000 0001
                      </code>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-800">Visa (Domestic):</span>
                      <code className="font-mono text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-indigo-200 font-bold">
                        4012 0010 3714
                      </code>
                    </div>
                    <p className="text-[10px] text-slate-500 pt-0.5">Exp: 12/30 • CVV: 123 • OTP: Any 6 digits</p>
                  </div>
                )}

                {paymentMethod === "netbanking" && (
                  <div className="mt-2.5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-2.5 text-xs">
                    <span className="font-bold text-slate-800">Domestic Banks: </span>
                    <span className="text-slate-600">HDFC, ICICI, SBI, Axis, Kotak</span>
                    <p className="text-[10px] text-slate-500 mt-1">Select any Indian bank to simulate netbanking checkout.</p>
                  </div>
                )}
              </div>

              {/* Developer Sandbox Simulated Checkboxes */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 mb-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  <span>Developer Sandbox Test Operations</span>
                </div>
                <p className="text-[11px] text-slate-600 mb-3 leading-relaxed">
                  Select a simulation condition below to test both happy-path and failure-handling flows:
                </p>

                <div className="space-y-2 text-xs">
                  {/* Simulate Success Checkbox */}
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      simulationMode === "success"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-950 font-semibold"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="sandbox_simulation"
                      value="success"
                      checked={simulationMode === "success"}
                      onChange={() => setSimulationMode("success")}
                      className="h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                    />
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div className="flex-1">
                      <p className="leading-tight">Simulate Payment Success</p>
                      <p className="text-[10px] text-emerald-700 font-normal">
                        Generates a valid transaction token and redirects to confirmation
                      </p>
                    </div>
                  </label>

                  {/* Simulate Failure Checkbox */}
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      simulationMode === "failure"
                        ? "border-rose-500 bg-rose-50 text-rose-950 font-semibold"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="sandbox_simulation"
                      value="failure"
                      checked={simulationMode === "failure"}
                      onChange={() => setSimulationMode("failure")}
                      className="h-4 w-4 text-rose-600 focus:ring-rose-500"
                    />
                    <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <div className="flex-1">
                      <p className="leading-tight">Simulate Payment Failure</p>
                      <p className="text-[10px] text-rose-700 font-normal">
                        Simulates card decline, insufficient funds, or customer cancellation
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleSimulatePayment}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all active:scale-95 cursor-pointer"
              >
                <Lock className="h-4 w-4" />
                <span>
                  {simulationMode === "success"
                    ? `Complete Test Payment of ₹${grandTotal.toFixed(2)}`
                    : "Simulate Failed Checkout"}
                </span>
              </button>

              <div className="text-center text-[10px] text-slate-400">
                Secured by Razorpay • 256-Bit TLS End-to-End Encryption
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Cart Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Continue Shopping</span>
          </Link>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Clear Entire Cart
            </button>
          )}
        </div>

        {/* Page Title */}
        <div className="border-b border-slate-200 pb-5 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                Shopping Cart
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Review items, calculate duties & taxes, and proceed via Razorpay Checkout.
              </p>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Razorpay Sandbox</span>
            </span>
          </div>
        </div>

        {cart.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center my-12">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 mb-5">
              <ShoppingBag className="h-10 w-10" />
            </div>
            <h2 className="text-xl font-bold text-slate-950">Your shopping cart is empty</h2>
            <p className="mt-2 max-w-md text-sm text-slate-500 leading-relaxed">
              Explore our collection of minimal everyday hardware and gear to discover items to add to your cart.
            </p>
            <Link
              href="/"
              className="mt-6 flex items-center gap-2 rounded-full bg-slate-950 px-7 py-3 text-xs font-bold text-white hover:bg-indigo-600 transition-all shadow-md active:scale-95"
            >
              <span>Explore Products</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          /* Two-Column Layout */
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
            
            {/* Left Column: Cart Items List (8 cols) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm divide-y divide-slate-100">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-5 first:pt-0 last:pb-0"
                  >
                    {/* Item Image & Title */}
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                        {item.product.image_url ? (
                          <Image
                            src={item.product.image_url}
                            alt={item.product.name}
                            fill
                            className="object-cover object-center"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                            No Image
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-950 truncate">
                          {item.product.name}
                        </h3>
                        {item.product.description && (
                          <p className="mt-1 text-xs text-slate-500 line-clamp-2 max-w-md">
                            {item.product.description}
                          </p>
                        )}
                        <p className="mt-2 text-xs font-bold text-indigo-600">
                          ₹{Number(item.product.price).toFixed(2)} each
                        </p>
                      </div>
                    </div>

                    {/* Quantity Controls & Line Total */}
                    <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {/* Quantity Selector */}
                      <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 shadow-inner">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="p-2 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                          title="Decrease quantity"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-9 text-center text-xs font-bold text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="p-2 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                          title="Increase quantity"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Line Item Total */}
                      <div className="text-right min-w-[70px]">
                        <span className="text-sm font-extrabold text-slate-950">
                          ₹{(Number(item.product.price) * item.quantity).toFixed(2)}
                        </span>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete product"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code Input Card */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Promotional Code
                  </h3>
                </div>
                {appliedPromo ? (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs text-emerald-800 font-semibold">
                    <span>Code &quot;{appliedPromo}&quot; applied: 15% discount active</span>
                    <button
                      onClick={() => setAppliedPromo(null)}
                      className="text-xs text-emerald-700 underline hover:text-emerald-900 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyPromo} className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Enter code (e.g. APEX2026)"
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 uppercase"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-600 transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </form>
                )}
                {promoError && (
                  <p className="mt-2 text-xs font-medium text-rose-600">{promoError}</p>
                )}
              </div>

              {/* Delivery & Shipping Address (Autofilled from Profile) */}
              <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-indigo-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-950">
                        Delivery & Shipping Address
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {currentUser
                          ? "Autofilled from your saved account profile"
                          : "Account required to complete delivery & order tracking"}
                      </p>
                    </div>
                  </div>

                  {currentUser ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>{isProfileLoaded ? "Autofilled" : "Account Active"}</span>
                    </span>
                  ) : (
                    <Link
                      href="/login?redirect=/cart"
                      className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Sign In →</span>
                    </Link>
                  )}
                </div>

                {currentUser ? (
                  <div className="space-y-4 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Recipient Name
                        </label>
                        <div className="relative">
                          <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Full Name"
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Shipping Address (Flat / House No., Street, Area)
                      </label>
                      <textarea
                        rows={2}
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        placeholder="Enter your street delivery address..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          City
                        </label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="e.g. Mumbai"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Postal / PIN Code
                        </label>
                        <input
                          type="text"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder="e.g. 400050"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-medium text-slate-900 focus:border-indigo-600 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                      <span>Logged in as <strong>{currentUser.email}</strong></span>
                      <Link
                        href="/profile"
                        className="text-indigo-600 hover:text-indigo-800 font-semibold underline"
                      >
                        Edit Profile Address →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
                    <p className="text-xs text-slate-700 leading-relaxed">
                      You are currently browsing as a guest. Please sign in or register to autofill your saved shipping address and track your delivery.
                    </p>
                    <Link
                      href="/login?redirect=/cart"
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-all"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      <span>Sign In or Create Account</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Order Summary (4 cols) */}
            <div className="lg:col-span-5 xl:col-span-4 sticky top-24">
              <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-lg space-y-6">
                <h2 className="text-lg font-bold text-slate-950 border-b border-slate-100 pb-4">
                  Order Summary
                </h2>

                <div className="space-y-3.5 text-xs">
                  {/* Subtotal */}
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal ({totalCount} {totalCount === 1 ? "item" : "items"})</span>
                    <span className="font-bold text-slate-950">₹{totalPrice.toFixed(2)}</span>
                  </div>

                  {/* Promo Discount */}
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-semibold">
                      <span>Promo Discount (15%)</span>
                      <span>-₹{discountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Shipping Estimate */}
                  <div className="flex justify-between text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 text-slate-400" />
                      <span>Shipping Estimate</span>
                    </div>
                    {shippingCost === 0 ? (
                      <span className="font-bold text-emerald-600">FREE</span>
                    ) : (
                      <span className="font-bold text-slate-950">₹{shippingCost.toFixed(2)}</span>
                    )}
                  </div>
                  {shippingCost > 0 && (
                    <p className="text-[11px] text-slate-400">
                      Add ₹{(freeDeliveryThreshold - totalPrice).toFixed(2)} more for free express delivery.
                    </p>
                  )}

                  {/* Estimated Tax */}
                  <div className="flex justify-between text-slate-600">
                    <span>Estimated GST (18%)</span>
                    <span className="font-bold text-slate-950">₹{estimatedTax.toFixed(2)}</span>
                  </div>

                  {/* Grand Total */}
                  <div className="border-t border-slate-200 pt-4 flex justify-between items-baseline">
                    <div>
                      <span className="text-base font-extrabold text-slate-950">Grand Total</span>
                      <p className="text-[10px] text-slate-400">All applicable taxes included (INR)</p>
                    </div>
                    <span className="text-2xl font-black text-indigo-600">
                      ₹{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* 🇮🇳 Indian Domestic Test Credentials Box */}
                <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-950">
                      <CreditCard className="h-4 w-4 text-indigo-600 shrink-0" />
                      <span>🇮🇳 Indian Test Cards & UPI</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                      Razorpay Sandbox
                    </span>
                  </div>

                  {/* International Card Warning Notice */}
                  <div className="rounded-xl border border-amber-200/90 bg-amber-50 p-2.5 text-[11px] text-amber-900 leading-snug">
                    <div className="font-bold flex items-center gap-1 text-amber-950 mb-0.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      <span>Avoid International Cards</span>
                    </div>
                    Do NOT use <code className="bg-amber-100 text-amber-950 font-mono px-1 rounded font-bold">4111 1111 1111</code> (causes &ldquo;International cards are not supported&rdquo;). Use the Indian domestic cards below:
                  </div>

                  {/* Quick-Copy Test Credentials */}
                  <div className="space-y-2 text-xs">
                    {/* Domestic RuPay Card */}
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-xs">RuPay Domestic</span>
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-semibold">100% India</span>
                        </div>
                        <p className="font-mono text-slate-800 text-xs mt-0.5 tracking-wider font-semibold">
                          5085 0500 0000 0001
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("5085050000000001", "rupay")}
                        className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        title="Copy RuPay card number"
                      >
                        {copiedItem === "rupay" ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Domestic Visa Card */}
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-xs">Visa Domestic</span>
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-semibold">India BIN</span>
                        </div>
                        <p className="font-mono text-slate-800 text-xs mt-0.5 tracking-wider font-semibold">
                          4012 0010 3714
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("401200103714", "visa")}
                        className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        title="Copy Visa card number"
                      >
                        {copiedItem === "visa" ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* UPI Virtual Payment Address */}
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 text-xs">UPI VPA</span>
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">Instant / No OTP</span>
                        </div>
                        <p className="font-mono text-slate-800 text-xs mt-0.5 font-semibold">
                          success@razorpay
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard("success@razorpay", "upi")}
                        className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        title="Copy UPI ID"
                      >
                        {copiedItem === "upi" ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Card Security Parameters */}
                  <div className="text-[10px] text-slate-500 flex items-center justify-between border-t border-indigo-100 pt-2 font-medium">
                    <span>CVV: <strong className="font-mono text-slate-800">123</strong></span>
                    <span>Expiry: <strong className="font-mono text-slate-800">12/30</strong></span>
                    <span>OTP: <strong className="font-mono text-slate-800">Any 6 digits</strong></span>
                  </div>
                </div>

                {/* Error Banner */}
                {checkoutError && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      <span>Checkout Notice</span>
                    </div>
                    <p className="leading-relaxed">{checkoutError}</p>
                  </div>
                )}

                {/* Checkout Action Button */}
                <button
                  onClick={handleProceedToPayment}
                  disabled={isProcessing}
                  className={`w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-sm font-bold text-white shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 cursor-pointer ${
                    currentUser
                      ? "bg-indigo-600 shadow-indigo-600/30 hover:bg-indigo-500 hover:shadow-indigo-600/40"
                      : "bg-slate-900 shadow-slate-900/30 hover:bg-indigo-600 hover:shadow-indigo-600/30"
                  }`}
                >
                  <Lock className="h-4 w-4" />
                  <span>
                    {isProcessing
                      ? "Initializing Razorpay..."
                      : currentUser
                      ? `Proceed to Payment (₹${grandTotal.toFixed(2)})`
                      : "Sign In to Proceed to Payment"}
                  </span>
                  {!isProcessing && <ArrowRight className="h-4 w-4 ml-1" />}
                </button>

                {!currentUser && (
                  <p className="text-center text-[11px] text-slate-500 font-medium">
                    You will be directed to Sign In before completing payment.
                  </p>
                )}

                {/* Trust and Assurance Badges */}
                <div className="border-t border-slate-100 pt-5 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Razorpay 256-Bit SSL Encrypted Checkout</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Truck className="h-4 w-4 text-indigo-500 shrink-0" />
                    <span>Dispatched in 24 Hours with Live Tracking</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
