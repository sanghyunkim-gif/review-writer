import OpenAI from "openai";
import type { ReviewInput, OrganizedData, ContentPlan } from "../types";

const SYSTEM = `당신은 체험단 블로그 글의 구조를 설계하는 기획 전문가입니다.
정리된 데이터를 바탕으로 글의 전체 아웃라인을 설계하세요.

설계 요소:
1. 글 구조 (소제목 5-7개, 각 소제목 아래 핵심 포인트)
2. 사진 배치 위치 (몇 번째 섹션 뒤에 사진)
3. 필수 키워드 자연 배치 전략
4. 도입부→제품소개→사용후기→장단점→총평 흐름

반드시 JSON으로 출력:
{"outline":["섹션1: 설명", ...], "photoPositions":[1,3,5], "keywordStrategy":"...", "structure":"전체 흐름 설명"}`;

export async function runPlanner(
  input: ReviewInput,
  organized: OrganizedData
): Promise<ContentPlan> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `제품: ${input.productName} (${input.brandName})
카테고리: ${input.category}
사진 매수: ${input.photoCount}장
필수 키워드: ${input.requiredKeywords}
글 톤: ${input.tone === "friendly" ? "친근" : input.tone === "professional" ? "전문" : "유머"}

정리된 데이터:
- 셀링포인트: ${organized.sellingPoints.join(", ")}
- 사실: ${organized.facts.join(", ")}
- 의견: ${organized.opinions.join(", ")}
- 핵심 데이터: ${organized.keyData}`,
      },
    ],
    temperature: 0.5,
    max_tokens: 1500,
  });

  const text = res.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch {
    return { outline: [], photoPositions: [], keywordStrategy: "", structure: text };
  }
}
