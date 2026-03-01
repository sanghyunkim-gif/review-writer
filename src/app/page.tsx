"use client";

import { useState } from "react";
import type { ReviewType, ReviewResult, PipelineStage } from "@/lib/types";

const REVIEW_TYPES: { value: ReviewType; label: string; icon: string; desc: string }[] = [
  { value: "product", label: "제품", icon: "📦", desc: "화장품, 가전, 식품 등" },
  { value: "restaurant", label: "맛집", icon: "🍽️", desc: "음식점, 카페, 베이커리 등" },
  { value: "accommodation", label: "숙박", icon: "🏨", desc: "호텔, 리조트, 펜션 등" },
  { value: "service", label: "서비스", icon: "💡", desc: "앱, 플랫폼, 구독 등" },
];

const CATEGORIES: Record<ReviewType, string[]> = {
  product: ["식품", "화장품", "육아", "가전", "생활용품", "패션", "기타"],
  restaurant: ["한식", "중식", "일식", "양식", "카페", "분식", "기타"],
  accommodation: ["호텔", "리조트", "펜션", "모텔", "게스트하우스", "기타"],
  service: ["앱/플랫폼", "구독서비스", "교육", "금융", "건강/운동", "기타"],
};

const TONES = [
  { value: "friendly", label: "친근한" },
  { value: "professional", label: "전문적인" },
  { value: "humorous", label: "유머러스" },
] as const;

const STAGE_NAMES = ["🔍 리서처", "📋 정리자", "🎯 기획자", "✍️ 작성자", "✨ 검수자"];

const SUBJECT_LABELS: Record<ReviewType, string> = {
  product: "제품명",
  restaurant: "매장명",
  accommodation: "숙소명",
  service: "서비스명",
};

const BRAND_LABELS: Record<ReviewType, string> = {
  product: "브랜드명",
  restaurant: "프랜차이즈/운영사",
  accommodation: "운영사/체인",
  service: "운영사/개발사",
};

const SUBJECT_PLACEHOLDERS: Record<ReviewType, string> = {
  product: "예: 비타민C 세럼",
  restaurant: "예: 을지로골목식당",
  accommodation: "예: 해비치 리조트",
  service: "예: 토스",
};

const BRAND_PLACEHOLDERS: Record<ReviewType, string> = {
  product: "예: 닥터자르트",
  restaurant: "예: 직영 / 프랜차이즈명",
  accommodation: "예: 해비치호텔앤드리조트",
  service: "예: 비바리퍼블리카",
};

