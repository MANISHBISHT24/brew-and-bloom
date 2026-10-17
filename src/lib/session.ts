import { headers } from "next/headers";
import { getPrisma } from "@/lib/prisma";

export async function getCurrentSession() {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("replace-me") || !process.env.AUTH_SECRET) return null;
  try {
    const { auth } = await import("@/lib/auth");
    return await auth.api.getSession({ headers: await headers() });
  } catch (error) {
    if ((error as { digest?: string })?.digest === "DYNAMIC_SERVER_USAGE") throw error;
    console.error("Session lookup failed", error);
    return null;
  }
}
export async function requireAdmin(){const session=await getCurrentSession();return session?.user.role==="ADMIN"?session:null;}
export async function getUserOrderHistory(){const session=await getCurrentSession();if(!session)return null;const db=getPrisma();return db.order.findMany({where:{userId:session.user.id},orderBy:{createdAt:"desc"},include:{items:true,payment:true},take:50});}
