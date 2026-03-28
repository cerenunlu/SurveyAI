"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { notFound, useParams } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { DataTable } from "@/components/ui/DataTable";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchOperationById, fetchOperationContacts } from "@/lib/operations";
import { Operation, OperationContact, TableColumn } from "@/lib/types";

const contactColumns: TableColumn<OperationContact>[] = [
  {
    key: "name",
    label: "Ki�i",
    render: (contact) => (
      <div>
        <div className="table-title">{contact.name}</div>
        <div className="table-subtitle">{contact.phoneNumber}</div>
      </div>
    ),
  },
  {
    key: "status",
    label: "Durum",
    render: (contact) => <StatusBadge status={contact.status} />,
  },
  {
    key: "createdAt",
    label: "Eklendi",
    render: (contact) => contact.createdAt,
  },
  {
    key: "updatedAt",
    label: "G�ncellendi",
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

  const readiness = useMemo(() => {
    if (!operation) {
      return {
        title: "Haz�rl�k durumu hesaplan�yor",
        description: "Operasyon ve ki�i verileri y�klendi�inde bir sonraki ad�m netle�ecek.",
        startHint: "Operasyon ba�latma durumu kontrol ediliyor.",
      };
    }

    if (contacts.length === 0) {
      return {
        title: "Ki�i listesi eksik",
        description: "Bu operasyon �al��t�r�lamaz. Devam etmek i�in �nce ki�ileri y�kleyin ve operasyonla e�leyin.",
        startHint: "Operasyonu ba�latmak i�in en az bir ki�i gerekli.",
      };
    }

    if (operation.status === "Draft") {
      return {
        title: "Ki�iler haz�r",
        description: "Operasyonun ba�l� anketi ve ki�i listesi mevcut. Ba�latma ak��� hen�z devrede de�il ama sonraki mant�k bu noktadan �al��acak.",
        startHint: "Ba�latma ak��� sonraki iterasyonda bu ekrandan a��lacak.",
      };
    }

    if (operation.status === "Paused") {
      return {
        title: "Operasyon duraklat�lm��",
        description: "Ki�iler y�kl� g�r�n�yor. Ba�latma yerine devam ettirme mant��� daha sonra bu alanda ele al�nacak.",
        startHint: "Duraklat�lm�� operasyonlar i�in ba�lat d��mesi kullan�lm�yor.",
      };
    }

    return {
      title: "Operasyon hareket halinde",
      description: "Bu kay�t taslak a�amas�n� ge�mi� durumda. Bu sayfa haz�rl�k ve g�r�n�rl�k i�in kullan�l�yor.",
      startHint: "Ba�lat d��mesi yaln�zca taslak haz�rl�k ak��� i�in d���n�l�yor.",
    };
  }, [contacts.length, operation]);

  if (isMissing) {
    notFound();
  }

  const contactCount = contacts.length;
  const hasContacts = contactCount > 0;
  const canStart = Boolean(operation && hasContacts && operation.status === "Draft");
  const nextActionLabel = hasContacts
    ? "Ki�iler ba�l�. Ba�latma ak��� aktif oldu�unda bir sonraki ad�m operasyonu �al��t�rmak olacak."
    : "�lk ad�m ki�i y�klemek. Ki�i listesi eklenmeden operasyon ilerleyemez.";

  return (
    <PageContainer>
      <section className="hero-card is-compact operation-workspace-hero">
        <div className="eyebrow">Operation Workspace</div>
        <div className="operation-workspace-hero-head">
          <div>
            <h2 className="hero-title">{operation?.name ?? "Operasyon y�kleniyor"}</h2>
            <p className="hero-text">
              {operation
                ? nextActionLabel
                : "Operasyon �zeti, ki�i haz�rl��� ve sonraki aksiyonlar y�kleniyor."}
            </p>
          </div>
          <div className="operation-hero-status-cluster">
            <StatusBadge status={operation?.status ?? "Pending"} />
            <span className={hasContacts ? "operation-readiness-pill is-ready" : "operation-readiness-pill is-blocked"}>
              {hasContacts ? `${contactCount} ki�i haz�r` : "Ki�i bekleniyor"}
            </span>
          </div>
        </div>
        <div className="chip-row">
          <span className="chip">Ba�l� anket: {operation?.survey ?? "Y�kleniyor"}</span>
          <span className="chip">Ki�i say�s�: {isLoading ? "..." : String(contactCount)}</span>
          <span className="chip">Son g�ncelleme: {operation?.updatedAt ?? "Y�kleniyor"}</span>
        </div>
      </section>

      {errorMessage ? (
        <section className="panel-card">
          <div className="operation-inline-message is-danger">
            <strong>Operasyon �al��ma alan� y�klenemedi</strong>
            <span>{errorMessage}</span>
          </div>
        </section>
      ) : null}

      <div className="operation-workspace-grid">
        <div className="operation-workspace-main">
          <SectionCard title="Operasyon �zeti" description="Bu operasyonun ne oldu�u ve hangi kay�tlarla y�r�t�lece�i.">
            {operation ? (
              <div className="operation-summary-list operation-workspace-summary-list">
                <div className="operation-summary-row">
                  <span>Operasyon ad�</span>
                  <strong>{operation.name}</strong>
                </div>
                <div className="operation-summary-row">
                  <span>Durum</span>
                  <strong>{operation.status}</strong>
                </div>
                <div className="operation-summary-row">
                  <span>Ba�l� anket</span>
                  <strong>{operation.survey}</strong>
                </div>
                <div className="operation-summary-row">
                  <span>Operasyon �zeti</span>
                  <strong>{operation.summary}</strong>
                </div>
              </div>
            ) : (
              <div className="list-item">
                <div>
                  <strong>{isLoading ? "Operasyon y�kleniyor" : "Operasyon bilgisi bulunamad�"}</strong>
                  <span>{errorMessage ?? "Backend operasyon kayd� bekleniyor."}</span>
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Ki�i haz�rl���"
            description="Operasyonun �al��abilir olmas� i�in ki�i listesinin haz�r olup olmad���n� g�sterir."
            action={
              <span className={hasContacts ? "operation-readiness-pill is-ready" : "operation-readiness-pill is-blocked"}>
                {isLoading ? "Kontrol ediliyor" : hasContacts ? "Haz�r" : "Eksik"}
              </span>
            }
          >
            {isLoading ? (
              <div className="list-item">
                <div>
                  <strong>Ki�i kay�tlar� y�kleniyor</strong>
                  <span>Operasyona ba�l� ki�i listesi backend �zerinden getiriliyor.</span>
                </div>
              </div>
            ) : (
              <div className="operation-contact-readiness">
                <div className="operation-contact-count-card">
                  <span>Ki�i say�s�</span>
                  <strong>{contactCount}</strong>
                  <p>{hasContacts ? "Bu operasyon i�in ki�i listesi mevcut." : "Hen�z operasyon ki�isi y�klenmedi."}</p>
                </div>

                <div className={`operation-inline-message ${hasContacts ? "is-accent" : "is-danger"}`}>
                  <strong>{readiness.title}</strong>
                  <span>{readiness.description}</span>
                </div>

                {!hasContacts ? (
                  <div className="operation-empty-state">
                    <strong>Operasyon ba�lat�lamaz</strong>
                    <p>Ki�iler eklenmeden bu operasyon y�r�tmeye al�namaz. Bir sonraki zorunlu ad�m ki�i y�klemedir.</p>
                  </div>
                ) : null}

                {hasContacts ? (
                  <DataTable
                    columns={contactColumns}
                    rows={contacts}
                    toolbar={<span className="table-meta">{contactCount} ki�i / backend senkron</span>}
                  />
                ) : null}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Survey referans�" description="Operasyonun ba�l� oldu�u yay�nlanm�� anketin k�sa �zeti.">
            {operation ? (
              <div className="operation-survey-summary operation-workspace-survey-card">
                <div className="operation-survey-summary-head">
                  <div>
                    <strong>{operation.survey}</strong>
                    <span>
                      {operation.surveyGoal?.trim() || "Bu operasyon i�in ek survey a��klamas� backend taraf�ndan hen�z sa�lanm�yor."}
                    </span>
                  </div>
                  <StatusBadge status={operation.surveyStatus ?? "Draft"} />
                </div>

                <div className="operation-summary-metrics">
                  <div className="mini-metric">
                    <span>Survey durumu</span>
                    <strong>{operation.surveyStatus ?? "Bilinmiyor"}</strong>
                  </div>
                  <div className="mini-metric">
                    <span>Dil / kitle</span>
                    <strong>{operation.surveyAudience ?? "-"}</strong>
                  </div>
                  <div className="mini-metric">
                    <span>Son survey g�ncellemesi</span>
                    <strong>{operation.surveyUpdatedAt ?? "Bilinmiyor"}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="list-item">
                <div>
                  <strong>Survey referans� y�kleniyor</strong>
                  <span>Ba�l� survey metadata bilgisi getiriliyor.</span>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        <aside className="operation-workspace-side">
          <section className="panel-card operation-workspace-action-panel">
            <div className="section-header operation-summary-header">
              <div className="section-copy">
                <h2>Sonraki ad�m</h2>
                <p>Bu operasyonu y�r�tmeye haz�rlamak i�in tamamlanmas� gereken aksiyonlar.</p>
              </div>
            </div>

            <div className="operation-inline-message is-accent compact">
              <strong>{readiness.title}</strong>
              <span>{readiness.startHint}</span>
            </div>

            <div className="operation-workspace-action-group">
              <Link href="/contacts" className="button-primary compact-button">
                Ki�i y�kle
              </Link>
              <button type="button" className="button-secondary compact-button operation-disabled-action" disabled>
                Operasyonu ba�lat
              </button>
            </div>

            <div className="operation-summary-list operation-action-checklist">
              <div className="operation-summary-row">
                <span>Ba�l� anket</span>
                <strong>{operation?.survey ?? "Y�kleniyor"}</strong>
              </div>
              <div className="operation-summary-row">
                <span>Ki�i haz�r m�</span>
                <strong>{isLoading ? "Kontrol ediliyor" : hasContacts ? `Evet, ${contactCount} ki�i ba�l�` : "Hay�r"}</strong>
              </div>
              <div className="operation-summary-row">
                <span>Ba�latma durumu</span>
                <strong>{canStart ? "Yak�nda bu ekrandan ba�lat�lacak" : readiness.startHint}</strong>
              </div>
            </div>

            <p className="operation-action-footnote">
              Ba�latma mant��� hen�z uygulanmad�. Bu blok gelecekte ki�i do�rulamas� tamamland�ktan sonra operasyonu �al��t�ran ana kontrol noktas� olacak.
            </p>
          </section>
        </aside>
      </div>
    </PageContainer>
  );
}
