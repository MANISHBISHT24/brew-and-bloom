"use client";

import { useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import type { StoreProduct } from "@/lib/products";
import { formatINR } from "@/components/catalog/product-card";
import { useCart } from "@/components/cart/cart-provider";

export function ProductDetail({ product }: { product: StoreProduct }) {
  const [selected, setSelected] = useState(product.variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { add } = useCart();
  const variant = product.variants.find((item) => item.id === selected) ?? product.variants[0];
  const unitPrice = product.price + (variant?.priceAdjustment ?? 0);
  function addToBag() { for (let i=0;i<quantity;i++) add(product,selected); setAdded(true); window.setTimeout(()=>setAdded(false),1600); }
  return <div className="detail-copy"><span className="eyebrow">{product.category}</span><h1>{product.name}</h1><div className="detail-price">{formatINR(unitPrice)}</div><p>{product.description}</p>{product.variants.length>1&&<div className="detail-options"><div className="option-title">Choose your size</div><div className="option-row">{product.variants.map((item)=><button className={`option${selected===item.id?" selected":""}`} key={item.id} type="button" aria-pressed={selected===item.id} onClick={()=>setSelected(item.id)}>{item.name}{item.priceAdjustment>0?` · +${formatINR(item.priceAdjustment)}`:""}</button>)}</div></div>}<div className="detail-options"><div className="option-title">Made with care</div><p style={{fontSize:12,color:"var(--muted)",lineHeight:1.8}}>Ask our team about milk alternatives and ingredients when you order. Please tell us about any allergies before we prepare your drink.</p></div><div className="detail-quantity"><div className="qty-control"><button type="button" aria-label="Decrease quantity" onClick={()=>setQuantity((value)=>Math.max(1,value-1))}><Minus size={14}/></button><span>{quantity}</span><button type="button" aria-label="Increase quantity" onClick={()=>setQuantity((value)=>Math.min(20,value+1))}><Plus size={14}/></button></div><span style={{fontSize:12,color:"var(--muted)"}}>Quantity</span></div><button className="button" type="button" disabled={!product.available} onClick={addToBag}>{added?<Check size={16}/>:<ShoppingBag size={16}/>} {added?"Added to your bag":product.available?"Add to bag":"Currently unavailable"}</button></div>;
}
