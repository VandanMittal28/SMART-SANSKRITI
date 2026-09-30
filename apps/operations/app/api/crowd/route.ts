import { store } from "../../../lib/store";
import { assertLocal, failure, jsonBody } from "../../../lib/request";
import { DomainError } from "../../../lib/domain";
import {
  applyCrowdEvent,
  crowdEventSchema,
  emptyInputs,
  publicSnapshot,
} from "../../../lib/crowd";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    assertLocal(request);
    const input = crowdEventSchema.safeParse(await jsonBody(request));
    if (!input.success)
      throw new DomainError(
        "Invalid crowd observation. Check consent, zone/camera, sequence, time and count.",
      );
    const result = await store.transaction((data) => {
      const update = applyCrowdEvent(
        data.crowdInputs ?? emptyInputs(),
        input.data,
      );
      data.crowdInputs = update.inputs;
      return { workspace: publicSnapshot(data), duplicate: update.duplicate };
    });
    return Response.json(result);
  } catch (error) {
    return failure(error);
  }
}
