import type { EventRecord, NotificationRecord } from "@/lib/types";
import { DEMO_IDS } from "./demo-data";

const iso = (daysAgo: number, hoursAgo = 0): string =>
  new Date(Date.now() - daysAgo * 86_400_000 - hoursAgo * 3_600_000).toISOString();

/**
 * Synthetic demonstration events.
 *
 * Every record is flagged `isDemo: true`, every URL uses the reserved
 * `.invalid` TLD, and titles/summaries state that they are synthetic. Demo data
 * is never mixed into a live feed (queries filter on `isDemo`).
 */
export function buildDemoEvents(): EventRecord[] {
  return [
    {
      id: "evt_demo_grid",
      title: {
        fa: "نمونه: اختلال در شبکهٔ برق منطقهٔ نمایشی",
        en: "Scenario: Power-grid disturbance in demo sector",
      },
      summary: {
        fa: "این رویداد کاملاً ساختگی و برای نمایش رابط کاربری است. اپراتور نمایشی از قطع برق برنامه‌ریزی‌شده در سه منطقهٔ خیالی خبر داده و یک خبرگزاری نمایشی علت را نقص پست برق دانسته است. هیچ‌کدام از این گزارش‌ها واقعی نیستند.",
        en: "This event is entirely synthetic and exists to demonstrate the interface. A fictional operator reports controlled load-shedding in three fictional districts, and a fictional wire service attributes it to a substation fault. None of these reports are real.",
      },
      category: "infrastructure",
      regions: ["Demo Region North", "Demo Region East"],
      location: { name: { fa: "منطقهٔ نمایشی شمالی", en: "Demo Region North" } },
      severity: 4,
      confidence: 0.68,
      confidenceRationale: {
        fa: "دو منبع نمایشی مستقل (اپراتور و خبرگزاری) هم‌خوان هستند، اما یک پست اجتماعی گسترهٔ بزرگ‌تری ادعا می‌کند که تأیید نشده است. در محیط واقعی، تأییدیهٔ انسانی و منبع اولیهٔ بیشتری لازم است.",
        en: "Two synthetic sources (operator and wire) agree, but a social post claims a wider outage without support. A real deployment would require more primary evidence and human review.",
      },
      status: "corroborated",
      isDemo: true,
      firstSeenAt: iso(0, 4),
      createdAt: iso(0, 4),
      updatedAt: iso(0, 1.5),
      lastVerifiedAt: iso(0, 2),
      statusHistory: [
        {
          id: "sch_demo_grid_1",
          at: iso(0, 4),
          byUserId: "system",
          byName: "Ingestion demo",
          from: null,
          to: "unverified",
          reason: "Demo record created from a synthetic feed item.",
          evidenceReportIds: ["rep_demo_grid_1"],
          demo: true,
        },
        {
          id: "sch_demo_grid_2",
          at: iso(0, 2),
          byUserId: DEMO_IDS.userAnalyst,
          byName: "Demo Analyst",
          from: "unverified",
          to: "corroborated",
          reason: "Two independent synthetic sources describe the same scope.",
          evidenceReportIds: ["rep_demo_grid_1", "rep_demo_grid_2"],
          demo: true,
        },
      ],
      facts: [
        {
          id: "fact_demo_grid_1",
          text: {
            fa: "اپراتور نمایشی از قطع برق برنامه‌ریزی‌شده در سه منطقهٔ خیالی خبر داده است.",
            en: "A fictional operator reports controlled load-shedding across three fictional districts.",
          },
          reportIds: ["rep_demo_grid_1"],
        },
      ],
      claims: [
        {
          id: "claim_demo_grid_1",
          text: {
            fa: "علت، نقص در یک پست برق بوده است.",
            en: "The cause was a substation fault.",
          },
          attributedTo: "Demo Wire Service (synthetic)",
          status: "uncorroborated",
          reportIds: ["rep_demo_grid_2"],
        },
      ],
      unknowns: [
        {
          id: "q_demo_grid_1",
          text: {
            fa: "مدت واقعی و گسترهٔ جغرافیایی قطع برق روشن نیست.",
            en: "Actual duration and geographic scope remain unknown.",
          },
        },
      ],
      assessments: [
        {
          id: "as_demo_grid_1",
          text: {
            fa: "با توجه به هم‌خوانی دو منبع نمایشی، اختلال محتمل است؛ اما ادعای گسترهٔ کشوری پشتیبانی ندارد.",
            en: "Two synthetic sources align, so a disturbance is plausible; the nationwide claim is unsupported.",
          },
          basisReportIds: ["rep_demo_grid_1", "rep_demo_grid_2"],
        },
      ],
      corrections: [],
      reportIds: ["rep_demo_grid_1", "rep_demo_grid_2", "rep_demo_grid_3"],
      alert: {
        state: "pending_review",
        requiresHumanApproval: true,
        reviewNote: "Demo alert awaiting administrator review.",
      },
      clusterKey: "demo-power-grid",
      createdBy: "ingestion",
    },
    {
      id: "evt_demo_storm",
      title: {
        fa: "نمونه: هشدار توفان ساحلی در خط ساحلی نمایشی",
        en: "Scenario: Coastal storm watch for demo coastline",
      },
      summary: {
        fa: "رویداد ساختگی برای نمایش وضعیت «در حال توسعه». یک سازمان هواشناسی خیالی هشدار توفان صادر کرده و یک رسانهٔ محلی خیالی از توقف کشتی‌ها خبر داده است.",
        en: "Synthetic event demonstrating the developing state. A fictional meteorological office issued a storm watch and a fictional local outlet reports ferry suspensions.",
      },
      category: "weather",
      regions: ["Demo Coast"],
      location: { name: { fa: "ساحل نمایشی", en: "Demo Coast" } },
      severity: 3,
      confidence: 0.55,
      confidenceRationale: {
        fa: "فقط یک منبع رسمی نمایشی و یک رسانهٔ محلی نمایشی وجود دارد؛ دادهٔ میدانی در دسترس نیست.",
        en: "Only one synthetic official source and one synthetic local outlet are available; no field data exists.",
      },
      status: "developing",
      isDemo: true,
      firstSeenAt: iso(0, 6),
      createdAt: iso(0, 6),
      updatedAt: iso(0, 4),
      statusHistory: [
        {
          id: "sch_demo_storm_1",
          at: iso(0, 6),
          byUserId: "system",
          byName: "Ingestion demo",
          from: null,
          to: "unverified",
          reason: "Single demo source.",
          evidenceReportIds: ["rep_demo_storm_1"],
          demo: true,
        },
        {
          id: "sch_demo_storm_2",
          at: iso(0, 4),
          byUserId: DEMO_IDS.userAnalyst,
          byName: "Demo Analyst",
          from: "unverified",
          to: "developing",
          reason: "A second synthetic local source reported precautionary measures.",
          evidenceReportIds: ["rep_demo_storm_1", "rep_demo_storm_2"],
          demo: true,
        },
      ],
      facts: [
        {
          id: "fact_demo_storm_1",
          text: {
            fa: "هشدار توفان نمایشی برای ۱۲ ساعت آیندهٔ زمان ساختگی صادر شده است.",
            en: "A synthetic storm watch is in effect for the next 12 fictional hours.",
          },
          reportIds: ["rep_demo_storm_1"],
        },
      ],
      claims: [
        {
          id: "claim_demo_storm_1",
          text: {
            fa: "سرویس کشتی‌ها به‌صورت احتیاطی متوقف شده است.",
            en: "Ferry service was suspended as a precaution.",
          },
          attributedTo: "Demo Local News (synthetic)",
          status: "supported",
          reportIds: ["rep_demo_storm_2"],
        },
      ],
      unknowns: [
        {
          id: "q_demo_storm_1",
          text: {
            fa: "شدت توفان در زمان رسیدن به ساحل نامشخص است.",
            en: "Storm intensity at landfall is unknown.",
          },
        },
      ],
      assessments: [
        {
          id: "as_demo_storm_1",
          text: {
            fa: "اقدامات احتیاطی منطقی است؛ اما هیچ گزارش خسارتی در مجموعهٔ نمایشی وجود ندارد.",
            en: "Precautionary measures are plausible, but the demo dataset contains no damage reports.",
          },
          basisReportIds: ["rep_demo_storm_1", "rep_demo_storm_2"],
        },
      ],
      corrections: [],
      reportIds: ["rep_demo_storm_1", "rep_demo_storm_2"],
      alert: { state: "none", requiresHumanApproval: true },
      clusterKey: "demo-coastal-storm",
      createdBy: "ingestion",
    },
    {
      id: "evt_demo_cable",
      title: {
        fa: "نمونه: ادعای تأییدنشدهٔ اختلال در کابل زیردریایی",
        en: "Scenario: Unverified undersea cable disruption claim",
      },
      summary: {
        fa: "یک پست اجتماعی ساختگی مدعی اختلال اتصال در جریان تعمیرات برنامه‌ریزی‌شده است. هیچ منبع دوم یا اولیه‌ای این ادعا را تأیید نمی‌کند.",
        en: "A single synthetic social post claims connectivity degradation during scheduled maintenance. No second or primary source supports the claim.",
      },
      category: "infrastructure",
      regions: ["Demo Ocean"],
      severity: 2,
      confidence: 0.22,
      confidenceRationale: {
        fa: "تنها یک منبع غیررسمی و بدون تأیید مستقل؛ بنابراین اعتماد پایین است.",
        en: "A single unofficial source without independent corroboration; confidence is therefore low.",
      },
      status: "unverified",
      isDemo: true,
      firstSeenAt: iso(0, 2),
      createdAt: iso(0, 2),
      updatedAt: iso(0, 2),
      statusHistory: [
        {
          id: "sch_demo_cable_1",
          at: iso(0, 2),
          byUserId: "system",
          byName: "Ingestion demo",
          from: null,
          to: "unverified",
          reason: "Single synthetic social post; no corroboration.",
          evidenceReportIds: ["rep_demo_cable_1"],
          demo: true,
        },
      ],
      facts: [],
      claims: [
        {
          id: "claim_demo_cable_1",
          text: {
            fa: "اتصال اینترنت در منطقهٔ نمایشی کند شده است.",
            en: "Internet connectivity in the demo region has slowed.",
          },
          attributedTo: "Demo Social Account (synthetic)",
          status: "uncorroborated",
          reportIds: ["rep_demo_cable_1"],
        },
      ],
      unknowns: [
        {
          id: "q_demo_cable_1",
          text: {
            fa: "آیا اختلال واقعی است یا ناشی از تعمیرات برنامه‌ریزی‌شده؟",
            en: "Is the disruption real or explained by scheduled maintenance?",
          },
        },
      ],
      assessments: [],
      corrections: [],
      reportIds: ["rep_demo_cable_1"],
      alert: { state: "none", requiresHumanApproval: true },
      clusterKey: "demo-cable",
      createdBy: "ingestion",
    },
    {
      id: "evt_demo_health",
      title: {
        fa: "نمونه: اصلاح و پس‌گیری یک هشدار بهداشتی",
        en: "Scenario: Corrected and retracted health advisory",
      },
      summary: {
        fa: "این رویداد ساختگی نشان می‌دهد چگونه یک ادعای اولیهٔ گسترده اصلاح و سپس پس‌گیری می‌شود. سابقهٔ اصلاحات برای شفافیت حفظ شده است.",
        en: "This synthetic event demonstrates how an overbroad initial claim is corrected and then retracted. The correction record is retained for transparency.",
      },
      category: "health",
      regions: ["Demo District"],
      severity: 2,
      confidence: 0.35,
      confidenceRationale: {
        fa: "پس از اصلاح، دامنهٔ هشدار محدود و سپس کاملاً پس‌گیری شد. اعتماد به ادعای اولیه پایین است.",
        en: "After correction the advisory scope narrowed and was then fully retracted. Confidence in the initial claim is low.",
      },
      status: "retracted",
      isDemo: true,
      firstSeenAt: iso(1, 6),
      createdAt: iso(1, 6),
      updatedAt: iso(0, 20),
      statusHistory: [
        {
          id: "sch_demo_health_1",
          at: iso(1, 6),
          byUserId: "system",
          byName: "Ingestion demo",
          from: null,
          to: "unverified",
          reason: "Single synthetic advisory.",
          evidenceReportIds: ["rep_demo_health_1"],
          demo: true,
        },
        {
          id: "sch_demo_health_2",
          at: iso(0, 22),
          byUserId: DEMO_IDS.userAdmin,
          byName: "Demo Administrator",
          from: "unverified",
          to: "developing",
          reason: "Synthetic local outlet reported a narrower scope.",
          evidenceReportIds: ["rep_demo_health_1", "rep_demo_health_2"],
          demo: true,
        },
        {
          id: "sch_demo_health_3",
          at: iso(0, 20),
          byUserId: DEMO_IDS.userAdmin,
          byName: "Demo Administrator",
          from: "developing",
          to: "retracted",
          reason: "Synthetic issuing agency withdrew the advisory; a demonstrated retraction.",
          evidenceReportIds: ["rep_demo_health_2"],
          demo: true,
        },
      ],
      facts: [],
      claims: [],
      unknowns: [],
      assessments: [],
      corrections: [
        {
          id: "corr_demo_health_1",
          at: iso(0, 20),
          byName: "Demo Administrator",
          kind: "retraction",
          note: {
            fa: "هشدار نمایشی توسط ناشر خیالی پس گرفته شد. این رکورد ساختگی است.",
            en: "The synthetic advisory was withdrawn by the fictional issuer. This record is demo data.",
          },
        },
      ],
      reportIds: ["rep_demo_health_1", "rep_demo_health_2"],
      alert: {
        state: "rejected",
        requiresHumanApproval: true,
        reviewNote: "Retracted before any alert was sent.",
      },
      clusterKey: "demo-health",
      createdBy: "ingestion",
    },
  ];
}

