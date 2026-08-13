"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Cake,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  Palette,
  Images,
  Video,
  FileText,
  Sparkles,
  NotebookPen,
  Play,
  Lock,
  Award,
  BookMarked,
  HeartHandshake,
  MessagesSquare,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { StaggerGrid, StaggerItem } from "@/components/ui/Stagger";
import { getClass, getUser, useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { formatDate } from "@/lib/utils";
import { driveDownloadUrl } from "@/lib/upload";
import { EmptyState } from "@/components/ui/EmptyState";
import { AddArtworkButton, AddAlbumButton, AddVideoButton, AddChildDocumentButton, AddMilestoneButton } from "@/components/children/ChildRecordModals";
import type { Child, SpiritualMilestone } from "@/lib/types";

const milestoneIcons: Record<SpiritualMilestone["category"], typeof Award> = {
  "Memory Verse": BookMarked,
  "Bible Knowledge": Sparkles,
  Participation: MessagesSquare,
  Prayer: HeartHandshake,
  Kindness: HeartHandshake,
  Achievement: Award,
};

function DriveLinkWrap({ fileId, children }: { fileId?: string; children: React.ReactNode }) {
  if (!fileId) return <>{children}</>;
  return (
    <a href={driveDownloadUrl(fileId)} target="_blank" rel="noopener noreferrer" className="block">
      {children}
    </a>
  );
}

export function ChildDetail({ child }: { child: Child }) {
  const cls = getClass(child.classId);
  const teacher = getUser(child.teacherId);
  const [tab, setTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "artwork", label: "Artwork" },
    { id: "photos", label: "Photos" },
    { id: "videos", label: "Videos" },
    { id: "documents", label: "Documents" },
    { id: "growth", label: "Spiritual Growth" },
    { id: "observations", label: "Observations" },
  ];

  return (
    <div>
      <Link href="/children" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-5">
        <ArrowLeft size={15} /> Back to Portfolios
      </Link>

      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <Card className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row gap-6">
            <Avatar name={child.name} color={child.photoColor} size="xl" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="font-display text-2xl sm:text-3xl font-semibold">{child.name}</h1>
                {child.allergies && (
                  <Badge tone="danger">
                    <AlertTriangle size={11} /> {child.allergies}
                  </Badge>
                )}
              </div>
              <p className="text-[var(--text-secondary)] text-sm mb-4">
                {cls?.name} · Age {child.age} · Taught by {teacher?.name}
              </p>
              <div className="grid sm:grid-cols-2 gap-3 text-[13px]">
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Cake size={14} /> Born {formatDate(child.birthday)}
                </div>
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <MapPin size={14} /> Enrolled {formatDate(child.enrollmentDate)}
                </div>
                {child.guardians.map((g) => (
                  <div key={g.name} className="flex items-center gap-2 text-[var(--text-secondary)]">
                    <Phone size={14} /> {g.name} ({g.relation}) · {g.phone}
                  </div>
                ))}
              </div>
            </div>
            <div className="sm:w-40 shrink-0 text-center sm:text-right">
              <p className="font-display text-3xl font-semibold text-[var(--color-sage-deep)]">{child.attendanceRate}%</p>
              <p className="text-[11px] text-[var(--text-secondary)]">Attendance rate</p>
            </div>
          </div>
        </Card>
      </motion.div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} className="mb-6 flex-wrap" />

      {tab === "overview" && (
        <StaggerGrid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StaggerItem>
            <Card className="p-5">
              <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
                <Palette size={16} /> Recent Artwork
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {child.artwork.slice(0, 3).map((a) => (
                  <div key={a.id} className="aspect-square rounded-xl" style={{ background: a.imageColor }} />
                ))}
              </div>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="p-5">
              <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
                <Sparkles size={16} /> Latest Milestones
              </h3>
              <div className="space-y-2.5">
                {child.milestones.slice(0, 3).map((m) => (
                  <div key={m.id} className="flex items-center gap-2 text-[13px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-gold)] shrink-0" />
                    {m.label}
                  </div>
                ))}
              </div>
            </Card>
          </StaggerItem>
          <StaggerItem>
            <Card className="p-5">
              <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
                <Mail size={16} /> Guardian Contacts
              </h3>
              <div className="space-y-3">
                {child.guardians.map((g) => (
                  <div key={g.name} className="text-[13px]">
                    <p className="font-medium">{g.name} <span className="text-[var(--text-secondary)] font-normal">· {g.relation}</span></p>
                    <p className="text-[var(--text-secondary)]">{g.email}</p>
                  </div>
                ))}
              </div>
            </Card>
          </StaggerItem>
        </StaggerGrid>
      )}

      {tab === "artwork" && (
        <div>
          <div className="flex justify-end mb-4">
            <AddArtworkButton childId={child.id} />
          </div>
          {child.artwork.length === 0 ? (
            <EmptyState icon={Palette} title="No artwork yet" description="Add the first piece of artwork for this child." />
          ) : (
            <StaggerGrid className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {child.artwork.map((a) => (
                <StaggerItem key={a.id}>
                  <DriveLinkWrap fileId={a.driveFileId}>
                    <Card className="overflow-hidden" hover>
                      <div className="aspect-square" style={{ background: a.imageColor }} />
                      <div className="p-3.5">
                        <p className="text-[13px] font-semibold truncate">{a.title}</p>
                        <div className="flex items-center justify-between mt-1">
                          <Badge tone="gold" className="!text-[9.5px] !py-0.5">{a.category}</Badge>
                          <span className="text-[10.5px] text-[var(--text-secondary)]">{formatDate(a.date)}</span>
                        </div>
                      </div>
                    </Card>
                  </DriveLinkWrap>
                </StaggerItem>
              ))}
            </StaggerGrid>
          )}
        </div>
      )}

      {tab === "photos" && (
        <div>
          <div className="flex justify-end mb-4">
            <AddAlbumButton childId={child.id} />
          </div>
          {child.albums.length === 0 ? (
            <EmptyState icon={Images} title="No photo albums yet" description="Add the first album for this child." />
          ) : (
            <StaggerGrid className="grid sm:grid-cols-2 gap-4">
              {child.albums.map((a) => (
                <StaggerItem key={a.id}>
                  <DriveLinkWrap fileId={a.driveFileId}>
                    <Card className="overflow-hidden" hover>
                      <div className="h-36 relative flex items-end p-4" style={{ background: `linear-gradient(135deg, ${a.coverColor}, color-mix(in srgb, ${a.coverColor} 50%, black))` }}>
                        <Images size={56} className="absolute -right-1 -top-1 text-white/20" />
                        <Badge className="bg-white/85">{a.photoCount} photos</Badge>
                      </div>
                      <div className="p-4">
                        <p className="font-semibold text-sm">{a.title}</p>
                        <p className="text-[12px] text-[var(--text-secondary)]">{a.event} · {formatDate(a.date)}</p>
                      </div>
                    </Card>
                  </DriveLinkWrap>
                </StaggerItem>
              ))}
            </StaggerGrid>
          )}
        </div>
      )}

      {tab === "videos" && (
        <div>
          <div className="flex justify-end mb-4">
            <AddVideoButton childId={child.id} />
          </div>
          {child.videos.length === 0 ? (
            <EmptyState icon={Play} title="No videos yet" description="Add the first video for this child." />
          ) : (
            <StaggerGrid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {child.videos.map((v) => (
                <StaggerItem key={v.id}>
                  <DriveLinkWrap fileId={v.driveFileId}>
                    <Card className="overflow-hidden" hover>
                      <div className="h-32 relative flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${v.coverColor}, color-mix(in srgb, ${v.coverColor} 50%, black))` }}>
                        <span className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center">
                          <Play size={18} className="text-[var(--color-ink)] ml-0.5" fill="currentColor" />
                        </span>
                        <span className="absolute bottom-2 right-2 text-[10.5px] font-semibold text-white bg-black/40 px-1.5 py-0.5 rounded">{v.duration}</span>
                      </div>
                      <div className="p-3.5">
                        <p className="text-[13px] font-semibold truncate">{v.title}</p>
                        <div className="flex items-center justify-between mt-1">
                          <Badge tone="blue" className="!text-[9.5px] !py-0.5">{v.category}</Badge>
                          <span className="text-[10.5px] text-[var(--text-secondary)]">{formatDate(v.date)}</span>
                        </div>
                      </div>
                    </Card>
                  </DriveLinkWrap>
                </StaggerItem>
              ))}
            </StaggerGrid>
          )}
        </div>
      )}

      {tab === "documents" && (
        <div>
          <div className="flex justify-end mb-4">
            <AddChildDocumentButton childId={child.id} />
          </div>
          {child.documents.length === 0 ? (
            <EmptyState icon={FileText} title="No documents yet" description="Add the first document for this child." />
          ) : (
            <StaggerGrid className="space-y-2.5">
              {child.documents.map((d) => (
                <StaggerItem key={d.id}>
                  <DriveLinkWrap fileId={d.driveFileId}>
                    <Card className="p-4 flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--color-blue)_14%,transparent)] flex items-center justify-center text-[var(--color-blue-deep)] shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{d.title}</p>
                        <p className="text-[11.5px] text-[var(--text-secondary)]">{d.type} · {formatDate(d.date)}</p>
                      </div>
                      <Badge tone="neutral">{d.fileType.toUpperCase()}</Badge>
                    </Card>
                  </DriveLinkWrap>
                </StaggerItem>
              ))}
            </StaggerGrid>
          )}
        </div>
      )}

      {tab === "growth" && (
        <div>
          <div className="flex justify-end mb-4">
            <AddMilestoneButton childId={child.id} />
          </div>
          {child.milestones.length === 0 ? (
            <EmptyState icon={Sparkles} title="No milestones yet" description="Record the first spiritual growth milestone for this child." />
          ) : (
            <StaggerGrid className="grid sm:grid-cols-2 gap-4">
              {child.milestones.map((m) => {
                const Icon = milestoneIcons[m.category];
                return (
                  <StaggerItem key={m.id}>
                    <Card className="p-4 flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-[color-mix(in_srgb,var(--color-sage)_16%,transparent)] flex items-center justify-center text-[var(--color-sage-deep)] shrink-0">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{m.label}</p>
                        {m.note && <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">{m.note}</p>}
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge tone="sage" className="!text-[9.5px] !py-0.5">{m.category}</Badge>
                          <span className="text-[10.5px] text-[var(--text-secondary)]">{formatDate(m.date)}</span>
                        </div>
                      </div>
                    </Card>
                  </StaggerItem>
                );
              })}
            </StaggerGrid>
          )}
        </div>
      )}

      {tab === "observations" && (
        <div>
          <div className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-xl bg-[color-mix(in_srgb,var(--color-gold)_8%,transparent)] text-[12.5px] text-[var(--color-gold-deep)] font-medium">
            <Lock size={13} /> Private — visible only to teachers and administrators
          </div>
          <div className="relative pl-6 space-y-6 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-[var(--border-soft)]">
            {child.observations.map((o) => {
              const obsAuthor = getUser(o.authorId);
              return (
                <motion.div key={o.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="relative">
                  <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-[var(--color-gold)] ring-4 ring-[var(--bg)]" />
                  <Card className="p-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[13px] font-semibold">{obsAuthor?.name}</p>
                      <span className="text-[11px] text-[var(--text-secondary)]">{formatDate(o.date)}</span>
                    </div>
                    <p className="text-[13.5px] leading-relaxed">{o.note}</p>
                    {o.tag && <Badge tone="gold" className="mt-2">{o.tag}</Badge>}
                  </Card>
                </motion.div>
              );
            })}
            <StaggerItem>
              <NewObservationInput childId={child.id} />
            </StaggerItem>
          </div>
        </div>
      )}
    </div>
  );
}

function NewObservationInput({ childId }: { childId: string }) {
  const { user } = useAuth();
  const [value, setValue] = useState("");

  async function submit() {
    if (!value.trim() || !user) return;
    const note = value.trim();
    setValue("");
    try {
      await useAppStore.getState().addObservation(childId, user.id, note);
    } catch (err) {
      console.error("Failed to add observation:", err);
    }
  }

  return (
    <div className="relative">
      <span className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-[var(--border-soft)] ring-4 ring-[var(--bg)]" />
      <Card className="p-4 flex items-center gap-2">
        <NotebookPen size={16} className="text-[var(--text-secondary)] shrink-0" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add a private teacher observation, then press Enter…"
          className="flex-1 text-[13.5px] bg-transparent outline-none"
        />
      </Card>
    </div>
  );
}
