"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  Bell,
  Camera,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileText,
  Landmark,
  LayoutDashboard,
  MapPinned,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import {
  crowdState,
  isOpen,
  labels,
  site,
  staff,
  transitions,
  zones,
  type Incident,
  type Snapshot,
  type Status,
} from "../lib/domain";
import { CrowdSimulator } from "./crowd-simulator";

const navigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Incidents", icon: CircleAlert },
  { name: "Zone crowd", icon: MapPinned },
  { name: "Field team", icon: Users },
  { name: "Reports", icon: FileText },
] as const;
type View = (typeof navigation)[number]["name"];
const titles: Record<View, [string, string]> = {
  Overview: [
    "A clearer view of your site.",
    "Review what needs attention and keep your team connected.",
  ],
  Incidents: [
    "Every report. One accountable response.",
    "Review, verify and follow each case through to resolution.",
  ],
  "Zone crowd": [
    "Understand where people gather.",
    "Camera estimates and participating app users, without double-counting.",
  ],
  "Field team": [
    "The right people, in the right place.",
    "View sample staff assignments and progress field work.",
  ],
  Reports: [
    "A record of the work that matters.",
    "A current workspace summary, with traceable case history.",
  ],
};
const actionLabels: Partial<Record<Status, string>> = {
  under_review: "Start review",
  confirmed: "Confirm incident",
  dismissed: "Dismiss report",
  assigned: "Assign to staff",
  acknowledged: "Acknowledge",
  in_progress: "Start work",
  resolved: "Record resolution",
  closed: "Close case",
};
function when(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: site.timezone,
  });
}
function Badge({
  value,
  children,
}: {
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <span className={`badge ${value.toLowerCase().replaceAll(" ", "-")}`}>
      {children ?? value}
    </span>
  );
}

