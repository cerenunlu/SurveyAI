import { PageContainer } from "@/components/layout/PageContainer";
import { SurveyBuilderShell } from "@/components/surveys/SurveyBuilderShell";
import { createEmptySurveyDraft } from "@/lib/survey-builder";

export default function NewSurveyPage() {
  return (
    <PageContainer>
      <SurveyBuilderShell initialSurvey={createEmptySurveyDraft()} mode="create" />
    </PageContainer>
  );
}
