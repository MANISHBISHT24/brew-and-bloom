import type { Metadata } from "next";
import { CartPage } from "@/components/cart/cart-page";
export const metadata:Metadata={title:"Your bag",robots:{index:false,follow:false}};
export default function CartRoute(){return <div className="page-wrap"><div className="shell" style={{paddingTop:50}}><CartPage/></div></div>;}