export default function Home() {
  const [reviewType, setReviewType] = useState<ReviewType>("product");
  const [form, setForm] = useState({
    subjectName: "",
    brandOrOwner: "",
    experience: "",
    mission: "",
    pros: "",
    cons: "",
    requiredKeywords: "",
    requiredPhrases: "",
    tone: "friendly" as "friendly" | "professional" | "humorous",
    photoCount: 5,
  });
  const [typeFields, setTypeFields] = useState<Record<string, string>>({ category: "식품" });

  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const updateField = (field: string, value: string | number) =>
    setForm((p) => ({ ...p, [field]: value }));

  const updateTypeField = (field: string, value: string) =>
    setTypeFields((p) => ({ ...p, [field]: value }));

  function handleTypeChange(type: ReviewType) {
    setReviewType(type);
    setTypeFields({ category: CATEGORIES[type][0] });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setCopied(false);
    setStages(STAGE_NAMES.map((name, i) => ({ stage: i + 1, name, status: "pending" })));

    const payload = {
      reviewType,
      ...form,
      typeFields,
    };

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.status === "complete") {
              const final = JSON.parse(data.result);
              setResult(final);
              setStages((prev) => prev.map((s) => ({ ...s, status: "done" })));
            } else if (data.status === "error") {
              setStages((prev) =>
                prev.map((s) => {
                  if (s.stage === data.stage) return { ...s, status: "error" };
                  if (s.status === "running") return { ...s, status: "error" };
                  return s;
                })
              );
              setLoading(false);
            } else {
              setStages((prev) =>
                prev.map((s) =>
                  s.stage === data.stage ? { ...s, status: data.status as "running" | "done" } : s
                )
              );
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function markdownToNaverHtml(md: string): string {
    return md
      .split("\n\n")
      .map((block) => {
        const trimmed = block.trim();
        if (!trimmed) return "";
        // 소제목
        if (trimmed.startsWith("## ")) {
          const text = trimmed.replace(/^## /, "");
          return `<h3 style="font-size:18px;font-weight:bold;margin:28px 0 12px 0;color:#333;">${text}</h3>`;
        }
        // 사진 마커 ([사진: 캡션] 또는 [사진])
        const photoMatch = trimmed.match(/\[사진(?::?\s*(.+?))?\]/);
        if (photoMatch) {
          const caption = photoMatch[1] || "사진 삽입";
          return `<p style="text-align:center;margin:24px 0;"><br></p>\n<p style="text-align:center;margin:4px 0;color:#888;font-size:13px;font-style:italic;">${caption}</p>`;
        }
        // 일반 문단 (줄바꿈 보존)
        const html = trimmed
          .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
          .replace(/\n/g, "<br>");
        return `<p style="font-size:16px;line-height:1.8;margin:10px 0;color:#333;">${html}</p>`;
      })
      .filter(Boolean)
      .join("\n");
  }

  async function copyToClipboard() {
    if (!result) return;
    const text = `${result.finalTitles[0]}\n\n${result.finalBody}\n\n${result.hashtags.map((t) => `#${t}`).join(" ")}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function copyAsHtml() {
    if (!result) return;
    const title = `<h2 style="font-size:22px;font-weight:bold;margin-bottom:16px;color:#222;">${result.finalTitles[0]}</h2>`;
    const body = markdownToNaverHtml(result.finalBody);
    const tags = `<p style="margin-top:24px;font-size:14px;color:#3366cc;">${result.hashtags.map((t) => `#${t}`).join(" ")}</p>`;
    const html = `${title}\n${body}\n${tags}`;

    // 임시 요소를 만들어 rich text로 복사 (브라우저 호환성 최고)
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    tmp.style.position = "fixed";
    tmp.style.left = "-9999px";
    tmp.style.whiteSpace = "pre-wrap";
    document.body.appendChild(tmp);

    const range = document.createRange();
    range.selectNodeContents(tmp);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);

    document.execCommand("copy");

    sel?.removeAllRanges();
    document.body.removeChild(tmp);

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inputClass = "w-full px-3 py-2 rounded-lg border dark:border-gray-700 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none text-sm";

  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">체험단 리뷰 작성기</h1>
      <p className="text-center text-gray-500 dark:text-gray-400 mb-6 text-sm">
        5단계 AI 파이프라인이 자연스러운 체험 리뷰를 작성합니다
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 유형 선택 */}
        <div>
          <label className="block text-sm font-medium mb-2">리뷰 유형</label>
          <div className="grid grid-cols-4 gap-2">
            {REVIEW_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => handleTypeChange(t.value)}
                className={`p-3 rounded-lg border text-center transition ${
                  reviewType === t.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "dark:border-gray-700 dark:bg-gray-900 hover:border-blue-400"
                }`}
              >
                <div className="text-xl">{t.icon}</div>
                <div className="text-sm font-medium mt-1">{t.label}</div>
                <div className={`text-xs mt-0.5 ${reviewType === t.value ? "text-blue-100" : "text-gray-500"}`}>
                  {t.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 기본 정보 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">{SUBJECT_LABELS[reviewType]} *</label>
            <input
              required
              value={form.subjectName}
              onChange={(e) => updateField("subjectName", e.target.value)}
              className={inputClass}
              placeholder={SUBJECT_PLACEHOLDERS[reviewType]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{BRAND_LABELS[reviewType]} *</label>
            <input
              required
              value={form.brandOrOwner}
              onChange={(e) => updateField("brandOrOwner", e.target.value)}
              className={inputClass}
              placeholder={BRAND_PLACEHOLDERS[reviewType]}
            />
          </div>
        </div>

        {/* 카테고리 + 사진 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">카테고리</label>
            <select
              value={typeFields.category || ""}
              onChange={(e) => updateTypeField("category", e.target.value)}
              className={inputClass}
            >
              {CATEGORIES[reviewType].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">사진 매수</label>
            <input
              type="number"
              min={0}
              max={20}
              value={form.photoCount}
              onChange={(e) => updateField("photoCount", Number(e.target.value))}
              className={inputClass}
            />
          </div>
        </div>

        {/* 유형별 추가 필드 */}
        {(reviewType === "restaurant" || reviewType === "accommodation") && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">위치/지역</label>
              <input
                value={typeFields.location || ""}
                onChange={(e) => updateTypeField("location", e.target.value)}
                className={inputClass}
                placeholder={reviewType === "restaurant" ? "예: 강남역 3번출구" : "예: 제주 서귀포시"}
              />
            </div>
            {reviewType === "restaurant" ? (
              <div>
                <label className="block text-sm font-medium mb-1">추천 메뉴</label>
                <input
                  value={typeFields.menuHighlights || ""}
                  onChange={(e) => updateTypeField("menuHighlights", e.target.value)}
                  className={inputClass}
                  placeholder="예: 된장찌개, 제육볶음"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1">객실 타입</label>
                <input
                  value={typeFields.roomType || ""}
                  onChange={(e) => updateTypeField("roomType", e.target.value)}
                  className={inputClass}
                  placeholder="예: 디럭스 더블, 스위트"
                />
              </div>
            )}
          </div>
        )}

        {reviewType === "restaurant" && (
          <div>
            <label className="block text-sm font-medium mb-1">가격대</label>
            <input
              value={typeFields.priceRange || ""}
              onChange={(e) => updateTypeField("priceRange", e.target.value)}
              className={inputClass}
              placeholder="예: 1인 15,000~20,000원"
            />
          </div>
        )}

        {reviewType === "accommodation" && (
          <div>
            <label className="block text-sm font-medium mb-1">편의시설</label>
            <input
              value={typeFields.facilities || ""}
              onChange={(e) => updateTypeField("facilities", e.target.value)}
              className={inputClass}
              placeholder="예: 수영장, 조식뷔페, 피트니스"
            />
          </div>
        )}

        {reviewType === "service" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">서비스 유형</label>
              <input
                value={typeFields.serviceType || ""}
                onChange={(e) => updateTypeField("serviceType", e.target.value)}
                className={inputClass}
                placeholder="예: 간편송금, 가계부"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">요금제</label>
              <input
                value={typeFields.pricing || ""}
                onChange={(e) => updateTypeField("pricing", e.target.value)}
                className={inputClass}
                placeholder="예: 무료 / 프리미엄 월 9,900원"
              />
            </div>
          </div>
        )}

        {/* 체험 내용 */}
        <div>
          <label className="block text-sm font-medium mb-1">체험 내용 / 사용 후기</label>
          <textarea
            value={form.experience}
            onChange={(e) => updateField("experience", e.target.value)}
            rows={3}
            className={`${inputClass} resize-none`}
            placeholder="직접 체험해본 경험을 자유롭게 적어주세요"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">리뷰어 미션</label>
          <textarea
            value={form.mission}
            onChange={(e) => updateField("mission", e.target.value)}
            rows={2}
            className={`${inputClass} resize-none`}
            placeholder="예: 대표메뉴 2가지 이상 소개, 주차 정보 언급, 할인 쿠폰 코드 안내 포함"
          />
          <p className="text-xs text-gray-500 mt-1">체험단에서 요구하는 필수 포함 항목을 적어주세요</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">장점</label>
            <textarea
              value={form.pros}
              onChange={(e) => updateField("pros", e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder="좋았던 점"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">단점</label>
            <textarea
              value={form.cons}
              onChange={(e) => updateField("cons", e.target.value)}
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder="아쉬웠던 점"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">필수 키워드 / 해시태그</label>
          <input
            value={form.requiredKeywords}
            onChange={(e) => updateField("requiredKeywords", e.target.value)}
            className={inputClass}
            placeholder="쉼표로 구분 (예: 강남맛집, 점심추천, 한식당)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">필수 포함 문구</label>
          <input
            value={form.requiredPhrases}
            onChange={(e) => updateField("requiredPhrases", e.target.value)}
            className={inputClass}
            placeholder="예: 본 포스팅은 업체로부터 제품을 제공받아 작성하였습니다"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">글 톤</label>
          <div className="flex gap-2">
            {TONES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => updateField("tone", t.value)}
                className={`flex-1 py-2 rounded-lg text-sm border transition ${
                  form.tone === t.value
                    ? "bg-blue-600 text-white border-blue-600"
                    : "dark:border-gray-700 dark:bg-gray-900 hover:border-blue-400"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium transition"
        >
          {loading ? "AI가 열심히 작성 중..." : "리뷰 글 생성하기"}
        </button>
      </form>

      {/* Pipeline Progress */}
      {stages.length > 0 && (
        <div className="mt-6 p-4 rounded-lg border dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-sm font-medium mb-3">파이프라인 진행 상황</h2>
          <div className="space-y-2">
            {stages.map((s) => (
              <div key={s.stage} className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    s.status === "done"
                      ? "bg-green-600 text-white"
                      : s.status === "running"
                      ? "bg-blue-600 text-white animate-pulse"
                      : s.status === "error"
                      ? "bg-red-600 text-white"
                      : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {s.status === "done" ? "✓" : s.status === "running" ? "⟳" : s.stage}
                </div>
                <span className={`text-sm ${s.status === "running" ? "text-blue-400" : s.status === "done" ? "text-green-400" : "text-gray-500"}`}>
                  {s.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6 space-y-4">
          <div className="p-4 rounded-lg border dark:border-gray-800 dark:bg-gray-900">
            <h2 className="font-bold mb-2">제목 후보</h2>
            {result.finalTitles.map((t, i) => (
              <p key={i} className="text-sm py-1">
                {i + 1}. {t}
              </p>
            ))}
          </div>

          <div className="p-4 rounded-lg border dark:border-gray-800 dark:bg-gray-900">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-bold">본문</h2>
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="text-xs px-3 py-1 rounded bg-gray-600 hover:bg-gray-700 text-white"
                >
                  텍스트 복사
                </button>
                <button
                  onClick={copyAsHtml}
                  className="text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {copied ? "복사됨!" : "네이버 블로그 붙여넣기용 복사"}
                </button>
              </div>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
              {result.finalBody}
            </div>
          </div>

          <div className="p-4 rounded-lg border dark:border-gray-800 dark:bg-gray-900">
            <h2 className="font-bold mb-2">해시태그</h2>
            <div className="flex flex-wrap gap-1">
              {result.hashtags.map((t, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-full bg-blue-900/30 text-blue-400">
                  #{t}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-lg border dark:border-gray-800 dark:bg-gray-900">
              <h2 className="font-bold mb-2">SEO 점수</h2>
              <div className="text-3xl font-bold text-center text-blue-400">{result.seoScore}</div>
              <div className="mt-2 space-y-1 text-xs text-gray-400">
                <p>키워드 밀도: {result.seoAnalysis.keywordDensity}</p>
                <p>제목 최적화: {result.seoAnalysis.titleOptimization}</p>
                <p>글 길이: {result.seoAnalysis.contentLength}</p>
                <p>가독성: {result.seoAnalysis.readability}</p>
                <p>CTA: {result.seoAnalysis.ctaPresence}</p>
              </div>
            </div>

            <div className="p-4 rounded-lg border dark:border-gray-800 dark:bg-gray-900">
              <h2 className="font-bold mb-2">AI톤 제거</h2>
              <div className="text-3xl font-bold text-center text-green-400">{result.aiToneReport.score}점</div>
              <p className="text-xs text-gray-400 mt-2">
                {result.aiToneReport.detectCount}개 표현 수정
              </p>
              {result.aiToneReport.fixes.slice(0, 3).map((f, i) => (
                <p key={i} className="text-xs text-gray-500 mt-1">• {f}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
