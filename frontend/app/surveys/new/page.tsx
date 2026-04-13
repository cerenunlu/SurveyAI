import { PageContainer } from "@/components/layout/PageContainer";
import { SurveyBuilderShell } from "@/components/surveys/SurveyBuilderShell";
import { createEmptySurveyDraft } from "@/lib/survey-builder";

export default function NewSurveyPage() {
  return (
    <PageContainer hideBackRow>
      <SurveyBuilderShell
        initialSurvey={createEmptySurveyDraft()}
        mode="create"
        showSummaryStrip={false}
        showToolbar={false}
        showHeaderPersistActions
        showTopRow={false}
        showPreviewPanel={false}
        showReadinessPanel={false}
        showSurveySummaryPanel={false}
        showCanvasHeader={false}
        showLanguageCodeField={false}
        compactSpacing
      />
    </PageContainer>
  );
}


