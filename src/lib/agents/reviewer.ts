import OpenAI from "openai";
import type { ReviewInput, WrittenContent, ReviewResult } from "../types";

const SYSTEM = `당신은 체험단 블로그 글의 최종 검수 전문가입니다.

## 검수 항목
1. **SEO 최적화**: 키워드 밀도, 제목 최적화, 글 길이, 가독성, CTA
2. **AI 말투 탐지 및 제거**:
   - "~를 제공합니다", "~가 가능합니다", "효율적인", "최적화된" 등 번역체
   - "이 제품은 ~합니다" 같은 딱딱한 서술체
   - 자연스러운 블로그 말투로 교정
3. **맞춤법/어색한 표현** 수정
4. **필수 문구 포함 여부** 확인

## 출력 (반드시 JSON)
{
  "finalTitles": ["수정된 제목1", "제목2", "제목3"],
  "finalBody": "최종 수정된 본문",
  "hashtags": ["태그1", ...],
  "seoScore": 85,
  "seoAnalysis": {
    "keywordDensity": "적정/부족/과다",
    "titleOptimization": "우수/보통/미흡",
    "contentLength": "1800자",
    "readability": "우수/보통/미흡",
    "ctaPresence": "포함/미포함"
  },
  "aiToneReport": {
    "detectCount": 3,
    "fixes": ["변경1", "변경2"],
    "score": 92
  }
}`;

export async function runReviewer(
  input: ReviewInput,
  written: WrittenContent
): Promise<ReviewResult> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `## 원본 글
제목 후보: ${written.titles.join(" / ")}

본문:
${written.body}

해시태그: ${written.hashtags.join(", ")}

## 검수 기준
- 유형: ${input.reviewType}
- 필수 키워드: ${input.requiredKeywords}
- 필수 문구: ${input.requiredPhrases}
- 대상: ${input.subjectName} (${input.brandOrOwner})

위 글을 검수하고, AI 말투를 제거하고, SEO를 최적화해서 최종 결과물을 만들어주세요.`,
      },
    ],
    temperature: 0.3,
    max_tokens: 5000,
  });

  const text = res.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch {
    return {
      finalTitles: written.titles,
      finalBody: written.body,
      hashtags: written.hashtags,
      seoScore: 0,
      seoAnalysis: { keywordDensity: "분석 실패", titleOptimization: "", contentLength: "", readability: "", ctaPresence: "" },
      aiToneReport: { detectCount: 0, fixes: [], score: 0 },
    };
  }
}
