import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { getPrisma } from "@/lib/prisma";

function sendEmail(to:string,subject:string,html:string){const key=process.env.EMAIL_API_KEY;const from=process.env.EMAIL_FROM;if(!key||!from){console.warn(`Email provider is not configured. ${subject} was not sent.`);return Promise.resolve();}return import("resend").then(async({Resend})=>{const client=new Resend(key);const result=await client.emails.send({from,to,subject,html});if(result.error)throw new Error("Email provider rejected the message");});}

export const auth=betterAuth({
  appName:"Brew & Bloom",
  baseURL:process.env.AUTH_URL??process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000",
  secret:process.env.AUTH_SECRET,
  trustedOrigins:[process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000"],
  database:prismaAdapter(getPrisma(),{provider:"postgresql"}),
  user:{additionalFields:{role:{type:"string",required:false,defaultValue:"CUSTOMER",input:false}}},
  emailAndPassword:{enabled:true,requireEmailVerification:process.env.REQUIRE_EMAIL_VERIFICATION==="true",sendResetPassword:async({user,url})=>sendEmail(user.email,"Reset your Brew & Bloom password",`<p>Use this one-time link to reset your password:</p><p><a href="${url}">Reset password</a></p><p>If you did not request this, ignore this message.</p>`)},
  emailVerification:{sendVerificationEmail:async({user,url})=>sendEmail(user.email,"Verify your Brew & Bloom email",`<p>Confirm your email address:</p><p><a href="${url}">Verify email</a></p>`)},
  rateLimit:{enabled:true,window:60,max:10},
  advanced:{useSecureCookies:process.env.NODE_ENV==="production",crossSubDomainCookies:{enabled:false}},
});
