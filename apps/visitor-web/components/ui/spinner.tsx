import { Loader2 } from "lucide-react";
export function Spinner({className}: {className?: string}) { return <Loader2 aria-label="Loading" className={`animate-spin ${className ?? ""}`} />; }
