import { TajPilot } from "./taj-pilot";
import { MmsCrowdFeature } from "./mms-crowd-feature";
export default function Page() { return process.env.VERCEL ? <MmsCrowdFeature /> : <TajPilot />; }
