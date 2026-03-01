export async function searchBrave(query: string): Promise<string> {
  const key = process.env.BRAVE_API_KEY;
  if (!key) return "(검색 API 키 미설정 - 제공된 정보로만 작성합니다)";

  try {
    const year = new Date().getFullYear();
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(
      `${query} ${year}`
    )}&count=8&search_lang=ko&country=KR&extra_snippets=true`;

    const res = await fetch(url, {
      headers: { "X-Subscription-Token": key, Accept: "application/json" },
    });
    if (!res.ok) return "(검색 실패)";

    const data = await res.json();
    const results = (data.web?.results || []).slice(0, 8);
    if (!results.length) return "(검색 결과 없음)";

    return results
      .map(
        (r: { title?: string; description?: string; extra_snippets?: string[] }, i: number) => {
          let text = `[${i + 1}] ${r.title || ""}\n${r.description || ""}`;
          if (r.extra_snippets?.length) text += `\n${r.extra_snippets.join(" ")}`;
          return text;
        }
      )
      .join("\n\n");
  } catch {
    return "(검색 중 오류)";
  }
}
