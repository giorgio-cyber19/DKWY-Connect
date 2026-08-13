import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-[20px] glass card-shadow p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
