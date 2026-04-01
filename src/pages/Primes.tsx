import { AppLayout } from "@/components/AppLayout";
import { MyPrimeTracker } from "@/components/MyPrimeTracker";

export default function Primes() {
  return (
    <AppLayout>
      <section className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Primes</h1>
        <MyPrimeTracker />
      </section>
    </AppLayout>
  );
}
