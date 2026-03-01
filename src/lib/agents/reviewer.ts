import type { ReviewInput, WrittenContent, ReviewResult } from "../types";

const AI_PATTERNS = [
  "제공합니다", "가능합니다", "효율적인", "최적화된",
  "탁월한", "혁신적인", "획기적인", "인상적인",
  "~를 자랑합니다", "할 수 있습니다", "되어 있습니다",
];

export async function runReviewer(
  input: ReviewInput,
  written: WrittenContent
): Promise<ReviewResult> {
  const body = written.body || "";
  const keywords = input.requiredKeywords.split(",").map((k) => k.trim()).filter(Boolean);

  // AI 말투 탐지
  const detected = AI_PATTERNS.filter((p) => body.includes(p));

  // 키워드 밀도
  const keywordHits = keywords.filter((k) => body.includes(k));
  const keywordRatio = keywords.length > 0 ? keywordHits.length / keywords.length : 1;
  const keywordDensity = keywordRatio >= 0.8 ? "적정" : keywordRatio >= 0.5 ? "부족" : "과다";

  // 제목 키워드 포함
  const titleHasKeyword = keywords.some((k) =>
    written.titles.some((t) => t.includes(k))
  );

  // 글 길이
  const charCount = body.length;

  // 필수 문구 포함
  const hasRequiredPhrases = !input.requiredPhrases || body.includes(input.requiredPhrases);

  // 리뷰어 미션 체크
  const missionItems = input.mission ? input.mission.split(",").map((m) => m.trim()).filter(Boolean) : [];
  const missionHits = missionItems.filter((m) => {
    const words = m.split(" ").filter((w) => w.length > 1);
    return words.some((w) => body.includes(w));
  });

  // SEO 점수 계산
  let score = 50;
  if (charCount >= 1500) score += 15;
  else if (charCount >= 1000) score += 8;
  if (titleHasKeyword) score += 10;
  if (keywordRatio >= 0.8) score += 10;
  if (hasRequiredPhrases) score += 5;
  if (detected.length === 0) score += 10;
  else if (detected.length <= 2) score += 5;

  const aiScore = detected.length === 0 ? 100 : Math.max(60, 100 - detected.length * 10);

  return {
    finalTitles: written.titles,
    finalBody: body,
    hashtags: written.hashtags,
    seoScore: Math.min(score, 100),
    seoAnalysis: {
      keywordDensity,
      titleOptimization: titleHasKeyword ? "우수" : "미흡",
      contentLength: `${charCount}자`,
      readability: charCount >= 1500 ? "우수" : charCount >= 1000 ? "보통" : "미흡",
      ctaPresence: hasRequiredPhrases ? "포함" : "미포함",
    },
    aiToneReport: {
      detectCount: detected.length,
      fixes: detected.map((p) => `"${p}" 표현 감지됨`),
      score: aiScore,
    },
  };
}
