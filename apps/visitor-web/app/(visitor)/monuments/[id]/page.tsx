import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IconArrowLeft, IconCamera, IconChevronRight } from "@/components/icons";
import { AskYatrikButton } from "@/components/monuments/ask-yatrik-button";
import { AudioStory } from "@/components/monuments/audio-story";
import { MonumentPhoto, PhotoCredit } from "@/components/monuments/monument-photo";
import { MONUMENTS, getMonument } from "@/lib/content/monuments";

export function generateStaticParams() {
  return MONUMENTS.map((monument) => ({ id: monument.id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const monument = getMonument((await params).id);
  return monument ? { title: monument.name, description: monument.summary } : {};
}

export default async function MonumentPage({ params }: { params: Promise<{ id: string }> }) {
  const monument = getMonument((await params).id);
  if (!monument) notFound();

  const index = MONUMENTS.findIndex((m) => m.id === monument.id);
  const more = [1, 2, 3].map((step) => MONUMENTS[(index + step) % MONUMENTS.length]);

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
          <header className="monument__head">
            <p className="eyebrow">{monument.place}</p>
            <h1>{monument.name}</h1>
            <p className="monument__hi" lang="hi">
              {monument.nameHi}
            </p>
            <p className="monument__summary">{monument.summary}</p>
            <div className="monument__actions">
              <AskYatrikButton monumentId={monument.id} label={`Ask Yatrik about ${monument.name}`} className="btn btn--primary btn--block" />
            </div>
          </header>

          {monument.audio && <AudioStory name={monument.name} audio={monument.audio} />}

          <section className="monument__story" aria-label={`The story of ${monument.name}`}>
            <div className="story-part">
              <h2 className="section-label">Origins</h2>
              <p>{monument.origins}</p>
            </div>
            <div className="story-part">
              <h2 className="section-label">Later history</h2>
              <p>{monument.laterHistory}</p>
            </div>
            <div className="story-part">
              <h2 className="section-label">Today</h2>
              <p>{monument.today}</p>
            </div>
          </section>

          <p className="monument__source">
            Guide text from Sanskriti&apos;s monument notes. It hasn&apos;t been independently reviewed; check the Archaeological Survey of India for
            dates and current visiting information.
          </p>

          <Link href="/recognize" className="monument__recognise">
            <IconCamera size={20} /> Standing in front of a monument? Recognise it from a photo
          </Link>

          <nav className="monument__more" aria-labelledby="more-title">
            <h2 id="more-title" className="section-label">
              More monuments
            </h2>
            <ul>
              {more.map((m) => (
                <li key={m.id}>
                  <Link href={`/monuments/${m.id}`} className="monument-row monument-row--compact">
                    <MonumentPhoto monumentId={m.id} alt="" className="monument-row__img" sizes="72px" />
                    <span className="monument-row__text">
                      <span className="monument-row__name">{m.name}</span>
                      <span className="monument-row__place">{m.place}</span>
                    </span>
                    <IconChevronRight size={20} className="monument-row__chevron" />
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
