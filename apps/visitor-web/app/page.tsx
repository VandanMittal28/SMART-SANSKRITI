import { Logo } from "@/components/brand/logo";
import { WelcomeBackdrop, WelcomePhotoCredits } from "@/components/visitor/welcome-backdrop";
import { WelcomeForm } from "@/components/visitor/welcome-form";
import { backdropPhotos } from "@/lib/monument-photos";

// Phone-first welcome: one column sized for a 360px screen, so the name field
// and Continue stay in the first screen even on short phones. Wider screens
// keep the same column and reveal more of the photographic backdrop.
export default function WelcomePage() {
  const photos = backdropPhotos();
  return (
    <main id="main" className="welcome">
      <WelcomeBackdrop photos={photos} />
      <div className="welcome__column">
        <header className="welcome__brand">
          <span className="seal">
            <Logo variant="mark" size={40} idPrefix="welcome" />
          </span>
          <span className="welcome__brand-text">
            <span className="welcome__wordmark">Sanskriti</span>
            <span className="welcome__strap">Heritage companion</span>
          </span>
        </header>

        <section className="welcome__card" aria-labelledby="welcome-title">
          <div className="welcome__intro">
            <h1 id="welcome-title" className="welcome__title">
              Welcome
            </h1>
            <p className="welcome__lede">Recognise monuments, ask Yatrik about their stories, and help look after the places you visit.</p>
          </div>
          <WelcomeForm />
          <p className="welcome__privacy">
            Your name only personalises this visit on this device. There&apos;s no account or password, it isn&apos;t sent to our
            servers, and anyone using this browser can see or change it.
          </p>
        </section>

        <WelcomePhotoCredits photos={photos} />
      </div>
    </main>
  );
}
