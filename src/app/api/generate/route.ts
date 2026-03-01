import { NextRequest } from "next/server";
import { runResearcher } from "@/lib/agents/researcher";
import { runOrganizer } from "@/lib/agents/organizer";
import { runPlanner } from "@/lib/agents/planner";
import { runWriter } from "@/lib/agents/writer";
import { runReviewer } from "@/lib/agents/reviewer";
import type { ReviewInput } from "@/lib/types";

function sendEvent(controller: ReadableStreamDefaultController, stage: number, name: string, status: string, result?: string) {
  const data = JSON.stringify({ stage, name, status, result });
  controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
}

export async function POST(request: NextRequest) {
  const input: ReviewInput = await request.json();

  if (!input.productName || !input.brandName) {
    return new Response(JSON.stringify({ error: "제품명과 브랜드명은 필수입니다." }), { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Stage 1: Research
        sendEvent(controller, 1, "🔍 리서처", "running");
        const research = await runResearcher(input);
        sendEvent(controller, 1, "🔍 리서처", "done", JSON.stringify(research));

        // Stage 2: Organize
        sendEvent(controller, 2, "📋 정리자", "running");
        const organized = await runOrganizer(input, research);
        sendEvent(controller, 2, "📋 정리자", "done", JSON.stringify(organized));

        // Stage 3: Plan
        sendEvent(controller, 3, "🎯 기획자", "running");
        const plan = await runPlanner(input, organized);
        sendEvent(controller, 3, "🎯 기획자", "done", JSON.stringify(plan));

        // Stage 4: Write
        sendEvent(controller, 4, "✍️ 작성자", "running");
        const written = await runWriter(input, organized, plan);
        sendEvent(controller, 4, "✍️ 작성자", "done", JSON.stringify(written));

        // Stage 5: Review
        sendEvent(controller, 5, "✨ 검수자", "running");
        const final = await runReviewer(input, written);
        sendEvent(controller, 5, "✨ 검수자", "done", JSON.stringify(final));

        // Final result
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ stage: 6, name: "완료", status: "complete", result: JSON.stringify(final) })}\n\n`));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "알 수 없는 오류";
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ stage: 0, name: "오류", status: "error", result: msg })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
