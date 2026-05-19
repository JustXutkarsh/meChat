import { OnboardingGate } from "@/components/onboarding-gate";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <OnboardingGate>{children}</OnboardingGate>;
}
