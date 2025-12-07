import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowRight, ArrowLeft } from "lucide-react";

export interface InvestorDetails {
  name: string;
  email: string;
  phone: string;
  address: string;
  entityType: 'individual' | 'entity';
  entityName: string;
  entityJurisdiction: string;
}

interface InvestorDetailsStepProps {
  initialData: InvestorDetails;
  onContinue: (data: InvestorDetails) => void;
  onBack: () => void;
}

export default function InvestorDetailsStep({ initialData, onContinue, onBack }: InvestorDetailsStepProps) {
  const [formData, setFormData] = useState<InvestorDetails>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof InvestorDetails, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof InvestorDetails, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }
    if (formData.entityType === 'entity' && !formData.entityName.trim()) {
      newErrors.entityName = 'Entity name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onContinue(formData);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-heading font-semibold text-foreground">
          Your Details
        </h1>
        <p className="text-muted-foreground mt-2">
          Enter your information as it should appear on the investment agreement.
        </p>
      </div>

      <div className="space-y-6">
        {/* Investor Type */}
        <div className="space-y-3">
          <Label>Investor Type</Label>
          <RadioGroup
            value={formData.entityType}
            onValueChange={(value: 'individual' | 'entity') => 
              setFormData(prev => ({ ...prev, entityType: value }))
            }
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="individual" id="individual" />
              <Label htmlFor="individual" className="font-normal cursor-pointer">Individual</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="entity" id="entity" />
              <Label htmlFor="entity" className="font-normal cursor-pointer">Entity (LLC, Corp, Trust)</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Entity Details */}
        {formData.entityType === 'entity' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="entityName">Entity Name</Label>
              <Input
                id="entityName"
                value={formData.entityName}
                onChange={(e) => setFormData(prev => ({ ...prev, entityName: e.target.value }))}
                placeholder="Acme Ventures LLC"
              />
              {errors.entityName && <p className="text-sm text-destructive">{errors.entityName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="entityJurisdiction">Jurisdiction (Optional)</Label>
              <Input
                id="entityJurisdiction"
                value={formData.entityJurisdiction}
                onChange={(e) => setFormData(prev => ({ ...prev, entityJurisdiction: e.target.value }))}
                placeholder="Delaware"
              />
            </div>
          </div>
        )}

        {/* Personal Details */}
        <div className="space-y-2">
          <Label htmlFor="name">
            {formData.entityType === 'entity' ? 'Signatory Name' : 'Full Legal Name'}
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="John Smith"
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="john@example.com"
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+1 (555) 123-4567"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Mailing Address</Label>
          <Input
            id="address"
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            placeholder="123 Main Street, City, State, ZIP, Country"
          />
          {errors.address && <p className="text-sm text-destructive">{errors.address}</p>}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handleSubmit} className="flex-1">
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}