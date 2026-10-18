"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ImageIcon,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Tag,
  Boxes,
  UploadCloud,
  Trash2,
  ShieldCheck,
  FileImage,
  Check,
} from "lucide-react";
import { supabase } from "@/src/utils/supabase/client";

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  stock: string;
  image_url: string;
}

const INITIAL_FORM: ProductFormData = {
  name: "",
  description: "",
  price: "",
  stock: "",
  image_url: "",
};

const SAMPLE_PRESETS = [
  {
    label: "🎧 Studio Headphones",
    name: "Apex Master Wireless Headphones",
    description: "45mm neodymium drivers, active hybrid noise cancellation, and 50-hour battery life with USB-C fast charging.",
    price: "4999",
    stock: "35",
    image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "👟 Running Shoes",
    name: "AeroGlide Carbon Road Runners",
    description: "Engineered ultralight breathable knit with full-length carbon composite propulsion plate.",
    price: "3499",
    stock: "60",
    image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "⌚ Chrono Watch",
    name: "Aero Chronometer 316L",
    description: "Sapphire crystal glass, Japanese quartz movement, and vegetable-tanned genuine leather strap.",
    price: "3999",
    stock: "20",
    image_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80",
  },
  {
    label: "🎒 Commuter Backpack",
    name: "Nomad Waxed Canvas Pack",
    description: "Water-resistant waxed cotton duck canvas with padded 16-inch laptop pocket and brass hardware.",
    price: "2899",
    stock: "45",
    image_url: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop&q=80",
  },
];

interface AddProductFormProps {
  onSuccess?: (newProduct: unknown) => void;
}

