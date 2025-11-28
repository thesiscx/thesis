import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GlobalDocketProps {
  roundSlug?: string;
}

export default function GlobalDocket({ roundSlug }: GlobalDocketProps) {
  const [instrumentType, setInstrumentType] = useState<"safe" | "note">("safe");
  const [roundState, setRoundState] = useState<"draft" | "live" | "closed">("draft");
  
  // Placeholder data
  const investorDockets = [
    { id: "1", investor: "Sequoia", amount: 500000, status: "investor_signed", lastUpdated: "2024-01-15", wireReceived: false },
    { id: "2", investor: "Andreessen", amount: 250000, status: "sent", lastUpdated: "2024-01-14", wireReceived: false },
    { id: "3", investor: "Julian K", amount: 50000, status: "executed", lastUpdated: "2024-01-10", wireReceived: true },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      sent: "secondary",
      investor_signed: "default",
      executed: "default",
      expired: "destructive",
    };
    const labels: Record<string, string> = {
      draft: "Draft",
      sent: "Sent",
      investor_signed: "Signed by investor",
      executed: "Fully executed",
      expired: "Expired",
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-y-auto">
      <div className="max-w-5xl mx-auto p-8 space-y-8">
        <div>
          <h1 className="font-heading text-2xl font-semibold mb-2">Docket Settings</h1>
          <p className="text-muted-foreground">Configure your round terms and agreement template</p>
        </div>

        <Tabs defaultValue="terms" className="space-y-6">
          <TabsList>
            <TabsTrigger value="terms">Round Terms</TabsTrigger>
            <TabsTrigger value="template">Agreement Template</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Round Terms Tab */}
          <TabsContent value="terms" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Instrument Type</Label>
                <Select value={instrumentType} onValueChange={(v: "safe" | "note") => setInstrumentType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="safe">SAFE</SelectItem>
                    <SelectItem value="note">Convertible Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Round State</Label>
                <Select value={roundState} onValueChange={(v: "draft" | "live" | "closed") => setRoundState(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cap">Valuation Cap</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input id="cap" placeholder="10,000,000" className="pl-7" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount">Discount Rate (%)</Label>
                <Input id="discount" placeholder="20" type="number" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target">Target Raise</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input id="target" placeholder="2,000,000" className="pl-7" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minimum">Minimum Ticket</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input id="minimum" placeholder="25,000" className="pl-7" />
                </div>
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch id="mfn" />
                <Label htmlFor="mfn">MFN (Most Favored Nation)</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="prorata" />
                <Label htmlFor="prorata">Pro-rata Rights</Label>
              </div>
            </div>

            <div className="border-t pt-6 space-y-4">
              <h3 className="font-medium">Company Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Company Name</Label>
                  <Input id="company" placeholder="Acme Inc." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entity">Entity Type</Label>
                  <Input id="entity" placeholder="Delaware C-Corp" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jurisdiction">Jurisdiction</Label>
                  <Input id="jurisdiction" placeholder="Delaware" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Registered Address</Label>
                  <Input id="address" placeholder="123 Main St..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signatory">Signatory Name</Label>
                  <Input id="signatory" placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Signatory Title</Label>
                  <Input id="title" placeholder="CEO" />
                </div>
              </div>
            </div>

            <div className="border-t pt-6 space-y-4">
              <h3 className="font-medium">Wire Instructions</h3>
              <Textarea 
                placeholder="Bank name, account number, routing number..."
                className="min-h-[100px]"
              />
            </div>

            <div className="flex justify-end">
              <Button>Save Terms</Button>
            </div>
          </TabsContent>

          {/* Agreement Template Tab */}
          <TabsContent value="template" className="space-y-4">
            <div className="border rounded-lg p-6 bg-muted/30">
              <ScrollArea className="h-[500px]">
                <div className="prose prose-sm max-w-none">
                  <h2>SAFE (Simple Agreement for Future Equity)</h2>
                  <p className="text-muted-foreground text-sm">
                    Most of this template is locked. Editable sections are highlighted.
                  </p>
                  <hr />
                  <p>
                    THIS CERTIFIES THAT in exchange for the payment by [<span className="bg-yellow-200 dark:bg-yellow-900 px-1">Investor Name</span>] 
                    (the "Investor") of $[<span className="bg-yellow-200 dark:bg-yellow-900 px-1">Amount</span>] 
                    (the "Purchase Amount") on or about [Date], [Company Name], a Delaware corporation 
                    (the "Company"), issues to the Investor the right to certain shares of the Company's 
                    Capital Stock, subject to the terms described below.
                  </p>
                  <p>
                    The "Post-Money Valuation Cap" is $[<span className="bg-yellow-200 dark:bg-yellow-900 px-1">Valuation Cap</span>].
                  </p>
                  {/* More SAFE template content would go here */}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Wire Received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investorDockets.map((docket) => (
                    <TableRow key={docket.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{docket.investor}</TableCell>
                      <TableCell>${docket.amount.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(docket.status)}</TableCell>
                      <TableCell className="text-muted-foreground">{docket.lastUpdated}</TableCell>
                      <TableCell>
                        <Switch checked={docket.wireReceived} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
