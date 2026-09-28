"use client";

import {
  PublishToggle,
  EditLink,
  DeleteButton,
} from "@/app/admin/(dashboard)/_components/RowActions";
import {
  deletePackage,
  togglePackagePublished,
} from "@/app/lib/goga/actions-packages";
import { useLocale } from "@/app/lib/i18n/useLocale";

export function PackageActions({
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
        onToggle={() => togglePackagePublished(id)}
      />
      <EditLink href={`/admin/packages/${id}`} />
      <DeleteButton
        confirmText={tr(
          `Delete package "${title}"? This cannot be undone.`,
          `წაშალოთ პაკეტი „${title}“? მოქმედება შეუქცევადია.`,
        )}
        onDelete={() => deletePackage(id)}
      />
    </>
  );
}
