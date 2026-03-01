import OpenAI from "openai";
import type { ReviewInput, OrganizedData, ContentPlan, WrittenContent } from "../types";

const SYSTEM = `당신은 네이버 체험단 블로그 글 전문 작가입니다.

## 필수 규칙
1. **1500자 이상** 작성
2. **네이버 블로그 말투**: ~해요, ~거든요, ~죠, ~네요, ~더라고요
3. **1인칭 경험 공유** 스타일 (직접 써본 것처럼)
4. **번역체/AI체 절대 금지**
   - ❌ "이 제품은 효율적인 성능을 제공합니다"
   - ✅ "써보니까 진짜 좋더라고요"
5. **필수 문구** 반드시 포함 (협찬 표시 등)
6. **[📸 사진]** 마커를 지정된 위치에 삽입
7. 소제목은 ## 마크다운 사용

## 출력 (반드시 JSON)
{"titles":["제목1","제목2","제목3"], "body":"마크다운 본문", "hashtags":["태그1","태그2",...]}`;

export async function runWriter(
  input: ReviewInput,
  organized: OrganizedData,
  plan: ContentPlan
): Promise<WrittenContent> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const toneMap = { friendly: "친근하고 편한", professional: "전문적이지만 읽기 쉬운", humorous: "유머러스하고 재밌는" };

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM },
      {
        role: "user",
        content: `## 제품 정보
- 제품: ${input.productName}
- 브랜드: ${input.brandName}
- 카테고리: ${input.category}

## 체험 내용
${input.experience}

## 장점
${input.pros}

## 단점
${input.cons}

## 필수 포함
- 키워드: ${input.requiredKeywords}
- 필수 문구: ${input.requiredPhrases}
- 톤: ${toneMap[input.tone]}
- 사진 ${input.photoCount}장 (위치: 섹션 ${plan.photoPositions.join(", ")} 뒤)

## 글 구조
${plan.outline.join("\n")}

## 활용 데이터
- 셀링포인트: ${organized.sellingPoints.join(", ")}
- 사실: ${organized.facts.join(", ")}
- 의견: ${organized.opinions.join(", ")}

## 키워드 전략
${plan.keywordStrategy}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 4000,
  });

  const text = res.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch {
    return { titles: ["제목 생성 실패"], body: text, hashtags: [] };
  }
}