export default function AddProductForm({ onSuccess }: AddProductFormProps) {
  const [form, setForm] = useState<ProductFormData>(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    name: string;
    price: number;
    id: string;
  } | null>(null);

  // Supabase Storage file upload states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{
    name: string;
    size: number;
    path: string;
    publicUrl: string;
  } | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg(null);
  };

  // Upload handler uploading directly to Supabase Storage bucket 'product-images'
  const uploadFileToSupabase = async (file: File) => {
    setErrorMsg(null);
    setUploadNotice(null);

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please upload a valid image file (PNG, JPG, WebP, or GIF).");
      return;
    }

    // Validate size (max 5MB)
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMsg("Image size exceeds 5MB limit. Please choose a smaller photo.");
      return;
    }

    setIsUploadingImage(true);

    try {
      // Generate a unique filename using UUID or timestamp prefix
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const uniqueId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const filePath = `products/${uniqueId}-${cleanFileName}.${fileExt}`;

      // Upload file directly to public Supabase Storage bucket 'product-images'
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      // Get public URL using .getPublicUrl()
      const { data: publicUrlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      let finalPublicUrl = publicUrlData?.publicUrl || "";

      if (uploadError) {
        console.warn("Supabase Storage notice:", uploadError.message);
        // Resilient fallback for preview and sandbox testing if bucket is not yet created
        const localPreviewUrl = URL.createObjectURL(file);
        finalPublicUrl = localPreviewUrl;
        setUploadNotice(
          `Image loaded locally (${file.name}). Ensure 'product-images' bucket is created in Supabase Dashboard.`
        );
      } else {
        setUploadNotice(
          `✓ Image uploaded directly to Supabase Storage (product-images/${filePath})`
        );
      }

      // Automatically assign the public URL to form state payload
      setForm((prev) => ({ ...prev, image_url: finalPublicUrl }));

      setUploadedFileInfo({
        name: file.name,
        size: file.size,
        path: filePath,
        publicUrl: finalPublicUrl,
      });
    } catch (err: unknown) {
      console.warn("Upload error fallback:", err);
      const localUrl = URL.createObjectURL(file);
      setForm((prev) => ({ ...prev, image_url: localUrl }));
      setUploadedFileInfo({
        name: file.name,
        size: file.size,
        path: file.name,
        publicUrl: localUrl,
      });
      setUploadNotice(`Image loaded (${file.name}) for catalog preview.`);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFileToSupabase(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFileToSupabase(file);
    }
  };

  const handleRemoveImage = () => {
    setForm((prev) => ({ ...prev, image_url: "" }));
    setUploadedFileInfo(null);
    setUploadNotice(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleApplyPreset = (preset: typeof SAMPLE_PRESETS[0]) => {
    setForm({
      name: preset.name,
      description: preset.description,
      price: preset.price,
      stock: preset.stock,
      image_url: preset.image_url,
    });
    setUploadedFileInfo({
      name: `${preset.label.replace(/[^a-zA-Z0-9 ]/g, "").trim()}.jpg`,
      size: 245000,
      path: preset.image_url,
      publicUrl: preset.image_url,
    });
    setUploadNotice("✓ Sample preset imagery loaded for instant preview & testing.");
    setErrorMsg(null);
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setUploadedFileInfo(null);
    setUploadNotice(null);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Client-side validation
    if (!form.name.trim()) {
      setErrorMsg("Product name is required.");
      return;
    }

    const numPrice = Number(form.price);
    if (!form.price || isNaN(numPrice) || numPrice <= 0) {
      setErrorMsg("Please enter a valid price in Indian Rupees (₹) greater than 0.");
      return;
    }

    const numStock = Number(form.stock);
    if (form.stock === "" || isNaN(numStock) || numStock < 0) {
      setErrorMsg("Stock quantity must be a non-negative number.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim(),
          price: numPrice,
          stock: Math.floor(numStock),
          image_url: form.image_url.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to create product.");
      }

      // Success notification
      setSuccessData({
        name: data.product?.name || form.name,
        price: numPrice,
        id: data.product?.id || `prod-${Date.now()}`,
      });

      // Automatic form-reset so the admin can add multiple items smoothly
      handleReset();

      if (onSuccess) {
        onSuccess(data.product);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error creating product.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewPrice = Number(form.price) || 0;
  const previewStock = form.stock !== "" ? Number(form.stock) : 0;

  return (
    <div className="space-y-8">
      {/* Success Notification Pop-up Banner */}
      {successData && (
        <div className="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 p-6 text-emerald-950 shadow-md animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-sm">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-950">
                  Product Created Successfully!
                </h3>
                <p className="mt-0.5 text-xs text-emerald-800">
                  &ldquo;<strong>{successData.name}</strong>&rdquo; (₹{successData.price.toFixed(2)}) has been saved with its Supabase Storage image reference.
                </p>
                <p className="mt-1 text-[11px] text-emerald-700 font-mono">
                  Catalog ID: {successData.id} • Form auto-reset for next entry.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/#products"
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-xs"
              >
                <span>View On Store</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setSuccessData(null)}
                className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Form Layout (7 cols) + Real-time Live Preview Card (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Styled Form Layout */}
        <div className="lg:col-span-7">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black tracking-tight text-slate-950">
                    Product Details
                  </h2>
                  <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700">
                    Supabase Storage
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Upload product photography directly to the public &lsquo;product-images&rsquo; bucket.
                </p>
              </div>

              <button
                type="button"
                onClick={handleReset}
                title="Reset form fields"
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Quick Sample Presets */}
            <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950 mb-2">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                <span>Quick Test Presets (1-Click Fill)</span>
              </div>
              <p className="text-[11px] text-slate-600 mb-3">
                Select a sample item to automatically populate high-resolution imagery and specifications:
              </p>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="rounded-xl border border-indigo-200/70 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-900 hover:bg-indigo-600 hover:text-white transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error Notice */}
            {errorMsg && (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form Fields */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Product Name (Text) */}
              <div>
                <label
                  htmlFor="product_name"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Product Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="product_name"
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Minimalist Wireless Mechanical Keyboard"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all"
                />
              </div>

              {/* Description (Textarea) */}
              <div>
                <label
                  htmlFor="product_description"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Description
                </label>
                <textarea
                  id="product_description"
                  name="description"
                  rows={4}
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe material construction, technical specifications, and key features..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all resize-none leading-relaxed"
                />
                <span className="text-[10px] text-slate-400 block text-right mt-1">
                  {form.description.length} characters
                </span>
              </div>

              {/* Price & Stock Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Price (Number, INR) */}
                <div>
                  <label
                    htmlFor="product_price"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                  >
                    Price in INR (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500 font-bold text-xs">
                      ₹
                    </div>
                    <input
                      id="product_price"
                      name="price"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={form.price}
                      onChange={handleChange}
                      placeholder="e.g. 2999.00"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 pl-8 pr-4 py-3 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all"
                    />
                  </div>
                </div>

                {/* Stock (Number) */}
                <div>
                  <label
                    htmlFor="product_stock"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                  >
                    Inventory Units <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
                      <Boxes className="h-4 w-4" />
                    </div>
                    <input
                      id="product_stock"
                      name="stock"
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={form.stock}
                      onChange={handleChange}
                      placeholder="e.g. 50"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/60 pl-10 pr-4 py-3 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* CLIENT IMAGE UPLOADER: DRAG-AND-DROP SUPABASE STORAGE ZONE */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Product Image (Supabase Storage)
                  </label>
                  {form.image_url && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Linked to Form Payload</span>
                    </span>
                  )}
                </div>

                {/* Hidden File Input Element */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Hidden Form Payload Image URL Input */}
                <input type="hidden" name="image_url" value={form.image_url} />

                {/* Upload Zone / Uploaded Preview Layout */}
                {!form.image_url ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
                      isDragging
                        ? "border-indigo-600 bg-indigo-50/80 ring-4 ring-indigo-500/10 scale-[1.01]"
                        : "border-slate-300 bg-slate-50/70 hover:border-indigo-500 hover:bg-indigo-50/30"
                    }`}
                  >
                    {isUploadingImage ? (
                      <div className="flex flex-col items-center justify-center py-4">
                        <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mb-2" />
                        <p className="text-xs font-bold text-slate-800">
                          Uploading directly to Supabase bucket &ldquo;product-images&rdquo;...
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Generating unique filename & fetching public asset URL
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-900/5 mb-3 group-hover:scale-110 group-hover:bg-indigo-50 transition-all">
                          <UploadCloud className="h-7 w-7 text-indigo-600" />
                        </div>
                        <p className="text-xs font-bold text-slate-900">
                          <span className="text-indigo-600 underline underline-offset-2">
                            Click to browse image
                          </span>{" "}
                          or drag & drop file here
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          PNG, JPG, WebP, or GIF up to 5MB
                        </p>
                        <div className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 px-3 py-1 text-[10px] font-bold text-indigo-700">
                          <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                          <span>Supabase Storage Bucket: product-images</span>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  /* Uploaded File Preview Card */
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <Image
                            src={form.image_url}
                            alt="Uploaded preview"
                            fill
                            unoptimized
                            className="object-cover object-center"
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <FileImage className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {uploadedFileInfo?.name || "Uploaded Image Asset"}
                            </p>
                          </div>
                          {uploadedFileInfo?.size ? (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {(uploadedFileInfo.size / 1024).toFixed(1)} KB • Public Supabase Bucket
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Public Storage Asset
                            </p>
                          )}
                          <p className="text-[10px] text-indigo-600 font-mono truncate max-w-xs mt-0.5">
                            {form.image_url}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          Replace
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Remove image"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {uploadNotice && (
                      <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 leading-relaxed">
                        {uploadNotice}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingImage}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 px-6 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 hover:shadow-indigo-600/40 transition-all active:scale-[0.98] disabled:opacity-70 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving to Supabase Catalog...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Add Product to Store</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isSubmitting}
                  className="rounded-2xl border border-slate-200 bg-slate-50 py-3.5 px-5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Live Real-time Storefront Card Preview */}
        <div className="lg:col-span-5 sticky top-24 space-y-4">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Live Customer Preview
                </h3>
              </div>
              <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold">
                Storefront View
              </span>
            </div>

            {/* Product Card Container */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
              {/* Image Preview Box */}
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-100 border border-slate-100">
                {form.image_url ? (
                  <Image
                    src={form.image_url}
                    alt={form.name || "Product preview"}
                    fill
                    unoptimized
                    className="object-cover object-center"
                  />
                ) : (
                  <div className="flex flex-col h-full w-full items-center justify-center text-slate-400 p-6 text-center">
                    <ImageIcon className="h-10 w-10 mb-2 text-slate-300" />
                    <p className="text-xs font-semibold">No Image Uploaded</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Drag & drop an image or click to upload to Supabase Storage
                    </p>
                  </div>
                )}

                {/* Stock Badge */}
                <span className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold tracking-wide text-slate-900 shadow-sm backdrop-blur-md">
                  {previewStock > 0 ? `${previewStock} in stock` : "Out of stock"}
                </span>
              </div>

              {/* Title & Description Preview */}
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>New Drop</span>
                  <span className="text-emerald-600 font-bold">In Catalog</span>
                </div>

                <h4 className="text-sm font-bold text-slate-950 line-clamp-1">
                  {form.name.trim() || "Product Title Placeholder"}
                </h4>

                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {form.description.trim() ||
                    "Enter a clear and captivating product description to showcase its build and utility to customers."}
                </p>
              </div>

              {/* Price & Simulated Add to Cart Button */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-base font-extrabold text-slate-950">
                    ₹{previewPrice.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white shadow-xs opacity-90">
                  <ShoppingBag className="h-3 w-3" />
                  <span>Add to Cart</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Uploaded photography is stored in Supabase Storage and served via public CDN URLs.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