export function buildDemoNotifications(): NotificationRecord[] {
  return [
    {
      id: "ntf_demo_1",
      userId: DEMO_IDS.userAdmin,
      eventId: "evt_demo_grid",
      kind: "review",
      title: { fa: "هشدار نمایشی در انتظار بررسی", en: "Demo alert awaiting review" },
      body: {
        fa: "این یک اعلان ساختگی است. در حالت واقعی، هشدارهای با شدت بالا تا تأیید مدیر ارسال نمی‌شوند.",
        en: "This is a synthetic notification. In live operation, high-severity alerts are withheld until an administrator approves them.",
      },
      severity: 4,
      createdAt: iso(0, 1.2),
      channels: ["in_app"],
      isDemo: true,
    },
    {
      id: "ntf_demo_2",
      userId: DEMO_IDS.userAdmin,
      kind: "system",
      title: { fa: "حالت نمایشی فعال است", en: "Demo mode is active" },
      body: {
        fa: "داده‌های این نمونه ساختگی هستند و هیچ خبر واقعی نمایش داده نمی‌شود.",
        en: "Sample data is synthetic; no real events are shown. Configure Supabase and enable sources for live monitoring.",
      },
      severity: null,
      createdAt: iso(0, 8),
      channels: ["in_app"],
      isDemo: true,
    },
  ];
}
