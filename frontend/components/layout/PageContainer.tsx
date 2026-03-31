import { ReactNode } from "react";
import { PageBackButton } from "@/components/navigation/PageBackButton";

type PageContainerProps = {
  children: ReactNode;
  topSlot?: ReactNode;
  hideBackRow?: boolean;
};

export function PageContainer({ children, topSlot, hideBackRow = false }: PageContainerProps) {
  return (
    <div className="page-container">
      {!hideBackRow ? (
        <div className="page-back-row">
          <PageBackButton />
          {topSlot}
        </div>
      ) : null}
      {children}
    </div>
  );
}
