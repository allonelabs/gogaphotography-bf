"use client";

import {
  PublishToggle,
  EditLink,
  DeleteButton,
} from "@/app/app/_components/RowActions";
import {
  deleteService,
  toggleServicePublished,
} from "@/app/lib/goga/actions-content";

export function ServiceActions({
  id,
  title,
  published,
}: {
  id: string;
  title: string;
  published: boolean;
}) {
  return (
    <>
      <PublishToggle
        published={published}
        onToggle={() => toggleServicePublished(id)}
      />
      <EditLink href={`/app/services/${id}`} />
      <DeleteButton
        confirmText={`Delete service "${title}"? This cannot be undone.`}
        onDelete={() => deleteService(id)}
      />
    </>
  );
}
