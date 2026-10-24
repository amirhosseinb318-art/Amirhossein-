import { z } from "zod";
import { EVENT_CATEGORIES, EVENT_STATUSES } from "./config";

export const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(200),
});

export const inviteRedemptionSchema = z.object({
  token: z.string().min(20).max(200),
  name: z.string().trim().min(1).max(120).optional(),
  password: z.string().min(12).max(200),
});

export const createInvitationSchema = z.object({
  email: emailSchema,
  name: z.string().trim().min(1).max(120),
  role: z.enum(["admin", "analyst", "viewer"]),
  expiresInHours: z.coerce.number().int().min(1).max(720).default(72),
});

export const transitionSchema = z.object({
  eventId: z.string().min(3).max(120),
  to: z.enum(["unverified", "developing", "corroborated", "verified", "retracted"]),
  reason: z.string().trim().min(10).max(600),
  evidenceReportIds: z.array(z.string().min(3).max(120)).max(30).default([]),
});

export const alertReviewSchema = z.object({
  eventId: z.string().min(3).max(120),
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().max(400).optional(),
});

export const analysisRequestSchema = z.object({
  eventId: z.string().min(3).max(120),
  reportIds: z.array(z.string().min(3).max(120)).min(1).max(8),
  lang: z.enum(["fa", "en"]).default("fa"),
});

export const notificationReadSchema = z.object({
  id: z.string().min(3).max(120).optional(),
  all: z.boolean().optional(),
});

export const notificationPrefsSchema = z.object({
  alertCategories: z.array(z.enum(EVENT_CATEGORIES as [string, ...string[]])).max(20),
  minSeverity: z.coerce.number().int().min(1).max(5),
  inAppEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  quietHours: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  }),
});

export const preferencesSchema = z.object({
  locale: z.enum(["fa", "en"]),
  theme: z.enum(["dark", "light", "system"]),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(12).max(200),
});

export const sourceCreateSchema = z.object({
  nameFa: z.string().trim().min(2).max(120),
  nameEn: z.string().trim().min(2).max(120),
  organization: z.string().trim().min(2).max(120),
  homepageUrl: z.string().url().max(500).refine((value) => value.startsWith("https://"), {
    message: "Homepage must use https",
  }),
  feedUrl: z.string().url().max(1000).refine((value) => value.startsWith("https://"), {
    message: "Feed must use https",
  }),
  kind: z.enum(["official", "government", "agency", "news", "weather"]),
  reliability: z.enum(["primary", "high", "medium"]),
  language: z.enum(["fa", "en", "ar"]),
  termsNote: z.string().trim().min(10).max(600),
});

export const sourceToggleSchema = z.object({
  sourceId: z.string().min(2).max(120),
  enabled: z.boolean(),
});

export const ingestionRunSchema = z.object({
  sourceIds: z.array(z.string().min(2).max(120)).max(20).optional(),
});

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url().max(800),
  keys: z.object({
    p256dh: z.string().min(20).max(300),
    auth: z.string().min(8).max(120),
  }),
});

export const correctionSchema = z.object({
  eventId: z.string().min(3).max(120),
  note: z.string().trim().min(10).max(600),
});

export const statusEnum = z.enum(EVENT_STATUSES as [string, ...string[]]);
