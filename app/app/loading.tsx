// Overview chat skeleton — mirrors OverviewChat's empty state: centered
// greeting + suggestion rows + composer pill. Shows immediately when the
// operator navigates to /app while real data is still loading.

import { Skeleton } from "@/app/components/app/Skeleton";

export default function Loading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden px-8">
        <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-8 pb-10">
          <Skeleton h="h-12" w="w-[20rem]" rounded="rounded-2xl" />
          <ul className="flex w-full max-w-md flex-col gap-2">
            <li>
              <Skeleton h="h-9" w="w-full" rounded="rounded-xl" />
            </li>
            <li>
              <Skeleton h="h-9" w="w-[88%]" rounded="rounded-xl" />
            </li>
            <li>
              <Skeleton h="h-9" w="w-[78%]" rounded="rounded-xl" />
            </li>
            <li>
              <Skeleton h="h-9" w="w-[70%]" rounded="rounded-xl" />
            </li>
          </ul>
        </div>
      </div>
      <div className="px-8 pb-6">
        <div className="mx-auto max-w-3xl">
          <Skeleton h="h-[60px]" w="w-full" rounded="rounded-[1.625rem]" />
          <div className="mt-2 flex justify-center">
            <Skeleton h="h-3" w="w-64" rounded="rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
