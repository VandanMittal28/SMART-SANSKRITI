"use client";
import { useState } from "react";
import { ZONES, type ZoneId, type ZoneSnapshot, type RuleState } from "../../lib/taj-pilot/contracts";
import { flowPolicy } from "../../lib/taj-pilot/flow-policy";
import styles from "./taj-pilot.module.css";

const positions: Record<ZoneId, { left: string; top: string }> = {
  "east-gate": { left: "78%", top: "78%" },
  "main-gateway": { left: "50%", top: "78%" },
  "mausoleum": { left: "50%", top: "26%" },
};
export function ZoneMap({ mode, snapshots = [], states = {} }: {
  mode: "demo" | "real"; snapshots?: ZoneSnapshot[]; states?: Record<string, RuleState>;
}) {
  const [selected, setSelected] = useState<ZoneId>("east-gate");
  const condition = (id: ZoneId) => mode === "demo" ? states[id]?.condition ?? "Unknown" : "Unknown";
  const count = (id: ZoneId) => condition(id) === "Unknown" ? null : snapshots.find(s => s.zoneId === id)?.estimatedCount ?? null;
  const flow = flowPolicy(mode, states);
  const snapshot = mode === "demo" ? snapshots.find(s => s.zoneId === selected) : undefined;
  return <section className={styles.mapSection} aria-label="Zone map">
    <div className={styles.mapHeading}><div><h2>Taj Mahal · zone map</h2><p>Illustrative layout · not to scale · zone positions and boundaries unverified</p></div><strong className={styles.badge}>{mode === "demo" ? "SIMULATION" : "NOT CONNECTED"}</strong></div>
    <div className={styles.mapLayout}>
      <div className={styles.mapCanvas}>
        <svg viewBox="0 0 800 560" preserveAspectRatio="none" className={styles.mapDrawing} aria-hidden="true">
          <rect width="800" height="560" fill="#f3efe3" />
          <path d="M0 0H800V65Q650 35 480 65T0 55Z" fill="#bddbdc" />
          <rect x="155" y="85" width="490" height="410" rx="10" fill="#e4dfcd" stroke="#c0b79f" strokeWidth="3" />
          <rect x="270" y="95" width="260" height="60" rx="5" fill="#faf8f1" stroke="#baa98a" strokeWidth="2" />
          <path d="M370 95Q400 45 430 95" fill="#faf8f1" stroke="#baa98a" strokeWidth="2" />
          {[285, 505].map(x => <rect key={x} x={x} y="80" width="10" height="85" rx="3" fill="#faf8f1" stroke="#baa98a" />)}
          {[195, 425].flatMap(x => [200, 315].map(y => <rect key={`${x}-${y}`} x={x} y={y} width="180" height="90" rx="8" fill="#c8d7b7" />))}
          <path d="M400 170V425M180 300H620" stroke="#faf7ed" strokeWidth="22" />
          <rect x="393" y="195" width="14" height="195" rx="5" fill="#9bc7ca" />
          <rect x="340" y="430" width="120" height="45" rx="5" fill="#c29579" />
          <path d="M460 450H730" stroke="#e5d0ae" strokeWidth="22" />
          <text x="28" y="34" fill="#456a6d" fontSize="16">River backdrop</text>
          <text x="400" y="526" textAnchor="middle" fill="#72664c" fontSize="16">Schematic site layout — not for navigation</text>
        </svg>
        {ZONES.map((zone, index) => <button key={zone.id} style={positions[zone.id]} className={styles.mapMarker} data-condition={condition(zone.id)} aria-label={`${zone.name}: ${condition(zone.id)}, ${count(zone.id) ?? "unknown"} count`} aria-pressed={selected === zone.id} onClick={() => setSelected(zone.id)}><span>{index + 1}</span><span className={styles.markerLabel}>{zone.id === "east-gate" ? "East Gate" : zone.id === "main-gateway" ? "Gateway" : "Mausoleum"}</span></button>)}
      </div>
      <div className={styles.mapDetail} aria-live="polite"><p className={styles.eyebrow}>SELECTED ZONE</p><h3>{ZONES.find(z => z.id === selected)?.name}</h3><strong className={styles.count}>{count(selected) ?? "—"}</strong><p><strong>{condition(selected)}</strong>{count(selected) !== null ? " · simulated count" : " · count unavailable"}</p><p>Source: {snapshot?.sourceHealth ?? "unavailable"}<br />Freshness: {snapshot?.freshness ?? "missing"}</p><p className={styles.timestamp}>Observed: {snapshot?.observedAt ?? "No observation"}</p><p>{selected === "east-gate" ? `Entry: ${flow.entry}` : selected === "mausoleum" && flow.exitSuggested ? "Fast exit suggested · orderly, staff-managed departure through a verified exit only." : ""}</p><p>Select a numbered marker to inspect a zone.</p></div>
    </div>
    <div className={styles.mapLegend}><span><i style={{background:"#27634d"}} />Normal / recovered</span><span><i style={{background:"#a46712"}} />Rising / recovering</span><span><i style={{background:"#ac3d2d"}} />Congestion</span><span><i style={{background:"#69746f"}} />Unknown</span></div>
  </section>;
}
