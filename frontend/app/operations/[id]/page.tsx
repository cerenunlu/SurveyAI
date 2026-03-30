"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { notFound, useParams, useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { DataTable } from "@/components/ui/DataTable";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { fetchOperationById, fetchOperationContacts } from "@/lib/operations";
import { Operation, OperationContact, TableColumn } from "@/lib/types";

const contactColumns: TableColumn<OperationContact>[] = [
  {
    key: "name",
    label: "Kisi",
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
    label: "Guncellendi",
    render: (contact) => contact.updatedAt,
  },
];

export default function OperationDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
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
        title: "Hazirlik durumu hesaplaniyor",
        description: "Operasyon ve kisi verileri yuklendiginde bir sonraki adim netlesecek.",
        startHint: "Operasyon baslatma durumu kontrol ediliyor.",
      };
    }

    if (contacts.length === 0) {
      return {
        title: "Kisi listesi eksik",
        description: "Bu operasyon calistirilamaz. Devam etmek icin once kisileri yukleyin ve operasyonla esleyin.",
        startHint: "Operasyonu baslatmak icin en az bir kisi gerekli.",
      };
    }

    if (operation.status === "Draft") {
      return {
        title: "Kisiler hazir",
        description:
          "Operasyonun bagli anketi ve kisi listesi mevcut. Baslatma akisi henuz devrede degil ama sonraki mantik bu noktadan calisacak.",
        startHint: "Baslatma akisi sonraki iterasyonda bu ekrandan acilacak.",
      };
    }

    if (operation.status === "Paused") {
      return {
        title: "Operasyon duraklatilmis",
        description: "Kisiler yuklu gorunuyor. Baslatma yerine devam ettirme mantigi daha sonra bu alanda ele alinacak.",
        startHint: "Duraklatilmis operasyonlar icin baslat dugmesi kullanilmiyor.",
      };
    }

    return {
      title: "Operasyon hareket halinde",
      description: "Bu kayit taslak asamasini gecmis durumda. Bu sayfa hazirlik ve gorunurluk icin kullaniliyor.",
      startHint: "Baslat dugmesi yalnizca taslak hazirlik akisi icin dusunuluyor.",
    };
  }, [contacts.length, operation]);

  if (isMissing) {
    notFound();
  }

  const importedCount = Number(searchParams.get("imported") ?? "0");
  const invalidCount = Number(searchParams.get("invalid") ?? "0");
  const ignoredCount = Number(searchParams.get("ignored") ?? "0");
  const importRequested = searchParams.get("importRequested") === "1";
  const importError = searchParams.get("importError");
  const contactsSkipped = searchParams.get("contacts") === "skipped";
  const showCreationSummary = importRequested || contactsSkipped;
  const contactCount = contacts.length;
  const hasContacts = contactCount > 0;
  const canStart = Boolean(operation && hasContacts && operation.status === "Draft");
  const nextActionLabel = hasContacts
    ? "Kisiler bagli. Baslatma akisi aktif oldugunda bir sonraki adim operasyonu calistirmak olacak."
    : "Ilk adim kisi yuklemek. Kisi listesi eklenmeden operasyon ilerleyemez.";

  return (
    <PageContainer>
      <section className="hero-card is-compact operation-workspace-hero">
        <div className="eyebrow">Operation Workspace</div>
        <div className="operation-workspace-hero-head">
          <div>
            <h2 className="hero-title">{operation?.name ?? "Operasyon yukleniyor"}</h2>
            <p className="hero-text">
              {operation ? nextActionLabel : "Operasyon ozeti, kisi hazirligi ve sonraki aksiyonlar yukleniyor."}
            </p>
          </div>
          <div className="operation-hero-status-cluster">
            <StatusBadge status={operation?.status ?? "Pending"} />
            <span className={hasContacts ? "operation-readiness-pill is-ready" : "operation-readiness-pill is-blocked"}>
              {hasContacts ? `${contactCount} kisi hazir` : "Kisi bekleniyor"}
            </span>
          </div>
        </div>
        <div className="chip-row">
          <span className="chip">Bagli anket: {operation?.survey ?? "Yukleniyor"}</span>
          <span className="chip">Kisi sayisi: {isLoading ? "..." : String(contactCount)}</span>
          <span className="chip">Son guncelleme: {operation?.updatedAt ?? "Yukleniyor"}</span>
        </div>
      </section>

      {showCreationSummary ? (
        <section className="panel-card">
          <div className={`operation-inline-message ${importError ? "is-danger" : "is-accent"}`}>
            <strong>
              {contactsSkipped
                ? "Operasyon olusturuldu"
                : importError
                  ? "Operasyon olusturuldu, kisi importu tamamlanamadi"
                  : importedCount > 0
                    ? "Operasyon ve kisi importu tamamlandi"
                    : "Operasyon olusturuldu, gecerli kisi bulunamadi"}
            </strong>
            <span>
              {contactsSkipped
                ? "Kisi importu bu adimda atlandi. Isterseniz mevcut operasyon-kisi yukleme akisindan daha sonra ekleyebilirsiniz."
                : importError
                  ? `${importError}${invalidCount > 0 ? ` Gecersiz satir: ${invalidCount}.` : ""}`
                  : importedCount > 0
                    ? `${importedCount} gecerli kisi yeni operasyona baglandi.${invalidCount > 0 ? ` Gecersiz satir: ${invalidCount}.` : ""}${ignoredCount > 0 ? ` Bos gecilen satir: ${ignoredCount}.` : ""}`
                    : `Dosya parse edildi ancak import edilecek gecerli kisi bulunamadi.${invalidCount > 0 ? ` Gecersiz satir: ${invalidCount}.` : ""}${ignoredCount > 0 ? ` Bos gecilen satir: ${ignoredCount}.` : ""}`}
            </span>
          </div>
        </section>
      ) : null}

      {errorMessage ? (
        <section className="panel-card">
          <div className="operation-inline-message is-danger">
            <strong>Operasyon calisma alani yuklenemedi</strong>
            <span>{errorMessage}</span>
          </div>
        </section>
      ) : null}

      <div className="operation-workspace-grid">
        <div className="operation-workspace-main">
          <SectionCard title="Operasyon ozeti" description="Bu operasyonun ne oldugu ve hangi kayitlarla yurutulecegi.">
            {operation ? (
              <div className="operation-summary-list operation-workspace-summary-list">
                <div className="operation-summary-row">
                  <span>Operasyon adi</span>
                  <strong>{operation.name}</strong>
                </div>
                <div className="operation-summary-row">
                  <span>Durum</span>
                  <strong>{operation.status}</strong>
                </div>
                <div className="operation-summary-row">
                  <span>Bagli anket</span>
                  <strong>{operation.survey}</strong>
                </div>
                <div className="operation-summary-row">
                  <span>Operasyon ozeti</span>
                  <strong>{operation.summary}</strong>
                </div>
              </div>
            ) : (
              <div className="list-item">
                <div>
                  <strong>{isLoading ? "Operasyon yukleniyor" : "Operasyon bilgisi bulunamadi"}</strong>
                  <span>{errorMessage ?? "Backend operasyon kaydi bekleniyor."}</span>
                </div>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Kisi hazirligi"
            description="Operasyonun calisabilir olmasi icin kisi listesinin hazir olup olmadigini gosterir."
            action={
              <span className={hasContacts ? "operation-readiness-pill is-ready" : "operation-readiness-pill is-blocked"}>
                {isLoading ? "Kontrol ediliyor" : hasContacts ? "Hazir" : "Eksik"}
              </span>
            }
          >
            {isLoading ? (
              <div className="list-item">
                <div>
                  <strong>Kisi kayitlari yukleniyor</strong>
                  <span>Operasyona bagli kisi listesi backend uzerinden getiriliyor.</span>
                </div>
              </div>
            ) : (
              <div className="operation-contact-readiness">
                <div className="operation-contact-count-card">
                  <span>Kisi sayisi</span>
                  <strong>{contactCount}</strong>
                  <p>{hasContacts ? "Bu operasyon icin kisi listesi mevcut." : "Henuz operasyon kisisi yuklenmedi."}</p>
                </div>

                <div className={`operation-inline-message ${hasContacts ? "is-accent" : "is-danger"}`}>
                  <strong>{readiness.title}</strong>
                  <span>{readiness.description}</span>
                </div>

                {!hasContacts ? (
                  <div className="operation-empty-state">
                    <strong>Operasyon baslatilamaz</strong>
                    <p>Kisiler eklenmeden bu operasyon yurutmeye alinamaz. Bir sonraki zorunlu adim kisi yuklemedir.</p>
                  </div>
                ) : null}

                {hasContacts ? (
                  <DataTable
                    columns={contactColumns}
                    rows={contacts}
                    toolbar={<span className="table-meta">{contactCount} kisi / backend senkron</span>}
                  />
                ) : null}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Survey referansi" description="Operasyonun bagli oldugu yayinlanmis anketin kisa ozeti.">
            {operation ? (
              <div className="operation-survey-summary operation-workspace-survey-card">
                <div className="operation-survey-summary-head">
                  <div>
                    <strong>{operation.survey}</strong>
                    <span>
                      {operation.surveyGoal?.trim() || "Bu operasyon icin ek survey aciklamasi backend tarafindan henuz saglanmiyor."}
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
                    <span>Son survey guncellemesi</span>
                    <strong>{operation.surveyUpdatedAt ?? "Bilinmiyor"}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="list-item">
                <div>
                  <strong>Survey referansi yukleniyor</strong>
                  <span>Bagli survey metadata bilgisi getiriliyor.</span>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        <aside className="operation-workspace-side">
          <section className="panel-card operation-workspace-action-panel">
            <div className="section-header operation-summary-header">
              <div className="section-copy">
                <h2>Sonraki adim</h2>
                <p>Bu operasyonu yurutmeye hazirlamak icin tamamlanmasi gereken aksiyonlar.</p>
              </div>
            </div>

            <div className="operation-inline-message is-accent compact">
              <strong>{readiness.title}</strong>
              <span>{readiness.startHint}</span>
            </div>

            <div className="operation-workspace-action-group">
              <Link href={`/operations/${operationId}/contacts`} className="button-primary compact-button">
                Kisi yukle
              </Link>
              <button type="button" className="button-secondary compact-button operation-disabled-action" disabled>
                Operasyonu baslat
              </button>
            </div>

            <div className="operation-summary-list operation-action-checklist">
              <div className="operation-summary-row">
                <span>Bagli anket</span>
                <strong>{operation?.survey ?? "Yukleniyor"}</strong>
              </div>
              <div className="operation-summary-row">
                <span>Kisi hazir mi</span>
                <strong>{isLoading ? "Kontrol ediliyor" : hasContacts ? `Evet, ${contactCount} kisi bagli` : "Hayir"}</strong>
              </div>
              <div className="operation-summary-row">
                <span>Baslatma durumu</span>
                <strong>{canStart ? "Yakinda bu ekrandan baslatilacak" : readiness.startHint}</strong>
              </div>
            </div>

            <p className="operation-action-footnote">
              Baslatma mantigi henuz uygulanmadi. Bu blok gelecekte kisi dogrulamasi tamamlandiktan sonra operasyonu calistiran ana kontrol noktasi olacak.
            </p>
          </section>
        </aside>
      </div>
    </PageContainer>
  );
}