async function request<T>(
  method = "GET",
  body?: unknown,
  path = "/api/workspace",
): Promise<T> {
  const response = await fetch(path, {
    method,
    cache: "no-store",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error ?? "The request failed. Please try again.");
  return result;
}

export function Operations() {
  const [view, setView] = useState<View>("Overview");
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("open");
  const [fieldStaff, setFieldStaff] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const createDialog = useRef<HTMLDialogElement>(null);
  const detailDialog = useRef<HTMLDialogElement>(null);
  const requestId = useRef("");
  const load = useCallback(async () => {
    const snapshot = await request<Snapshot>();
    setData(snapshot);
    setNow(Date.now());
    return snapshot;
  }, []);
  useEffect(() => {
    void load().catch((e) => setError(e.message));
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [load]);
  useEffect(() => {
    if (view !== "Zone crowd" || data?.crowdMode !== "simulator") return;
    const timer = setInterval(() => {
      void load().catch((e) => setError(e.message));
    }, 30_000);
    return () => clearInterval(timer);
  }, [view, data?.crowdMode, load]);
  const selected = data?.incidents.find((i) => i.id === selectedId);
  const open = data?.incidents.filter(isOpen) ?? [];
  const review = open.filter((i) =>
    ["reported", "under_review"].includes(i.status),
  );
  const active = open.filter((i) => i.assigneeId);
  const resolved =
    data?.incidents.filter((i) => ["resolved", "closed"].includes(i.status)) ??
    [];
  const filtered =
    data?.incidents.filter(
      (i) =>
        (statusFilter === "all" ||
          (statusFilter === "open" ? isOpen(i) : i.status === statusFilter)) &&
        `${i.title} ${i.category} ${zones.find((z) => z.id === i.zoneId)?.name}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    ) ?? [];
  function chooseIncident(i: Incident) {
    setSelectedId(i.id);
    setError("");
    detailDialog.current?.showModal();
  }
  function newReport() {
    requestId.current = crypto.randomUUID();
    setError("");
    createDialog.current?.showModal();
  }
  async function refresh() {
    setBusy(true);
    setError("");
    try {
      await load();
      setNotice("Workspace refreshed. Sample sensor timestamps are unchanged.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError("");
    try {
      const incident = await request<Incident>("POST", {
        ...Object.fromEntries(new FormData(form)),
        requestId: requestId.current,
      });
      setData((current) =>
        current
          ? {
              ...current,
              incidents: [
                incident,
                ...current.incidents.filter((i) => i.id !== incident.id),
              ],
            }
          : current,
      );
      form.reset();
      createDialog.current?.close();
      setNotice("Report saved. It is awaiting review.");
      setView("Incidents");
      setStatusFilter("open");
      setQuery("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function advance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true);
    setError("");
    try {
      const updated = await request<Incident>("PATCH", {
        id: selected.id,
        version: selected.version,
        status: fields.get("status"),
        note: fields.get("note"),
        ...(fields.get("assigneeId")
          ? { assigneeId: fields.get("assigneeId") }
          : {}),
      });
      setData((current) =>
        current
          ? {
              ...current,
              incidents: current.incidents.map((i) =>
                i.id === updated.id ? updated : i,
              ),
            }
          : current,
      );
      form.reset();
      setNotice(`Incident updated: ${labels[updated.status]}.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function download() {
    if (!data) return;
    const report = {
      title: "Sanskriti local workspace report",
      generatedAt: new Date().toISOString(),
      mode: "Local sandbox - synthetic data, not operational records",
      site,
      totals: {
        open: open.length,
        needsReview: review.length,
        assignedOpen: active.length,
        resolvedOrClosed: resolved.length,
      },
      incidents: data.incidents,
      zoneSignals: data.signals,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "sanskriti-workspace-report.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  const rows = (incidents: Incident[]) =>
    incidents.length ? (
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Incident</th>
              <th>Zone</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Owner</th>
              <th>
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((i) => (
              <tr key={i.id}>
                <td>
                  <button
                    className="case-link"
                    onClick={() => chooseIncident(i)}
                  >
                    {i.title}
                  </button>
                  <small>
                    {i.source} <span>·</span> {when(i.createdAt)}
                  </small>
                </td>
                <td>{zones.find((z) => z.id === i.zoneId)?.name}</td>
                <td>
                  <Badge value={i.priority} />
                </td>
                <td>
                  <Badge value={i.status}>{labels[i.status]}</Badge>
                </td>
                <td>
                  {staff.find((s) => s.id === i.assigneeId)?.name ?? (
                    <span className="muted">Unassigned</span>
                  )}
                </td>
                <td>
                  <button
                    className="icon-button"
                    aria-label={`Open ${i.title}`}
                    onClick={() => chooseIncident(i)}
                  >
                    <ChevronRight size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="empty">
        <ShieldCheck size={28} />
        <h3>No incidents in this view</h3>
        <p>Change your filters or create a new report.</p>
      </div>
    );
  const signals = (
    <div className="zone-list">
      {data?.signals.map((signal) => {
        const zone = zones.find((z) => z.id === signal.zoneId)!;
        const reading = crowdState(signal, now);
        return (
          <article key={zone.id} className="zone-item">
            <div className="row-between">
              <h3>{zone.name}</h3>
              <Badge value={reading.level} />
            </div>
            <div className="zone-numbers">
              <strong>
                {reading.count ?? "—"}
                <small> / {zone.capacity} capacity</small>
              </strong>
              <span>
                <Users size={13} /> {reading.activeUsers ?? "—"} app users
              </span>
            </div>
            <div className="meter">
              <span
                className={reading.level.toLowerCase()}
                style={{
                  width: `${reading.count === null ? 0 : Math.min(100, (reading.count / zone.capacity) * 100)}%`,
                }}
              />
            </div>
            <small>
              {reading.confidence} ·{" "}
              {signal.cameraAt ? when(signal.cameraAt) : "Camera offline"}
            </small>
          </article>
        );
      })}
    </div>
  );

  return (
    <div className="workspace">
      <aside className="sidebar">
        <a href="/" className="brand">
          <span className="brand-mark">
            <Landmark size={25} />
          </span>
          <span>
            Sanskriti<small>HERITAGE OPERATIONS</small>
          </span>
        </a>
        <div className="site-card">
          <span className="site-monogram">HP</span>
          <span>
            {site.name}
            <small>Sample workspace</small>
          </span>
        </div>
        <p className="nav-caption">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.name}
              className={view === item.name ? "nav-item selected" : "nav-item"}
              onClick={() => {
                setView(item.name);
                setError("");
              }}
              aria-current={view === item.name ? "page" : undefined}
            >
              <item.icon size={18} />
              {item.name}
              {item.name === "Incidents" && (
                <span className="nav-count">{open.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sandbox-note">
            <ShieldCheck size={20} />
            <strong>A foundation for better care</strong>
            <p>
              Visitor experience.
              <br />
              Accountable site response.
            </p>
          </div>
          <div className="operator">
            <span>LO</span>
            <div>
              Local operator<small>Sandbox access · not a staff login</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} />
            <strong>{view}</strong>
          </div>
          <div className="top-actions">
            <span className="sample-pill">
              <span /> Local sandbox
            </span>
            <button
              className="icon-button"
              aria-label="Refresh workspace"
              disabled={busy}
              onClick={refresh}
            >
              <RefreshCw size={17} />
            </button>
            <button
              className="icon-button notification"
              aria-label="View reports needing review"
              onClick={() => {
                setView("Incidents");
                setStatusFilter("reported");
              }}
            >
              <Bell size={18} />
              {review.length > 0 && <i />}
            </button>
          </div>
        </header>
        <main>
          <div className="sandbox-banner">
            <span>
              <strong>Demonstration workspace</strong> · Sample site, people and
              crowd signals. Incident changes are saved on this computer.
            </span>
            <span>No live feeds connected</span>
          </div>
          <div className="page-heading">
            <div>
              <p className="eyebrow">HERITAGE PARK / OPERATIONS</p>
              <h1>{titles[view][0]}</h1>
              <p>{titles[view][1]}</p>
            </div>
            <button className="primary" onClick={newReport} disabled={!data}>
              <Plus size={17} /> New report
            </button>
          </div>
          {error && (
            <div role="alert" className="error">
              {error} <button onClick={refresh}>Refresh workspace</button>
            </div>
          )}
          {notice && (
            <div role="status" className="notice">
              <Check size={15} />
              {notice}
              <button
                className="icon-button"
                aria-label="Dismiss message"
                onClick={() => setNotice("")}
              >
                <X size={14} />
              </button>
            </div>
          )}
          {!data ? (
            <div className="panel empty">
              <Activity size={28} />
              <h2>
                {error ? "Workspace unavailable" : "Opening your workspace…"}
              </h2>
              <p>Your saved records will not be reset.</p>
            </div>
          ) : (
            <>
              {(view === "Overview" || view === "Reports") && (
                <div className="metrics">
                  {[
                    {
                      name: "Open incidents",
                      value: open.length,
                      note: "Awaiting resolution",
                      icon: CircleAlert,
                      cls: "teal",
                    },
                    {
                      name: "Needs verification",
                      value: review.length,
                      note: "Human review required",
                      icon: ShieldCheck,
                      cls: "amber",
                    },
                    {
                      name: "Assigned cases",
                      value: active.length,
                      note: "Open cases with an owner",
                      icon: Users,
                      cls: "blue",
                    },
                    {
                      name: "Resolved / closed",
                      value: resolved.length,
                      note: "Across this workspace",
                      icon: Check,
                      cls: "green",
                    },
                  ].map((metric) => (
                    <article className="metric" key={metric.name}>
                      <div className="row-between">
                        <span>{metric.name}</span>
                        <metric.icon className={metric.cls} size={18} />
                      </div>
                      <strong>
                        {metric.value.toString().padStart(2, "0")}
                      </strong>
                      <small>{metric.note}</small>
                    </article>
                  ))}
                </div>
              )}
              {view === "Overview" && (
                <>
                  <div className="overview-grid">
                    <section className="panel map-panel">
                      <div className="panel-title">
                        <div>
                          <h2>Site at a glance</h2>
                          <p>Illustrative zone layout · sample readings</p>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => setView("Zone crowd")}
                        >
                          Explore zones <ArrowRight size={15} />
                        </button>
                      </div>
                      <div className="site-map">
                        <div className="map-grid" />
                        <div className="map-road horizontal" />
                        <div className="map-road vertical" />
                        <div className="map-garden garden-left" />
                        <div className="map-garden garden-right" />
                        <div className="monument-shape">
                          <Landmark size={44} />
                          <span>HERITAGE COMPLEX</span>
                        </div>
                        {data.signals.map((signal, index) => (
                          <button
                            key={signal.zoneId}
                            className={`map-pin pin-${index} ${crowdState(signal, now).level.toLowerCase()}`}
                            onClick={() => setView("Zone crowd")}
                          >
                            <span className="pin-dot" />
                            {zones.find((z) => z.id === signal.zoneId)?.name}
                            <strong>
                              {crowdState(signal, now).count ?? "—"}
                            </strong>
                          </button>
                        ))}
                        <span className="north">N ↑</span>
                        <div className="map-caption">
                          SCHEMATIC · NOT FOR NAVIGATION
                        </div>
                      </div>
                      <div className="map-legend">
                        <span>
                          <i className="low" />
                          Low
                        </span>
                        <span>
                          <i className="moderate" />
                          Moderate
                        </span>
                        <span>
                          <i className="high" />
                          High
                        </span>
                        <span>
                          <i className="unknown" />
                          Unknown / stale
                        </span>
                      </div>
                    </section>
                    <section className="panel attention">
                      <div className="panel-title">
                        <div>
                          <h2>Needs your attention</h2>
                          <p>Start with unverified reports</p>
                        </div>
                        <span className="circle-count">{review.length}</span>
                      </div>
                      {review.slice(0, 3).map((i) => (
                        <button
                          className="attention-item"
                          key={i.id}
                          onClick={() => chooseIncident(i)}
                        >
                          <span className={`attention-icon ${i.priority}`}>
                            <CircleAlert size={19} />
                          </span>
                          <span>
                            <Badge value={i.priority} />
                            <strong>{i.title}</strong>
                            <small>
                              {zones.find((z) => z.id === i.zoneId)?.name} ·{" "}
                              {i.source}
                            </small>
                          </span>
                          <ChevronRight size={16} />
                        </button>
                      ))}
                      {!review.length && (
                        <p className="quiet">All reports have been reviewed.</p>
                      )}
                      <div className="review-note">
                        <ShieldCheck size={17} />
                        <p>
                          Camera alerts are suggestions. Verify an event before
                          assigning a response.
                        </p>
                      </div>
                    </section>
                  </div>
                  <section className="panel">
                    <div className="panel-title">
                      <div>
                        <h2>Incident activity</h2>
                        <p>Recent cases and the people taking action</p>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => setView("Incidents")}
                      >
                        View all incidents <ArrowRight size={15} />
                      </button>
                    </div>
                    {rows(data.incidents.slice(0, 5))}
                  </section>
                </>
              )}
              {view === "Incidents" && (
                <section className="panel">
                  <div className="panel-title">
                    <div>
                      <h2>Incident register</h2>
                      <p>
                        {filtered.length} matching cases · all actions have a
                        history
                      </p>
                    </div>
                  </div>
                  <div className="filters">
                    <label>
                      Search incidents
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search title, category or zone"
                      />
                    </label>
                    <label>
                      Status
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="open">Open cases</option>
                        <option value="all">All cases</option>
                        {Object.entries(labels).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {rows(filtered)}
                </section>
              )}
              {view === "Zone crowd" && (
                <>
                  <div className="info-panel">
                    <Camera size={23} />
                    <div>
                      <h2>Three signals. No double-counting.</h2>
                      <p>
                        Fresh, calibrated camera readings estimate zone
                        occupancy. Active app users are a partial sample, shown
                        separately. Entry/exit integration is not connected.
                        Readings become unknown after five minutes.
                      </p>
                    </div>
                    <button
                      className="secondary"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        setError("");
                        try {
                          const snapshot = await request<Snapshot>(
                            "POST",
                            {},
                            "/api/signals",
                          );
                          setData(snapshot);
                          setNow(Date.now());
                          setNotice(
                            "Sample sensor readings replayed. No live inputs were used.",
                          );
                        } catch (e) {
                          setError((e as Error).message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Replay sample readings
                    </button>
                  </div>
                  <section className="panel">
                    <div className="panel-title">
                      <div>
                        <h2>Zone conditions</h2>
                        <p>
                          {data.crowdMode === "simulator"
                            ? "Last simulated input"
                            : "Sample captured"}{" "}
                          {when(data.sampledAt)} IST · illustrative capacities
                        </p>
                      </div>
                      <Badge value="unknown">
                        {data.crowdMode === "simulator"
                          ? "Input simulation"
                          : "Sample data"}
                      </Badge>
                    </div>
                    {signals}
                  </section>
                  <CrowdSimulator
                    onUpdate={(snapshot) => {
                      setData(snapshot);
                      setNow(Date.now());
                    }}
                  />
                  <div className="note-grid">
                    <div className="panel padded">
                      <h3>Before live monitoring</h3>
                      <p>
                        Define zone boundaries, obtain location consent,
                        calibrate camera coverage and remove overlapping counts.
                      </p>
                    </div>
                    <div className="panel padded">
                      <h3>When a zone fills up</h3>
                      <p>
                        A future sustained-threshold alert will prompt staff
                        review. Route recommendations need verified safe paths
                        and staff controls.
                      </p>
                    </div>
                  </div>
                </>
              )}
              {view === "Field team" && (
                <>
                  <div className="staff-grid">
                    {staff.map((person) => (
                      <button
                        className={`staff-card ${fieldStaff === person.id ? "active" : ""}`}
                        key={person.id}
                        onClick={() =>
                          setFieldStaff(
                            fieldStaff === person.id ? "all" : person.id,
                          )
                        }
                      >
                        <span className="avatar">{person.initials}</span>
                        <strong>{person.name}</strong>
                        <small>{person.role}</small>
                        <span>
                          {
                            active.filter((i) => i.assigneeId === person.id)
                              .length
                          }{" "}
                          open assignments
                        </span>
                      </button>
                    ))}
                  </div>
                  <section className="panel">
                    <div className="panel-title">
                      <div>
                        <h2>
                          {fieldStaff === "all"
                            ? "All field assignments"
                            : `${staff.find((s) => s.id === fieldStaff)?.name} · assignments`}
                        </h2>
                        <p>
                          Open a case to acknowledge it, start work or record a
                          resolution.
                        </p>
                      </div>
                      <button
                        className="text-button"
                        onClick={() => setFieldStaff("all")}
                      >
                        Show all
                      </button>
                    </div>
                    {rows(
                      active.filter(
                        (i) =>
                          fieldStaff === "all" || i.assigneeId === fieldStaff,
                      ),
                    )}
                  </section>
                  <p className="footnote">
                    Sample staff directory. Selection filters the view; it does
                    not sign you in as that person. All changes are attributed
                    to the local operator.
                  </p>
                </>
              )}
              {view === "Reports" && (
                <section className="panel padded">
                  <div className="panel-title no-padding">
                    <div>
                      <h2>Workspace summary</h2>
                      <p>
                        Current records, not an automated daily production
                        report.
                      </p>
                    </div>
                    <button className="secondary" onClick={download}>
                      <ArrowDownToLine size={17} /> Export report
                    </button>
                  </div>
                  <div className="report-grid">
                    <div>
                      <h3>Cases by status</h3>
                      {Object.entries(labels).map(([status, label]) => (
                        <div className="report-row" key={status}>
                          <span>{label}</span>
                          <strong>
                            {
                              data.incidents.filter((i) => i.status === status)
                                .length
                            }
                          </strong>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h3>What this export contains</h3>
                      <p>
                        Case details, owners, review outcomes, complete action
                        history and the sample zone readings, together with
                        their timestamps.
                      </p>
                      <div className="review-note">
                        <FileText size={20} />
                        <p>
                          The export is labelled as a local sandbox. It does not
                          claim live admissions, camera accuracy or
                          response-time performance.
                        </p>
                      </div>
                      <h3>Next reporting milestone</h3>
                      <p>
                        Connect real staff identity and site data, then define
                        daily report windows, missing-data handling and
                        acknowledgement metrics.
                      </p>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
          <footer className="workspace-footer">
            <span>Sanskriti · Care for the places that connect us.</span>
            <span>Operations foundation / v0.1</span>
          </footer>
        </main>
      </div>
      <dialog
        ref={createDialog}
        aria-labelledby="new-report-title"
        onClose={() => setError("")}
      >
        <form onSubmit={create}>
          <div className="dialog-heading">
            <div>
              <p className="eyebrow">STAFF REPORT</p>
              <h2 id="new-report-title">Record an incident</h2>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Close new report"
              onClick={() => createDialog.current?.close()}
            >
              <X />
            </button>
          </div>
          <p>
            Describe what you observed. New reports require verification before
            staff assignment.
          </p>
          <label>
            Title
            <input
              name="title"
              required
              minLength={5}
              maxLength={120}
              placeholder="A short, specific description"
            />
          </label>
          <div className="form-grid">
            <label>
              Zone
              <select name="zoneId">
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select name="priority" defaultValue="medium">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>
          <label>
            Category
            <select name="category">
              {[
                "Crowding",
                "Damage",
                "Access",
                "Maintenance",
                "Visitor assistance",
              ].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Observation
            <textarea
              name="description"
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              placeholder="What happened, where, and what needs to be checked?"
            />
          </label>
          <p className="footnote">
            Local sandbox only. Do not enter personal or sensitive information.
            Evidence uploads are not connected yet.
          </p>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => createDialog.current?.close()}
            >
              Cancel
            </button>
            <button className="primary" disabled={busy}>
              {busy ? "Saving…" : "Save report"}
            </button>
          </div>
        </form>
      </dialog>
      <dialog
        ref={detailDialog}
        className="detail-dialog"
        aria-labelledby="incident-title"
        onClose={() => {
          setSelectedId(null);
          setError("");
        }}
      >
        {selected && (
          <>
            <div className="dialog-heading">
              <div>
                <p className="eyebrow">
                  INCIDENT RECORD / {selected.id.slice(0, 10).toUpperCase()}
                </p>
                <h2 id="incident-title">{selected.title}</h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close incident"
                onClick={() => detailDialog.current?.close()}
              >
                <X />
              </button>
            </div>
            <div className="detail-badges">
              <Badge value={selected.priority} />
              <Badge value={selected.status}>{labels[selected.status]}</Badge>
              <span>{selected.source}</span>
            </div>
            <p>{selected.description}</p>
            <dl className="detail-meta">
              <div>
                <dt>Zone</dt>
                <dd>{zones.find((z) => z.id === selected.zoneId)?.name}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>
                  {staff.find((s) => s.id === selected.assigneeId)?.name ??
                    "Not assigned"}
                </dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{when(selected.createdAt)} IST</dd>
              </div>
              <div>
                <dt>Evidence</dt>
                <dd>Not connected in this version</dd>
              </div>
            </dl>
            {transitions[selected.status].length > 0 && (
              <form
                onSubmit={advance}
                className="action-form"
                key={`${selected.id}-${selected.version}`}
              >
                <h3>Next action</h3>
                <label>
                  Action
                  <select name="status">
                    {transitions[selected.status].map((s) => (
                      <option key={s} value={s}>
                        {actionLabels[s]}
                      </option>
                    ))}
                  </select>
                </label>
                {selected.status === "confirmed" && (
                  <label>
                    Assign to
                    <select name="assigneeId" defaultValue="" required>
                      <option value="" disabled>
                        Select staff member
                      </option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · {s.role}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label>
                  {selected.status === "in_progress"
                    ? "Resolution notes"
                    : "Action notes"}
                  <textarea
                    name="note"
                    required
                    minLength={5}
                    maxLength={1200}
                    rows={3}
                    placeholder="Record what was verified or what action was taken."
                  />
                </label>
                {error && (
                  <div role="alert" className="error">
                    {error}
                    <button type="button" onClick={refresh}>
                      Refresh latest record
                    </button>
                  </div>
                )}
                <button className="primary" disabled={busy}>
                  {busy ? "Saving…" : "Save action"}
                </button>
              </form>
            )}
            <h3 className="history-heading">
              <Clock3 size={17} /> Action history
            </h3>
            <ol className="timeline">
              {[...selected.history].reverse().map((item, n) => (
                <li key={`${item.at}-${n}`}>
                  <strong>{labels[item.status]}</strong>
                  <p>{item.note}</p>
                  <small>
                    {item.actor} · {when(item.at)} IST
                  </small>
                </li>
              ))}
            </ol>
          </>
        )}
      </dialog>
    </div>
  );
}
