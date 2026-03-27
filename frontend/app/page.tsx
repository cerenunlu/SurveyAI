import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchCampaignContacts, fetchCompanyCampaigns } from "@/lib/campaigns";
import { fetchCompanySurveys } from "@/lib/surveys";
import { CampaignContact } from "@/lib/types";

type DashboardContact = CampaignContact & {
  campaignName: string;
};

export default async function DashboardPage() {
  const [surveysResult, campaignsResult] = await Promise.allSettled([
    fetchCompanySurveys(),
    fetchCompanyCampaigns(),
  ]);

  const surveys = surveysResult.status === "fulfilled" ? surveysResult.value : [];
  const campaigns = campaignsResult.status === "fulfilled" ? campaignsResult.value : [];

  const contactResults = campaigns.length
    ? await Promise.allSettled(
        campaigns.map(async (campaign) => ({
          campaignName: campaign.name,
          contacts: await fetchCampaignContacts(campaign.id),
        })),
      )
    : [];

  const contacts = contactResults.flatMap((result): DashboardContact[] => {
    if (result.status !== "fulfilled") {
      return [];
    }

    return result.value.contacts.map((contact) => ({
      ...contact,
      campaignName: result.value.campaignName,
    }));
  });

  const unavailableSections = [
    surveysResult.status === "rejected" ? "surveys" : null,
    campaignsResult.status === "rejected" ? "campaigns" : null,
    contactResults.some((result) => result.status === "rejected") ? "contacts" : null,
  ].filter((value): value is string => value !== null);

  return (
    <PageContainer>
      <section className="overview-hero panel-card interactive-panel">
        <div className="overview-header">
          <div className="overview-copy">
            <div className="eyebrow">Product Overview</div>
            <h2 className="overview-title">A clean dashboard built from live product records</h2>
            <p className="overview-text">
              This overview only surfaces backend-backed inventory for surveys, campaigns, and contacts so the dashboard stays useful without drifting into demo metrics.
            </p>
          </div>

          <div className="overview-actions">
            <Link href="/surveys" className="button-primary">
              Open Surveys
            </Link>
            <Link href="/campaigns" className="button-secondary">
              Open Campaigns
            </Link>
            <Link href="/contacts" className="button-secondary">
              Open Contacts
            </Link>
          </div>
        </div>

        <div className="overview-strip">
          <div className="overview-strip-item">
            <span className="overview-strip-label">Surveys</span>
            <strong>{surveys.length} synced</strong>
          </div>
          <div className="overview-strip-item">
            <span className="overview-strip-label">Campaigns</span>
            <strong>{campaigns.length} synced</strong>
          </div>
          <div className="overview-strip-item">
            <span className="overview-strip-label">Contacts</span>
            <strong>{contacts.length} synced</strong>
          </div>
        </div>
      </section>

      {unavailableSections.length > 0 ? (
        <SectionCard
          title="Some data is temporarily unavailable"
          description="Only successfully loaded backend sections are shown below."
        >
          <div className="list-item">
            <div>
              <strong>Unavailable right now</strong>
              <span>{formatUnavailableSections(unavailableSections)}</span>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <div className="operations-grid">
        <div className="operations-main-column">
          <SectionCard
            title="Recent Surveys"
            description="Latest survey records returned by the backend."
            action={<Link href="/surveys" className="button-secondary compact-button">View all</Link>}
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
                    <strong>No surveys yet</strong>
                    <span>Survey records will appear here as soon as they exist in the backend.</span>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Recent Campaigns"
            description="Current campaign inventory backed by the backend API."
            action={<Link href="/campaigns" className="button-secondary compact-button">View all</Link>}
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
                    <strong>No campaigns yet</strong>
                    <span>Campaign records will show up here once they are created in the backend.</span>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="operations-side-column">
          <SectionCard
            title="Recent Contacts"
            description="Contacts loaded from campaign contact records already stored in the backend."
            action={<Link href="/contacts" className="button-secondary compact-button">Open contacts</Link>}
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
                    <strong>No contacts yet</strong>
                    <span>Uploaded campaign contacts will appear here when backend records are available.</span>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Operational Analytics"
            description="Reserved for backend-backed throughput and quality metrics."
          >
            <div className="list-item">
              <div>
                <strong>Not available yet</strong>
                <span>Completion, alerting, and call-operation metrics stay hidden until the backend exposes real aggregates.</span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </PageContainer>
  );
}

function formatUnavailableSections(sections: string[]): string {
  if (sections.length === 1) {
    return `${capitalize(sections[0])} could not be loaded from the backend.`;
  }

  return `${sections.map(capitalize).join(", ")} could not be fully loaded from the backend.`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
