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

export function AddonActions({
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
        onToggle={() => toggleAddonPublished(id)}
      />
      <EditLink href={`/admin/addons/${id}`} />
      <DeleteButton
        confirmText={`Delete add-on "${title}"? This cannot be undone.`}
        onDelete={() => deleteAddon(id)}
      />
    </>
  );
}
