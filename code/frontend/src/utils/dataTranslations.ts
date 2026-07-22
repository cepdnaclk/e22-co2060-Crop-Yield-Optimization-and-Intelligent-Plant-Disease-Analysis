export type Language = "en" | "si";

export const seasonTranslations: Record<string, { en: string; si: string }> = {
  "Yala": {
    en: "Yala",
    si: "යල"
  },

  "Maha": {
    en: "Maha",
    si: "මහ"
  }
};

export const cropTranslations: Record<string, { en: string; si: string }> = {
  "Paddy": {
    en: "Paddy",
    si: "වී"
  },

  "Corn": {
    en: "Corn",
    si: "ඉරිඟු"
  },

  "Tomatoes": {
    en: "Tomatoes",
    si: "තක්කාලි"
  },

  "Onions": {
    en: "Onions",
    si: "ළූණු"
  },

  "Wheat": {
    en: "Wheat",
    si: "තිරිඟු"
  }
};

export const translateSeason = (
  season: string | undefined,
  language: string
): string => {

  if (!season) return "";

  const lang: Language = language.startsWith("si") ? "si" : "en";

  return seasonTranslations[season]?.[lang] || season;

};

export const translateCrop = (
  crop: string | undefined,
  language: string
): string => {

  if (!crop) return "";

  const lang: Language = language.startsWith("si") ? "si" : "en";

  return cropTranslations[crop]?.[lang] || crop;

};