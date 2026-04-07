import { useState } from "react";
import { Button } from "@/components/ui/button";

interface PlantQuoteFormProps {
  plantType?: string;
  plantTitle?: string;
  [key: string]: any;
}

export function PlantQuoteForm({ plantType, plantTitle }: PlantQuoteFormProps) {
  return (
    <div className="p-6 bg-card border border-border rounded-lg">
      <h3 className="text-lg font-medium mb-4">Request Quote - {plantTitle || plantType}</h3>
      <p className="text-muted-foreground text-sm">Contact us for a customized quote.</p>
      <Button className="mt-4" asChild>
        <a href="mailto:info@elpgreen.com">Contact Us</a>
      </Button>
    </div>
  );
}
