import type { ReviewType, TypeFields } from "./types";
import { searchNaverBlog, searchNaverPlace } from "./search-naver";

export interface SearchResults {
  blogReviews: string;
  blogDetails: string;
  placeInfo: string;
}

export async function executeSearchStrategy(
  reviewType: ReviewType,
  subjectName: string,
  brandOrOwner: string,
  typeFields: TypeFields
): Promise<SearchResults> {
  const fullName = brandOrOwner ? `${brandOrOwner} ${subjectName}` : subjectName;
  const location = "location" in typeFields ? (typeFields.location || "") : "";

  let searches: [Promise<string>, Promise<string>, Promise<string>];

  switch (reviewType) {
    case "product":
      searches = [
        searchNaverBlog(`${fullName} 체험단 후기 리뷰`),
        searchNaverBlog(`${fullName} 솔직 사용기 블로그`),
        searchNaverBlog(`${subjectName} 장단점 추천`),
      ];
      break;

    case "restaurant":
      searches = [
        searchNaverBlog(`${fullName} 체험단 방문 후기`),
        searchNaverBlog(`${location ? location + " " : ""}${subjectName} 맛집 블로그 리뷰`),
        searchNaverPlace(location ? `${location} ${subjectName}` : subjectName),
      ];
      break;

    case "accommodation":
      searches = [
        searchNaverBlog(`${fullName} 체험단 숙박 후기`),
        searchNaverBlog(`${location ? location + " " : ""}${subjectName} 숙소 블로그 리뷰`),
        searchNaverPlace(location ? `${location} ${subjectName}` : subjectName),
      ];
      break;

    case "service":
      searches = [
        searchNaverBlog(`${fullName} 체험단 후기 리뷰`),
        searchNaverBlog(`${fullName} 솔직 사용 후기 블로그`),
        searchNaverBlog(`${subjectName} 장단점 비교`),
      ];
      break;
  }

  console.log(`[검색전략] ${reviewType} 유형 - 기존 블로그 리뷰 3개 병렬 검색`);
  const [blogReviews, blogDetails, placeInfo] = await Promise.all(searches);
  console.log(`[검색전략] 검색 완료`);

  return { blogReviews, blogDetails, placeInfo };
}
