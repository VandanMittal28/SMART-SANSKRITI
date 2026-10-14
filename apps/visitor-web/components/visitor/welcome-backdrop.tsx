import { backdropPhotos, licenceLabel, sourceSiteName, type MonumentPhoto } from "@/lib/monument-photos";

// Faint, slowly drifting monument photographs behind the welcome screen.
// Pure CSS animation (styles/welcome.css): 6–12% opacity, toned toward the
// palette, three tiles on phones and six on wider screens, and no movement
// when the visitor prefers reduced motion.
export function WelcomeBackdrop({ photos = backdropPhotos() }: { photos?: MonumentPhoto[] }) {
  if (photos.length === 0) return null;
  return (
    <div className="backdrop" aria-hidden="true">
      {photos.map((photo, index) => (
        <div key={photo.id} className={`backdrop__tile backdrop__tile--${index + 1}`} style={{ aspectRatio: `${photo.width} / ${photo.height}` }}>
          {/* <picture>, not srcset: phones always get the small file. Tiles 4–6
              are hidden on phones and lazy, so they aren't downloaded there. */}
          <picture>
            {photo.srcSmall && <source media="(min-width: 768px)" srcSet={photo.src} />}
            <img
              src={photo.srcSmall ?? photo.src}
              alt=""
              width={photo.width}
              height={photo.height}
              decoding="async"
              loading="lazy"
              fetchPriority="low"
              style={photo.focus ? { objectPosition: photo.focus } : undefined}
            />
          </picture>
        </div>
      ))}
    </div>
  );
}

export function WelcomePhotoCredits({ photos = backdropPhotos() }: { photos?: MonumentPhoto[] }) {
  if (photos.length === 0) return null;
  return (
    <details className="welcome__credits">
      <summary>Background photo credits</summary>
      <ul>
        {photos.map((photo) => {
          const site = sourceSiteName(photo.credit.source);
          return (
            <li key={photo.id}>
              {photo.monument}:{" "}
              <a href={photo.credit.source} rel="noopener noreferrer" target="_blank">
                {photo.credit.author}
              </a>
              {site ? `, via ${site}, ` : ", "}
              {photo.credit.licenceUrl ? (
                <a href={photo.credit.licenceUrl} rel="noopener noreferrer license" target="_blank">
                  {licenceLabel(photo.credit.licence)}
                </a>
              ) : (
                licenceLabel(photo.credit.licence)
              )}
              {photo.credit.changes ? `. ${photo.credit.changes}` : "."}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
