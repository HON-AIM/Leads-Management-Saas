"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatCurrency } from "@/lib/utils";
import {
  ShoppingBag,
  MapPin,
  ChevronLeft,
  CheckCircle2,
  Loader2,
  Package,
} from "lucide-react";
import toast from "react-hot-toast";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, cartTotal, clearCart } = useCart();
  const [shippingAddress, setShippingAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }
    if (shippingAddress.trim().length < 5) {
      toast.error("Please enter a valid shipping address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/user/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            price: item.price,
          })),
          shippingAddress: shippingAddress.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Failed to place order. Please try again.");
        return;
      }

      setOrderId(data.orderId);
      setOrderPlaced(true);
      clearCart();
    } catch {
      toast.error("A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Order Confirmation Screen ────────────────────────────────────────────
  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-10 text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order Placed!</h1>
            <p className="text-gray-500 mt-2 text-sm">
              Thank you for your order. We&apos;ll start preparing it right away.
            </p>
          </div>
          {orderId && (
            <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
              <span className="text-gray-500">Order ID: </span>
              <span className="font-mono font-medium text-gray-800 break-all">
                {orderId}
              </span>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard/orders"
              className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              <Package className="h-4 w-4" />
              View My Orders
            </Link>
            <Link
              href="/shop"
              className="inline-flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── Empty Cart Redirect ──────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-10 text-center space-y-6">
          <div className="flex justify-center">
            <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center">
              <ShoppingBag className="h-10 w-10 text-gray-400" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cart is Empty</h1>
            <p className="text-gray-500 mt-2 text-sm">
              Add some products before checking out.
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Browse Shop
          </Link>
        </div>
      </div>
    );
  }

  // ─── Main Checkout ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Back Link */}
        <Link
          href="/shop"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-8 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Shop
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* ── Shipping Form ── */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-9 w-9 bg-primary-50 rounded-lg flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Shipping Details
              </h2>
            </div>

            <form onSubmit={handlePlaceOrder} className="space-y-5">
              <div>
                <label
                  htmlFor="shippingAddress"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Delivery Address
                </label>
                <textarea
                  id="shippingAddress"
                  rows={4}
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="e.g. 12 Bode Thomas Street, Surulere, Lagos, Nigeria"
                  required
                  minLength={5}
                  className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none transition"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Please provide your full address including city and state.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 text-white py-3.5 rounded-lg font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Placing Order…
                  </>
                ) : (
                  "PLACE ORDER"
                )}
              </button>
            </form>
          </div>

          {/* ── Order Summary ── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="h-9 w-9 bg-primary-50 rounded-lg flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-primary-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Order Summary
                </h2>
              </div>

              <ul className="space-y-4">
                {items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3">
                    <div className="h-14 w-14 flex-shrink-0 rounded-lg border border-gray-100 overflow-hidden bg-gray-50 relative">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <ShoppingBag className="h-5 w-5 text-gray-300" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </li>
                ))}
              </ul>

              <div className="mt-5 pt-5 border-t border-gray-100 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Delivery</span>
                  <span className="text-green-600 font-medium">Free</span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>{formatCurrency(cartTotal)}</span>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-sm text-green-700 flex gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                All orders are processed securely. You&apos;ll receive a
                confirmation in your dashboard once placed.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
