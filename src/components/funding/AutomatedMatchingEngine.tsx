import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  BadgeCheck,
  BookOpen,
  CheckCircle2,
  DollarSign,
  FileText,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { sampleFunders, sampleOpportunities, SMEProfile, FunderProfile, Opportunity } from "@/data/matchingEngineData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const packages = [
  {
    id: "full",
    title: "Full Automated Matchmaking",
    price: 250,
    description: "AI-driven matches across investors, banks, donors, tenders and accelerators.",
    includes: ["All categories", "AI narratives", "Fit scores & reasons", "PDF-ready report (ZMW50 add-on)", "Share link (ZMW50 per share)", "Proposal upsell (ZMW100)", "Priority boost add-on (ZMW150/mo)", "Compliance, impact & financial filters"],
  },
  {
    id: "single",
    title: "Single Match Category",
    price: 75,
    description: "One category only (e.g. banks or donors). Upgrade anytime.",
    includes: ["1 category", "Eligibility filter", "Fit score & narrative", "Share priced separately"],
  },
];

const categories: { id: string; label: string; categories: FunderProfile["category"][] }[] = [
  { id: "investors", label: "Investors (Angels + VC)", categories: ["angel", "vc"] },
  { id: "banks", label: "Banks", categories: ["bank"] },
  { id: "microfinance", label: "Microfinance", categories: ["microfinance"] },
  { id: "donors", label: "Donors & Grants", categories: ["donor", "grant", "government"] },
  { id: "corporate", label: "Corporate Supplier Funds", categories: ["corporate"] },
  { id: "accelerators", label: "Accelerators & Incubators", categories: ["accelerator"] },
];

const steps = [
  "Aligning SME Data",
  "Checking Eligibility",
  "Calculating Fit Scores",
  "Ranking Opportunities",
  "Generating AI Narratives",
  "Preparing Match Report",
];

type StageStatus = "pending" | "active" | "done";

type MatchResult = {
  funder: FunderProfile;
  fitScore: number;
  matchReasons: string[];
  concerns: string[];
  narrative: string;
};

type OpportunityMatch = {
  opportunity: Opportunity;
  fitScore: number;
  reasons: string[];
  concerns: string[];
  narrative: string;
};

const defaultProfile: SMEProfile = {
  name: "Wathaci Demo SME",
  sector: "agriculture",
  subsector: "value_chain",
  businessModel: "B2B",
  location: "Zambia",
  revenue: 1200000,
  profitability: "profitable",
  cashflowStability: "moderate",
  fundabilityScore: 72,
  debtHistory: "clean",
  fundingRequestAmount: 450000,
  fundingPurpose: "Working capital to scale regional distribution and climate-smart storage",
  registrationYears: 3,
  taxClearance: true,
  businessLicences: true,
  growthStage: "growth",
  impactTags: ["jobs", "gender", "rural", "esg"],
};

const calculateEligibility = (sme: SMEProfile, funder: FunderProfile) => {
  const blockers: string[] = [];
  if (sme.fundingRequestAmount < funder.minAmount || sme.fundingRequestAmount > funder.maxAmount) {
    blockers.push("Ticket size outside range");
  }
  if (funder.excludedSectors?.includes(sme.sector)) {
    blockers.push("Sector excluded by funder");
  }
  if (!funder.sectors.includes(sme.sector)) {
    blockers.push("Sector not in mandate");
  }
  if (funder.eligibility.registrationAge && sme.registrationYears < funder.eligibility.registrationAge) {
    blockers.push("Too early for registration age");
  }
  if (funder.eligibility.revenueMinimum && sme.revenue < funder.eligibility.revenueMinimum) {
    blockers.push("Revenue below minimum");
  }
  if (funder.eligibility.geographicFocus && !funder.eligibility.geographicFocus.includes(sme.location)) {
    blockers.push("Outside geographic focus");
  }
  if (funder.eligibility.complianceRequirements?.includes("tax_clearance") && !sme.taxClearance) {
    blockers.push("Tax clearance missing");
  }
  if (funder.eligibility.complianceRequirements?.includes("business_license") && !sme.businessLicences) {
    blockers.push("Business licence missing");
  }
  if (funder.eligibility.genderOrYouth?.includes("women") && !sme.impactTags.includes("gender")) {
    blockers.push("Women-led requirement");
  }
  return {
    eligible: blockers.length === 0,
    blockers,
  };
};

