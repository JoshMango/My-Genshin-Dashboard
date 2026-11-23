import { showcase } from "@/lib/enka/proxy";

export async function GET(
  request: Request,
  context: { params: Promise<{ uid: string }> },
) {
  const { uid } = await context.params;
  return showcase(request, uid);
}
