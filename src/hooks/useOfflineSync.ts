import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PublicTableName = keyof Database["public"]["Tables"];
import { toast } from "sonner";

const DB_NAME = "dynaperf_offline";
const STORE_NAME = "pending_actions";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

interface PendingAction {
  id?: number;
  table: string;
  operation: "insert" | "update" | "delete";
  data: Record<string, unknown>;
  timestamp: number;
}

async function addPending(action: Omit<PendingAction, "id" | "timestamp">) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).add({ ...action, timestamp: Date.now() });
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllPending(): Promise<PendingAction[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const req = tx.objectStore(STORE_NAME).getAll();
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function removePending(id: number) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  tx.objectStore(STORE_NAME).delete(id);
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshCount = useCallback(async () => {
    try {
      const items = await getAllPending();
      setPendingCount(items.length);
    } catch { setPendingCount(0); }
  }, []);

  const syncPending = useCallback(async () => {
    const items = await getAllPending();
    if (items.length === 0) return;

    let synced = 0;
    for (const item of items) {
      try {
        if (item.operation === "insert") {
          const { error } = await supabase.from(item.table as PublicTableName).insert(item.data as never);
          if (error) throw error;
        } else if (item.operation === "update") {
          const { id: rowId, ...rest } = item.data;
          const { error } = await supabase.from(item.table as PublicTableName).update(rest as never).eq("id", rowId);
          if (error) throw error;
        } else if (item.operation === "delete") {
          const { error } = await supabase.from(item.table as PublicTableName).delete().eq("id", item.data.id as string);
          if (error) throw error;
        }
        await removePending(item.id!);
        synced++;
      } catch (e) {
        console.error("Sync failed for item", item, e);
      }
    }
    if (synced > 0) {
      toast.success(`${synced} action${synced > 1 ? "s" : ""} synchronisée${synced > 1 ? "s" : ""}`);
    }
    await refreshCount();
  }, [refreshCount]);

  const saveOffline = useCallback(async (table: string, operation: "insert" | "update" | "delete", data: Record<string, unknown>) => {
    await addPending({ table, operation, data });
    await refreshCount();
    toast.info("Sauvegardé hors-ligne — synchronisation automatique au retour en ligne");
  }, [refreshCount]);

  useEffect(() => {
    const goOnline = () => { setIsOnline(true); syncPending(); };
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    refreshCount();
    if (navigator.onLine) syncPending();
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [syncPending, refreshCount]);

  return { isOnline, pendingCount, saveOffline, syncPending };
}
