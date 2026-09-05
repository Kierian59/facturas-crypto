import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-dvh grid place-items-center px-4 py-10 bg-paper">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <span className="stamp mx-auto text-lg inline-grid place-items-center">F</span>
          <h1 className="font-display text-2xl">Facturas Crypto</h1>
          <p className="text-sm text-muted">
            Continuer avec Google · Continuar con Google
          </p>
        </div>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          forceRedirectUrl="/"
          appearance={{
            elements: {
              rootBox: "mx-auto w-full",
              card: "shadow-none border border-line bg-card rounded-2xl",
            },
          }}
        />
      </div>
    </div>
  );
}
