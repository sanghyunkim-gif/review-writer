export interface ReviewInput {
  productName: string;
  brandName: string;
  category: string;
  experience: string;
  pros: string;
  cons: string;
  requiredKeywords: string;
  requiredPhrases: string;
  tone: "friendly" | "professional" | "humorous";
  photoCount: number;
}

export interface ResearchResult {
  productInfo: string;
  specs: string;
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
