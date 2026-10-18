import type { Metadata } from "next";
import Link from "next/link";
import { DeviceFooter, Greeting, PrimaryAction, ServiceNote } from "@/components/home/home-parts";
import { IconArrowRight, IconFlag } from "@/components/icons";
import { MonumentPhoto } from "@/components/monuments/monument-photo";
import { MONUMENTS } from "@/lib/content/monuments";

export const metadata: Metadata = { title: "Home" };

// Hierarchy: recognition is the headline action, reporting beneath it, then a
// strip of monuments to browse. Yatrik is opened from its floating character.
export default function HomePage() {
  return (
    <div className="container page home">
      <Greeting />

      <section className="home-actions" aria-label="What would you like to do?">
        <PrimaryAction />
        <Link href="/report" className="home-tile">
          <span className="home-tile__icon" aria-hidden="true">
            <IconFlag size={22} />
          </span>
          <span className="home-tile__title">Report an issue</span>
          <span className="home-tile__text">Tell the site team about damage, litter or a hazard</span>
        </Link>
      </section>

      <ServiceNote />

      <section className="home-explore" aria-labelledby="explore-title">
        <div className="home-explore__head">
          <h2 id="explore-title">Explore monuments</h2>
          <Link href="/monuments" className="home-explore__all">
            All {MONUMENTS.length} <IconArrowRight size={16} />
          </Link>
        </div>
        <ul className="strip">
          {MONUMENTS.slice(0, 8).map((monument) => (
            <li key={monument.id}>
              <Link href={`/monuments/${monument.id}`} className="strip-card">
                <span className="strip-card__frame">
                  <MonumentPhoto monumentId={monument.id} alt="" className="strip-card__img" sizes="(min-width: 1024px) 240px, 160px" />
                </span>
                <span className="strip-card__name">{monument.name}</span>
                <span className="strip-card__place">{monument.place}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <DeviceFooter />
    </div>
  );
}
