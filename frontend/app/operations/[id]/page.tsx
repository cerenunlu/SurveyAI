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
    label: "Kişi",
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
    label: "Güncellendi",
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
        title: "Hazırlık durumu hesaplanıyor",
        description: "Operasyon ve kişi verileri yüklendiğinde bir sonraki adım netleşecek.",
        startHint: "Operasyon başlatma durumu kontrol ediliyor.",
      };
    }

    if (contacts.length === 0) {
      return {
        title: "Kişi listesi eksik",
        description: "Bu operasyon çalıştırılamaz. Devam etmek için önce kişileri yükleyin ve operasyonla eşleyin.",
        startHint: "Operasyonu başlatmak için en az bir kişi gerekli.",
      };
    }

    if (operation.status === "Draft") {
      return {
        title: "Kişiler hazır",
        description:
          "Operasyonun bağlı anketi ve kişi listesi mevcut. Başlatma akışı henüz devrede değil ama sonraki mantık bu noktadan çalışacak.",
        startHint: "Başlatma akışı sonraki iterasyonda bu ekrandan açılacak.",
      };
    }

    if (operation.status === "Paused") {
      return {
        title: "Operasyon duraklatılmış",
        description: "Kişiler yüklü görünüyor. Başlatma yerine devam ettirme mantığı daha sonra bu alanda ele alınacak.",
        startHint: "Duraklatılmış operasyonlar için başlat düğmesi kullanılmıyor.",
      };
    }

    return {
      title: "Operasyon hareket halinde",
      description: "Bu kayıt taslak aşamasını geçmiş durumda. Bu sayfa hazırlık ve görünürlük için kullanılıyor.",
      startHint: "Başlat düğmesi yalnızca taslak hazırlık akışı için düşünülüyor.",
    };
  }, [contacts.length, operation]);

  if (isMissing) {
    notFound();
  }

  const contactCount = contacts.length;
  const hasContacts = contactCount > 0;
  const canStart = Boolean(operation && hasContacts && operation.status === "Draft");
  const nextActionLabel = hasContacts
    ? "Kişiler bağlı. Başlatma akışı aktif olduğunda bir sonraki adım operasyonu çalıştırmak olacak."
    : "İlk adım kişi yüklemek. Kişi listesi eklenmeden operasyon ilerleyemez.";

  return (
    <PageContainer>
      <section className="hero-card is-compact operation-workspace-hero">
        <div className="eyebrow">Operation Workspace</div>
        <div className="operation-workspace-hero-head">
          <div>
            <h2 className="hero-title">{operation?.name ?? "Operasyon yükleniyor"}</h2>
            <p className="hero-text">
              {operation ? nextActionLabel : "Operasyon özeti, kişi hazırlığı ve sonraki aksiyonlar yükleniyor."}
            </p>
          </div>
          <div className="operation-hero-status-cluster">
            <StatusBadge status={operation?.status ?? "Pending"} />
            <span className={hasContacts ? "operation-readiness-pill is-ready" : "operation-readiness-pill is-blocked"}>
              {hasContacts ? `${contactCount} kişi hazır` : "Kişi bekleniyor"}
            </span>
          </div>
        </div>
        <div className="chip-row">
          <span className="chip">Bağlı anket: {operation?.survey ?? "Yükleniyor"}</span>
          <span className="chip">Kişi sayısı: {isLoading ? "..." : String(contactCount)}</span>
          <span className="chip">Son güncelleme: {operation?.updatedAt ?? "Yükleniyor"}</span>
        </div>
      </section>

      {errorMessage ? (
        <section className="panel-card">
          <div className="operation-inline-message is-danger">
            <strong>Operasyon çalışma alanı yüklenemedi</strong>
            <span>{errorMessage}</span>
          </div>
        </section>
      ) : null}

      <div className="operation-workspace-grid">
        <div className="operation-workspace-main">
          <SectionCard title="Operasyon özeti" description="Bu operasyonun ne olduğu ve hangi kayıtlarla yürütüleceği.">
            {operation ? (
              <div className="operation-summary-list operation-workspace-summary-list">
                <div className="operation-summary-row">
                  <span>Operasyon adı</span>
                  <strong>{operation.name}</strong>
                </div>
                <div className="operation-summary-row">
                  <span>Durum</span>
                  <strong>{operation.status}</strong>
                </div>
                <div className="operation-summary-row">
                  <span>Bağlı anket</span>
                  <strong>{operation.survey}</strong>
                </div>
                <div className="operation-summary-row">
                  <span>Operasyon özeti</span>
                  <strong>{operation.summary}</strong>
                </div>
              </div>
            ) : (
              <div className="list-item">
                <div>
                  <strong>{isLoading ? "Operasyon yükleniyor" : "Operasyon bilgisi bulunamadı"}</strong>
                  <span>{errorMessage ?? "Backend operasyon kaydı bekleniyor."}</span>
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Kişi hazırlığı"
            description="Operasyonun çalışabilir olması için kişi listesinin hazır olup olmadığını gösterir."
            action={
              <span className={hasContacts ? "operation-readiness-pill is-ready" : "operation-readiness-pill is-blocked"}>
                {isLoading ? "Kontrol ediliyor" : hasContacts ? "Hazır" : "Eksik"}
              </span>
            }
          >
            {isLoading ? (
              <div className="list-item">
                <div>
                  <strong>Kişi kayıtları yükleniyor</strong>
                  <span>Operasyona bağlı kişi listesi backend üzerinden getiriliyor.</span>
                </div>
              </div>
            ) : (
              <div className="operation-contact-readiness">
                <div className="operation-contact-count-card">
                  <span>Kişi sayısı</span>
                  <strong>{contactCount}</strong>
                  <p>{hasContacts ? "Bu operasyon için kişi listesi mevcut." : "Henüz operasyon kişisi yüklenmedi."}</p>
                </div>

                <div className={`operation-inline-message ${hasContacts ? "is-accent" : "is-danger"}`}>
                  <strong>{readiness.title}</strong>
                  <span>{readiness.description}</span>
                </div>

                {!hasContacts ? (
                  <div className="operation-empty-state">
                    <strong>Operasyon başlatılamaz</strong>
                    <p>Kişiler eklenmeden bu operasyon yürütmeye alınamaz. Bir sonraki zorunlu adım kişi yüklemedir.</p>
                  </div>
                ) : null}

                {hasContacts ? (
                  <DataTable
                    columns={contactColumns}
                    rows={contacts}
                    toolbar={<span className="table-meta">{contactCount} kişi / backend senkron</span>}
                  />
                ) : null}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Survey referansı" description="Operasyonun bağlı olduğu yayınlanmış anketin kısa özeti.">
            {operation ? (
              <div className="operation-survey-summary operation-workspace-survey-card">
                <div className="operation-survey-summary-head">
                  <div>
                    <strong>{operation.survey}</strong>
                    <span>
                      {operation.surveyGoal?.trim() || "Bu operasyon için ek survey açıklaması backend tarafından henüz sağlanmıyor."}
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
                    <span>Son survey güncellemesi</span>
                    <strong>{operation.surveyUpdatedAt ?? "Bilinmiyor"}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="list-item">
                <div>
                  <strong>Survey referansı yükleniyor</strong>
                  <span>Bağlı survey metadata bilgisi getiriliyor.</span>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        <aside className="operation-workspace-side">
          <section className="panel-card operation-workspace-action-panel">
            <div className="section-header operation-summary-header">
              <div className="section-copy">
                <h2>Sonraki adım</h2>
                <p>Bu operasyonu yürütmeye hazırlamak için tamamlanması gereken aksiyonlar.</p>
              </div>
            </div>

            <div className="operation-inline-message is-accent compact">
              <strong>{readiness.title}</strong>
              <span>{readiness.startHint}</span>
            </div>

            <div className="operation-workspace-action-group">
              <Link href="/contacts" className="button-primary compact-button">
                Kişi yükle
              </Link>
              <button type="button" className="button-secondary compact-button operation-disabled-action" disabled>
                Operasyonu başlat
              </button>
            </div>

            <div className="operation-summary-list operation-action-checklist">
              <div className="operation-summary-row">
                <span>Bağlı anket</span>
                <strong>{operation?.survey ?? "Yükleniyor"}</strong>
              </div>
              <div className="operation-summary-row">
                <span>Kişi hazır mı</span>
                <strong>{isLoading ? "Kontrol ediliyor" : hasContacts ? `Evet, ${contactCount} kişi bağlı` : "Hayır"}</strong>
              </div>
              <div className="operation-summary-row">
                <span>Başlatma durumu</span>
                <strong>{canStart ? "Yakında bu ekrandan başlatılacak" : readiness.startHint}</strong>
              </div>
            </div>

            <p className="operation-action-footnote">
              Başlatma mantığı henüz uygulanmadı. Bu blok gelecekte kişi doğrulaması tamamlandıktan sonra operasyonu çalıştıran ana kontrol noktası olacak.
            </p>
          </section>
        </aside>
      </div>
    </PageContainer>
  );
}
