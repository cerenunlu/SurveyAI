import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { ChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { HeroPanel } from "@/components/ui/HeroPanel";
import { KeyValueList } from "@/components/ui/KeyValueList";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { detailHighlights, surveys } from "@/mock/data";

type SurveyDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SurveyDetailPage({ params }: SurveyDetailPageProps) {
  const { id } = await params;
  const survey = surveys.find((item) => item.id === id);

  if (!survey) {
    notFound();
  }

  return (
    <PageContainer>
      <HeroPanel
        eyebrow="Survey Detail"
        title={survey.name}
        description={survey.goal}
        actions={
          <>
            <StatusBadge status={survey.status} />
            <button className="button-secondary">Duplicate Survey</button>
          </>
        }
        chips={survey.channels}
      />

      <div className="detail-grid">
        <SectionCard title="Survey health" description="Core performance metrics and chart placeholder.">
          <ChartPlaceholder
            title="Completion and engagement"
            subtitle={`Audience: ${survey.audience} / ${survey.questions} questions`}
            values={[22, 34, 48, 40, 54, 66, 70, 64, 75, 78, 81, 86]}
          />
        </SectionCard>

        <SectionCard title="Snapshot" description="Reusable summary block for metadata and quick stats.">
          <KeyValueList
            items={[
              { label: "Owner", value: survey.owner },
              { label: "Audience", value: survey.audience },
              { label: "Completions", value: survey.completions.toLocaleString() },
              { label: "Response rate", value: survey.responseRate },
              { label: "Updated", value: survey.updatedAt },
            ]}
          />
        </SectionCard>
      </div>

      <div className="two-column-grid">
        <SectionCard title="AI monitoring highlights" description="Premium detail card intended for generated insights later.">
          <div className="stack-list">
            {detailHighlights.map((item) => (
              <div key={item.label} className="list-item">
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.value}</span>
                </div>
                <StatusBadge status={item.value === "Low" ? "Active" : "Completed"} />
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Operational notes" description="Reserved surface for timeline events and future backend hooks.">
          <div className="stack-list">
            {[
              "Question order is optimized for early signal capture before optional verbatims.",
              "Voice AI branch is outperforming email by 11 percentage points in completions.",
              "Mobile users show strongest completion quality after shortening open-text prompts.",
            ].map((item) => (
              <div className="list-item" key={item}>
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageContainer>
  );
}
