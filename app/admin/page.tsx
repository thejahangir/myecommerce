"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Package,
  Clock,
  Truck,
  CheckCircle2,
  RefreshCw,
  Search,
  ExternalLink,
  DollarSign,
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  Plus,
} from "lucide-react";
import AddProductForm from "@/src/components/AddProductForm";

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  total_price: number;
  status: "Pending" | "Processing" | "Shipped" | "Delivered";
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  created_at: string;
  order_items?: OrderItem[];
}

const STATUS_OPTIONS: Order["status"][] = ["Pending", "Processing", "Shipped", "Delivered"];

const STATUS_COLORS: Record<Order["status"], { bg: string; text: string; border: string }> = {
  Pending: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  Processing: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  Shipped: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  Delivered: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"orders" | "add-product">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");

  const syncOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch("/api/orders");
        if (res.ok && !ignore) {
          const data = await res.json();
          setOrders(data.orders || []);
        }
      } catch (err) {
        console.error("Failed to load orders:", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: Order["status"]) => {
    setUpdatingId(orderId);
    setFeedbackNotice(null);

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );

    try {
      const res = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status in database.");
      }

      setFeedbackNotice(`Order ${orderId.slice(0, 8)} status updated to "${newStatus}"`);
      setTimeout(() => setFeedbackNotice(null), 3000);
    } catch (err: unknown) {
      console.error("Update error:", err);
      alert("Could not update order status. Please check database permissions.");
      // Rollback by re-fetching
      syncOrders();
    } finally {
      setUpdatingId(null);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalRevenue = orders.reduce((acc, o) => acc + Number(o.total_price || 0), 0);
    const pendingCount = orders.filter((o) => o.status === "Pending").length;
    const processingCount = orders.filter((o) => o.status === "Processing").length;
    const shippedCount = orders.filter((o) => o.status === "Shipped").length;
    const deliveredCount = orders.filter((o) => o.status === "Delivered").length;
    return { totalRevenue, pendingCount, processingCount, shippedCount, deliveredCount };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        order.id.toLowerCase().includes(q) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(q)) ||
        (order.customer_email && order.customer_email.toLowerCase().includes(q)) ||
        (order.razorpay_payment_id && order.razorpay_payment_id.toLowerCase().includes(q));

      const matchesStatus =
        filterStatus === "All" || order.status.toLowerCase() === filterStatus.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, filterStatus]);

  return (
    <div className="min-h-screen bg-slate-50 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Navigation & Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Storefront</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab(activeTab === "orders" ? "add-product" : "orders")}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20 active:scale-95 cursor-pointer"
            >
              {activeTab === "orders" ? (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add New Product</span>
                </>
              ) : (
                <>
                  <Package className="h-3.5 w-3.5" />
                  <span>Manage Orders</span>
                </>
              )}
            </button>

            {activeTab === "orders" && (
              <button
                onClick={syncOrders}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-sm cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-indigo-600" : ""}`} />
                <span>Sync Live Orders</span>
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              {activeTab === "orders" ? "Admin Order Management" : "Add Catalog Product"}
            </h1>
            <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
              Supabase
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {activeTab === "orders"
              ? "Monitor real-time customer purchases, view item line breakdowns, and adjust fulfillment tracking stages."
              : "Create, configure, and publish new products directly to the Supabase store catalog with live inventory."}
          </p>
        </div>

        {/* Navigation Toggle Tabs: Manage Orders vs Add New Product */}
        <div className="flex items-center gap-2 border-b border-slate-200 mb-8 pb-px">
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-2 py-3 px-5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === "orders"
                ? "border-indigo-600 text-indigo-600 bg-white rounded-t-xl shadow-xs"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Manage Orders</span>
            <span className="rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px] font-bold">
              {orders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("add-product")}
            className={`flex items-center gap-2 py-3 px-5 font-bold text-xs uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === "add-product"
                ? "border-indigo-600 text-indigo-600 bg-white rounded-t-xl shadow-xs"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <Plus className="h-4 w-4" />
            <span>Add New Product</span>
            <span className="rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[10px] font-bold">
              Form View
            </span>
          </button>
        </div>

        {/* Tab Content: Add Product Form OR Manage Orders */}
        {activeTab === "add-product" ? (
          <AddProductForm />
        ) : (
          <>
            {/* Feedback Alert Toast */}
            {feedbackNotice && (
              <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs font-semibold text-emerald-800 flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{feedbackNotice}</span>
                </div>
                <span className="text-[10px] text-emerald-600">Updated in Supabase</span>
              </div>
            )}

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5 mb-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Revenue</span>
              <DollarSign className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-black text-slate-950">₹{metrics.totalRevenue.toFixed(2)}</p>
            <p className="text-[11px] text-slate-500 mt-1">{orders.length} total orders</p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
            <div className="flex items-center justify-between text-amber-700 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Pending</span>
              <Clock className="h-4 w-4" />
            </div>
            <p className="text-2xl font-black text-amber-950">{metrics.pendingCount}</p>
            <p className="text-[11px] text-amber-700 mt-1">Awaiting fulfillment</p>
          </div>

          <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-5 shadow-sm">
            <div className="flex items-center justify-between text-sky-700 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Processing</span>
              <Package className="h-4 w-4" />
            </div>
            <p className="text-2xl font-black text-sky-950">{metrics.processingCount}</p>
            <p className="text-[11px] text-sky-700 mt-1">In packaging</p>
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 shadow-sm">
            <div className="flex items-center justify-between text-indigo-700 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Shipped</span>
              <Truck className="h-4 w-4" />
            </div>
            <p className="text-2xl font-black text-indigo-950">{metrics.shippedCount}</p>
            <p className="text-[11px] text-indigo-700 mt-1">In transit</p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-emerald-700 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Delivered</span>
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <p className="text-2xl font-black text-emerald-950">{metrics.deliveredCount}</p>
            <p className="text-[11px] text-emerald-700 mt-1">Completed orders</p>
          </div>
        </div>

        {/* Filters & Search Bar */}
        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, Customer, or Payment ID..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-sm focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Status Filter:</span>
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3.5 pr-8 text-xs font-semibold text-slate-700 shadow-sm focus:border-indigo-600 focus:outline-none cursor-pointer"
              >
                <option value="All">All Statuses ({orders.length})</option>
                <option value="Pending">Pending ({metrics.pendingCount})</option>
                <option value="Processing">Processing ({metrics.processingCount})</option>
                <option value="Shipped">Shipped ({metrics.shippedCount})</option>
                <option value="Delivered">Delivered ({metrics.deliveredCount})</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Orders Table Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-slate-400">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-xs font-bold">Querying Supabase orders table...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <AlertCircle className="h-12 w-12 text-slate-300 mb-3" />
              <h3 className="text-base font-bold text-slate-900">No orders found</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm">
                {orders.length === 0
                  ? "Orders placed through the cart checkout will automatically populate in this table."
                  : "No orders match your search query."}
              </p>
              {orders.length === 0 && (
                <Link
                  href="/"
                  className="mt-5 rounded-full bg-slate-950 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-600 transition-colors"
                >
                  Go to Storefront & Place Order
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">Order ID & Date</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Purchased Items</th>
                    <th className="px-6 py-4">Total Amount</th>
                    <th className="px-6 py-4">Payment Reference</th>
                    <th className="px-6 py-4">Fulfillment Status</th>
                    <th className="px-6 py-4 text-right">Customer View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredOrders.map((order) => {
                    const statusColor = STATUS_COLORS[order.status] || STATUS_COLORS.Pending;
                    const dateFormatted = order.created_at
                      ? new Date(order.created_at).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Recent";

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Order ID & Date */}
                        <td className="px-6 py-4 align-top font-mono">
                          <p className="font-bold text-slate-950 break-all">{order.id}</p>
                          <p className="text-[11px] text-slate-400 font-sans mt-0.5">{dateFormatted}</p>
                        </td>

                        {/* Customer */}
                        <td className="px-6 py-4 align-top">
                          <p className="font-bold text-slate-900">{order.customer_name || "Customer"}</p>
                          <p className="text-slate-500 text-[11px]">{order.customer_email || "N/A"}</p>
                          {order.customer_phone && (
                            <p className="text-slate-400 text-[10px] mt-0.5">{order.customer_phone}</p>
                          )}
                        </td>

                        {/* Order Items */}
                        <td className="px-6 py-4 align-top">
                          {order.order_items && order.order_items.length > 0 ? (
                            <ul className="space-y-1">
                              {order.order_items.map((item) => (
                                <li key={item.id} className="text-slate-700 flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900">{item.quantity}x</span>
                                  <span className="truncate max-w-[150px]">{item.product_name}</span>
                                  <span className="text-slate-400 text-[10px]">
                                    (₹{Number(item.unit_price).toFixed(2)})
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-slate-400 italic">Cart items</span>
                          )}
                        </td>

                        {/* Total Amount */}
                        <td className="px-6 py-4 align-top font-bold text-slate-950">
                          ₹{Number(order.total_price).toFixed(2)}
                        </td>

                        {/* Payment ID */}
                        <td className="px-6 py-4 align-top font-mono text-[11px]">
                          {order.razorpay_payment_id ? (
                            <span className="inline-flex items-center rounded-lg bg-indigo-50 border border-indigo-200 px-2 py-1 text-indigo-700">
                              {order.razorpay_payment_id}
                            </span>
                          ) : (
                            <span className="text-slate-400">Simulated / Cash</span>
                          )}
                        </td>

                        {/* Status Dropdown */}
                        <td className="px-6 py-4 align-top">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <select
                                value={order.status}
                                disabled={updatingId === order.id}
                                onChange={(e) =>
                                  handleStatusChange(order.id, e.target.value as Order["status"])
                                }
                                aria-label="Update order fulfillment status"
                                className={`appearance-none rounded-xl border px-3 py-1.5 pr-7 text-xs font-bold cursor-pointer transition-all shadow-sm focus:outline-none ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}
                              >
                                {STATUS_OPTIONS.map((opt) => (
                                  <option key={opt} value={opt} className="bg-white text-slate-900 font-medium">
                                    {opt}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            </div>

                            {updatingId === order.id && (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                            )}
                          </div>
                        </td>

                        {/* Customer Tracking View Link */}
                        <td className="px-6 py-4 align-top text-right">
                          <Link
                            href={`/checkout/success?order_id=${order.id}${
                              order.razorpay_payment_id ? `&payment_id=${order.razorpay_payment_id}` : ""
                            }`}
                            target="_blank"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                          >
                            <span>Live Tracker</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    )}

      </div>
    </div>
  );
}
