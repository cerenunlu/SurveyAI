"use client";

import { PlusIcon } from "@/components/ui/Icons";

export function EmptyBuilderState({ onAdd, disabled = false }: { onAdd: () => void; disabled?: boolean }) {
  return (
    <div className="empty-builder-state">
      <div className="empty-builder-icon">
        <PlusIcon className="nav-icon" />
      </div>
      <strong>{disabled ? "Bu anket yalnızca görüntülenebilir" : "İlk soruyu ekleyin"}</strong>
      <p>
        {disabled
          ? "Yayınlanmış anketlerde soru yapısı değiştirilemez. İçeriği inceleyebilir, yeni taslak oluşturma akışını bekleyebilirsiniz."
          : "Sakin ve premium bir taslakla başlayın. Soru tipi seçin, ayrıntıları sağ panelden netleştirin."}
      </p>
      <button type="button" className="button-primary" onClick={onAdd} disabled={disabled}>
        <PlusIcon className="nav-icon" />
        {disabled ? "Yeni taslak yakında" : "Soru tipi seçin"}
      </button>
    </div>
  );
}
