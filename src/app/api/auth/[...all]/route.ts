import { NextResponse } from "next/server";
async function handle(request:Request){if(!process.env.DATABASE_URL||!process.env.AUTH_SECRET)return NextResponse.json({error:{message:"Authentication is not configured yet. Add DATABASE_URL and AUTH_SECRET."}},{status:503});try{const [{auth},{toNextJsHandler}]=await Promise.all([import("@/lib/auth"),import("better-auth/next-js")]);const handlers=toNextJsHandler(auth);return request.method==="GET"?handlers.GET(request):handlers.POST(request);}catch(error){console.error("Authentication request failed",error);return NextResponse.json({error:{message:"Authentication is temporarily unavailable."}},{status:503});}}
export const GET=handle;
export const POST=handle;
