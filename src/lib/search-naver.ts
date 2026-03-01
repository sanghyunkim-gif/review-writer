function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "").replace(/&[a-z]+;/gi, " ").trim();
}

export async function searchNaverBlog(query: string): Promise<string> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn("[네이버블로그] API 키 미설정");
    return "(네이버 블로그 검색 API 키 미설정)";
  }

  try {
    const url = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(query)}&display=8&sort=sim`;
    console.log(`[네이버블로그] 쿼리: "${query}"`);

    const res = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`[네이버블로그] API 응답 실패: ${res.status}`);
      return "(네이버 블로그 검색 실패)";
    }

    const data = await res.json();
    const items = (data.items || []).slice(0, 8);
    if (!items.length) {
      console.warn("[네이버블로그] 결과 없음");
      return "(네이버 블로그 검색 결과 없음)";
    }

    console.log(`[네이버블로그] ${items.length}개 결과 수신`);
    return items
      .map((item: { title?: string; description?: string }, i: number) =>
        `[${i + 1}] ${stripHtml(item.title || "")}\n${stripHtml(item.description || "")}`
      )
      .join("\n\n");
  } catch (err) {
    console.error("[네이버블로그] 오류:", err instanceof Error ? err.message : err);
    return "(네이버 블로그 검색 중 오류)";
  }
}

export async function searchNaverPlace(query: string): Promise<string> {
  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.warn("[네이버장소] API 키 미설정");
    return "(네이버 장소 검색 API 키 미설정)";
  }

  try {
    const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&sort=comment`;
    console.log(`[네이버장소] 쿼리: "${query}"`);

    const res = await fetch(url, {
      headers: {
        "X-Naver-Client-Id": clientId,
        "X-Naver-Client-Secret": clientSecret,
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`[네이버장소] API 응답 실패: ${res.status}`);
      return "(네이버 장소 검색 실패)";
    }

    const data = await res.json();
    const items = (data.items || []).slice(0, 5);
    if (!items.length) {
      console.warn("[네이버장소] 결과 없음");
      return "(네이버 장소 검색 결과 없음)";
    }

    console.log(`[네이버장소] ${items.length}개 결과 수신`);
    return items
      .map(
        (item: { title?: string; category?: string; address?: string; roadAddress?: string; telephone?: string }, i: number) =>
          `[${i + 1}] ${stripHtml(item.title || "")}\n카테고리: ${item.category || ""}\n주소: ${item.roadAddress || item.address || ""}\n전화: ${item.telephone || ""}`
      )
      .join("\n\n");
  } catch (err) {
    console.error("[네이버장소] 오류:", err instanceof Error ? err.message : err);
    return "(네이버 장소 검색 중 오류)";
  }
}
