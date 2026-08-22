-- Keep the persisted profile language aligned with the portal's supported
-- multilingual experience.
alter table public.profiles
  drop constraint if exists profiles_language_check;

alter table public.profiles
  add constraint profiles_language_check
  check (
    language in (
      'ar', 'da', 'de', 'el', 'en', 'es', 'fi', 'fr', 'he', 'hi', 'it',
      'ja', 'ko', 'ms', 'nl', 'nb', 'pl', 'pt', 'ru', 'sv', 'sw', 'tr', 'zh'
    )
  );
