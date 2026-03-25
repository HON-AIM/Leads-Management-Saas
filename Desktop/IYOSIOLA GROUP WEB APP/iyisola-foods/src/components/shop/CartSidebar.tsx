"use client";

import { useCart } from "@/context/CartContext";
import { X, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export default function CartSidebar() {
  const { isCartOpen, setIsCartOpen, items, updateQuantity, removeFromCart, cartTotal } = useCart();

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(amount);
  };

  if (!isCartOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      {/* Sidebar Panel */}
      <div className="fixed inset-y-0 right-0 z-[70] w-full max-w-sm bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-primary-900 text-white">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            <h2 className="text-lg font-bold">Your Cart ({items.length})</h2>
          </div>
          <button 
            onClick={() => setIsCartOpen(false)}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 text-gray-500">
              <div className="h-20 w-20 bg-gray-50 rounded-full flex items-center justify-center">
                <ShoppingBag className="h-10 w-10 text-gray-300" />
              </div>
              <p className="text-lg font-medium text-gray-900">Your cart is empty!</p>
              <p className="text-sm">Browse our store and add items to your cart.</p>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="mt-4 bg-primary-600 text-white px-6 py-2 rounded-md font-medium hover:bg-primary-700"
              >
                START SHOPPING
              </button>
            </div>
          ) : (
            <ul className="space-y-6">
              {items.map((item) => (
                <li key={item.id} className="flex gap-4">
                  <div className="h-20 w-20 flex-shrink-0 border border-gray-200 rounded-md overflow-hidden relative bg-gray-50">
                    {item.image ? (
                       <Image src={item.image} alt={item.name} fill className="object-cover" />
                    ) : (
                       <ShoppingBag className="h-8 w-8 text-gray-300 m-auto mt-6" />
                    )}
                  </div>
                  
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{item.name}</h3>
                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="text-gray-400 hover:text-red-500 p-1"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-primary-600 font-bold mt-1">{formatMoney(item.price)}</p>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-2">
                      <div className="flex items-center border border-gray-200 rounded-md">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1.5 hover:bg-gray-50 text-gray-600 disabled:opacity-50"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1.5 hover:bg-gray-50 text-gray-600 disabled:opacity-50"
                          disabled={item.quantity >= item.stock}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-xs text-gray-500">{item.stock} left</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer / Checkout */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex justify-between text-base font-bold text-gray-900 mb-6">
              <p>Subtotal</p>
              <p>{formatMoney(cartTotal)}</p>
            </div>
            {/* Note: In future we link to an actual checkout page */}
            <Link
              href="/checkout"
              onClick={() => setIsCartOpen(false)}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white flex justify-center items-center py-3.5 rounded-md font-bold shadow-lg transition-colors"
            >
              PROCEED TO CHECKOUT
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
