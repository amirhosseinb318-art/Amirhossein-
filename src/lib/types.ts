/**
 * Domain model for AI Crisis Radar.
 *
 * Design rules encoded here:
 *  - Verification status, analytical confidence and severity are separate axes.
 *  - Every factual assertion carries citations pointing at stored report records.
 *  - Demo data is explicitly flagged (`isDemo`) and never mixed into live feeds.
 */

export type Locale = "fa" | "en";
export type Direction = "rtl" | "ltr";
export type Role = "admin" | "analyst" | "viewer";

export type EventStatus =
  | "unverified"
  | "developing"
  | "corroborated"
  | "verified"
  | "retracted";

export type EventCategory =
  | "conflict"
  | "disaster"
  | "weather"
  | "infrastructure"
  | "health"
  | "geopolitical"
  | "economy"
  | "other";

export type Severity = 1 | 2 | 3 | 4 | 5;

export type SourceKind = "official" | "government" | "agency" | "news" | "weather";
export type SourceReliability = "primary" | "high" | "medium";

export type ReportStatus = "linked" | "unlinked" | "duplicate" | "error";

export type AlertState = "none" | "pending_review" | "approved" | "sent" | "rejected";

export interface LocalizedText {
  fa: string;
  en: string;
}

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: "active" | "suspended";
  passwordHash: string | null;
  createdAt: string;
  lastLoginAt?: string;
  locale?: Locale;
}

export interface InvitationRecord {
  id: string;
  email: string;
  name: string;
  role: Role;
  tokenHash: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
  revokedAt?: string;
}

export interface SourceRecord {
  id: string;
  name: LocalizedText;
  organization: string;
  homepageUrl: string;
  feedUrl: string;
  kind: SourceKind;
  reliability: SourceReliability;
  language: "fa" | "en" | "ar";
  enabled: boolean;
  termsNote: string;
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  lastError?: string;
  errorCount: number;
  etag?: string;
  lastModified?: string;
  createdAt: string;
  isDemo?: boolean;
}

export interface ReportRecord {
  id: string;
  eventId: string | null;
  sourceId: string;
  sourceName: string;
  sourceReliability: SourceReliability;
  title: string;
  url: string;
  canonicalUrl: string;
  excerpt: string;
  language: "fa" | "en" | "ar";
  publishedAt: string;
  fetchedAt: string;
  contentHash: string;
  independenceKey: string;
  isPrimary: boolean;
  isDemo?: boolean;
  status: ReportStatus;
  error?: string;
}

export interface EvidencePoint {
  id: string;
  text: LocalizedText;
  reportIds: string[];
}

export interface Claim {
  id: string;
  text: LocalizedText;
  attributedTo: string;
  status: "supported" | "uncorroborated" | "contested";
  reportIds: string[];
}

export interface OpenQuestion {
  id: string;
  text: LocalizedText;
}

export interface EventRecord {
  id: string;
  title: LocalizedText;
  summary: LocalizedText;
  category: EventCategory;
  regions: string[];
  location?: EventLocation;
  severity: Severity;
  confidence: number;
  confidenceRationale: LocalizedText;
  status: EventStatus;
  isDemo: boolean;
  firstSeenAt: string;
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt?: string;
  statusHistory: StatusChange[];
  facts: EvidencePoint[];
  claims: Claim[];
  unknowns: OpenQuestion[];
  assessments: Assessment[];
  corrections: Correction[];
  reportIds: string[];
  alert: AlertRecord;
  clusterKey: string;
  createdBy: string;
}

export type NotificationKind = "event" | "system" | "test" | "review";

export interface NotificationRecord {
  id: string;
  userId: string;
  eventId?: string;
  kind: NotificationKind;
  title: LocalizedText;
  body: LocalizedText;
  severity: Severity | null;
  createdAt: string;
  readAt?: string;
  channels: Array<"in_app" | "push">;
  pushState?: "skipped" | "sent" | "failed" | "unavailable";
  isDemo?: boolean;
}

export interface UserSettingsRecord {
  id: string;
  userId: string;
  locale: Locale;
  theme: "dark" | "light" | "system";
  alertCategories: EventCategory[];
  minSeverity: Severity;
  inAppEnabled: boolean;
  pushEnabled: boolean;
  quietHours: { enabled: boolean; start: string; end: string };
}

export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: string;
  userAgent?: string;
}

export type AuditAction =
  | "auth.sign_in"
  | "auth.sign_in_failed"
  | "auth.sign_out"
  | "auth.password_changed"
  | "invitation.created"
  | "invitation.revoked"
  | "invitation.redeemed"
  | "source.created"
  | "source.updated"
  | "source.toggled"
  | "ingestion.run"
  | "event.status_changed"
  | "event.corrected"
  | "event.alert_reviewed"
  | "analysis.run"
  | "user.role_changed"
  | "notification.test"
  | "push.subscribed"
  | "push.unsubscribed";

export interface AuditLogRecord {
  id: string;
  at: string;
  actorId: string;
  actorEmail: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  summary: string;
  meta?: Record<string, string | number | boolean | null>;
}

export interface IngestionRunRecord {
  id: string;
  sourceId: string | null;
  startedAt: string;
  finishedAt?: string;
  status: "running" | "ok" | "partial" | "failed";
  itemsFound: number;
  itemsNew: number;
  duplicates: number;
  linked: number;
  errors: string[];
  triggeredBy: string;
}

export interface AnalysisFinding {
  id: string;
  text: string;
  reportIds: string[];
}

export interface AnalysisOutput {
  summary: string;
  keyClaims: AnalysisFinding[];
  contradictions: AnalysisFinding[];
  coverage: {
    independentSources: number;
    primarySources: number;
    gaps: string[];
  };
  uncertainty: string;
  missingEvidence: string[];
  suggestedStatus?: EventStatus;
  suggestions: string[];
  citationsDropped: number;
  promptInjectionFlags: string[];
}

export interface AnalysisRunRecord {
  id: string;
  userId: string;
  eventId: string;
  reportIds: string[];
  provider: string;
  model: string;
  lang: Locale;
  createdAt: string;
  status: "ok" | "error";
  error?: string;
  output?: AnalysisOutput;
  usedFallback: boolean;
  isDemo: boolean;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  locale: Locale;
}

export interface EventFilters {
  query?: string;
  status?: EventStatus | "all";
  category?: EventCategory | "all";
  severity?: Severity | "all";
  region?: string | "all";
  updatedWithinHours?: number | null;
  demo?: boolean;
}

export type CollectionName =
  | "users"
  | "invitations"
  | "sources"
  | "reports"
  | "events"
  | "notifications"
  | "settings"
  | "pushSubscriptions"
  | "auditLogs"
  | "ingestionRuns"
  | "analysisRuns";



export interface Assessment {
  id: string;
  text: LocalizedText;
  basisReportIds: string[];
}

export interface StatusChange {
  id: string;
  at: string;
  byUserId: string;
  byName: string;
  from: EventStatus | null;
  to: EventStatus;
  reason: string;
  evidenceReportIds: string[];
  demo?: boolean;
}

export interface Correction {
  id: string;
  at: string;
  byName: string;
  kind: "correction" | "retraction";
  note: LocalizedText;
}

export interface AlertRecord {
  state: AlertState;
  requiresHumanApproval: boolean;
  approvedBy?: string;
  approvedAt?: string;
  reviewNote?: string;
  notifiedAt?: string;
}

export interface EventLocation {
  name: LocalizedText;
  lat?: number;
  lng?: number;
}
