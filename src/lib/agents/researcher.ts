import OpenAI from "openai";
import { searchBrave } from "../search";
import type { ReviewInput, ResearchResult } from "../types";

const SYSTEM = `당신은 체험단 리뷰 블로그 글 작성을 위한 리서치 전문가입니다.
주어진 제품에 대해 검색 결과를 분석하고 다음을 정리하세요:
1. 제품 기본 정보 (가격, 스펙, 특징)
2. 실사용자 후기 요약
3. 경쟁 제품 비교
4. 최신 뉴스/이벤트

반드시 JSON으로 출력:
{"productInfo":"...", "specs":"...", "reviews":"...", "competitors":"...", "rawSearch":"..."}`;

export async function runResearcher(input: ReviewInput): Promise<ResearchResult> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const searchResults = await Promise.all([
    searchBrave(`${input.brandName} ${input.productName} 후기 리뷰`),
    searchBrave(`${input.brandName} ${input.productName} 스펙 가격`),
  ]);

  const combined = searchResults.join("\n\n---\n\n");

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `제품: ${input.productName}\n브랜드: ${input.brandName}\n카테고리: ${input.category}\n\n검색 결과:\n${combined}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  const text = res.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch {
    return { productInfo: text, specs: "", reviews: "", competitors: "", rawSearch: combined };
  }
}
