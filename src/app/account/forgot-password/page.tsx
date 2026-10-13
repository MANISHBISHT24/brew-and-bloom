import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
export const metadata:Metadata={title:"Reset your password",robots:{index:false,follow:false}};
export default function ForgotPasswordPage(){return <div className="shell content-page" style={{maxWidth:560}}><span className="eyebrow">A fresh start</span><h1>Reset your password.</h1><p>Enter the email address on your account. We’ll show the same confirmation whether or not it exists.</p><ForgotPasswordForm/></div>;}
