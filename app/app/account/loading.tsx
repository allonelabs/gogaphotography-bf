// Account page skeleton — avatar + name + plan chip + row list, mirroring
// the real /app/account layout so nothing jumps when real data lands.

import { Skeleton } from "@/app/components/app/Skeleton";

export default function Loading() {
  return (
    <div className="px-10 py-12">
      <div className="mx-auto max-w-[720px]">
        <div className="flex items-center gap-5">
          <Skeleton h="h-14" w="w-14" rounded="rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton h="h-6" w="w-56" rounded="rounded" />
            <Skeleton h="h-3" w="w-40" rounded="rounded" />
          </div>
          <Skeleton h="h-7" w="w-24" rounded="rounded-full" />
        </div>

        <div className="mt-10 border-t border-[var(--allonce-line-soft)]">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between border-b border-[var(--allonce-line-soft)] py-5"
            >
              <div className="space-y-2">
                <Skeleton h="h-4" w="w-28" rounded="rounded" />
                <Skeleton h="h-3" w="w-72" rounded="rounded" />
              </div>
              <Skeleton h="h-4" w="w-20" rounded="rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
