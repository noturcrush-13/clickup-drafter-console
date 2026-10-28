export type SourceType = "fathom" | "mom" | "slide" | "tracker" | "clickup_prev";
export const SOURCE_TYPES: SourceType[] = ["fathom", "mom", "slide", "tracker", "clickup_prev"];

export type StyleMode = "saya" | "ikuti";
export type JobStatus = "antri" | "jalan" | "selesai" | "gagal";

export type WeekRow = {
  id: string;
  iso_year: number;
  iso_week: number;
  start_date: string;
  end_date: string;
  clickup_list_id: string | null;
  clickup_list_name: string | null;
};

export type ActivityRow = {
  id: string;
  week_id: string;
  clickup_task_id: string;
  name: string;
  project: string | null;
  assignee_names: string | null;
  assigned_to_me: boolean;
  selected: boolean;
  style_mode: StyleMode;
  style_source_task_id: string | null;
  sort_order: number;
};

export type SourceRow = {
  id: string;
  activity_id: string;
  source_type: SourceType;
  enabled: boolean;
  params: Record<string, unknown>;
};

export type SettingsRow = {
  id: number;
  auto_run: boolean;
  style_rules: string[] | null;
  output_format: string | null;
  secret_keywords: string | null;
  notify_email: string | null;
  web_base_url: string | null;
  pic_lead_option_id: string | null;
  pic_lead_name: string | null;
};

export type JobRow = {
  id: string;
  status: JobStatus;
  trigger_source: "manual" | "jadwal";
  requested_at: string;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
};
