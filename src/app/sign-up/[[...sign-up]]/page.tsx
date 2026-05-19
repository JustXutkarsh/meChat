import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { AppShell } from "@/components/ui/app-shell";
import { GradientLogo } from "@/components/ui/gradient-logo";

export default function SignUpPage() {
  return (
    <AppShell className="grid place-items-center px-4 py-8">
      <div className="w-full rounded-3xl border border-[var(--border)] bg-[linear-gradient(180deg,#111821,#0B0F14)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
        <div className="mb-5 flex flex-col items-center text-center">
          <GradientLogo size="lg" />
          <h1 className="mt-3 text-2xl font-bold">meChat</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Private conversations, beautifully simple.</p>
        </div>
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/sign-in"
          appearance={{
            variables: { colorBackground: "#0B0F14", colorText: "#F8FAFC", colorInputBackground: "#111821", colorInputText: "#F8FAFC", colorPrimary: "#7C3AED", colorDanger: "#EF4444", borderRadius: "0.9rem" },
            elements: { card: "!shadow-none !border !border-[#1F2A37] !bg-[#0B0F14]", footer: "hidden" },
          }}
        />
        <p className="mt-4 text-center text-xs text-[var(--text-muted)]">
          Already have an account? <Link href="/sign-in" className="text-[var(--accent)]">Sign in</Link>
        </p>
      </div>
    </AppShell>
  );
}
