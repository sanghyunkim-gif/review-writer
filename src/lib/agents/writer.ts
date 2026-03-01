import OpenAI from "openai";
import type { ReviewInput, ReviewType, OrganizedData, ContentPlan, WrittenContent } from "../types";

function getSystemPrompt(reviewType: ReviewType): string {
  const base = `당신은 네이버 체험단 블로그 글 전문 작가입니다.

## 필수 규칙
1. **1500자 이상** 작성
2. **네이버 블로그 말투**: ~해요, ~거든요, ~죠, ~네요, ~더라고요
3. **1인칭 경험 공유** 스타일 (직접 체험한 것처럼)
4. **번역체/AI체 절대 금지**
   - 금지: "이 제품은 효율적인 성능을 제공합니다"
   - 권장: "써보니까 진짜 좋더라고요"
5. **필수 문구** 반드시 포함 (협찬 표시 등)
6. **리뷰어 미션** 항목이 있으면 각 항목을 본문에 반드시 자연스럽게 녹여서 포함
7. **[사진]** 마커를 지정된 위치에 삽입
7. 소제목은 ## 마크다운 사용

## 출력 (반드시 JSON)
{"titles":["제목1","제목2","제목3"], "body":"마크다운 본문", "hashtags":["태그1","태그2",...]}`;

  const styleGuides: Record<ReviewType, string> = {
    product: `## 유형별 표현
- "직접 써봤는데", "사용해보니까", "개봉해보면"
- 제품 스펙은 자연스럽게 녹여서 설명`,
    restaurant: `## 유형별 표현
- "직접 먹어봤는데", "방문해보니까", "가보면"
- "메뉴판을 보니", "한입 먹어보니까", "분위기가 ~해서"
- 위치/찾아가는 법은 도입부에서 자연스럽게 언급
- 메뉴 가격은 구체적으로 명시`,
    accommodation: `## 유형별 표현
- "직접 묵어봤는데", "숙박해보니까", "체크인하면"
- "방에 들어가보니", "시설을 이용해보니까", "주변을 둘러보면"
- 체크인/아웃 시간, 주차 정보 등 실용 정보 포함
- 객실 상태와 청결도 구체적으로 묘사`,
    service: `## 유형별 표현
- "직접 써봤는데", "사용해보니까", "가입해보면"
- "앱을 열어보면", "기능을 써보니까", "요금제를 비교해보면"
- 가입/시작 방법을 단계별로 설명
- 무료/유료 차이점 명확히 구분`,
  };

  return `${base}\n\n${styleGuides[reviewType]}`;
}

const SUBJECT_LABELS: Record<ReviewType, string> = {
  product: "제품",
  restaurant: "매장",
  accommodation: "숙소",
  service: "서비스",
};

export async function runWriter(
  input: ReviewInput,
  organized: OrganizedData,
  plan: ContentPlan
): Promise<WrittenContent> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const toneMap = { friendly: "친근하고 편한", professional: "전문적이지만 읽기 쉬운", humorous: "유머러스하고 재밌는" };
  const label = SUBJECT_LABELS[input.reviewType];

  const typeFieldsStr = Object.entries(input.typeFields)
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: getSystemPrompt(input.reviewType) },
      {
        role: "user",
        content: `## ${label} 정보
- ${label}: ${input.subjectName}
- 브랜드/운영: ${input.brandOrOwner}
${typeFieldsStr ? `${typeFieldsStr}\n` : ""}
## 체험 내용
${input.experience}

## 장점
${input.pros}

## 단점
${input.cons}

## 필수 포함
- 키워드: ${input.requiredKeywords}
- 필수 문구: ${input.requiredPhrases}${input.mission ? `\n\n## 리뷰어 미션 (반드시 본문에 포함)\n${input.mission}` : ""}
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
    max_tokens: 2500,
  });

  const text = res.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch {
    return { titles: ["제목 생성 실패"], body: text, hashtags: [] };
  }
}
