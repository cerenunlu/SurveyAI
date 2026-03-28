"use client";

import { useEffect, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { ChartPlaceholder } from "@/components/ui/ChartPlaceholder";
import { DataTable } from "@/components/ui/DataTable";
import { HeroPanel } from "@/components/ui/HeroPanel";
import { KeyValueList } from "@/components/ui/KeyValueList";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchOperationById, fetchOperationContacts } from "@/lib/operations";
import { Operation, OperationContact, TableColumn } from "@/lib/types";

const contactColumns: TableColumn<OperationContact>[] = [
  {
    key: "name",
    label: "Contact",
    render: (contact) => (
      <div>
        <div className="table-title">{contact.name}</div>
        <div className="table-subtitle">{contact.phoneNumber}</div>
      </div>
    ),
  },
  {
    key: "status",
    label: "Status",
    render: (contact) => <StatusBadge status={contact.status} />,
  },
  {
    key: "createdAt",
    label: "Added",
    render: (contact) => contact.createdAt,
  },
  {
    key: "updatedAt",
    label: "Updated",
    render: (contact) => contact.updatedAt,
  },
];

export default function OperationDetailPage() {
  const params = useParams<{ id: string }>();
  const operationId = params.id;
  const [operation, setOperation] = useState<Operation | null>(null);
  const [contacts, setContacts] = useState<OperationContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMissing, setIsMissing] = useState(false);

  useEffect(() => {
    if (!operationId) {
      return;
    }

    const controller = new AbortController();

    async function loadOperationDetail() {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        setIsMissing(false);

        const [nextOperation, nextContacts] = await Promise.all([
          fetchOperationById(operationId, undefined, { signal: controller.signal }),
          fetchOperationContacts(operationId, undefined, { signal: controller.signal }),
        ]);

        setOperation(nextOperation);
        setContacts(nextContacts);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const message = error instanceof Error ? error.message : "Failed to load operation detail.";
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

    void loadOperationDetail();

    return () => controller.abort();
  }, [operationId]);

  if (isMissing) {
    notFound();
  }

  return (
    <PageContainer>
      <HeroPanel
        eyebrow="Operation Detail"
        title={operation?.name ?? "Loading operation detail"}
        description={operation?.summary ?? "Read-only operation overview synced from the backend API."}
        variant="compact"
        actions={
          <>
            <StatusBadge status={operation?.status ?? "Pending"} />
            <button className="button-secondary">Adjust Audience</button>
          </>
        }
        chips={operation?.channels ?? ["Backend sync", "Read-only mode", "Contacts connected"]}
      />

      <div className="detail-grid">
        <SectionCard title="Performance curve" description="Live operation posture in the existing premium detail layout.">
          <ChartPlaceholder
            title="Engagement performance"
            subtitle={operation ? `${operation.survey} / ${operation.reach} current reach` : "Loading operation metrics"}
            values={[24, 30, 36, 50, 55, 62, 58, 72, 76, 80, 84, 90]}
          />
        </SectionCard>

        <SectionCard title="Operation snapshot" description="Detail module for quick operational review.">
          {operation ? (
            <KeyValueList
              items={[
                { label: "Owner", value: operation.owner },
                { label: "Survey", value: operation.survey },
                { label: "Reach", value: operation.reach },
                { label: "Conversion", value: operation.conversion },
                { label: "Updated", value: operation.updatedAt },
              ]}
            />
          ) : (
            <div className="list-item">
              <div>
                <strong>{isLoading ? "Loading operation" : "Operation unavailable"}</strong>
                <span>{errorMessage ?? "Waiting for operation data from the backend."}</span>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="two-column-grid">
        <SectionCard title="Execution notes" description="Reserved timeline and operational intelligence card.">
          <div className="stack-list">
            {errorMessage ? (
              <div className="list-item">
                <div>
                  <strong>Unable to load operation detail</strong>
                  <span>{errorMessage}</span>
                </div>
              </div>
            ) : isLoading ? (
              <div className="list-item">
                <div>
                  <strong>Loading operation detail</strong>
                  <span>Fetching operation information and contact inventory from the backend.</span>
                </div>
              </div>
            ) : (
              [
                `Current survey linkage: ${operation?.survey ?? "Unavailable"}.`,
                `Contact inventory synced: ${contacts.length} contact${contacts.length === 1 ? "" : "s"}.`,
                `Most recent backend update: ${operation?.updatedAt ?? "Unavailable"}.`,
              ].map((item) => (
                <div className="list-item" key={item}>
                  <strong>{item}</strong>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Operation contacts" description="Read-only contact roster from the backend API.">
          {errorMessage ? (
            <div className="list-item">
              <div>
                <strong>Unable to load contacts</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
          ) : isLoading ? (
            <div className="list-item">
              <div>
                <strong>Loading contacts</strong>
                <span>Fetching operation contacts from the backend.</span>
              </div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="list-item">
              <div>
                <strong>No contacts yet</strong>
                <span>No contact records were returned for this operation.</span>
              </div>
            </div>
          ) : (
            <DataTable
              columns={contactColumns}
              rows={contacts}
              toolbar={<span className="table-meta">{contacts.length} contacts / synced from backend</span>}
            />
          )}
        </SectionCard>
      </div>
    </PageContainer>
  );
}

