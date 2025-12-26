

export interface RestorationOptions {
  model: string;
  colorize: boolean;
  highQuality: boolean;
  sharpenBackground: boolean;
  numPeople: string;
  gender: string;
  age: string;
  smile: string;
  isVietnamese: boolean;
  clothing: string;
  hairStyle: string;
  background: string;
  transformationIntensity: number;
  customRequest: string;
  numResults: string;
  advancedRestore: boolean;
  redrawHands: boolean;
  redrawHair: boolean;
  // Fix: Add missing mimicReference property.
  mimicReference: boolean;
}