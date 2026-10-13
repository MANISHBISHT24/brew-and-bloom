"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ProductCard } from "@/components/catalog/product-card";
import type { StoreProduct } from "@/lib/products";

export function MenuExplorer({ products }: { products: StoreProduct[] }) {
  const [query,setQuery]=useState(""); const [category,setCategory]=useState("All"); const [sort,setSort]=useState("popular");
  const categories=useMemo(()=>["All",...Array.from(new Set(products.map((product)=>product.category)))],[products]);
  const visible=useMemo(()=>products.filter((product)=>product.name.toLowerCase().includes(query.trim().toLowerCase())||product.description.toLowerCase().includes(query.trim().toLowerCase())).filter((product)=>category==="All"||product.category===category).sort((a,b)=>sort==="price-low"?a.price-b.price:sort==="price-high"?b.price-a.price:0),[products,query,category,sort]);
  return <><div className="menu-controls"><label className="field" style={{flex:1,margin:0}}><span className="sr-only">Search the menu</span><span style={{position:"relative",display:"block"}}><Search size={17} style={{position:"absolute",left:14,top:15,color:"var(--muted)"}}/><input className="input" style={{paddingLeft:42}} value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search coffee, pastries…"/></span></label><label className="sr-only" htmlFor="menu-sort">Sort menu</label><select className="input" style={{width:"auto",minWidth:170}} id="menu-sort" value={sort} onChange={(event)=>setSort(event.target.value)}><option value="popular">Sort: featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></div><div className="menu-controls" style={{marginTop:-18}} aria-label="Filter by category">{categories.map((item)=><button type="button" key={item} className={`filter-button${category===item?" active":""}`} onClick={()=>setCategory(item)}>{item}</button>)}</div>{visible.length?<div className="product-grid">{visible.map((product)=><ProductCard key={product.id} product={product}/>)}</div>:<div className="empty-state"><h2>Nothing on the menu yet.</h2><p>Try another search or category.</p></div>}</>;
}
