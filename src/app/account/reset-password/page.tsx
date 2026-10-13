import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
export const metadata:Metadata={title:"Choose a new password",robots:{index:false,follow:false}};
export default function ResetPasswordPage(){return <div className="shell content-page" style={{maxWidth:560}}><span className="eyebrow">Back to your account</span><h1>Choose a new password.</h1><p>Reset links are single-use and expire after the configured period.</p><ResetPasswordForm/></div>;}
