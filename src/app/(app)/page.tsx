import { Suspense } from "react";
import { CalendarDays, Clock, Building2 } from "lucide-react";
import { RecentEventsPanel } from "@/components/dashboard/recent-events-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { EventCalendar } from "@/components/events/event-calendar";
import { getEventsForCalendar, getRecentEvents } from "@/lib/actions/events";
import { mapEventsToCalendar } from "@/lib/calendar-events";
import {
  calendarScaleToFcView,
  parseCalendarScale,
} from "@/lib/event-view";
import { prisma } from "@/lib/prisma";

interface DashboardPageProps {
  searchParams: Promise<{ scale?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { scale: scaleParam } = await searchParams;
  const scale = parseCalendarScale(scaleParam);

  return (
    <div className="h-full flex flex-col gap-6">
      <Suspense fallback={<StatsSkeleton />}>
        <StatsRow />
      </Suspense>
      <Suspense fallback={<RecentEventsSkeleton />}>
        <RecentEventsSection />
      </Suspense>
      <div className="flex-1 bg-white rounded-2xl border border-zinc-200 overflow-hidden p-4 min-h-0">
        <Suspense fallback={<CalendarLoading />}>
          <CalendarSection scale={scale} />
        </Suspense>
      </div>
    </div>
  );
}

async function StatsRow() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [todayCount, weekCount, monthCount, roomCount] = await Promise.all([
    prisma.event.count({ where: { date: { gte: today, lt: new Date(today.getTime() + 86400000) } } }),
    prisma.event.count({ where: { date: { gte: today, lte: weekEnd } } }),
    prisma.event.count({ where: { date: { gte: today, lte: monthEnd } } }),
    prisma.room.count(),
  ]);

  const stats = [
    { label: "Dnes", value: todayCount, icon: Clock, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Tento týden", value: weekCount, icon: CalendarDays, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Tento měsíc", value: monthCount, icon: CalendarDays, color: "text-sky-600", bg: "bg-sky-50" },
    { label: "Místností", value: roomCount, icon: Building2, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-white rounded-2xl border border-zinc-200 p-4 flex items-center gap-4"
          >
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 leading-none">{stat.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

async function RecentEventsSection() {
  const events = await getRecentEvents();
  return <RecentEventsPanel events={events} />;
}

async function CalendarSection({
  scale,
}: {
  scale: ReturnType<typeof parseCalendarScale>;
}) {
  const events = await getEventsForCalendar();
  return (
    <EventCalendar
      events={mapEventsToCalendar(events)}
      initialView={calendarScaleToFcView(scale)}
    />
  );
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[72px] rounded-2xl" />
      ))}
    </div>
  );
}

function RecentEventsSkeleton() {
  return (
    <div className="shrink-0 bg-white rounded-2xl border border-zinc-200 p-4 space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-24" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  );
}

function CalendarLoading() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="space-y-3 w-full">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-7 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, j) => (
              <Skeleton key={j} className="h-20 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
