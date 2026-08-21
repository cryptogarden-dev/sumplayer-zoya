import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { ComparisonView } from "@/components/perbandingan/ComparisonView";

export const metadata: Metadata = { title: "Bandingkan" };

export default function BandingkanPage() {
  return (
    <div>
      <PageHeader
        title="Bandingkan"
        description="Bandingkan harga per satuan, ongkir, dan rekomendasi supplier."
      />
      <ComparisonView />
    </div>
  );
}
