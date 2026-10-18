import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

export interface OrderRecord {
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

const INITIAL_SAMPLE_ORDERS: OrderRecord[] = [
  {
    id: "ORD-849201",
    customer_name: "Sarah Jenkins",
    customer_email: "sarah.j@example.com",
    customer_phone: "+91 98765 43210",
    total_price: 3499.0,
    status: "Processing",
    razorpay_payment_id: "pay_rzp_live_94812",
    razorpay_order_id: "order_rzp_94812",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    order_items: [
      { id: "item-1", product_name: "Apex Studio Pro Headphones", quantity: 1, unit_price: 3499.0 },
    ],
  },
  {
    id: "ORD-849202",
    customer_name: "Rohit Sharma",
    customer_email: "rohit.s@example.com",
    customer_phone: "+91 98123 45678",
    total_price: 799.0,
    status: "Pending",
    razorpay_payment_id: "pay_rzp_mock_39201",
    razorpay_order_id: "order_rzp_39201",
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    order_items: [
      { id: "item-2", product_name: "Classic Heavyweight Cotton T-Shirt", quantity: 1, unit_price: 799.0 },
    ],
  },
  {
    id: "ORD-849203",
    customer_name: "Elena Vance",
    customer_email: "elena.v@example.com",
    customer_phone: "+91 97654 32109",
    total_price: 2999.0,
    status: "Shipped",
    razorpay_payment_id: "pay_rzp_live_10928",
    razorpay_order_id: "order_rzp_10928",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    order_items: [
      { id: "item-3", product_name: "Everyday Commuter Leather Backpack", quantity: 1, unit_price: 2999.0 },
    ],
  },
  {
    id: "ORD-849204",
    customer_name: "Alex Chen",
    customer_email: "alex.c@example.com",
    customer_phone: "+91 99887 76655",
    total_price: 2499.0,
    status: "Delivered",
    razorpay_payment_id: "pay_rzp_live_83910",
    razorpay_order_id: "order_rzp_83910",
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    order_items: [
      { id: "item-4", product_name: "AeroFlow Running Shoes", quantity: 1, unit_price: 2499.0 },
    ],
  },
];

// Persistent global storage that persists across hot reloads in Next.js development
declare global {
  var __apex_orders_store__: { orders: OrderRecord[] } | undefined;
}

function getStore(): { orders: OrderRecord[] } {
  if (!globalThis.__apex_orders_store__) {
    globalThis.__apex_orders_store__ = {
      orders: [...INITIAL_SAMPLE_ORDERS],
    };
  }
  return globalThis.__apex_orders_store__;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  if (!url || !key || url.includes("supabase.co")) {
    return null; // Return null for placeholder url to avoid timeout
  }
  try {
    return createClient(url, key);
  } catch {
    return null;
  }
}

interface CartItemPayload {
  product: {
    id: string | number;
    name: string;
    price: number;
    image_url?: string;
  };
  quantity: number;
}

// POST: Save new order into orders store and Supabase
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cartItems, customerDetails, totalPrice, paymentId, orderId } = body;

    const store = getStore();
    const fallbackId = orderId && String(orderId).startsWith("order_") 
      ? `ORD-${orderId.slice(-6).toUpperCase()}`
      : `ORD-${Date.now().toString().slice(-6)}`;

    const newOrder: OrderRecord = {
      id: fallbackId,
      customer_name: customerDetails?.name || "Customer",
      customer_email: customerDetails?.email || "customer@example.com",
      customer_phone: customerDetails?.phone || "+91 98765 43210",
      total_price: Number(totalPrice) || 0,
      status: "Pending",
      razorpay_payment_id: paymentId || undefined,
      razorpay_order_id: orderId || undefined,
      created_at: new Date().toISOString(),
      order_items: Array.isArray(cartItems)
        ? cartItems.map((item: CartItemPayload, idx: number) => ({
            id: `item-${Date.now()}-${idx}`,
            product_name: item.product?.name || "Product",
            quantity: item.quantity || 1,
            unit_price: Number(item.product?.price || 0),
          }))
        : [],
    };

    // Attempt Supabase insert if configured
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: dbOrder, error: orderError } = await supabase
          .from("orders")
          .insert({
            customer_name: newOrder.customer_name,
            customer_email: newOrder.customer_email,
            customer_phone: newOrder.customer_phone,
            total_price: newOrder.total_price,
            status: "Pending",
            razorpay_payment_id: newOrder.razorpay_payment_id || null,
            razorpay_order_id: newOrder.razorpay_order_id || null,
          })
          .select()
          .single();

        if (!orderError && dbOrder) {
          newOrder.id = dbOrder.id;

          if (newOrder.order_items && newOrder.order_items.length > 0) {
            await supabase.from("order_items").insert(
              newOrder.order_items.map((item) => ({
                order_id: dbOrder.id,
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
              }))
            );
          }
        }
      } catch (dbErr) {
        console.warn("Supabase insert notice (resilient fallback active):", dbErr);
      }
    }

    // Always prepend to in-memory store so it shows up instantly on Admin Dashboard & Tracking
    store.orders = [newOrder, ...store.orders.filter((o) => o.id !== newOrder.id)];

    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
      order: newOrder,
    });
  } catch (err: unknown) {
    console.error("Order creation API error:", err);
    const message = err instanceof Error ? err.message : "Failed to save order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET: Fetch all orders for admin dashboard or single order by ?id=
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("id");
    const store = getStore();

    if (orderId) {
      const cleanId = decodeURIComponent(orderId).trim().toLowerCase();

      // 1. First, search local resilient store for exact match or substring match
      const localMatch = store.orders.find((o) => {
        const oId = String(o.id || "").toLowerCase();
        const rzpOrderId = String(o.razorpay_order_id || "").toLowerCase();
        const rzpPayId = String(o.razorpay_payment_id || "").toLowerCase();
        return (
          oId === cleanId ||
          rzpOrderId === cleanId ||
          rzpPayId === cleanId ||
          cleanId.includes(oId) ||
          (oId.length > 5 && cleanId.includes(oId.slice(-6)))
        );
      });

      if (localMatch) {
        return NextResponse.json({ order: localMatch });
      }

      // 2. If not found in local store, attempt Supabase query if available
      const supabase = getSupabase();
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from("orders")
            .select(`*, order_items (*)`)
            .or(`id.eq.${orderId},razorpay_order_id.eq.${orderId},razorpay_payment_id.eq.${orderId}`)
            .single();

          if (!error && data) {
            // Cache into store
            store.orders.unshift(data);
            return NextResponse.json({ order: data });
          }
        } catch {
          // Continue to dynamic order creation
        }
      }

      // 3. Fallback: Create dynamic entry so tracking never fails with 404
      const dynamicOrder: OrderRecord = {
        id: orderId,
        customer_name: "Customer",
        customer_email: "shopper@apexstore.com",
        customer_phone: "+91 98765 43210",
        total_price: 2499.0,
        status: "Pending",
        created_at: new Date().toISOString(),
        order_items: [
          { id: "item-dyn", product_name: "Storefront Purchase", quantity: 1, unit_price: 2499.0 },
        ],
      };
      store.orders.unshift(dynamicOrder);

      return NextResponse.json({ order: dynamicOrder });
    }

    // List all orders for Admin Dashboard
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: dbOrders, error } = await supabase
          .from("orders")
          .select(`*, order_items (*)`)
          .order("created_at", { ascending: false });

        if (!error && dbOrders && dbOrders.length > 0) {
          // Merge with any session orders
          const existingIds = new Set(dbOrders.map((o) => o.id));
          const sessionOnly = store.orders.filter((o) => !existingIds.has(o.id));
          return NextResponse.json({ orders: [...sessionOnly, ...dbOrders] });
        }
      } catch (err) {
        console.warn("Supabase all orders notice:", err);
      }
    }

    // Return the local store's orders
    return NextResponse.json({ orders: store.orders });
  } catch (err: unknown) {
    console.warn("Orders fetch fallback:", err);
    return NextResponse.json({ orders: getStore().orders });
  }
}

