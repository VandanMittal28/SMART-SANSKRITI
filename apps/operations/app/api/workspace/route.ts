import { store } from "../../../lib/store";
import { publicSnapshot } from "../../../lib/crowd";
import { assertLocal, failure, jsonBody } from "../../../lib/request";
import {
  createSchema,
  createIncident,
  updateSchema,
  transitionIncident,
  DomainError,
} from "../../../lib/domain";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    assertLocal(request);
    return Response.json(
      await store.transaction((data) => publicSnapshot(data), false),
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return failure(error);
  }
}
export async function POST(request: Request) {
  try {
    assertLocal(request);
    const input = createSchema.safeParse(await jsonBody(request));
    if (!input.success)
      throw new DomainError(
        "Enter a title (5–120 characters), a description (10–2000), and valid report details.",
      );
    const incident = await store.transaction((data) => {
      const existing = data.incidents.find(
        (i) => i.id === input.data.requestId,
      );
      if (existing) return existing;
      const created = createIncident(input.data);
      data.incidents.unshift(created);
      return created;
    });
    return Response.json(incident, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
export async function PATCH(request: Request) {
  try {
    assertLocal(request);
    const body = await jsonBody(request);
    if (
      !body ||
      typeof body !== "object" ||
      !("id" in body) ||
      typeof body.id !== "string"
    )
      throw new DomainError("Incident ID is required.");
    const { id, ...rest } = body;
    const input = updateSchema.safeParse(rest);
    if (!input.success)
      throw new DomainError(
        "Add an action note (5–1200 characters) and a valid status.",
      );
    const incident = await store.transaction((data) => {
      const index = data.incidents.findIndex((i) => i.id === id);
      if (index < 0) throw new DomainError("Incident not found.", 404);
      data.incidents[index] = transitionIncident(
        data.incidents[index],
        input.data,
      );
      return data.incidents[index];
    });
    return Response.json(incident);
  } catch (error) {
    return failure(error);
  }
}
