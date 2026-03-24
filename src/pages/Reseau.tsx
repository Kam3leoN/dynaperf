import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminPartenaires from "@/components/AdminPartenaires";
import AdminClubs from "@/components/AdminClubs";

export default function Reseau() {
  return (
    <AppLayout>
      <Tabs defaultValue="partenaires" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="partenaires">Partenaires</TabsTrigger>
          <TabsTrigger value="clubs">Clubs d'affaires</TabsTrigger>
        </TabsList>
        <TabsContent value="partenaires">
          <AdminPartenaires />
        </TabsContent>
        <TabsContent value="clubs">
          <AdminClubs />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
