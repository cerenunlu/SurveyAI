"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchCampaignContacts, fetchCompanyCampaigns } from "@/lib/campaigns";
import { useTranslations } from "@/lib/i18n/LanguageContext";
import { fetchCompanySurveys } from "@/lib/surveys";
import type { CampaignContact } from "@/lib/types";

type DashboardContact = CampaignContact & {
  campaignName: string;
};

export default function DashboardPage() {
  const { t } = useTranslations();
  const [surveys, setSurveys] = useState<Awaited<ReturnType<typeof fetchCompanySurveys>>>([]);
  const [campaigns, setCampaigns] = useState<Awaited<ReturnType<typeof fetchCompanyCampaigns>>>([]);
  const [contacts, setContacts] = useState<DashboardContact[]>([]);
  const [unavailableSections, setUnavailableSections] = useState<string[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      const [surveysResult, campaignsResult] = await Promise.allSettled([fetchCompanySurveys(), fetchCompanyCampaigns()]);

      if (!isMounted) {
        return;
      }

      const nextSurveys = surveysResult.status === "fulfilled" ? surveysResult.value : [];
      const nextCampaigns = campaignsResult.status === "fulfilled" ? campaignsResult.value : [];

      setSurveys(nextSurveys);
      setCampaigns(nextCampaigns);

      const contactResults = nextCampaigns.length
        ? await Promise.allSettled(
            nextCampaigns.map(async (campaign) => ({
              campaignName: campaign.name,
              contacts: await fetchCampaignContacts(campaign.id),
            })),
          )
        : [];

      if (!isMounted) {
        return;
      }

      setContacts(
        contactResults.flatMap((result): DashboardContact[] => {
          if (result.status !== "fulfilled") {
            return [];
          }

          return result.value.contacts.map((contact) => ({
            ...contact,
            campaignName: result.value.campaignName,
          }));
        }),
      );

      setUnavailableSections(
        [
          surveysResult.status === "rejected" ? t("dashboard.unavailable.surveys") : null,
          campaignsResult.status === "rejected" ? t("dashboard.unavailable.campaigns") : null,
          contactResults.some((result) => result.status === "rejected") ? t("dashboard.unavailable.contacts") : null,
        ].filter((value): value is string => value !== null),
      );
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [t]);

  return (
    <PageContainer>
      <section className="dashboard-actions panel-card">
        <div className="dashboard-actions-row">
          <Link href="/surveys" className="button-primary">
            {t("shell.topbar.createSurvey")}
          </Link>
          <Link href="/surveys" className="button-secondary">
            {t("dashboard.hero.openSurveys")}
          </Link>
          <Link href="/campaigns" className="button-secondary">
            {t("dashboard.hero.openCampaigns")}
          </Link>
          <Link href="/contacts" className="button-secondary">
            {t("dashboard.hero.openContacts")}
          </Link>
        </div>
      </section>

      <section className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">{t("dashboard.hero.surveysSynced")}</span>
            <span className="kpi-indicator tone-neutral" aria-hidden="true" />
          </div>
          <strong className="kpi-value">{surveys.length}</strong>
          <p className="kpi-detail">{t("dashboard.kpis.surveysDetail")}</p>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">{t("dashboard.hero.campaignsSynced")}</span>
            <span className="kpi-indicator tone-positive" aria-hidden="true" />
          </div>
          <strong className="kpi-value">{campaigns.length}</strong>
          <p className="kpi-detail">{t("dashboard.kpis.campaignsDetail")}</p>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-top">
            <span className="kpi-label">{t("dashboard.hero.contactsSynced")}</span>
            <span className="kpi-indicator tone-warning" aria-hidden="true" />
          </div>
          <strong className="kpi-value">{contacts.length}</strong>
          <p className="kpi-detail">{t("dashboard.kpis.contactsDetail")}</p>
        </div>
      </section>

      {unavailableSections.length > 0 ? (
        <SectionCard title={t("dashboard.unavailable.title")} description={t("dashboard.unavailable.description")}>
          <div className="list-item">
            <div>
              <strong>{t("dashboard.unavailable.nowUnavailable")}</strong>
              <span>{formatUnavailableSections(unavailableSections, t)}</span>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <div className="operations-grid">
        <div className="operations-main-column">
          <SectionCard
            title={t("dashboard.sections.recentSurveys.title")}
            description={t("dashboard.sections.recentSurveys.description")}
            action={<Link href="/surveys" className="button-secondary compact-button">{t("shell.common.viewAll")}</Link>}
          >
            <div className="stack-list">
              {surveys.length > 0 ? (
                surveys.slice(0, 5).map((survey) => (
                  <Link href={`/surveys/${survey.id}`} className="list-item operational-row" key={survey.id}>
                    <div>
                      <strong>{survey.name}</strong>
                      <span>{survey.goal}</span>
                    </div>
                    <div className="operational-meta">
                      <span>{survey.updatedAt}</span>
                      <StatusBadge status={survey.status} />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="list-item">
                  <div>
                    <strong>{t("dashboard.sections.recentSurveys.emptyTitle")}</strong>
                    <span>{t("dashboard.sections.recentSurveys.emptyDescription")}</span>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title={t("dashboard.sections.recentCampaigns.title")}
            description={t("dashboard.sections.recentCampaigns.description")}
            action={<Link href="/campaigns" className="button-secondary compact-button">{t("shell.common.viewAll")}</Link>}
          >
            <div className="stack-list">
              {campaigns.length > 0 ? (
                campaigns.slice(0, 5).map((campaign) => (
                  <div className="list-item operational-row" key={campaign.id}>
                    <div>
                      <strong>{campaign.name}</strong>
                      <span>{campaign.summary}</span>
                    </div>
                    <div className="operational-meta">
                      <span>{campaign.updatedAt}</span>
                      <StatusBadge status={campaign.status} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="list-item">
                  <div>
                    <strong>{t("dashboard.sections.recentCampaigns.emptyTitle")}</strong>
                    <span>{t("dashboard.sections.recentCampaigns.emptyDescription")}</span>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="operations-side-column">
          <SectionCard
            title={t("dashboard.sections.recentContacts.title")}
            description={t("dashboard.sections.recentContacts.description")}
            action={<Link href="/contacts" className="button-secondary compact-button">{t("dashboard.sections.recentContacts.action")}</Link>}
          >
            <div className="stack-list">
              {contacts.length > 0 ? (
                contacts.slice(0, 6).map((contact) => (
                  <div className="list-item operational-row" key={contact.id}>
                    <div>
                      <strong>{contact.name}</strong>
                      <span>{contact.campaignName} / {contact.phoneNumber}</span>
                    </div>
                    <div className="operational-meta">
                      <span>{contact.updatedAt}</span>
                      <StatusBadge status={contact.status} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="list-item">
                  <div>
                    <strong>{t("dashboard.sections.recentContacts.emptyTitle")}</strong>
                    <span>{t("dashboard.sections.recentContacts.emptyDescription")}</span>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title={t("dashboard.sections.operationalAnalytics.title")} description={t("dashboard.sections.operationalAnalytics.description")}>
            <div className="list-item">
              <div>
                <strong>{t("dashboard.sections.operationalAnalytics.emptyTitle")}</strong>
                <span>{t("dashboard.sections.operationalAnalytics.emptyDescription")}</span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </PageContainer>
  );
}

function formatUnavailableSections(sections: string[], t: (path: string, values?: Record<string, string>) => string) {
  if (sections.length === 1) {
    return t("dashboard.unavailable.single", { section: sections[0] });
  }

  return t("dashboard.unavailable.multiple", { sections: sections.join(", ") });
}
