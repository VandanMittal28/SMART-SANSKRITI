"use client";
import { useState } from "react";
import styles from "./taj-pilot.module.css";
export function ManualCount({ zoneNumber, disabled, onSave }: { zoneNumber: number; disabled: boolean; onSave: (count: number) => Promise<void> }) {
  const [value, setValue] = useState("");
  return <form className={styles.manualCount} onSubmit={async e => {
    e.preventDefault();
    if (!/^\d+$/.test(value) || Number(value) > 100000) return;
    await onSave(Number(value));
  }}><label htmlFor={`manual-zone-${zoneNumber}`}>Manual count · Zone {zoneNumber}</label><div className={styles.actions}><input id={`manual-zone-${zoneNumber}`} type="number" min="0" max="100000" step="1" required inputMode="numeric" placeholder="e.g. 120" value={value} onChange={e => setValue(e.target.value)} /><button type="submit" disabled={disabled}>Apply count</button></div></form>;
}
