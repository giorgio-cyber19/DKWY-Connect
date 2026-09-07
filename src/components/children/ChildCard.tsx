"use client";

import Link from "next/link";
import { Cake, ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { StaggerItem } from "@/components/ui/Stagger";
import { getClass } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { useLanguage } from "@/lib/language-context";
import type { Child } from "@/lib/types";

export function ChildCard({ child }: { child: Child }) {
  const cls = getClass(child.classId);
  const { t, language } = useLanguage();
  return (
    <StaggerItem>
      <Link href={`/children/${child.id}`}>
        <Card className="p-5 flex flex-col items-center text-center h-full">
          <Avatar name={child.name} color={child.photoColor} size="xl" />
          <h3 className="font-display font-semibold text-base mt-3">{child.name}</h3>
          <p className="text-[12px] text-[var(--text-secondary)]">
            {cls?.name} · {t("children.ageLabel")} {child.age}
          </p>
          <div className="flex items-center gap-3 mt-3 text-[11px] text-[var(--text-secondary)]">
            <span className="flex items-center gap-1">
              <ImageIcon size={12} /> {child.artwork.length + child.albums.length}
            </span>
            <span className="flex items-center gap-1">
              <Cake size={12} /> {formatDate(child.birthday, { year: undefined }, language)}
            </span>
          </div>
        </Card>
      </Link>
    </StaggerItem>
  );
}
