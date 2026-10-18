"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import {
  ShoppingBag,
  Search,
  Heart,
  Star,
  ArrowRight,
  ShieldCheck,
  Truck,
  RotateCcw,
  Headphones,
  Check,
  Sparkles,
  Zap,
  ChevronDown,
  X,
  Mail,
  Loader2,
  Database,
} from "lucide-react";
import { supabase } from "@/src/utils/supabase/client";
import { useCart, CartProduct } from "@/src/context/CartContext";

// Fallback seed products matching supabase_schema.sql in case credentials are not yet configured
const FALLBACK_PRODUCTS: CartProduct[] = [
  {
    id: "seed-1",
    name: "AeroFlow Running Shoes",
    description: "Lightweight, breathable engineered mesh with responsive nitrogen-infused foam cushioning.",
    price: 2499.0,
    image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80",
    stock: 45,
  },
  {
    id: "seed-2",
    name: "SonicPro Wireless Headphones",
    description: "Premium studio-grade sound with active noise cancellation and 40-hour battery life.",
    price: 4999.0,
    image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
    stock: 30,
  },
  {
    id: "seed-3",
    name: "Classic Heavyweight Cotton T-Shirt",
    description: "Relaxed fit crafted from 100% combed organic ring-spun cotton with reinforced collar.",
    price: 799.0,
    image_url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
    stock: 120,
  },
  {
    id: "seed-4",
    name: "Vanguard Minimalist Chrono Watch",
    description: "Surgical grade 316L stainless steel case with sapphire crystal glass and genuine leather strap.",
    price: 3499.0,
    image_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
    stock: 25,
  },
  {
    id: "seed-5",
    name: "Everyday Commuter Leather Backpack",
    description: "Weatherproof waxed canvas and vegetable-tanned leather backpack with 16-inch laptop compartment.",
    price: 2999.0,
    image_url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80",
    stock: 18,
  },
];

