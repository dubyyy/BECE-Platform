"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const CIEAuthGate = dynamic(() => import("./CIEAuthGate"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="relative h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    </div>
  ),
});

export default function CIEAuthGateWrapper({ children }: { children: React.ReactNode }) {
  return <CIEAuthGate>{children}</CIEAuthGate>;
}
