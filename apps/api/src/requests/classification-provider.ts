export const CLASSIFICATION_CATEGORIES = ['support', 'sales', 'billing', 'unknown'] as const;

export type ClassificationCategory = (typeof CLASSIFICATION_CATEGORIES)[number];

export type ClassificationResult = {
  category: ClassificationCategory;
  confidence: number;
};

/**
 * Seam for swapping classifiers (keyword rules today, an LLM later). Async so
 * a network-backed implementation fits without changing callers.
 */
export interface ClassificationProvider {
  /** Stable identifier persisted with each classification, e.g. "keyword-v1". */
  readonly name: string;
  classify(message: string): Promise<ClassificationResult>;
}

export const CLASSIFICATION_PROVIDER = Symbol('CLASSIFICATION_PROVIDER');
