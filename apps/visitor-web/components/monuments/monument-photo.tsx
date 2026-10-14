import { licenceLabel, photoFor, sourceSiteName } from "@/lib/monument-photos";

// A guide monument's licensed photograph. Phones get the 640px file; wider
// screens the 1000px one.
export function MonumentPhoto({
  monumentId,
  alt,
  className,
  sizes = "(min-width: 768px) 50vw, 100vw",
  priority = false,
}: {
  monumentId: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const photo = photoFor(monumentId);
  if (!photo) return null;
  return (
    <img
      className={className}
      src={photo.srcSmall ?? photo.src}
      srcSet={photo.srcSmall ? `${photo.srcSmall} 640w, ${photo.src} 1000w` : undefined}
      sizes={photo.srcSmall ? sizes : undefined}
      width={photo.width}
      height={photo.height}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      style={photo.focus ? { objectPosition: photo.focus } : undefined}
    />
  );
}

/** Attribution as the photo's licence requires: author, source, licence, changes. */
export function PhotoCredit({ monumentId, className = "credit" }: { monumentId: string; className?: string }) {
  const photo = photoFor(monumentId);
  if (!photo) return null;
  const site = sourceSiteName(photo.credit.source);
  return (
    <p className={className}>
      Photo:{" "}
      <a href={photo.credit.source} target="_blank" rel="noopener noreferrer">
        {photo.credit.author}
      </a>
      {site ? `, ${site}` : ""} ·{" "}
      {photo.credit.licenceUrl ? (
        <a href={photo.credit.licenceUrl} target="_blank" rel="noopener noreferrer license">
          {licenceLabel(photo.credit.licence)}
        </a>
      ) : (
        licenceLabel(photo.credit.licence)
      )}
      {photo.credit.changes ? ` · ${photo.credit.changes.replace(/\.$/, "")}` : ""}
    </p>
  );
}
