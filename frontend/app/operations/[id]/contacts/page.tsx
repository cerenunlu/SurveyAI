"use client";
import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function OperationContactsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (params.id) {
      router.replace(`/operations/${params.id}/contacts/list`);
    }
  }, [params.id, router]);

  return null;
}
