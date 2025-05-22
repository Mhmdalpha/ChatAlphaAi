import React from "react";
import { SignIn } from "@clerk/clerk-react";  // Import komponen SignIn dari Clerk
import "./signInPage.css";  // Mengimpor CSS untuk halaman sign in

const SignInPage = () => {
  return (
    <div className="signInPage">
      <SignIn
        path="/sign-in"  // Path untuk halaman sign in
        signUpUrl="/sign-up"  // URL untuk halaman sign up
        forceRedirectUrl="/dashboard"  // Setelah berhasil sign in, redirect ke halaman dashboard
      />
    </div>
  );
};

export default SignInPage;  // Ekspor komponen SignInPage
