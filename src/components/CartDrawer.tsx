"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/src/context/CartContext";

export default function CartDrawer() {
  const {
    cart,
    isCartOpen,
    setIsCartOpen,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalCount,
    totalPrice,
  } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <aside
          aria-label="Shopping Cart Drawer"
          className="w-screen max-w-md bg-white shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Your Shopping Bag</h2>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600">
                {totalCount} {totalCount === 1 ? "item" : "items"}
              </span>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-4">
                  <ShoppingBag className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Your bag is empty</h3>
                <p className="mt-1 text-xs text-slate-500 max-w-xs">
                  Looks like you haven&apos;t added any items to your bag yet.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="mt-6 rounded-full bg-slate-950 px-6 py-2.5 text-xs font-semibold text-white hover:bg-indigo-600 transition-colors"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {cart.map((item) => (
                  <li key={item.product.id} className="flex gap-4 py-4">
                    {/* Item Image */}
                    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      {item.product.image_url ? (
                        <Image
                          src={item.product.image_url}
                          alt={item.product.name}
                          fill
                          className="object-cover object-center"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400 text-xs">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="flex flex-1 flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                          title="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="text-xs font-extrabold text-slate-900">
                        ₹{Number(item.product.price).toFixed(2)}
                      </p>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 transition-colors"
                            title="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 transition-colors"
                            title="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <span className="text-xs font-bold text-slate-600">
                          ₹{(Number(item.product.price) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer with totals */}
          {cart.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-50 p-6 space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Subtotal</span>
                  <span>₹{totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Shipping</span>
                  <span className="text-emerald-600 font-semibold">Free</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-slate-950 pt-2 border-t border-slate-200">
                  <span>Total</span>
                  <span>₹{totalPrice.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={clearCart}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Clear
                </button>
                <Link
                  href="/cart"
                  onClick={() => setIsCartOpen(false)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 text-xs font-bold text-white hover:bg-indigo-600 transition-all active:scale-95"
                >
                  <span>View Cart & Checkout</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
