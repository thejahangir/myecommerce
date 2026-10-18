"use client";

import React from "react";
import Link from "next/link";
import { ShoppingBag, Zap, Menu, X } from "lucide-react";
import { useCart } from "@/src/context/CartContext";

export default function Navbar() {
  const { totalCount, setIsCartOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        {/* Store Brand / Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Zap className="h-5 w-5 fill-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-slate-950">
                ApexStore<span className="text-indigo-600">.</span>
              </span>
              <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 -mt-1">
                Modern Essentials
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link href="/" className="hover:text-indigo-600 transition-colors">
              Home
            </Link>
            <a href="#products" className="hover:text-indigo-600 transition-colors">
              Products
            </a>
            <Link href="/admin" className="hover:text-indigo-600 transition-colors">
              Admin
            </Link>
          </nav>
        </div>

        {/* Right Section: Cart & Mobile Menu Toggle */}
        <div className="flex items-center gap-3">
          {/* Clickable Cart Icon with Dynamic Badge */}
          <button
            onClick={() => setIsCartOpen(true)}
            aria-label="Open Shopping Cart"
            className="group relative flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-600 transition-all active:scale-95 cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4 transition-transform group-hover:scale-110" />
            <span className="hidden sm:inline">Cart</span>
            
            {/* Dynamic Badge */}
            {totalCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[11px] font-extrabold text-white animate-in zoom-in-75">
                {totalCount}
              </span>
            )}
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col space-y-3 text-sm font-medium text-slate-700">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-indigo-600"
            >
              Home
            </Link>
            <a
              href="#products"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-indigo-600"
            >
              Products
            </a>
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="py-1 hover:text-indigo-600"
            >
              Admin Dashboard
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
