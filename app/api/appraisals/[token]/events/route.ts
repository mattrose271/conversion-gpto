import { getPublicAppraisalByToken } from "@/lib/appraisal/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { token: string } }
) {
  const initial = await getPublicAppraisalByToken(params.token);
  if (!initial) return Response.json({ error: "Appraisal link is invalid or expired." }, { status: 404 });

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | null = null;
  const stream = new ReadableStream({
    start(controller) {
      const send = async () => {
        try {
          const appraisal = await getPublicAppraisalByToken(params.token);
          if (!appraisal) {
            controller.enqueue(encoder.encode(`event: error\ndata: {"error":"expired"}\n\n`));
            controller.close();
            if (timer) clearInterval(timer);
            return;
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(appraisal)}\n\n`));
          if (appraisal.status === "completed" || appraisal.status === "failed") {
            controller.close();
            if (timer) clearInterval(timer);
          }
        } catch {
          controller.enqueue(encoder.encode(`event: error\ndata: {"error":"unavailable"}\n\n`));
        }
      };
      void send();
      timer = setInterval(() => void send(), 2000);
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "private, no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
