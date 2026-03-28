import { PageContainer } from "@/components/layout/PageContainer";
import { SurveyBuilderShell } from "@/components/surveys/SurveyBuilderShell";
import { fetchSurveyBuilderSurvey } from "@/lib/survey-builder-api";

type SurveyDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function SurveyDetailPage({ params }: SurveyDetailPageProps) {
  const { id } = await params;
  const survey = await fetchSurveyBuilderSurvey(id);

  return (
    <PageContainer>
      <SurveyBuilderShell initialSurvey={survey} mode="edit" />
    </PageContainer>
  );
}
