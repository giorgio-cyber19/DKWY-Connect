"use client";

import { useMemo, useState } from "react";
import { Search, Users, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { StaggerGrid } from "@/components/ui/Stagger";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChildCard } from "@/components/children/ChildCard";
import { AddChildModal } from "@/components/children/AddChildModal";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";

export default function ChildrenPage() {
  const { user } = useAuth();
  const allChildren = useAppStore((s) => s.children);
  const allClasses = useAppStore((s) => s.classes);
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);

  const scoped = user?.role === "teacher" ? allChildren.filter((c) => c.classId === user.classId) : allChildren;
  const visibleClasses = user?.role === "teacher" ? allClasses.filter((c) => c.id === user.classId) : allClasses;
  const eligibleClasses = user?.role === "teacher" ? allClasses.filter((c) => c.id === user.classId) : allClasses;

  const filtered = useMemo(() => {
    return scoped.filter((c) => {
      if (classFilter !== "all" && c.classId !== classFilter) return false;
      if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [scoped, query, classFilter]);

  return (
    <div>
      <PageHeader
        eyebrow="Ministry Records"
        title="Children Portfolios"
        description="Secure digital portfolios tracking artwork, growth, and memories for every child in your care."
        actions={
          <Button onClick={() => setAddOpen(true)} disabled={eligibleClasses.length === 0}>
            <UserPlus size={15} /> Add Child
          </Button>
        }
      />

      {allClasses.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No classes set up yet"
          description={user?.role === "admin" ? "Create an age group and class in the Admin panel before adding children." : "Ask your administrator to set up a class before adding children."}
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search children…"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--border-soft)] bg-transparent text-sm focus-ring focus:border-[var(--color-gold)]"
              />
            </div>
            {visibleClasses.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setClassFilter("all")}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    classFilter === "all" ? "border-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_12%,transparent)]" : "border-[var(--border-soft)] text-[var(--text-secondary)]"
                  }`}
                >
                  All Classes
                </button>
                {visibleClasses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setClassFilter(c.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      classFilter === c.id ? "border-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_12%,transparent)]" : "border-[var(--border-soft)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Users} title="No children yet" description="Add the first child to this class to start their portfolio." />
          ) : (
            <StaggerGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {filtered.map((c) => (
                <ChildCard key={c.id} child={c} />
              ))}
            </StaggerGrid>
          )}
        </>
      )}

      <AddChildModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        classes={eligibleClasses}
        defaultClassId={user?.role === "teacher" ? user.classId : undefined}
        defaultTeacherId={user?.role === "teacher" ? user.id : undefined}
      />
    </div>
  );
}
