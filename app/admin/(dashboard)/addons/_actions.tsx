"use client";

import {
  PublishToggle,
  EditLink,
  DeleteButton,
} from "@/app/admin/(dashboard)/_components/RowActions";
import {
  deleteAddon,
  toggleAddonPublished,
} from "@/app/lib/goga/actions-addons";
import { useLocale } from "@/app/lib/i18n/useLocale";

export function AddonActions({
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
        onToggle={() => toggleAddonPublished(id)}
      />
      <EditLink href={`/admin/addons/${id}`} />
      <DeleteButton
        confirmText={tr(
          `Delete add-on "${title}"? This cannot be undone.`,
          `წავშალოთ დამატება „${title}"? ამის დაბრუნება ვერ მოხერხდება.`,
        )}
        onDelete={() => deleteAddon(id)}
      />
    </>
  );
}
