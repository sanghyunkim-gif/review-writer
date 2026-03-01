export type ReviewType = "product" | "restaurant" | "accommodation" | "service";

export interface ProductFields {
  category: string;
  price?: string;
}

export interface RestaurantFields {
  category: string;
  location: string;
  menuHighlights?: string;
  priceRange?: string;
  visitTime?: string;
}

export interface AccommodationFields {
  category: string;
  location: string;
  roomType?: string;
  pricePerNight?: string;
  facilities?: string;
}

export interface ServiceFields {
  category: string;
  serviceType?: string;
  pricing?: string;
}

export type TypeFields = ProductFields | RestaurantFields | AccommodationFields | ServiceFields;

export interface ReviewInput {
  reviewType: ReviewType;
  subjectName: string;
  brandOrOwner: string;
  typeFields: TypeFields;
  experience: string;
  pros: string;
  cons: string;
  requiredKeywords: string;
  requiredPhrases: string;
  tone: "friendly" | "professional" | "humorous";
  photoCount: number;
}

export interface ResearchResult {
  subjectInfo: string;
  details: string;
  reviews: string;
  competitors: string;
  rawSearch: string;
}

export interface OrganizedData {
  sellingPoints: string[];
  facts: string[];
  opinions: string[];
  keyData: string;
}

export interface ContentPlan {
  outline: string[];
  photoPositions: number[];
  keywordStrategy: string;
  structure: string;
}

export interface WrittenContent {
  titles: string[];
  body: string;
  hashtags: string[];
}

export interface ReviewResult {
  finalTitles: string[];
  finalBody: string;
  hashtags: string[];
  seoScore: number;
  seoAnalysis: {
    keywordDensity: string;
    titleOptimization: string;
    contentLength: string;
    readability: string;
    ctaPresence: string;
  };
  aiToneReport: {
    detectCount: number;
    fixes: string[];
    score: number;
  };
}

export interface PipelineStage {
  stage: number;
  name: string;
  status: "pending" | "running" | "done" | "error";
  result?: string;
}
