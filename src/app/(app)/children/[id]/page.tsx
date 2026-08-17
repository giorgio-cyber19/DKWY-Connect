"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, UserX } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { ChildDetail } from "@/components/children/ChildDetail";
import { EmptyState } from "@/components/ui/EmptyState";
import { useLanguage } from "@/lib/language-context";

export default function ChildPage(props: PageProps<"/children/[id]">) {
  const { id } = use(props.params);
  const hydrated = useAppStore((s) => s.hydrated);
  const child = useAppStore((s) => s.children.find((c) => c.id === id));
  const { t } = useLanguage();

  if (!hydrated) return null;

  if (!child) {
    return (
      <div>
        <Link href="/children" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-5">
          <ArrowLeft size={15} /> {t("children.backToPortfolios")}
        </Link>
        <EmptyState icon={UserX} title={t("children.portfolioNotFoundTitle")} description={t("children.portfolioNotFoundDescription")} />
      </div>
    );
  }

  return <ChildDetail child={child} />;
}
