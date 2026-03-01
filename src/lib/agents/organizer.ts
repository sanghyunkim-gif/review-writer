import OpenAI from "openai";
import type { ReviewInput, ResearchResult, OrganizedData } from "../types";

const SYSTEM = `당신은 리서치 데이터를 체험단 블로그 글 작성용으로 정리하는 전문가입니다.
수집된 정보를 다음과 같이 구조화하세요:
1. 핵심 셀링포인트 (3-5개)
2. 사실 정보 (검증된 스펙/가격 등)
3. 의견/감상 (후기 기반)
4. 글 작성에 활용할 핵심 데이터 요약

반드시 JSON으로 출력:
{"sellingPoints":["..."], "facts":["..."], "opinions":["..."], "keyData":"..."}`;

export async function runOrganizer(
  input: ReviewInput,
  research: ResearchResult
): Promise<OrganizedData> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const typeFieldsStr = Object.entries(input.typeFields)
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `유형: ${input.reviewType}
대상: ${input.subjectName} (${input.brandOrOwner})
${typeFieldsStr ? `추가 정보:\n${typeFieldsStr}\n` : ""}
사용자 체험: ${input.experience}
장점: ${input.pros}
단점: ${input.cons}

리서치 결과:
- 기본정보: ${research.subjectInfo}
- 상세: ${research.details}
- 후기: ${research.reviews}
- 경쟁/비교: ${research.competitors}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 1500,
  });

  const text = res.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch {
    return { sellingPoints: [], facts: [], opinions: [], keyData: text };
  }
}
