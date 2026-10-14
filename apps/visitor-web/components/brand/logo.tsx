// Sanskriti logo, reproduced from apk/ui/public/sanskriti-logo.svg (same paths
// and gold gradient). Rendered inline so the wordmark uses the app's loaded
// Manrope font and the mark can be cropped for small sizes.
//
// The pale gold is designed for dark grounds: place it on navy surfaces.

type LogoProps = {
  /** "full" includes the SANSKRITI AI wordmark; "mark" is the emblem alone. */
  variant?: "full" | "mark";
  /** Rendered width and height in CSS pixels. */
  size?: number;
  /** Unique per page: the gradient id must not collide between instances. */
  idPrefix: string;
  /** Accessible name. Omit when visible text next to the logo already names it. */
  title?: string;
  className?: string;
};

export function Logo({ variant = "full", size = 120, idPrefix, title, className }: LogoProps) {
  const gradientId = `${idPrefix}-logo-gold`;
  const stroke = `url(#${gradientId})`;
  const viewBox = variant === "mark" ? "108 36 296 296" : "0 0 512 512";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={size}
      height={size}
      fill="none"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="76" y1="68" x2="438" y2="444" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F6D778" />
          <stop offset="0.55" stopColor="#E9BE57" />
          <stop offset="1" stopColor="#C99B3D" />
        </linearGradient>
      </defs>

      <circle cx="256" cy="184" r="142" stroke={stroke} strokeWidth="6" />

      <g stroke={stroke} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M256 82c22 23 27 46 27 68s-5 45-27 70c-22-25-27-48-27-70s5-45 27-68Z" />
        <path d="M256 101c13 13 16 27 16 41s-3 27-16 42c-13-15-16-28-16-42s3-28 16-41Z" />
        <path d="M204 109c16 17 19 35 19 53s-3 35-19 55c-17-20-21-37-21-55s4-36 21-53Z" />
        <path d="M308 109c17 17 21 35 21 53s-4 35-21 55c-16-20-19-37-19-55s3-36 19-53Z" />
        <path d="M166 137c14 14 16 30 16 45 0 16-2 31-16 48-15-17-19-32-19-48 0-15 4-31 19-45Z" />
        <path d="M346 137c15 14 19 30 19 45 0 16-4 31-19 48-14-17-16-32-16-48 0-15 2-31 16-45Z" />
      </g>

      <g stroke={stroke} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M130 198c29 26 57 39 85 39 15 0 29-4 41-11" />
        <path d="M382 198c-29 26-57 39-85 39-15 0-29-4-41-11" />
        <path d="M160 220c25 28 52 44 81 46" />
        <path d="M352 220c-25 28-52 44-81 46" />
      </g>

      <g stroke={stroke} strokeWidth="4.5" strokeLinecap="round">
        <line x1="256" y1="121" x2="256" y2="248" />
        <line x1="224" y1="136" x2="224" y2="228" />
        <line x1="288" y1="136" x2="288" y2="228" />
        <line x1="197" y1="157" x2="197" y2="213" />
        <line x1="315" y1="157" x2="315" y2="213" />
      </g>

      <g fill={stroke}>
        <circle cx="256" cy="184" r="7" />
        <circle cx="224" cy="170" r="5" />
        <circle cx="288" cy="170" r="5" />
        <circle cx="197" cy="186" r="5" />
        <circle cx="315" cy="186" r="5" />
      </g>

      {variant === "full" && (
        <g fill={stroke} style={{ fontFamily: "var(--font-sans), Arial, sans-serif" }} textAnchor="middle">
          <text x="256" y="396" fontSize="42" letterSpacing="4">
            SANSKRITI
          </text>
          <text x="256" y="444" fontSize="38" letterSpacing="8">
            AI
          </text>
        </g>
      )}
    </svg>
  );
}
