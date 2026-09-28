"use client";

import {
  PublishToggle,
  EditLink,
  DeleteButton,
} from "@/app/admin/(dashboard)/_components/RowActions";
import {
  deleteService,
  toggleServicePublished,
} from "@/app/lib/goga/actions-content";
import { useLocale } from "@/app/lib/i18n/useLocale";

export function ServiceActions({
  id,
  title,
  published,
}: {
  id: string;
  title: string;
  published: boolean;
}) {
  const { tr } = useLocale();
  return (
    <>
      <PublishToggle
        published={published}
        onToggle={() => toggleServicePublished(id)}
      />
      <EditLink href={`/admin/services/${id}`} />
      <DeleteButton
        confirmText={tr(
          `Delete service "${title}"? This cannot be undone.`,
          `წავშალოთ სერვისი „${title}"? ამის დაბრუნება ვერ მოხერხდება.`,
        )}
        onDelete={() => deleteService(id)}
      />
    </>
  );
}
