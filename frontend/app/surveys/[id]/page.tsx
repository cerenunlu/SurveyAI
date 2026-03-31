"use client";

import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { SurveyBuilderShell } from "@/components/surveys/SurveyBuilderShell";
import { fetchSurveyBuilderSurvey } from "@/lib/survey-builder-api";
import type { SurveyBuilderSurvey } from "@/lib/types";

export default function SurveyDetailPage() {
  const params = useParams<{ id: string }>();
  const surveyId = params.id;
  const [survey, setSurvey] = useState<SurveyBuilderSurvey | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMissing, setIsMissing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!surveyId) {
      return;
    }

    const controller = new AbortController();

    async function loadSurvey() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        setIsMissing(false);
        const nextSurvey = await fetchSurveyBuilderSurvey(surveyId, undefined, { signal: controller.signal });
        setSurvey(nextSurvey);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const message = error instanceof Error ? error.message : "Anket detayi yuklenemedi.";
        if (message.includes("(404)")) {
          setIsMissing(true);
          return;
        }

        setErrorMessage(message);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadSurvey();
    return () => controller.abort();
  }, [surveyId]);

  if (isMissing) {
    notFound();
  }

  return (
    <PageContainer hideBackRow>
      {errorMessage ? (
        <section className="panel-card">
          <div className="operation-inline-message is-danger">
            <strong>Anket duzenleme alani yuklenemedi</strong>
            <span>{errorMessage}</span>
          </div>
        </section>
      ) : null}

      {isLoading || !survey ? (
        <section className="panel-card">
          <div className="list-item">
            <div>
              <strong>Anket yukleniyor</strong>
              <span>Duzenleme ekrani hazirlaniyor.</span>
            </div>
          </div>
        </section>
      ) : (
        <SurveyBuilderShell initialSurvey={survey} mode="edit" />
      )}
    </PageContainer>
  );
}


