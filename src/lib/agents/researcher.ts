import OpenAI from "openai";
import { executeSearchStrategy } from "../search-strategy";
import type { ReviewInput, ReviewType, ResearchResult } from "../types";

function getSystemPrompt(reviewType: ReviewType): string {
  const base = `당신은 체험단 리뷰 블로그 글 작성을 위한 리서치 전문가입니다.

## 핵심 임무
네이버에서 검색한 **동일한 대상에 대한 기존 블로그 리뷰 글들**을 분석하여,
새로운 체험단 리뷰 글 작성에 필요한 참고 정보를 추출하세요.

## 분석 방법
1. 기존 블로그 글들이 공통적으로 언급하는 핵심 정보를 파악
2. 블로거들이 자주 사용하는 표현, 구성, 소제목 패턴을 정리
3. 긍정적/부정적 의견의 공통 포인트를 요약
4. 기존 글에서 빠지지 않는 필수 언급 사항을 정리

반드시 JSON으로 출력:
{
  "subjectInfo": "기존 블로그들이 공통으로 소개하는 기본 정보 요약",
  "details": "블로그들에서 반복 언급되는 상세 특징/스펙/메뉴/시설 등",
  "reviews": "블로거들의 공통 의견 요약 (긍정/부정 모두 포함, 자주 쓰는 표현 예시 포함)",
  "competitors": "비교 대상이나 대안으로 언급되는 것들",
  "rawSearch": "검색 원문 요약"
}`;

  const typeInstructions: Record<ReviewType, string> = {
    product: `## 제품 리뷰 블로그 분석 포인트
- 블로거들이 공통으로 언급하는 제품 특징, 사용감
- 자주 등장하는 before/after, 사용 기간별 변화
- 가격 대비 만족도에 대한 공통 의견
- 블로거들이 사진으로 많이 찍는 포인트 (패키지, 텍스처, 결과 등)`,
    restaurant: `## 맛집 리뷰 블로그 분석 포인트
- 블로거들이 공통으로 추천하는 메뉴
- 맛 표현 (매운 정도, 양, 가성비 등)에 대한 공통 의견
- 매장 분위기, 주차, 웨이팅에 대한 정보
- 블로거들이 자주 찍는 사진 구도 (외관, 메뉴판, 음식 클로즈업 등)`,
    accommodation: `## 숙박 리뷰 블로그 분석 포인트
- 블로거들이 공통으로 언급하는 객실 상태, 뷰
- 부대시설 (조식, 수영장, 라운지 등) 이용 후기 공통점
- 체크인/아웃, 주차, 접근성 정보
- 블로거들이 자주 찍는 사진 포인트 (로비, 객실뷰, 시설 등)`,
    service: `## 서비스 리뷰 블로그 분석 포인트
- 블로거들이 공통으로 소개하는 핵심 기능
- 가입/시작 과정에 대한 설명 패턴
- 무료/유료 차이에 대한 공통 의견
- 경쟁 서비스와의 비교 포인트`,
  };

  return `${base}\n\n${typeInstructions[reviewType]}`;
}

const SUBJECT_LABELS: Record<ReviewType, string> = {
  product: "제품",
  restaurant: "매장",
  accommodation: "숙소",
  service: "서비스",
};

export async function runResearcher(input: ReviewInput): Promise<ResearchResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY가 설정되지 않았습니다");

  const openai = new OpenAI({ apiKey, timeout: 55000 });
  const label = SUBJECT_LABELS[input.reviewType];

  console.log(`[리서처] ${input.reviewType} 유형 - 기존 블로그 리뷰 검색 시작...`);
  const searchResults = await executeSearchStrategy(
    input.reviewType,
    input.subjectName,
    input.brandOrOwner,
    input.typeFields
  );
  console.log("[리서처] 검색 완료");

  const combined = `[기존 블로그 리뷰 검색 1]\n${searchResults.blogReviews}\n\n---\n\n[기존 블로그 리뷰 검색 2]\n${searchResults.blogDetails}\n\n---\n\n[장소/추가 정보]\n${searchResults.placeInfo}`;

  const typeFieldsStr = Object.entries(input.typeFields)
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");

  console.log("[리서처] 기존 블로그 리뷰 분석 시작...");
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: getSystemPrompt(input.reviewType) },
      {
        role: "user",
        content: `${label}: ${input.subjectName}
브랜드/운영: ${input.brandOrOwner}
${typeFieldsStr ? `추가 정보:\n${typeFieldsStr}\n` : ""}
아래는 네이버에서 "${input.subjectName}"에 대해 검색한 기존 블로그 리뷰 글들입니다.
이 글들을 분석해서 새로운 체험단 리뷰 글 작성에 활용할 참고 정보를 추출해주세요.

${combined}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 2500,
  });
  console.log("[리서처] 블로그 리뷰 분석 완료");

  const text = res.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
  } catch {
    console.warn("[리서처] JSON 파싱 실패, 평문으로 반환");
    return { subjectInfo: text, details: "", reviews: "", competitors: "", rawSearch: combined };
  }
}
