import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles, HelpCircle, Plus, BookOpen, Layers } from "lucide-react";
import { getGateway } from "@/lib/gateway";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { progressStatusMeta } from "@/components/ui/status";
import { FadeIn } from "@/components/motion/FadeIn";
import { TopicChecklist } from "@/components/student/TopicChecklist";
import { ResourceList } from "@/components/student/ResourceList";
import { UnitAssignmentCard } from "@/components/student/UnitAssignmentCard";
import { cn } from "@/lib/utils";

interface UnitPageProps {
  params: Promise<{ subjectId: string; unitId: string }>;
}

export async function generateMetadata({ params }: UnitPageProps): Promise<Metadata> {
  const { unitId } = await params;
  const gateway = getGateway();
  try {
    const detail = await gateway.curriculum.getUnit(unitId);
    return {
      title: `${detail.unit.title} · ${detail.subject.code} | NODUS`,
      description: `Curriculum topics and faculty notes for ${detail.unit.title}`,
    };
  } catch {
    return {
      title: "Unit Details | NODUS",
    };
  }
}

export default async function UnitPage({ params }: UnitPageProps) {
  const { subjectId, unitId } = await params;
  const gateway = getGateway();

  let unitDetail;
  let sidePanel;

  try {
    [unitDetail, sidePanel] = await Promise.all([
      gateway.curriculum.getUnit(unitId),
      gateway.graph.getStudentSidePanel(unitId),
    ]);
  } catch (err: unknown) {
    console.error("Failed to fetch unit data:", err);
    notFound();
  }

  const { subject, unit } = unitDetail;
  const { progress, resources, assignment } = sidePanel;
  const statusMeta = progressStatusMeta[progress.status] ?? progressStatusMeta.not_started;

  return (
    <div className="space-y-8">
      {/* Back button & Subject Breadcrumb Header */}
      <FadeIn direction="down" distance={8}>
        <div className="space-y-4">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2 h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
           render={<Link href="/subjects" />}>
              <ArrowLeft className="size-3.5" />
              <span>Back to Subjects</span>
            </Button>

          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 pb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs font-semibold">
                  {subject.code}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {subject.name}
                </span>
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {unit.title}
              </h1>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                size="sm"
                className="h-9 gap-1.5 text-xs font-medium"
               render={<Link href={`/tutor?unitId=${unit.id}`} />}>
                  <Sparkles className="size-3.5" />
                  <span>Ask AI Tutor</span>
                </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs font-medium"
               render={<Link href={`/practice?unitId=${unit.id}`} />}>
                  <HelpCircle className="size-3.5" />
                  <span>Practice Quiz</span>
                </Button>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Main Grid: Topics & Resources on left, Progress & Assignment on right */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column (2 Cols) */}
        <div className="space-y-8 lg:col-span-2">
          {/* Topics Checklist */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                  Syllabus Topics
                </h2>
                <p className="text-xs text-muted-foreground">
                  {progress.coveredTopics} of {progress.totalTopics} topics covered ({Math.round(progress.percent)}%)
                </p>
              </div>
            </div>

            <TopicChecklist topics={progress.topics} unitId={unit.id} />
          </section>

          {/* Faculty Materials & Slides */}
          <section className="space-y-3">
            <div>
              <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
                Faculty Materials & Slides
              </h2>
              <p className="text-xs text-muted-foreground">
                Official lecture slides, notes, and handouts provided for this unit.
              </p>
            </div>

            <ResourceList resources={resources} />
          </section>
        </div>

        {/* Right Column (1 Col Sidebar) */}
        <div className="space-y-6">
          {/* Unit Progress Card */}
          <Card className="border-border/80">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Unit Mastery</CardTitle>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    statusMeta.bg,
                    statusMeta.text
                  )}
                >
                  {statusMeta.label}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="space-y-1.5">
                <div
                  className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={Math.round(progress.percent)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={cn("h-full transition-all duration-500", statusMeta.bg)}
                    style={{ width: `${Math.min(100, Math.max(0, progress.percent))}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progress score</span>
                  <span className="font-semibold text-foreground">
                    {Math.round(progress.percent)}%
                  </span>
                </div>
              </div>

              <div className="divide-y divide-border/60 rounded-lg border border-border/60 bg-muted/20 text-xs">
                <div className="flex justify-between p-2.5">
                  <span className="text-muted-foreground">Topics Covered</span>
                  <span className="font-medium text-foreground">
                    {progress.coveredTopics} / {progress.totalTopics}
                  </span>
                </div>
                <div className="flex justify-between p-2.5">
                  <span className="text-muted-foreground">Quiz Average</span>
                  <span className="font-medium text-foreground">
                    {progress.quizAverage !== null
                      ? `${Math.round(progress.quizAverage)}%`
                      : "Not attempted"}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Coverage increases when you take notes on topics or score ≥50% in practice quizzes.
              </p>
            </CardContent>
          </Card>

          {/* Assignment Slot */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Coursework</h3>
            <UnitAssignmentCard assignment={assignment} />
          </section>

          {/* Quick AI Help Banner */}
          <Card className="border-border/80 bg-muted/30">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-foreground font-medium text-sm">
                <Sparkles className="size-4 text-primary" />
                <span>Grounded AI Tutor</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Need clarification on {unit.title}? Ask questions grounded strictly in your syllabus and professor slides.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-medium"
               render={<Link href={`/tutor?unitId=${unit.id}`} />}>
                  Chat with Unit Tutor
                </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
