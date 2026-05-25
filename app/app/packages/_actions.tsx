"use client";

import {
  PublishToggle,
  EditLink,
  DeleteButton,
} from "@/app/app/_components/RowActions";
import {
  deletePackage,
  togglePackagePublished,
} from "@/app/lib/goga/actions-packages";

export function PackageActions({
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
        onToggle={() => togglePackagePublished(id)}
      />
      <EditLink href={`/app/packages/${id}`} />
      <DeleteButton
        confirmText={`Delete package "${title}"? This cannot be undone.`}
        onDelete={() => deletePackage(id)}
      />
    </>
  );
}
