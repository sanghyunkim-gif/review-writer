"use client";

import { useState } from "react";
import type { ReviewResult, PipelineStage } from "@/lib/types";

const CATEGORIES = ["식품", "화장품", "육아", "가전", "생활용품", "패션", "기타"];
const TONES = [
  { value: "friendly", label: "😊 친근한" },
  { value: "professional", label: "📋 전문적인" },
  { value: "humorous", label: "😄 유머러스" },
] as const;

const STAGE_NAMES = ["🔍 리서처", "📋 정리자", "🎯 기획자", "✍️ 작성자", "✨ 검수자"];

export default function Home() {
  const [form, setForm] = useState({
    productName: "",
    brandName: "",
    category: "식품",
    experience: "",
    pros: "",
    cons: "",
    requiredKeywords: "",
    requiredPhrases: "",
    tone: "friendly" as "friendly" | "professional" | "humorous",
    photoCount: 5,
  });

  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const updateField = (field: string, value: string | number) =>
    setForm((p) => ({ ...p, [field]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setCopied(false);
    setStages(STAGE_NAMES.map((name, i) => ({ stage: i + 1, name, status: "pending" })));

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
                prev.map((s) => (s.status === "running" ? { ...s, status: "error" } : s))
              );
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

  async function copyToClipboard() {
    if (!result) return;
    const text = `${result.finalTitles[0]}\n\n${result.finalBody}\n\n${result.hashtags.map((t) => `#${t}`).join(" ")}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-center mb-2">✍️ 체험단 리뷰 작성기</h1>
      <p className="text-center text-gray-500 dark:text-gray-400 mb-6 text-sm">
        5단계 AI 파이프라인이 자연스러운 체험 리뷰를 작성합니다
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">제품명 *</label>
            <input
              required
              value={form.productName}
              onChange={(e) => updateField("productName", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              placeholder="예: 비타민C 세럼"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">브랜드명 *</label>
            <input
              required
              value={form.brandName}
              onChange={(e) => updateField("brandName", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              placeholder="예: 닥터자르트"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">카테고리</label>
            <select
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 dark:bg-gray-900 text-sm"
            >
              {CATEGORIES.map((c) => (
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
              className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 dark:bg-gray-900 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">체험 내용 / 사용 후기</label>
          <textarea
            value={form.experience}
            onChange={(e) => updateField("experience", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 dark:bg-gray-900 text-sm resize-none"
            placeholder="직접 사용해본 경험을 자유롭게 적어주세요"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">장점</label>
            <textarea
              value={form.pros}
              onChange={(e) => updateField("pros", e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 dark:bg-gray-900 text-sm resize-none"
              placeholder="좋았던 점"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">단점</label>
            <textarea
              value={form.cons}
              onChange={(e) => updateField("cons", e.target.value)}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 dark:bg-gray-900 text-sm resize-none"
              placeholder="아쉬웠던 점"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">필수 키워드 / 해시태그</label>
          <input
            value={form.requiredKeywords}
            onChange={(e) => updateField("requiredKeywords", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 dark:bg-gray-900 text-sm"
            placeholder="쉼표로 구분 (예: 비타민C, 피부관리, 세럼추천)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">필수 포함 문구</label>
          <input
            value={form.requiredPhrases}
            onChange={(e) => updateField("requiredPhrases", e.target.value)}
            className="w-full px-3 py-2 rounded-lg border dark:border-gray-700 dark:bg-gray-900 text-sm"
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
          {loading ? "AI가 열심히 작성 중..." : "🚀 리뷰 글 생성하기"}
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
            <h2 className="font-bold mb-2">📌 제목 후보</h2>
            {result.finalTitles.map((t, i) => (
              <p key={i} className="text-sm py-1">
                {i + 1}. {t}
              </p>
            ))}
          </div>

          <div className="p-4 rounded-lg border dark:border-gray-800 dark:bg-gray-900">
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-bold">📝 본문</h2>
              <button
                onClick={copyToClipboard}
                className="text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white"
              >
                {copied ? "✓ 복사됨!" : "📋 복사"}
              </button>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
              {result.finalBody}
            </div>
          </div>

          <div className="p-4 rounded-lg border dark:border-gray-800 dark:bg-gray-900">
            <h2 className="font-bold mb-2">🏷️ 해시태그</h2>
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
              <h2 className="font-bold mb-2">📊 SEO 점수</h2>
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
              <h2 className="font-bold mb-2">🤖 AI톤 제거</h2>
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
