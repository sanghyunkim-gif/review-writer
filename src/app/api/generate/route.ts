import { NextRequest } from "next/server";
import { runResearcher } from "@/lib/agents/researcher";
import { runOrganizer } from "@/lib/agents/organizer";
import { runPlanner } from "@/lib/agents/planner";
import { runWriter } from "@/lib/agents/writer";
import { runReviewer } from "@/lib/agents/reviewer";
import type { ReviewInput } from "@/lib/types";

export const maxDuration = 60;

function sendEvent(controller: ReadableStreamDefaultController, stage: number, name: string, status: string, result?: string) {
  const data = JSON.stringify({ stage, name, status, result });
  controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
}

export async function POST(request: NextRequest) {
  const input: ReviewInput = await request.json();

  if (!input.subjectName || !input.brandOrOwner) {
    return new Response(JSON.stringify({ error: "대상명과 브랜드/운영사는 필수입니다." }), { status: 400 });
  }

  const stages = [
    { stage: 1, name: "🔍 리서처" },
    { stage: 2, name: "📋 정리자" },
    { stage: 3, name: "🎯 기획자" },
    { stage: 4, name: "✍️ 작성자" },
    { stage: 5, name: "✨ 검수자" },
  ];
  let currentStage = 0;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        currentStage = 1;
        sendEvent(controller, 1, stages[0].name, "running");
        const research = await runResearcher(input);
        sendEvent(controller, 1, stages[0].name, "done");

        currentStage = 2;
        sendEvent(controller, 2, stages[1].name, "running");
        const organized = await runOrganizer(input, research);
        sendEvent(controller, 2, stages[1].name, "done");

        currentStage = 3;
        sendEvent(controller, 3, stages[2].name, "running");
        const plan = await runPlanner(input, organized);
        sendEvent(controller, 3, stages[2].name, "done");

        currentStage = 4;
        sendEvent(controller, 4, stages[3].name, "running");
        const written = await runWriter(input, organized, plan);
        sendEvent(controller, 4, stages[3].name, "done");

        currentStage = 5;
        sendEvent(controller, 5, stages[4].name, "running");
        const final = await runReviewer(input, written);
        sendEvent(controller, 5, stages[4].name, "done");

        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ stage: 6, name: "완료", status: "complete", result: JSON.stringify(final) })}\n\n`));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "알 수 없는 오류";
        console.error(`[파이프라인] ${currentStage}단계 에러:`, msg);
        sendEvent(controller, currentStage, stages[currentStage - 1]?.name || "오류", "error", msg);
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
