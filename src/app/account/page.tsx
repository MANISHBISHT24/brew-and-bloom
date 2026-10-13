import type { Metadata } from "next";
import { AccountPanel } from "@/components/auth/account-panel";
import { getCurrentSession } from "@/lib/session";
export const metadata:Metadata={title:"Your account",robots:{index:false,follow:false}};
export default async function AccountPage(){const session=await getCurrentSession();return <div className="shell page-wrap"><div className="content-page" style={{maxWidth:560,margin:"auto"}}><AccountPanel signedIn={!!session} name={session?.user.name??undefined} role={session?.user.role??undefined}/>{!process.env.DATABASE_URL&&<p className="notice" style={{marginTop:20}}>Account sign-in is unavailable until PostgreSQL and AUTH_SECRET are configured.</p>}</div></div>;}
