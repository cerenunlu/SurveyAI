"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { DataTable } from "@/components/ui/DataTable";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { createOperationContacts, fetchOperationById, fetchOperationContacts } from "@/lib/operations";
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

type FormErrors = {
  name?: string;
  phoneNumber?: string;
};

export default function OperationContactsPage() {
  const params = useParams<{ id: string }>();
  const operationId = params.id;
  const [operation, setOperation] = useState<Operation | null>(null);
  const [contacts, setContacts] = useState<OperationContact[]>([]);
  const [contactName, setContactName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isMissing, setIsMissing] = useState(false);

  useEffect(() => {
    if (!operationId) {
      return;
    }

    const controller = new AbortController();

    async function loadOperationContext() {
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

        const message = error instanceof Error ? error.message : "Operation contact workspace could not be loaded.";
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

    void loadOperationContext();

    return () => controller.abort();
  }, [operationId]);

  const readiness = useMemo(() => {
    if (contacts.length === 0) {
      return {
        label: "Eksik",
        title: "Bu operasyon icin kisi listesi hazir degil",
        description: "Operasyon detayindaki hazirlik durumu, kisi eklenene kadar bloklu kalir.",
      };
    }

    return {
      label: "Hazir",
      title: "Operasyon kisi hazirligi tamamlandi",
      description: `${contacts.length} kisi bu operasyona bagli. Sonraki adimlar operasyon detay sayfasindan izlenebilir.`,
    };
  }, [contacts.length]);

  if (isMissing) {
    notFound();
  }

  async function handleAddContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = contactName.trim();
    const trimmedPhoneNumber = phoneNumber.trim();
    const nextErrors: FormErrors = {};

    if (!trimmedName) {
      nextErrors.name = "Ad soyad gerekli.";
    }

    if (!trimmedPhoneNumber) {
      nextErrors.phoneNumber = "Telefon numarasi gerekli.";
    }

    setErrors(nextErrors);
    setSubmitError(null);
    setSuccessMessage(null);

    if (Object.keys(nextErrors).length > 0 || !operationId) {
      return;
    }

    try {
      setIsSubmitting(true);
      await createOperationContacts(operationId, {
        contacts: [
          {
            name: trimmedName,
            phoneNumber: trimmedPhoneNumber,
          },
        ],
      });

      const nextContacts = await fetchOperationContacts(operationId);
      setContacts(nextContacts);
      setContactName("");
      setPhoneNumber("");
      setErrors({});
      setSuccessMessage("Kisi operasyona eklendi. Hazirlik durumu guncellendi.");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Kisi operasyona eklenemedi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageContainer>
      <div className="operation-contacts-shell">
        <section className="hero-card is-compact operation-workspace-hero">
          <div className="operation-contacts-topbar">
            <Link href={`/operations/${operationId}`} className="button-secondary compact-button">
              Operasyona don
            </Link>
          </div>

          <div className="operation-workspace-hero-head">
            <div>
              <div className="eyebrow">Operation Contacts</div>
              <h2 className="hero-title">{operation?.name ?? "Operasyon kisileri yukleniyor"}</h2>
              <p className="hero-text">
                {operation
                  ? "Bu alan yalnizca secili operasyonun kisi hazirligini yonetir. Eklenen her kayit dogrudan bu operasyona baglanir."
                  : "Operasyon baglami, bagli anket ve kisi hazirligi bilgileri yukleniyor."}
              </p>
            </div>
            <div className="operation-hero-status-cluster">
              <StatusBadge status={operation?.status ?? "Pending"} />
              <span className={contacts.length > 0 ? "operation-readiness-pill is-ready" : "operation-readiness-pill is-blocked"}>
                {isLoading ? "Kontrol ediliyor" : readiness.label}
              </span>
            </div>
          </div>

          <div className="chip-row">
            <span className="chip">Bagli anket: {operation?.survey ?? "Yukleniyor"}</span>
            <span className="chip">Kisi sayisi: {isLoading ? "..." : String(contacts.length)}</span>
            <span className="chip">Hazirlik: {isLoading ? "Degerlendiriliyor" : readiness.label}</span>
          </div>
        </section>

        {errorMessage ? (
          <section className="panel-card">
            <div className="operation-inline-message is-danger">
              <strong>Operasyon kisi alani yuklenemedi</strong>
              <span>{errorMessage}</span>
            </div>
          </section>
        ) : null}

        <div className="operation-workspace-grid">
          <div className="operation-workspace-main">
            <SectionCard
              title="Operasyon baglami"
              description="Kisi hazirligini bu operasyonun kendi baglaminda yonetin."
              action={
                <span className={contacts.length > 0 ? "operation-readiness-pill is-ready" : "operation-readiness-pill is-blocked"}>
                  {isLoading ? "Yukleniyor" : readiness.label}
                </span>
              }
            >
              {operation ? (
                <div className="operation-workspace-summary-list">
                  <div className="operation-summary-row">
                    <span>Operasyon</span>
                    <strong>{operation.name}</strong>
                  </div>
                  <div className="operation-summary-row">
                    <span>Bagli anket</span>
                    <strong>{operation.survey}</strong>
                  </div>
                  <div className="operation-summary-row">
                    <span>Kisi sayisi</span>
                    <strong>{contacts.length}</strong>
                  </div>
                  <div className="operation-summary-row">
                    <span>Kisi hazirligi</span>
                    <strong>{readiness.title}</strong>
                  </div>
                </div>
              ) : (
                <div className="list-item">
                  <div>
                    <strong>{isLoading ? "Operasyon baglami yukleniyor" : "Operasyon bilgisi alinamadi"}</strong>
                    <span>{errorMessage ?? "Secili operasyonun detay bilgileri backend uzerinden getiriliyor."}</span>
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Bu operasyona bagli kisiler"
              description="Listelenen kayitlar sadece bu operasyonla eslenen backend kisi kayitlaridir."
            >
              {isLoading ? (
                <div className="list-item">
                  <div>
                    <strong>Kisi listesi yukleniyor</strong>
                    <span>Secili operasyonun kayitlari backend uzerinden cekiliyor.</span>
                  </div>
                </div>
              ) : contacts.length === 0 ? (
                <div className="operation-empty-state">
                  <strong>Henuz kisi eklenmedi</strong>
                  <p>Bu operasyon icin ilk zorunlu adim, en az bir kisi eklemek. Eklenen kayitlar burada aninda gorunur.</p>
                </div>
              ) : (
                <DataTable
                  columns={contactColumns}
                  rows={contacts}
                  toolbar={<span className="table-meta">{contacts.length} kisi / operasyon baglaminda yuklendi</span>}
                />
              )}
            </SectionCard>
          </div>

          <aside className="operation-workspace-side">
            <SectionCard
              title="Kisi ekle"
              description="MVP akisinda tek tek kisi ekleyerek bu operasyonu hazir hale getirin."
            >
              <form className="survey-form-fields" onSubmit={(event) => void handleAddContact(event)}>
                <label className="builder-field">
                  <strong>Ad soyad</strong>
                  <input
                    value={contactName}
                    onChange={(event) => {
                      setContactName(event.target.value);
                      if (errors.name) {
                        setErrors((current) => ({ ...current, name: undefined }));
                      }
                    }}
                    placeholder="Orn. Ayse Yilmaz"
                    aria-invalid={Boolean(errors.name)}
                  />
                  <span>Kayit olustugunda kisi dogrudan bu operasyona baglanir.</span>
                  {errors.name ? <span className="field-error-message">{errors.name}</span> : null}
                </label>

                <label className="builder-field">
                  <strong>Telefon numarasi</strong>
                  <input
                    value={phoneNumber}
                    onChange={(event) => {
                      setPhoneNumber(event.target.value);
                      if (errors.phoneNumber) {
                        setErrors((current) => ({ ...current, phoneNumber: undefined }));
                      }
                    }}
                    placeholder="Orn. +90 555 123 45 67"
                    aria-invalid={Boolean(errors.phoneNumber)}
                  />
                  <span>Bu alan backend tarafina `phoneNumber` olarak gonderilir.</span>
                  {errors.phoneNumber ? <span className="field-error-message">{errors.phoneNumber}</span> : null}
                </label>

                {submitError ? (
                  <div className="operation-inline-message is-danger compact">
                    <strong>Kisi eklenemedi</strong>
                    <span>{submitError}</span>
                  </div>
                ) : null}

                {successMessage ? (
                  <div className="operation-inline-message is-accent compact">
                    <strong>Hazirlik guncellendi</strong>
                    <span>{successMessage}</span>
                  </div>
                ) : null}

                <button type="submit" className="button-primary compact-button" disabled={isSubmitting || isLoading || !operation}>
                  {isSubmitting ? "Kisi ekleniyor..." : "Bu operasyona kisi ekle"}
                </button>
              </form>
            </SectionCard>

            <SectionCard
              title="Toplu yukleme"
              description="CSV akisi daha sonra bu operasyon baglamina eklenecek."
            >
              <div className="operation-upload-placeholder">
                <strong>CSV import sonraki adimda gelecek</strong>
                <p>Bu MVP iterasyonunda toplu parse ve dogrulama kurulmedi. Ancak yerlesim operasyon bazli tutuldugu icin ayni sayfaya toplu yukleme kolayca eklenebilir.</p>
              </div>
            </SectionCard>
          </aside>
        </div>
      </div>
    </PageContainer>
  );
}



