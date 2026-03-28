"use client";

import { PlusIcon } from "@/components/ui/Icons";

export function EmptyBuilderState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="empty-builder-state">
      <div className="empty-builder-icon">
        <PlusIcon className="nav-icon" />
      </div>
      <strong>Ilk soruyu ekleyin</strong>
      <p>Sakin ve premium bir taslakla baslayin. Soru tipi secin, ayrintilari sag panelden netlestirin.</p>
      <button type="button" className="button-primary" onClick={onAdd}>
        <PlusIcon className="nav-icon" />
        Soru tipi secin
      </button>
    </div>
  );
}
