-- AI spam flags remain advisory and do not dismiss or hide incidents.
alter table public.mms_ai_assessments
  drop constraint mms_ai_assessments_value_check;
alter table public.mms_ai_assessments
  add constraint mms_ai_assessments_value_check
  check (value in ('relevant', 'uncertain', 'irrelevant', 'spam'));
