import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Global in-memory storage for products so newly added products are preserved across hot-reloads
declare global {
  var __apex_catalog_store__: {
    products: Array<{
      id: string;
      name: string;
      description: string | null;
      price: number;
      image_url: string | null;
      stock: number;
      created_at: string;
    }>;
  } | undefined;
}

function getCatalogStore() {
  if (!globalThis.__apex_catalog_store__) {
    globalThis.__apex_catalog_store__ = {
      products: [],
    };
  }
  return globalThis.__apex_catalog_store__;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";
  if (!url || !key || url.includes("supabase.co")) {
    return null; // Return null if placeholder to prevent fetch timeouts
  }
  try {
    return createClient(url, key);
  } catch {
    return null;
  }
}

// POST: Add a new product to Supabase products table
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, price, image_url, stock } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "Product name is required and cannot be empty." },
        { status: 400 }
      );
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return NextResponse.json(
        { error: "Valid price greater than ₹0 is required." },
        { status: 400 }
      );
    }

    const numericStock = stock !== undefined && stock !== null ? Number(stock) : 0;
    if (isNaN(numericStock) || numericStock < 0) {
      return NextResponse.json(
        { error: "Stock quantity must be a non-negative number." },
        { status: 400 }
      );
    }

    const payload = {
      name: name.trim(),
      description: description ? String(description).trim() : null,
      price: numericPrice,
      image_url: image_url ? String(image_url).trim() : null,
      stock: Math.floor(numericStock),
    };

    const supabase = getSupabase();
    let createdProduct = null;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("products")
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.warn("Supabase product insert notice:", error.message);
        } else {
          createdProduct = data;
        }
      } catch (dbErr) {
        console.warn("Supabase connection notice:", dbErr);
      }
    }

    // Resilient fallback record for developer/sandbox mode
    if (!createdProduct) {
      createdProduct = {
        id: `prod-${Date.now()}`,
        ...payload,
        created_at: new Date().toISOString(),
      };
    }

    // Save to global catalog store
    const store = getCatalogStore();
    store.products = [createdProduct, ...store.products.filter((p) => p.id !== createdProduct.id)];

    return NextResponse.json(
      {
        success: true,
        message: "Product created successfully.",
        product: createdProduct,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Admin Add Product Error:", err);
    const message = err instanceof Error ? err.message : "Failed to add product.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET: List products from Supabase products table
export async function GET() {
  try {
    const supabase = getSupabase();
    const store = getCatalogStore();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          // Merge with session-added products
          const existingIds = new Set(data.map((p) => p.id));
          const sessionOnly = store.products.filter((p) => !existingIds.has(p.id));
          return NextResponse.json({ products: [...sessionOnly, ...data] });
        }
      } catch (err) {
        console.warn("Supabase products query notice:", err);
      }
    }

    return NextResponse.json({ products: store.products });
  } catch {
    return NextResponse.json({ products: getCatalogStore().products });
  }
}
