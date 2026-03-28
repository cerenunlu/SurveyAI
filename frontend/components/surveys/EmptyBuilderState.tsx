"use client";

import { PlusIcon } from "@/components/ui/Icons";

export function EmptyBuilderState({ onAdd, disabled = false }: { onAdd: () => void; disabled?: boolean }) {
  return (
    <div className="empty-builder-state">
      <div className="empty-builder-icon">
        <PlusIcon className="nav-icon" />
      </div>
      <strong>{disabled ? "Bu anket yalnizca goruntulenebilir" : "Ilk soruyu ekleyin"}</strong>
      <p>
        {disabled
          ? "Yayinlanmis anketlerde soru yapisi degistirilemez. Icerigi inceleyebilir, yeni taslak olusturma akisini bekleyebilirsiniz."
          : "Sakin ve premium bir taslakla baslayin. Soru tipi secin, ayrintilari sag panelden netlestirin."}
      </p>
      <button type="button" className="button-primary" onClick={onAdd} disabled={disabled}>
        <PlusIcon className="nav-icon" />
        {disabled ? "Yeni taslak yakinda" : "Soru tipi secin"}
      </button>
    </div>
  );
}