const scoreMatch = (sme: SMEProfile, funder: FunderProfile): MatchResult | null => {
  const eligibility = calculateEligibility(sme, funder);
  if (!eligibility.eligible) {
    return null;
  }

  let score = 0;
  const reasons: string[] = [];
  const concerns: string[] = [];

  // Sector fit (25%)
  if (funder.sectors.includes(sme.sector)) {
    const sectorScore = funder.prioritySectors?.includes(sme.sector) ? 25 : 20;
    score += sectorScore;
    reasons.push(`Sector match: ${sectorScore === 25 ? "Top priority" : "Aligned"}`);
  } else {
    concerns.push("Sector alignment is weak");
  }

  // Financial fit (25%)
  const withinTicket = sme.fundingRequestAmount >= funder.minAmount && sme.fundingRequestAmount <= funder.maxAmount;
  const revenueOk = !funder.eligibility.revenueMinimum || sme.revenue >= funder.eligibility.revenueMinimum;
  let financialScore = 0;
  if (withinTicket) financialScore += 12;
  if (revenueOk) financialScore += 7;
  if (sme.profitability === "profitable") financialScore += 6;
  score += financialScore;
  reasons.push(`Ticket size alignment: ${withinTicket ? "Good" : "Adjust requested amount"}`);
  if (!withinTicket) concerns.push("Funding amount outside preferred range");
  if (!revenueOk) concerns.push("Revenue threshold risk");

  // Risk appetite (20%)
  let riskScore = 10;
  if (funder.riskAppetite === "high_growth" && sme.fundabilityScore >= 65) riskScore = 20;
  if (funder.riskAppetite === "moderate" && sme.fundabilityScore >= 55) riskScore = 18;
  if (funder.riskAppetite === "conservative" && sme.fundabilityScore >= 75) riskScore = 15;
  if (funder.riskAppetite === "early_stage_friendly") riskScore = 16;
  score += riskScore;
  reasons.push("Fundability score fits risk appetite");

  // Compliance (15%)
  let complianceScore = 0;
  if (sme.taxClearance) complianceScore += 8;
  if (sme.businessLicences) complianceScore += 7;
  score += complianceScore;
  if (!sme.taxClearance || !sme.businessLicences) concerns.push("Complete compliance to unlock better terms");

  // Impact (15%)
  const impactOverlap = funder.impactMandates?.filter((tag) => sme.impactTags.includes(tag)) ?? [];
  const impactScore = Math.min(15, (impactOverlap.length || 0) * 5);
  score += impactScore;
  if (impactScore > 0) {
    reasons.push(`Impact fit: ${impactOverlap.join(", ")}`);
  } else {
    concerns.push("Limited alignment with impact mandates");
  }

  const narrative = `Why this funder fits you: ${funder.name} is active in ${funder.region} with appetite for ${funder.prioritySectors?.join(", ") || funder.sectors.join(", ")}. Your fundability score of ${sme.fundabilityScore} aligns with their ${funder.riskAppetite.replace("_", " ")} profile, and your need for ZMW ${sme.fundingRequestAmount.toLocaleString()} sits within their ${funder.minAmount.toLocaleString()}-${funder.maxAmount.toLocaleString()} ticket.`;

  return {
    funder,
    fitScore: Math.min(100, Math.round(score)),
    matchReasons: reasons,
    concerns: [...concerns, ...eligibility.blockers],
    narrative,
  };
};

const scoreOpportunity = (sme: SMEProfile, opportunity: Opportunity): OpportunityMatch | null => {
  const reasons: string[] = [];
  const concerns: string[] = [];
  let score = 0;

  const sectorAligned = opportunity.sectorFocus.includes(sme.sector);
  if (!sectorAligned) concerns.push("Sector not prioritised");
  score += sectorAligned ? 25 : 5;

  if (opportunity.ticketMin && sme.fundingRequestAmount < opportunity.ticketMin) {
    concerns.push("Requested amount below minimum");
  } else if (opportunity.ticketMax && sme.fundingRequestAmount > opportunity.ticketMax) {
    concerns.push("Requested amount above maximum");
  } else {
    reasons.push("Ticket size within envelope");
    score += 20;
  }

  if (!opportunity.location || opportunity.location === sme.location || opportunity.location === "Pan-Africa") {
    score += 15;
    reasons.push("Geography accepted");
  }

  if (opportunity.requirements.includes("Tax clearance") && !sme.taxClearance) {
    concerns.push("Tax clearance needed for this call");
  } else {
    score += 10;
  }

  const impactSignals = opportunity.requirements.filter((req) => req.toLowerCase().includes("climate") || req.toLowerCase().includes("impact"));
  if (impactSignals.length && sme.impactTags.length) {
    score += 15;
    reasons.push("Impact narrative available");
  }

  const narrative = `${opportunity.title} from ${opportunity.sponsor} values ${opportunity.requirements.join(", ")}. Your ${sme.sector} focus and request of ZMW ${sme.fundingRequestAmount.toLocaleString()} align with the published range.`;

  return {
    opportunity,
    fitScore: Math.min(100, Math.round(score + (sme.fundabilityScore / 10))),
    reasons,
    concerns,
    narrative,
  };
};

