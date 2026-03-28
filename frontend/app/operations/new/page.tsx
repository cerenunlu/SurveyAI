import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionCard } from "@/components/ui/SectionCard";

export default function NewOperationPage() {
  return (
    <PageContainer>
      <SectionCard
        title="Create Operation"
        description="Operation creation is not wired in this frontend yet, but the renamed route is now live and aligned with the rest of the product terminology."
        action={<Link href="/operations" className="button-secondary compact-button">Back to operations</Link>}
      >
        <div className="list-item">
          <div>
            <strong>Next step</strong>
            <span>Connect this route to the operation creation form when the backend create flow is exposed in the UI.</span>
          </div>
        </div>
      </SectionCard>
    </PageContainer>
  );
}
