"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, UserX } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { ChildDetail } from "@/components/children/ChildDetail";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ChildPage(props: PageProps<"/children/[id]">) {
  const { id } = use(props.params);
  const hydrated = useAppStore((s) => s.hydrated);
  const child = useAppStore((s) => s.children.find((c) => c.id === id));

  if (!hydrated) return null;

  if (!child) {
    return (
      <div>
        <Link href="/children" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-5">
          <ArrowLeft size={15} /> Back to Portfolios
        </Link>
        <EmptyState icon={UserX} title="Portfolio not found" description="It may have been removed, or the link is out of date." />
      </div>
    );
  }

  return <ChildDetail child={child} />;
}
