import { AppLayout } from "@/components/AppLayout";

export default function NewAudit() {
  return (
    <AppLayout>
      <div className="flex items-center justify-center py-32">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground">Nouvel audit</h2>
          <p className="text-muted-foreground text-sm">En cours de création…</p>
        </div>
      </div>
    </AppLayout>
  );
}
