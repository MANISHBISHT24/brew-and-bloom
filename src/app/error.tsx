"use client";
import { useEffect } from "react";
export default function ErrorPage({error,reset}:{error:Error&{digest?:string};reset:()=>void}){useEffect(()=>{console.error("Storefront rendering error",error);},[error]);return <div className="shell empty-state page-wrap"><span className="eyebrow">A small hiccup</span><h1 className="section-title">Something went wrong.</h1><p>Try again in a moment. If it continues, send us a note.</p><button className="button" onClick={()=>reset()}>Try again</button></div>;}
