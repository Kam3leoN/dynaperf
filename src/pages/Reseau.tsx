import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminPartenaires from "@/components/AdminPartenaires";
import AdminClubs from "@/components/AdminClubs";
import BusinessPlan from "@/pages/BusinessPlan";

export default function Reseau() {
  return (
    <AppLayout>
      <Tabs defaultValue="partenaires" className="space-y-4">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="partenaires">Partenaires</TabsTrigger>
          <TabsTrigger value="clubs">Clubs d'affaires</TabsTrigger>
          <TabsTrigger value="business-plan">Business Plan</TabsTrigger>
        </TabsList>
        <TabsContent value="partenaires">
          <AdminPartenaires />
        </TabsContent>
        <TabsContent value="clubs">
          <AdminClubs />
        </TabsContent>
        <TabsContent value="business-plan">
          <BusinessPlan embedded />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
