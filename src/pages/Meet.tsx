import { useEffect, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import JitsiMeetModule from "@/components/JitsiMeetModule";

const STORAGE_KEY = "dynaperf.meet.settings";

export default function Meet() {
  const [defaults, setDefaults] = useState({
    defaultRoom: "dynameet-room",
    defaultDisplayName: "Invité Dynaperf",
    logoUrl: "",
    domain: "meet.jit.si",
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<{ defaultRoom: string; defaultDisplayName: string; logoUrl: string; domain: string }>;
      setDefaults({
        defaultRoom: parsed.defaultRoom || "dynameet-room",
        defaultDisplayName: parsed.defaultDisplayName || "Invité Dynaperf",
        logoUrl: parsed.logoUrl || "",
        domain: parsed.domain || "meet.jit.si",
      });
    } catch {
      // noop
    }
  }, []);

  return (
    <AppLayout>
      <main className="container mx-auto px-4 py-6 md:py-8">
        <JitsiMeetModule
          roomName={defaults.defaultRoom}
          displayName={defaults.defaultDisplayName}
          domain={defaults.domain || "meet.jit.si"}
          brandLogoUrl={defaults.logoUrl || undefined}
        />
      </main>
    </AppLayout>
  );
}
