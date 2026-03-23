import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartLine, faEuroSign, faUsers, faHandshake, faCar, faRocket, faBriefcase, faArrowTrendUp } from "@fortawesome/free-solid-svg-icons";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from "recharts";

interface YearData {
  year: number;
  label: string;
  newAvantages: number;
  renewedAvantages: number;
  totalAvantages: number;
  caAvantages: number;
  commAvantages: number;
  newClubMembers: number;
  renewedClubMembers: number;
  totalClubMembers: number;
  caClubs: number;
  commClubs: number;
  totalCA: number;
  totalCommissions: number;
  redevanceAnnuelle: number;
  droitsEntree: number;
  totalCharges: number;
  beneficeNet: number;
  cumulBenefice: number;
}

export default function BusinessPlan() {
  // --- Inputs ---
  const [nbAvantagesAnN, setNbAvantagesAnN] = useState(30);
  const [nbClubs, setNbClubs] = useState(2);
  const [membresParClub, setMembresParClub] = useState(25);
  const [croissanceAnnuelle, setCroissanceAnnuelle] = useState(20);
  const [tauxResiliation, setTauxResiliation] = useState(10);
  const [nbAnnees, setNbAnnees] = useState(5);

  // Pricing
  const [prixAvantages, setPrixAvantages] = useState(1200);
  const [prixClub, setPrixClub] = useState(800);
  const [commAvantagesPct, setCommAvantagesPct] = useState(50);
  const [commClubPct, setCommClubPct] = useState(50);

  // Pack & options
  const [packPerformance, setPackPerformance] = useState(false);
  const [vehiculeFloque, setVehiculeFloque] = useState(false);
  const [droitsEntree, setDroitsEntree] = useState(0);

  // Derived
  const commAvantagesEffective = packPerformance ? 60 : commAvantagesPct;
  const redevanceMensuelle = packPerformance
    ? (vehiculeFloque ? 250 - 90 : 250)
    : (vehiculeFloque ? 0 : 90);

  const projections = useMemo(() => {
    const data: YearData[] = [];
    let cumulBenefice = 0;
    let stockAvantages = 0;
    let stockClubMembers = 0;

    for (let y = 1; y <= nbAnnees; y++) {
      const growthFactor = 1 + croissanceAnnuelle / 100;
      const retentionRate = 1 - tauxResiliation / 100;

      // Renewed from previous stock
      const renewedAvantages = Math.round(stockAvantages * retentionRate);
      const renewedClubMembers = Math.round(stockClubMembers * retentionRate);

      // New business for year y
      const newAvantagesRaw = y === 1 ? nbAvantagesAnN : Math.round(nbAvantagesAnN * Math.pow(growthFactor, y - 1));
      const nbClubsY = y === 1 ? nbClubs : Math.min(nbClubs + Math.floor((y - 1) * 0.5), nbClubs + nbAnnees);
      const newClubMembersRaw = y === 1
        ? nbClubs * membresParClub
        : Math.round((nbClubsY - (y === 1 ? 0 : (y === 2 ? nbClubs : nbClubsY - 1))) * membresParClub + (nbClubsY > nbClubs ? Math.round(membresParClub * 0.3) : 0));

      // Simpler: new club members = new clubs opened * members + growth on existing
      const existingClubGrowth = y === 1 ? 0 : Math.round(renewedClubMembers * (croissanceAnnuelle / 100) * 0.3);
      const newClubsOpened = y === 1 ? nbClubs : Math.max(0, Math.floor((y - 1) * 0.5));
      const newClubMembers = y === 1
        ? nbClubs * membresParClub
        : newClubsOpened * membresParClub + existingClubGrowth;

      const totalAvantages = renewedAvantages + newAvantagesRaw;
      const totalClubMembers = renewedClubMembers + newClubMembers;

      // Update stock for next year
      stockAvantages = totalAvantages;
      stockClubMembers = totalClubMembers;

      // Revenue
      const caAvantages = totalAvantages * prixAvantages;
      const caClubs = totalClubMembers * prixClub;
      const totalCA = caAvantages + caClubs;

      // Commissions earned
      const commAvantages = Math.round(caAvantages * commAvantagesEffective / 100);
      const commClubs = Math.round(caClubs * commClubPct / 100);
      const totalCommissions = commAvantages + commClubs;

      // Charges
      const redevanceAnnuelle = redevanceMensuelle * 12;
      const droitsEntreeY = y === 1 ? droitsEntree : 0;
      const totalCharges = redevanceAnnuelle + droitsEntreeY;

      const beneficeNet = totalCommissions - totalCharges;
      cumulBenefice += beneficeNet;

      data.push({
        year: y,
        label: `Année ${y}`,
        newAvantages: newAvantagesRaw,
        renewedAvantages,
        totalAvantages,
        caAvantages,
        commAvantages,
        newClubMembers,
        renewedClubMembers,
        totalClubMembers,
        caClubs,
        commClubs,
        totalCA,
        totalCommissions,
        redevanceAnnuelle,
        droitsEntree: droitsEntreeY,
        totalCharges,
        beneficeNet,
        cumulBenefice,
      });
    }
    return data;
  }, [nbAvantagesAnN, nbClubs, membresParClub, croissanceAnnuelle, tauxResiliation, nbAnnees, prixAvantages, prixClub, commAvantagesEffective, commClubPct, redevanceMensuelle, droitsEntree]);

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

  const lastYear = projections[projections.length - 1];
  const firstYear = projections[0];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FontAwesomeIcon icon={faRocket} className="text-primary" />
              Business Plan Partenaire
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Simulateur de rentabilité pour les candidats au réseau Dynabuy
            </p>
          </div>
          <Badge variant="outline" className="text-xs w-fit">Projection sur {nbAnnees} ans</Badge>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Revenus Année 1</p>
              <p className="text-lg font-bold text-primary">{fmt(firstYear?.totalCommissions ?? 0)}</p>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Revenus Année {nbAnnees}</p>
              <p className="text-lg font-bold text-primary">{fmt(lastYear?.totalCommissions ?? 0)}</p>
            </CardContent>
          </Card>
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Bénéfice net An {nbAnnees}</p>
              <p className="text-lg font-bold text-green-600">{fmt(lastYear?.beneficeNet ?? 0)}</p>
            </CardContent>
          </Card>
          <Card className="border-green-500/20 bg-green-500/5">
            <CardContent className="p-4">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Cumul sur {nbAnnees} ans</p>
              <p className="text-lg font-bold text-green-600">{fmt(lastYear?.cumulBenefice ?? 0)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-[340px_1fr] gap-6">
          {/* Inputs Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FontAwesomeIcon icon={faBriefcase} className="text-primary h-3.5 w-3.5" />
                  Paramètres de simulation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Activité commerciale</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Contrats Avantages / an</Label>
                      <Input type="number" value={nbAvantagesAnN} onChange={e => setNbAvantagesAnN(+e.target.value)} min={0} />
                    </div>
                    <div>
                      <Label className="text-xs">Nb de clubs</Label>
                      <Input type="number" value={nbClubs} onChange={e => setNbClubs(+e.target.value)} min={1} max={20} />
                    </div>
                    <div>
                      <Label className="text-xs">Membres / club</Label>
                      <Input type="number" value={membresParClub} onChange={e => setMembresParClub(+e.target.value)} min={1} max={35} />
                    </div>
                    <div>
                      <Label className="text-xs">Années projetées</Label>
                      <Input type="number" value={nbAnnees} onChange={e => setNbAnnees(Math.min(10, Math.max(1, +e.target.value)))} min={1} max={10} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Croissance annuelle (%)</Label>
                      <Input type="number" value={croissanceAnnuelle} onChange={e => setCroissanceAnnuelle(+e.target.value)} min={0} max={100} />
                    </div>
                    <div>
                      <Label className="text-xs">Taux résiliation (%)</Label>
                      <Input type="number" value={tauxResiliation} onChange={e => setTauxResiliation(+e.target.value)} min={0} max={50} />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tarification</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Prix Avantages (€)</Label>
                      <Input type="number" value={prixAvantages} onChange={e => setPrixAvantages(+e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Prix Club (€)</Label>
                      <Input type="number" value={prixClub} onChange={e => setPrixClub(+e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Comm. Avantages (%)</Label>
                      <Input type="number" value={commAvantagesPct} onChange={e => setCommAvantagesPct(+e.target.value)} disabled={packPerformance} />
                    </div>
                    <div>
                      <Label className="text-xs">Comm. Clubs (%)</Label>
                      <Input type="number" value={commClubPct} onChange={e => setCommClubPct(+e.target.value)} />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Options & Charges</h4>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Pack Performance</Label>
                    <Switch checked={packPerformance} onCheckedChange={setPackPerformance} />
                  </div>
                  {packPerformance && (
                    <p className="text-[11px] text-muted-foreground bg-primary/5 rounded p-2">
                      ✨ Commission Avantages portée à <strong>60%</strong> — Redevance : 250€/mois
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <Label className="text-xs flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faCar} className="h-3 w-3 text-muted-foreground" />
                      Véhicule floqué
                    </Label>
                    <Switch checked={vehiculeFloque} onCheckedChange={setVehiculeFloque} />
                  </div>
                  {vehiculeFloque && (
                    <p className="text-[11px] text-muted-foreground bg-green-500/5 rounded p-2">
                      🚗 Réduction de 90€/mois sur la redevance
                    </p>
                  )}
                  <div>
                    <Label className="text-xs">Droits d'entrée (€)</Label>
                    <Input type="number" value={droitsEntree} onChange={e => setDroitsEntree(+e.target.value)} min={0} />
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                    <p className="text-xs text-muted-foreground">Redevance mensuelle effective</p>
                    <p className="text-base font-bold text-foreground">{fmt(redevanceMensuelle)}<span className="text-xs font-normal text-muted-foreground"> / mois</span></p>
                    <p className="text-xs text-muted-foreground">{fmt(redevanceMensuelle * 12)} / an</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Suggestions */}
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FontAwesomeIcon icon={faArrowTrendUp} className="text-primary h-3.5 w-3.5" />
                  Leviers de croissance
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2 text-muted-foreground">
                <p>💡 <strong>Parrainage :</strong> Prime de parrainage pour chaque nouveau partenaire recruté</p>
                <p>💡 <strong>Formations payantes :</strong> Revenus additionnels via la vente de formations certifiantes</p>
                <p>💡 <strong>Événementiel premium :</strong> Organisation de soirées networking avec billets payants</p>
                <p>💡 <strong>Mandats de vente :</strong> Commissions sur mise en relation d'affaires entre membres</p>
                <p>💡 <strong>Services complémentaires :</strong> Upsell coaching, accompagnement stratégique, audits</p>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <Tabs defaultValue="chart">
              <TabsList>
                <TabsTrigger value="chart">Graphiques</TabsTrigger>
                <TabsTrigger value="table">Tableau détaillé</TabsTrigger>
              </TabsList>

              <TabsContent value="chart" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Évolution des revenus cumulés</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={projections}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis tickFormatter={v => `${Math.round(v / 1000)}k€`} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: number) => fmt(v)} />
                          <Legend />
                          <Area type="monotone" dataKey="commAvantages" stackId="1" name="Comm. Avantages" fill="hsl(var(--primary))" fillOpacity={0.6} stroke="hsl(var(--primary))" />
                          <Area type="monotone" dataKey="commClubs" stackId="1" name="Comm. Clubs" fill="hsl(var(--chart-2))" fillOpacity={0.6} stroke="hsl(var(--chart-2))" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Bénéfice net annuel vs Cumul</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={projections}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis tickFormatter={v => `${Math.round(v / 1000)}k€`} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: number) => fmt(v)} />
                          <Legend />
                          <Bar dataKey="beneficeNet" name="Bénéfice net" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                          <Line type="monotone" dataKey="cumulBenefice" name="Cumul" stroke="hsl(var(--primary))" strokeWidth={2} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Portefeuille client (contrats actifs)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={projections}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="totalAvantages" name="Contrats Avantages" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="totalClubMembers" name="Membres Clubs" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="table">
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 font-semibold sticky left-0 bg-muted/50"></th>
                            {projections.map(p => (
                              <th key={p.year} className="text-right p-3 font-semibold whitespace-nowrap">{p.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          <tr className="bg-primary/5">
                            <td className="p-3 font-semibold sticky left-0 bg-primary/5" colSpan={nbAnnees + 1}>
                              <FontAwesomeIcon icon={faHandshake} className="mr-1.5 text-primary" /> Dynabuy Avantages
                            </td>
                          </tr>
                          <TableRow label="Nouveaux contrats" data={projections.map(p => p.newAvantages)} />
                          <TableRow label="Contrats reconduits" data={projections.map(p => p.renewedAvantages)} />
                          <TableRow label="Total contrats actifs" data={projections.map(p => p.totalAvantages)} bold />
                          <TableRow label="CA généré" data={projections.map(p => p.caAvantages)} money />
                          <TableRow label={`Commission (${commAvantagesEffective}%)`} data={projections.map(p => p.commAvantages)} money bold />

                          <tr className="bg-primary/5">
                            <td className="p-3 font-semibold sticky left-0 bg-primary/5" colSpan={nbAnnees + 1}>
                              <FontAwesomeIcon icon={faUsers} className="mr-1.5 text-primary" /> Clubs d'affaires
                            </td>
                          </tr>
                          <TableRow label="Nouveaux membres" data={projections.map(p => p.newClubMembers)} />
                          <TableRow label="Membres reconduits" data={projections.map(p => p.renewedClubMembers)} />
                          <TableRow label="Total membres actifs" data={projections.map(p => p.totalClubMembers)} bold />
                          <TableRow label="CA généré" data={projections.map(p => p.caClubs)} money />
                          <TableRow label={`Commission (${commClubPct}%)`} data={projections.map(p => p.commClubs)} money bold />

                          <tr className="bg-muted/30">
                            <td className="p-3 font-semibold sticky left-0 bg-muted/30" colSpan={nbAnnees + 1}>
                              <FontAwesomeIcon icon={faEuroSign} className="mr-1.5 text-muted-foreground" /> Synthèse
                            </td>
                          </tr>
                          <TableRow label="Total commissions" data={projections.map(p => p.totalCommissions)} money bold />
                          <TableRow label="Redevance annuelle" data={projections.map(p => -p.redevanceAnnuelle)} money negative />
                          <TableRow label="Droits d'entrée" data={projections.map(p => -p.droitsEntree)} money negative />
                          <TableRow label="Bénéfice net" data={projections.map(p => p.beneficeNet)} money bold highlight />
                          <TableRow label="Cumul bénéfice" data={projections.map(p => p.cumulBenefice)} money bold highlight />
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function TableRow({ label, data, money, bold, highlight, negative }: {
  label: string;
  data: number[];
  money?: boolean;
  bold?: boolean;
  highlight?: boolean;
  negative?: boolean;
}) {
  const fmt = (n: number) => {
    if (money) return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
    return new Intl.NumberFormat("fr-FR").format(n);
  };
  return (
    <tr className={highlight ? "bg-green-500/5" : ""}>
      <td className={`p-3 whitespace-nowrap sticky left-0 ${highlight ? "bg-green-500/5" : "bg-card"} ${bold ? "font-semibold" : ""}`}>{label}</td>
      {data.map((v, i) => (
        <td key={i} className={`p-3 text-right whitespace-nowrap ${bold ? "font-semibold" : ""} ${negative && v < 0 ? "text-destructive" : ""} ${highlight ? "text-green-600 dark:text-green-400" : ""}`}>
          {fmt(v)}
        </td>
      ))}
    </tr>
  );
}