export default function Home() {
  const { addToCart, setIsCartOpen } = useCart();
  const [products, setProducts] = useState<CartProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"supabase" | "fallback">("fallback");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Interactive UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"featured" | "price-low" | "price-high" | "name">("featured");
  const [wishlist, setWishlist] = useState<(string | number)[]>([]);
  const [addedItemName, setAddedItemName] = useState<string | null>(null);
  const [emailSubscribed, setEmailSubscribed] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  // Fetch live products from Supabase
  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      setErrorMessage(null);

      try {
        // Fetch newly added products from admin catalog API
        let sessionProducts: CartProduct[] = [];
        try {
          const apiRes = await fetch("/api/admin/products");
          if (apiRes.ok) {
            const apiData = await apiRes.json();
            if (apiData.products && Array.isArray(apiData.products)) {
              sessionProducts = apiData.products.map((p: {
                id: string | number;
                name: string;
                description?: string;
                price: number;
                image_url?: string;
                stock?: number;
              }) => ({
                id: p.id,
                name: p.name,
                description: p.description,
                price: Number(p.price),
                image_url: p.image_url,
                stock: Number(p.stock),
              }));
            }
          }
        } catch {
          // Ignore API fetch notice
        }

        const { data, error } = await supabase
          .from("products")
          .select("id, name, description, price, image_url, stock")
          .order("name", { ascending: true });

        if (error) {
          console.warn("Supabase query notice:", error.message);
          setErrorMessage(error.message);
          const combined = [
            ...sessionProducts,
            ...FALLBACK_PRODUCTS.filter((fb) => !sessionProducts.some((sp) => sp.name === fb.name)),
          ];
          setProducts(combined);
          setDataSource("fallback");
        } else if (data && data.length > 0) {
          // Normalize prices to numbers
          const formatted = data.map((item) => ({
            ...item,
            price: Number(item.price),
          }));
          const combined = [
            ...sessionProducts,
            ...formatted.filter((db) => !sessionProducts.some((sp) => sp.id === db.id)),
          ];
          setProducts(combined);
          setDataSource("supabase");
        } else {
          // Empty table or placeholder credentials
          const combined = [
            ...sessionProducts,
            ...FALLBACK_PRODUCTS.filter((fb) => !sessionProducts.some((sp) => sp.name === fb.name)),
          ];
          setProducts(combined);
          setDataSource("fallback");
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("Could not connect to Supabase:", message);
        setErrorMessage("Using local preview data. Set Supabase credentials in .env.local to fetch live.");
        setProducts(FALLBACK_PRODUCTS);
        setDataSource("fallback");
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  const handleAddToCart = (product: CartProduct) => {
    addToCart(product);
    setAddedItemName(product.name);
    setTimeout(() => {
      setAddedItemName((curr) => (curr === product.name ? null : curr));
    }, 2800);
  };

  const toggleWishlist = (id: string | number) => {
    setWishlist((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const filteredProducts = useMemo(() => {
    return products
      .filter((item) => {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === "price-low") return a.price - b.price;
        if (sortBy === "price-high") return b.price - a.price;
        if (sortBy === "name") return a.name.localeCompare(b.name);
        return 0;
      });
  }, [products, searchQuery, sortBy]);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      setEmailSubscribed(true);
      setEmailInput("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-500 selection:text-white">
      {/* Floating Add to Cart Toast */}
      {addedItemName && (
        <aside
          aria-label="Cart Notification"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl bg-slate-950/95 px-5 py-3.5 text-sm text-white shadow-2xl backdrop-blur-md ring-1 ring-white/10 transition-all animate-in fade-in slide-in-from-bottom-5"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
            <Check className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold leading-tight">Added to Bag</p>
            <p className="text-xs text-slate-400 truncate max-w-[200px]">{addedItemName}</p>
          </div>
          <button
            onClick={() => setIsCartOpen(true)}
            className="ml-3 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold hover:bg-indigo-500 transition-colors"
          >
            View Bag
          </button>
          <button
            onClick={() => setAddedItemName(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </aside>
      )}

      {/* Top Announcement Bar */}
      <div className="bg-slate-900 px-4 py-2.5 text-center text-xs font-medium text-slate-300 sm:text-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <span>Spring Launch: Complimentary Express Shipping On All Orders</span>
          <span className="hidden sm:inline text-slate-500">•</span>
          <span className="hidden sm:inline text-amber-400 font-semibold underline underline-offset-2 cursor-pointer hover:text-amber-300">
            Code: APEX2026
          </span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-indigo-50/20 to-slate-50 pt-12 pb-16 lg:pt-16 lg:pb-24">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-7 flex flex-col items-start">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/80 bg-indigo-50/80 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm backdrop-blur-sm mb-6">
                <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
                Live Supabase Inventory
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl leading-[1.12]">
                Architectural essentials for{" "}
                <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-600 bg-clip-text text-transparent">
                  modern living
                </span>
                .
              </h1>

              <p className="mt-6 max-w-xl text-base text-slate-600 sm:text-lg leading-relaxed">
                Explore our curated catalog synced directly with Supabase. Built with Next.js,
                TypeScript, and Tailwind CSS for seamless shopping.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href="#products"
                  className="flex items-center gap-2 rounded-full bg-indigo-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 hover:shadow-indigo-600/40 transition-all active:scale-95"
                >
                  <span>Browse Products</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="flex items-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-3.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-100 hover:border-slate-400 transition-all active:scale-95"
                >
                  <ShoppingBag className="h-4 w-4 text-indigo-600" />
                  <span>Open Bag</span>
                </button>
              </div>

              {/* Social Proof */}
              <div className="mt-12 flex flex-wrap items-center gap-8 border-t border-slate-200 pt-8">
                <div>
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400" />
                    ))}
                    <span className="ml-1 text-sm font-bold text-slate-900">4.9/5</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 font-medium">Over 10,000+ Happy Customers</p>
                </div>
                <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                <div>
                  <p className="text-lg font-bold text-slate-950">Fast Shipping</p>
                  <p className="text-xs text-slate-500 font-medium">Delivered within 2-3 business days</p>
                </div>
              </div>
            </div>

            {/* Hero Visual Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-indigo-500 to-sky-400 opacity-20 blur-xl" />
                <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 shadow-2xl">
                  <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-100">
                    <Image
                      src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80"
                      alt="SonicPro Wireless Headphones Hero"
                      fill
                      priority
                      sizes="(max-width: 768px) 100vw, 500px"
                      className="object-cover object-center hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute top-3 left-3 rounded-full bg-slate-950/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
                      Featured Hardware
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold tracking-wider text-indigo-600 uppercase">Top Seller</p>
                      <h3 className="text-lg font-bold text-slate-950">SonicPro Headphones</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-extrabold text-slate-950">₹4,999.00</p>
                      <p className="text-xs text-slate-400 line-through">₹5,999.00</p>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      handleAddToCart({
                        id: "hero-1",
                        name: "SonicPro Wireless Headphones",
                        price: 4999,
                        image_url:
                          "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
                      })
                    }
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 text-xs font-semibold text-white hover:bg-indigo-600 transition-colors"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Quick Add to Bag
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Highlights Strip */}
      <section id="features" className="border-y border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Free Express Delivery</h4>
                <p className="text-xs text-slate-500">Tracked worldwide shipping</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">30-Day Guarantee</h4>
                <p className="text-xs text-slate-500">Hassle-free instant returns</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">2-Year Warranty</h4>
                <p className="text-xs text-slate-500">100% genuine guaranteed</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Headphones className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">24/7 Support</h4>
                <p className="text-xs text-slate-500">Direct concierge assistance</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Product Catalog Section */}
      <main id="products" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600">
              <Database className="h-3.5 w-3.5" />
              <span>
                {dataSource === "supabase" ? "Live Supabase Database" : "Curated Product Catalog"}
              </span>
            </div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
              Featured Products
            </h2>
            <p className="mt-2 max-w-xl text-sm text-slate-600">
              Live products fetched directly from your Supabase database table with real-time stock and instant cart addition.
            </p>
          </div>

          {/* Controls: Search & Sort */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-48 sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs font-medium text-slate-800 placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "featured" | "price-low" | "price-high" | "name")
                }
                aria-label="Sort products"
                className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3.5 pr-8 text-xs font-semibold text-slate-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="featured">Featured First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name">Alphabetical</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Database Status Notice Banner (if using fallback due to placeholder credentials) */}
        {dataSource === "fallback" && (
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-800">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                <strong>Displaying Sample Products:</strong>{" "}
                {errorMessage
                  ? errorMessage
                  : "To sync with your real Supabase instance, add your project URL & Anon Key to .env.local and run the SQL migration from supabase_schema.sql."}
              </span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="mt-20 flex flex-col items-center justify-center py-12 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
            <p className="text-sm font-semibold">Loading live products from Supabase...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="mt-16 flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Search className="h-10 w-10 text-slate-400 mb-3" />
            <h3 className="text-base font-bold text-slate-900">No matching products found</h3>
            <p className="mt-1 text-xs text-slate-500">Try adjusting your search query.</p>
            <button
              onClick={() => setSearchQuery("")}
              className="mt-4 rounded-full bg-slate-950 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-600 transition-colors"
            >
              Clear Search
            </button>
          </div>
        ) : (
          /* Product Grid */
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const isWishlisted = wishlist.includes(product.id);

              return (
                <div
                  key={product.id}
                  className="group relative flex flex-col rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300"
                >
                  {/* Image Container */}
                  <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-slate-100">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400 text-xs">
                        No Image
                      </div>
                    )}

                    {/* Stock badge */}
                    {product.stock !== undefined && (
                      <span className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold tracking-wide text-slate-900 shadow-sm backdrop-blur-md">
                        {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                      </span>
                    )}

                    {/* Wishlist Button */}
                    <button
                      onClick={() => toggleWishlist(product.id)}
                      aria-label="Toggle Wishlist"
                      className={`absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-sm backdrop-blur-md transition-all active:scale-90 ${
                        isWishlisted ? "text-rose-500" : "text-slate-400 hover:text-rose-500"
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${isWishlisted ? "fill-rose-500" : ""}`} />
                    </button>
                  </div>

                  {/* Product Details */}
                  <div className="mt-4 flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold text-indigo-600">Product #{String(product.id).slice(0, 5)}</span>
                        <div className="flex items-center gap-1 font-semibold text-slate-700">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span>4.9</span>
                        </div>
                      </div>

                      <h3 className="mt-1.5 text-sm font-bold text-slate-950 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {product.name}
                      </h3>

                      {product.description && (
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      )}
                    </div>

                    {/* Price and Add to Cart Action */}
                    <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100">
                      <div>
                        <span className="text-base font-extrabold text-slate-950">
                          ₹{Number(product.price).toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleAddToCart(product)}
                        className="flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-600 transition-all active:scale-95 cursor-pointer"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        <span>Add to Cart</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Newsletter Signup */}
      <section id="newsletter" className="border-t border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
              <Mail className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              Join the Apex Foundry
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Receive private drop alerts, designer insights, and exclusive seasonal codes.
            </p>

            {emailSubscribed ? (
              <div className="mt-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-semibold text-emerald-800">
                ✓ Thank you for subscribing! Your 15% discount code has been sent.
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="mt-6 flex flex-col gap-2 sm:flex-row justify-center">
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter your email address"
                  className="rounded-full border border-slate-300 bg-slate-50 px-5 py-3 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20 sm:w-80"
                />
                <button
                  type="submit"
                  className="rounded-full bg-slate-950 px-6 py-3 text-xs font-bold text-white hover:bg-indigo-600 transition-colors active:scale-95 cursor-pointer"
                >
                  Subscribe
                </button>
              </form>
            )}
            <p className="mt-3 text-[11px] text-slate-400">
              Zero spam. Unsubscribe with one click anytime.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-950 text-slate-400 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
                  <Zap className="h-4 w-4 fill-white" />
                </div>
                <span className="text-lg font-black tracking-tight text-white">APEX.</span>
              </div>
              <p className="mt-3 text-xs text-slate-400 max-w-sm leading-relaxed">
                Precision engineering meets modern minimalist aesthetic. We design instruments and accessories for creators, builders, and audiophiles.
              </p>
              <p className="mt-4 text-xs text-slate-500">
                © 2026 Apex Studio Inc. All rights reserved.
              </p>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-white">Shop</h5>
              <ul className="mt-3 space-y-2 text-xs">
                <li><a href="#products" className="hover:text-white transition-colors">All Products</a></li>
                <li><a href="#products" className="hover:text-white transition-colors">Running Shoes</a></li>
                <li><a href="#products" className="hover:text-white transition-colors">Audio Equipment</a></li>
                <li><a href="#products" className="hover:text-white transition-colors">Accessories</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-white">Support</h5>
              <ul className="mt-3 space-y-2 text-xs">
                <li><a href="#features" className="hover:text-white transition-colors">Order Tracking</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Warranty & Service</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Returns & Exchanges</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Contact Concierge</a></li>
              </ul>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-white">Company</h5>
              <ul className="mt-3 space-y-2 text-xs">
                <li><a href="#features" className="hover:text-white transition-colors">Design Story</a></li>
                <li><a href="#features" className="hover:text-white transition-colors">Sustainability</a></li>
                <li><a href="#newsletter" className="hover:text-white transition-colors">Press Inquiries</a></li>
                <li><a href="#newsletter" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
