import { PageContainer } from "@/components/layout/PageContainer";
import { SurveyBuilderShell } from "@/components/surveys/SurveyBuilderShell";
import { getMockSurveyBuilder } from "@/lib/survey-builder";

type SurveyDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SurveyDetailPage({ params }: SurveyDetailPageProps) {
  const { id } = await params;

  return (
    <PageContainer>
      <SurveyBuilderShell initialSurvey={getMockSurveyBuilder(id)} mode="edit" />
    </PageContainer>
  );
}