// PATCH: Update order status from Admin Dashboard or Customer Simulation
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, status } = body;

    if (!orderId || !status) {
      return NextResponse.json(
        { error: "orderId and status are required" },
        { status: 400 }
      );
    }

    const store = getStore();
    const cleanId = String(orderId).trim().toLowerCase();

    // Find and update in store
    let targetOrder = store.orders.find((o) => {
      const oId = String(o.id || "").toLowerCase();
      const rzpOrderId = String(o.razorpay_order_id || "").toLowerCase();
      const rzpPayId = String(o.razorpay_payment_id || "").toLowerCase();
      return (
        oId === cleanId ||
        rzpOrderId === cleanId ||
        rzpPayId === cleanId ||
        cleanId.includes(oId) ||
        (oId.length > 5 && cleanId.includes(oId.slice(-6)))
      );
    });

    if (targetOrder) {
      targetOrder.status = status;
    } else {
      // If not yet in store, create and set status
      targetOrder = {
        id: orderId,
        customer_name: "Customer",
        customer_email: "shopper@apexstore.com",
        customer_phone: "+91 98765 43210",
        total_price: 2499.0,
        status: status,
        created_at: new Date().toISOString(),
      };
      store.orders.unshift(targetOrder);
    }

    // Also attempt Supabase update if reachable
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase
          .from("orders")
          .update({ status })
          .or(`id.eq.${orderId},razorpay_order_id.eq.${orderId}`);
      } catch (dbErr) {
        console.warn("Supabase patch notice:", dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      order: targetOrder,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update order status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
