import { store } from "../../../lib/store";
import { seed } from "../../../lib/domain";
import { publicSnapshot } from "../../../lib/crowd";
import { assertLocal, failure, jsonBody } from "../../../lib/request";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertLocal(request);
    await jsonBody(request);
    return Response.json(
      await store.transaction((data) => {
        const sample = seed();
        data.signals = sample.signals;
        data.sampledAt = sample.sampledAt;
        delete data.crowdInputs;
        return publicSnapshot(data);
      }),
    );
  } catch (error) {
    return failure(error);
  }
}
