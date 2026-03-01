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

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${label} 시간 초과 (${ms / 1000}초)`)), ms)
  );
  return Promise.race([promise, timeout]);
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
        // Stage 1: Research
        currentStage = 1;
        sendEvent(controller, 1, stages[0].name, "running");
        console.log("[파이프라인] 1단계 리서처 시작");
        const research = await withTimeout(runResearcher(input), 60000, "리서처");
        console.log("[파이프라인] 1단계 리서처 완료");
        sendEvent(controller, 1, stages[0].name, "done", JSON.stringify(research));

        // Stage 2: Organize
        currentStage = 2;
        sendEvent(controller, 2, stages[1].name, "running");
        console.log("[파이프라인] 2단계 정리자 시작");
        const organized = await withTimeout(runOrganizer(input, research), 45000, "정리자");
        console.log("[파이프라인] 2단계 정리자 완료");
        sendEvent(controller, 2, stages[1].name, "done", JSON.stringify(organized));

        // Stage 3: Plan
        currentStage = 3;
        sendEvent(controller, 3, stages[2].name, "running");
        console.log("[파이프라인] 3단계 기획자 시작");
        const plan = await withTimeout(runPlanner(input, organized), 45000, "기획자");
        console.log("[파이프라인] 3단계 기획자 완료");
        sendEvent(controller, 3, stages[2].name, "done", JSON.stringify(plan));

        // Stage 4: Write
        currentStage = 4;
        sendEvent(controller, 4, stages[3].name, "running");
        console.log("[파이프라인] 4단계 작성자 시작");
        const written = await withTimeout(runWriter(input, organized, plan), 60000, "작성자");
        console.log("[파이프라인] 4단계 작성자 완료");
        sendEvent(controller, 4, stages[3].name, "done", JSON.stringify(written));

        // Stage 5: Review
        currentStage = 5;
        sendEvent(controller, 5, stages[4].name, "running");
        console.log("[파이프라인] 5단계 검수자 시작");
        const final = await withTimeout(runReviewer(input, written), 60000, "검수자");
        console.log("[파이프라인] 5단계 검수자 완료");
        sendEvent(controller, 5, stages[4].name, "done", JSON.stringify(final));

        // Final result
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
