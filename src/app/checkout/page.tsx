import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getPrisma } from "@/lib/prisma";
export const metadata:Metadata={title:"Checkout",robots:{index:false,follow:false}};
export default async function CheckoutPage(){let deliveryEnabled=false;if(process.env.DATABASE_URL){try{deliveryEnabled=(await getPrisma().storeSettings.findUnique({where:{key:"default"},select:{deliveryEnabled:true}}))?.deliveryEnabled??false;}catch{deliveryEnabled=false;}}return <div className="page-wrap"><div className="shell"><CheckoutForm deliveryEnabled={deliveryEnabled}/></div></div>;}
