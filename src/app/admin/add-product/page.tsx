"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";
import AddProductForm from "@/src/components/AddProductForm";

export default function AddProductPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Navigation Breadcrumbs */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Admin Dashboard</span>
          </Link>

          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-sm"
          >
            <Package className="h-3.5 w-3.5 text-indigo-600" />
            <span>Manage Orders</span>
          </Link>
        </div>

        {/* Title */}
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Add New Catalog Item
            </h1>
            <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
              Supabase
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Publish products directly to your Supabase products table with live pricing and stock units.
          </p>
        </div>

        {/* Add Product Form Component */}
        <AddProductForm />

      </div>
    </div>
  );
}
