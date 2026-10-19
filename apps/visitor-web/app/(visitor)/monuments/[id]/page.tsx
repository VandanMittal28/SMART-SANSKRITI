import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowLeft, IconCamera, IconChevronRight, IconPin, IconSpeaker } from "@/components/icons";
import { AskYatrikButton } from "@/components/monuments/ask-yatrik-button";
import { AudioStory } from "@/components/monuments/audio-story";
import { MonumentPhoto, PhotoCredit } from "@/components/monuments/monument-photo";
import { EraSwitcher, MonumentTabs } from "@/components/monuments/monument-tabs";
import { factsFor } from "@/lib/content/monument-facts";
import { MONUMENTS, getMonument } from "@/lib/content/monuments";

export function generateStaticParams() {
  return MONUMENTS.map((monument) => ({ id: monument.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const monument = getMonument((await params).id);
  return monument ? { title: monument.name, description: monument.summary } : {};
}

// Structure follows the original app's monument page (apk/ui/app/monument/[id]):
// a header card with place, title, description and a row of action tiles,
// then tabbed detail (Overview / Through time / Visit) like its detail tabs.
export default async function MonumentPage({ params }: { params: Promise<{ id: string }> }) {
  const monument = getMonument((await params).id);
  if (!monument) notFound();
  const facts = factsFor(monument.id);

  const index = MONUMENTS.findIndex((m) => m.id === monument.id);
  const more = [1, 2, 3].map((step) => MONUMENTS[(index + step) % MONUMENTS.length]);

  const overview = (
    <div className="glance">
      <dl className="glance__grid">
        {facts?.builtBy && (
          <div>
            <dt>Built by</dt>
            <dd>{facts.builtBy}</dd>
          </div>
        )}
        {facts?.built && (
          <div>
            <dt>Built</dt>
            <dd>{facts.built}</dd>
          </div>
        )}
        {facts?.type && (
          <div>
            <dt>Type</dt>
            <dd>{facts.type}</dd>
          </div>
        )}
        <div>
          <dt>Location</dt>
          <dd>{monument.place}</dd>
        </div>
      </dl>
      {facts?.unesco && <p className="glance__badge">UNESCO World Heritage Site</p>}
      {facts?.architecture && (
        <div className="glance__section">
          <h3 className="section-label">Architecture</h3>
          <p>{facts.architecture}</p>
        </div>
      )}
    </div>
  );

  const throughTime = (
    <EraSwitcher
      eras={[
        { id: "origins", label: "Origins", text: monument.origins },
        { id: "later", label: "Later history", text: monument.laterHistory },
        { id: "today", label: "Today", text: monument.today },
      ]}
    />
  );

  const visit = (
    <div className="glance">
      {facts?.bestTimeToVisit && (
        <dl className="glance__grid glance__grid--single">
          <div>
            <dt>Best time to visit</dt>
            <dd>{facts.bestTimeToVisit}</dd>
          </div>
        </dl>
      )}
      <p className="glance__note">
        Opening hours, ticket prices and entry rules change, so check the Archaeological Survey of India or the site&apos;s official page before you go.
      </p>
      <Link href="/recognize" className="monument__recognise">
        <IconCamera size={20} /> At the site? Scan the monument to learn what you&apos;re looking at
      </Link>
    </div>
  );

  return (
    <article className="container monument">
      <Link href="/monuments" className="back-link">
        <IconArrowLeft size={18} /> All monuments
      </Link>

      <div className="monument__layout">
        <figure className="monument__hero">
          <MonumentPhoto monumentId={monument.id} alt={`${monument.name}, ${monument.place}`} className="monument__img" priority sizes="(min-width: 1024px) 520px, 100vw" />
          <figcaption>
            <PhotoCredit monumentId={monument.id} />
          </figcaption>
        </figure>

        <div className="monument__body">
          <header className="monument-card on-dark">
            <p className="monument-card__place">
              <IconPin size={16} /> {monument.place}
            </p>
            <h1>{monument.name}</h1>
            <p className="monument-card__hi" lang="hi">
              {monument.nameHi}
            </p>
            <p className="monument-card__summary">{monument.summary}</p>
            <div className={`action-tiles${monument.audio ? "" : " action-tiles--2"}`}>
              <AskYatrikButton monumentId={monument.id} label="Ask Yatrik" className="action-tile" />
              {monument.audio && (
                <a href="#audio-story" className="action-tile">
                  <IconSpeaker size={20} /> Audio story
                </a>
              )}
              <Link href="/recognize" className="action-tile">
                <IconCamera size={20} /> Scan
              </Link>
            </div>
          </header>

          <MonumentTabs
            label={`About ${monument.name}`}
            tabs={[
              { id: "overview", label: "Overview", content: overview },
              { id: "time", label: "Through time", content: throughTime },
              { id: "visit", label: "Visit", content: visit },
            ]}
          />

          {monument.audio && <AudioStory name={monument.name} audio={monument.audio} />}

          <p className="monument__source">
            Guide text and facts from Sanskriti&apos;s monument notes. They haven&apos;t been independently reviewed; check the Archaeological Survey of India for
            dates and current visiting information.
          </p>

          <nav className="monument__more" aria-labelledby="more-title">
            <h2 id="more-title" className="section-label">
              More monuments
            </h2>
            <ul className="row-list">
              {more.map((m) => (
                <li key={m.id}>
                  <Link href={`/monuments/${m.id}`} className="row">
                    <MonumentPhoto monumentId={m.id} alt="" className="row__img" sizes="64px" />
                    <span className="row__text">
                      <span className="row__name">{m.name}</span>
                      <span className="row__place">{m.place}</span>
                    </span>
                    <IconChevronRight size={20} className="row__chevron" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </article>
  );
}
