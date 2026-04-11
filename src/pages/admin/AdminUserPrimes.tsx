import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoneyBill, faPenToSquare, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { fetchManagedUsersList, UserConfigPanel, type ManagedUser } from "./AdminUsers";

/**
 * Administration : configuration des primes par utilisateur (même panneau que la liste Utilisateurs).
 */
export default function AdminUserPrimes() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<ManagedUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchManagedUsersList();
      setUsers(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${u.displayName} ${u.email}`.toLowerCase().includes(q);
  });

  return (
    <div className="app-page-shell-wide min-w-0 w-full max-w-full space-y-6 pb-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <FontAwesomeIcon icon={faMoneyBill} className="h-6 w-6 text-primary" />
          Primes par utilisateur
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Objectifs, paliers et montants par format — identique au panneau détaillé de la page Utilisateurs.
        </p>
      </div>

      <div className="max-w-md">
        <Input
          placeholder="Rechercher un collaborateur…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg"
          aria-label="Rechercher"
        />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-12">
          <FontAwesomeIcon icon={faSpinner} className="h-4 w-4 animate-spin" />
          Chargement…
        </div>
      ) : (
        <div className="rounded-xl border border-border/60 overflow-hidden bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Collaborateur</TableHead>
                <TableHead className="w-32 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{u.displayName}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="outline" size="sm" className="gap-1.5 rounded-md" onClick={() => setEdit(u)}>
                      <FontAwesomeIcon icon={faPenToSquare} className="h-3.5 w-3.5" />
                      Primes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={edit != null} onOpenChange={(o) => !o && setEdit(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Primes — {edit?.displayName}</SheetTitle>
          </SheetHeader>
          {edit && (
            <div className="mt-4">
              <UserConfigPanel
                key={edit.id}
                userId={edit.id}
                config={edit.config}
                customPrimes={edit.customPrimes}
                onSaved={() => void load()}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