interface AutomatedMatchingEngineProps {
  viewOnly?: boolean;
  onRequestAccess?: () => void;
}

export const AutomatedMatchingEngine = ({ viewOnly = false, onRequestAccess }: AutomatedMatchingEngineProps) => {
  const [profile, setProfile] = useState<SMEProfile>(defaultProfile);
  const [selectedPackage, setSelectedPackage] = useState<string>("full");
  const [selectedCategory, setSelectedCategory] = useState<string>("investors");
  const [paid, setPaid] = useState(false);
  const [processingState, setProcessingState] = useState<StageStatus[]>(() =>
    steps.map((_, idx) => (idx === 0 ? "active" : "pending"))
  );
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [opportunityMatches, setOpportunityMatches] = useState<OpportunityMatch[]>([]);
  const [sharePurchases, setSharePurchases] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const ensureInteractive = () => {
    if (viewOnly) {
      onRequestAccess?.();
      return false;
    }
    return true;
  };

  const filteredFunders = useMemo(() => {
    if (selectedPackage === "full") return sampleFunders;
    const category = categories.find((c) => c.id === selectedCategory);
    if (!category) return [];
    return sampleFunders.filter((f) => category.categories.includes(f.category));
  }, [selectedCategory, selectedPackage]);

  const runMatching = () => {
    if (!ensureInteractive()) return;
    if (!paid) {
      toast({ title: "Payment required", description: "Complete the payment to unlock AI-driven matching." });
      return;
    }
    setLoading(true);
    setProcessingState(steps.map((_, idx) => (idx === 0 ? "active" : "pending")));

    setTimeout(() => {
      setProcessingState((prev) =>
        prev.map((_, idx) => {
          if (idx <= 1) return "done";
          if (idx === 2) return "active";
          return "pending";
        })
      );
      const results = filteredFunders
        .map((funder) => scoreMatch(profile, funder))
        .filter(Boolean) as MatchResult[];
      const ranked = results.sort((a, b) => b.fitScore - a.fitScore).slice(0, 7);
      setMatches(ranked);

      const oppScores = sampleOpportunities
        .map((op) => scoreOpportunity(profile, op))
        .filter(Boolean) as OpportunityMatch[];
      const rankedOpps = oppScores.sort((a, b) => b.fitScore - a.fitScore).slice(0, 5);
      setOpportunityMatches(rankedOpps);

      setProcessingState((prev) => prev.map((_, idx) => (idx <= 4 ? "done" : "active")));
      setTimeout(() => setProcessingState(steps.map(() => "done")), 600);
      setLoading(false);
    }, 650);
  };

  const handlePayment = () => {
    if (!ensureInteractive()) return;
    setPaid(true);
    toast({
      title: "Payment captured",
      description: `ZMW ${selectedPackage === "full" ? 250 : 75} received. AI Matching unlocked.`,
    });
  };

  const handleShare = (id: string) => {
    if (!ensureInteractive()) return;
    setSharePurchases((prev) => ({ ...prev, [id]: true }));
    toast({ title: "Share link unlocked", description: "ZMW 50 share credit applied. Link expires in 48 hours." });
  };

  const categoryLabel = useMemo(() => {
    if (selectedPackage === "full") return "All categories";
    return categories.find((c) => c.id === selectedCategory)?.label ?? "Category";
  }, [selectedCategory, selectedPackage]);

  const averageScore = matches.length ? Math.round(matches.reduce((acc, curr) => acc + curr.fitScore, 0) / matches.length) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-[2fr,1.2fr]">
        <Card className="border-2 border-orange-100 bg-gradient-to-br from-orange-50 via-white to-green-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Automated Investor & Funding Opportunity Engine</CardTitle>
                <CardDescription>AI-driven, eligibility-first ranking with monetized workflows.</CardDescription>
              </div>
              <Badge variant="outline" className="flex items-center gap-1 text-orange-700 border-orange-200">
                <Sparkles className="h-4 w-4" />
                AI Orchestrated
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {packages.map((pkg) => (
                <Card
                  key={pkg.id}
                  className={cn("cursor-pointer border", selectedPackage === pkg.id ? "border-green-500 shadow-lg" : "border-gray-200")}
                  onClick={() => setSelectedPackage(pkg.id)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{pkg.title}</CardTitle>
                      <Badge className="bg-green-600">ZMW {pkg.price}</Badge>
                    </div>
                    <CardDescription>{pkg.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {pkg.includes.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedPackage === "single" && (
              <div>
                <Label className="text-sm font-semibold">Select focus category</Label>
                <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
                  {categories.map((cat) => (
                    <Button
                      key={cat.id}
                      variant={selectedCategory === cat.id ? "default" : "outline"}
                      className="justify-start"
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      <Target className="mr-2 h-4 w-4" />
                      {cat.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={handlePayment}
                className="bg-green-600 hover:bg-green-700"
                disabled={viewOnly}
              >
                {paid ? "Payment Confirmed" : `Pay ZMW ${selectedPackage === "full" ? 250 : 75}`}
              </Button>
              <Badge variant="secondary" className="flex items-center gap-1">
                <ShieldCheck className="h-4 w-4" /> Matching requires payment
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <FileText className="h-4 w-4" /> PDF export: ZMW 50
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <ArrowUpRight className="h-4 w-4" /> Share report: ZMW 50
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SME Funding Profile</CardTitle>
            <CardDescription>Data blended from SME Profile, Diagnostics and Credit Passport.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>SME Name</Label>
                <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              </div>
              <div>
                <Label>Sector</Label>
                <Input value={profile.sector} onChange={(e) => setProfile({ ...profile, sector: e.target.value.toLowerCase() })} />
              </div>
              <div>
                <Label>Business model</Label>
                <Input
                  value={profile.businessModel}
                  onChange={(e) => setProfile({ ...profile, businessModel: e.target.value as SMEProfile["businessModel"] })}
                />
              </div>
              <div>
                <Label>Location</Label>
                <Input value={profile.location} onChange={(e) => setProfile({ ...profile, location: e.target.value })} />
              </div>
              <div>
                <Label>Revenue (ZMW)</Label>
                <Input
                  type="number"
                  value={profile.revenue}
                  onChange={(e) => setProfile({ ...profile, revenue: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Fundability score</Label>
                <Input
                  type="number"
                  value={profile.fundabilityScore}
                  onChange={(e) => setProfile({ ...profile, fundabilityScore: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Funding request (ZMW)</Label>
                <Input
                  type="number"
                  value={profile.fundingRequestAmount}
                  onChange={(e) => setProfile({ ...profile, fundingRequestAmount: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Years registered</Label>
                <Input
                  type="number"
                  value={profile.registrationYears}
                  onChange={(e) => setProfile({ ...profile, registrationYears: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <Label>Funding purpose</Label>
              <Textarea
                value={profile.fundingPurpose}
                onChange={(e) => setProfile({ ...profile, fundingPurpose: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={profile.taxClearance}
                  onCheckedChange={(checked) => setProfile({ ...profile, taxClearance: checked })}
                />
                <Label className="cursor-pointer">Tax clearance</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={profile.businessLicences}
                  onCheckedChange={(checked) => setProfile({ ...profile, businessLicences: checked })}
                />
                <Label className="cursor-pointer">Business licences</Label>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>AI Automation Pipeline</CardTitle>
            <CardDescription>Eligibility filter → Fit score (0-100) → Narrative → Monetized actions</CardDescription>
          </div>
          <Button
            onClick={runMatching}
            disabled={loading || viewOnly}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running engine
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Start matching
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-3">
            {steps.map((label, idx) => (
              <div key={label} className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>{label}</span>
                  {processingState[idx] === "done" && <BadgeCheck className="h-4 w-4 text-green-600" />}
                  {processingState[idx] === "active" && <Loader2 className="h-4 w-4 animate-spin text-orange-600" />}
                  {processingState[idx] === "pending" && <Lock className="h-4 w-4 text-gray-400" />}
                </div>
                <Progress value={processingState[idx] === "done" ? 100 : processingState[idx] === "active" ? 55 : 8} />
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-orange-50 p-3 text-sm text-orange-900">
            Matching unlocked for <strong>{categoryLabel}</strong>. Sharing or exporting requires additional payments (ZMW50 each). AI proposal drafting is upsold at ZMW100 per investor, and visibility boosts at ZMW150/mo.
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="matches" className="space-y-4">
        <TabsList>
          <TabsTrigger value="matches">Investor/Bank/Donor Matches</TabsTrigger>
          <TabsTrigger value="opportunities">Tenders & Grant Calls</TabsTrigger>
        </TabsList>
        <TabsContent value="matches" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
            <Badge variant="secondary" className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" /> Average fit score: {averageScore || "-"}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" /> Share: ZMW 50 | Proposal: ZMW 100 | PDF: ZMW 50
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" /> AI narrative per match
            </Badge>
          </div>

          {matches.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-gray-600">
              Run the engine to see ranked matches. Eligibility filters remove non-fit options instantly.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {matches.map((match) => (
                <Card key={match.funder.id} className="border-2 border-gray-100">
                  <CardHeader className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{match.funder.name}</CardTitle>
                        <CardDescription className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{match.funder.category}</Badge>
                          <Badge variant="secondary">{match.funder.region}</Badge>
                          <span className="text-gray-600">{match.funder.fundingTypes.join(", ")}</span>
                        </CardDescription>
                      </div>
                      <Badge className={cn("text-lg", match.fitScore >= 75 ? "bg-green-600" : "bg-yellow-600")}>{match.fitScore}%</Badge>
                    </div>
                    <p className="text-sm text-gray-700">{match.narrative}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span>
                          Ticket: ZMW {match.funder.minAmount.toLocaleString()} - {match.funder.maxAmount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-orange-600" />
                        <span>Priority: {match.funder.prioritySectors?.join(", ") ?? "General"}</span>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold text-gray-800">Match reasons</p>
                      {match.matchReasons.map((reason) => (
                        <div key={reason} className="flex items-center gap-2 text-green-700">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                    {match.concerns.length > 0 && (
                      <div className="space-y-1 text-sm">
                        <p className="font-semibold text-gray-800">Concerns to fix</p>
                        {match.concerns.map((concern) => (
                          <div key={concern} className="flex items-center gap-2 text-orange-700">
                            <AlertCircle className="h-4 w-4" />
                            <span>{concern}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <Button
                        variant="outline"
                        onClick={() => handleShare(match.funder.id)}
                        className={sharePurchases[match.funder.id] ? "border-green-500 text-green-700" : ""}
                        disabled={viewOnly}
                      >
                        {sharePurchases[match.funder.id] ? "Share link active" : "Share (ZMW50)"}
                      </Button>
                      <Button
                        variant="secondary"
                        className="bg-orange-100 text-orange-800"
                        disabled={viewOnly}
                        onClick={() => {
                          if (viewOnly) {
                            onRequestAccess?.();
                          }
                        }}
                      >
                        AI proposal (ZMW100)
                      </Button>
                      <Button
                        variant="ghost"
                        className="flex items-center justify-center gap-1"
                        disabled={viewOnly}
                        onClick={() => {
                          if (viewOnly) {
                            onRequestAccess?.();
                          }
                        }}
                      >
                        <ArrowUpRight className="h-4 w-4" /> Apply / Contact
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-3">
          {opportunityMatches.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-gray-600">
              Run the engine to see matched tenders, procurement needs and grant calls.
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {opportunityMatches.map((match) => (
                <Card key={match.opportunity.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{match.opportunity.title}</CardTitle>
                      <Badge className="bg-blue-600">{match.fitScore}%</Badge>
                    </div>
                    <CardDescription className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge variant="outline">{match.opportunity.category}</Badge>
                      <Badge variant="secondary">Deadline: {match.opportunity.deadline}</Badge>
                      <span>{match.opportunity.sponsor}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p>{match.narrative}</p>
                    <div className="space-y-1">
                      <p className="font-semibold">Reasons</p>
                      {match.reasons.map((reason) => (
                        <div key={reason} className="flex items-center gap-2 text-green-700">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                    {match.concerns.length > 0 && (
                      <div className="space-y-1">
                        <p className="font-semibold">Concerns</p>
                        {match.concerns.map((concern) => (
                          <div key={concern} className="flex items-center gap-2 text-orange-700">
                            <AlertCircle className="h-4 w-4" />
                            <span>{concern}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={viewOnly}
                      onClick={() => {
                        if (viewOnly) {
                          onRequestAccess?.();
                        }
                      }}
                    >
                      Save as PDF (ZMW50)
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
