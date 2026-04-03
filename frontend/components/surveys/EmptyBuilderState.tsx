"use client";

import { PlusIcon } from "@/components/ui/Icons";

export function EmptyBuilderState({ onAdd, disabled = false }: { onAdd: () => void; disabled?: boolean }) {
  return (
    <div className="empty-builder-state ops-builder-empty-state">
      <div className="empty-builder-icon">
        <PlusIcon className="nav-icon" />
      </div>
      <strong>{disabled ? "Bu anket yalnizca goruntulenebilir" : "Ilk soruyu ekleyin"}</strong>
      <p>
        {disabled
          ? "Yayinlanmis anketlerde soru yapisi degistirilemez. Icerigi inceleyebilir, yeni taslak akisinin eklenmesini bekleyebilirsiniz."
          : "Gorusme akisinin ilk karar noktasini tanimlayin. Sistem soru eklendikce onizlemeyi ve hazirlik durumunu aninda gunceller."}
      </p>
      <button type="button" className="button-primary compact-button" onClick={onAdd} disabled={disabled}>
        <PlusIcon className="nav-icon" />
        {disabled ? "Yeni taslak yakinda" : "Ilk soruyu ekle"}
      </button>
    </div>
  );
}
