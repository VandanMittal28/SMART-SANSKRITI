import { assessmentModel, assessWithNvidia } from './nvidia-assessment.ts';

export type MmsAssessment = {
  incident_id: string;
  value: 'relevant' | 'uncertain' | 'irrelevant' | 'spam' | 'unavailable';
  reason: string;
  model: string;
  assessed_at: string;
};

export interface AssessmentRepository {
  // Implementations must authorize site-manager access before returning input.
  incident(id: string): Promise<{ category: string; description: string; photoPath: string | null }>;
  existing(id: string): Promise<MmsAssessment | null>;
  photo(path: string): Promise<Buffer>;
  save(result: MmsAssessment): Promise<MmsAssessment>;
}

export async function assessMmsIncident(id: string, repository: AssessmentRepository, assess = assessWithNvidia): Promise<MmsAssessment> {
  const incident = await repository.incident(id);
  const existing = await repository.existing(id);
  if (existing) return existing;
  const model = assessmentModel();
  let photo: Buffer | null = null;
  try {
    if (incident.photoPath) {
      photo = await repository.photo(incident.photoPath);
      if (photo.length > 2_000_000 || !photo.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) throw new Error('Invalid JPEG');
    }
  } catch {
    return { incident_id: id, value: 'unavailable', reason: 'The attached photo could not be assessed. Review the report manually.', model, assessed_at: new Date().toISOString() };
  }
  const result = await assess({ category: incident.category, note: incident.description, photo, mime: 'jpeg' }, { model });
  const assessment: MmsAssessment = { incident_id: id, ...result, model, assessed_at: new Date().toISOString() };
  // Failed attempts can be retried. Completed assessments are immutable and cached.
  if (assessment.value === 'unavailable') return assessment;
  return repository.save(assessment);
}
