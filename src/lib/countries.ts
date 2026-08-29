import type { Locale } from "./i18n";

export type Country = {
  code: string;
  nameFr: string;
  nameEs: string;
  horsUE: boolean;
};

const EU = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
]);

const NAMES: { code: string; nameFr: string; nameEs: string }[] = [
  { code: "US", nameFr: "États-Unis", nameEs: "Estados Unidos" },
  { code: "GB", nameFr: "Royaume-Uni", nameEs: "Reino Unido" },
  { code: "CH", nameFr: "Suisse", nameEs: "Suiza" },
  { code: "CA", nameFr: "Canada", nameEs: "Canadá" },
  { code: "AU", nameFr: "Australie", nameEs: "Australia" },
  { code: "AE", nameFr: "Émirats arabes unis", nameEs: "Emiratos Árabes Unidos" },
  { code: "SG", nameFr: "Singapour", nameEs: "Singapur" },
  { code: "JP", nameFr: "Japon", nameEs: "Japón" },
  { code: "KR", nameFr: "Corée du Sud", nameEs: "Corea del Sur" },
  { code: "MX", nameFr: "Mexique", nameEs: "México" },
  { code: "BR", nameFr: "Brésil", nameEs: "Brasil" },
  { code: "AR", nameFr: "Argentine", nameEs: "Argentina" },
  { code: "CL", nameFr: "Chili", nameEs: "Chile" },
  { code: "CO", nameFr: "Colombie", nameEs: "Colombia" },
  { code: "IN", nameFr: "Inde", nameEs: "India" },
  { code: "IL", nameFr: "Israël", nameEs: "Israel" },
  { code: "NO", nameFr: "Norvège", nameEs: "Noruega" },
  { code: "IS", nameFr: "Islande", nameEs: "Islandia" },
  { code: "LI", nameFr: "Liechtenstein", nameEs: "Liechtenstein" },
  { code: "NZ", nameFr: "Nouvelle-Zélande", nameEs: "Nueva Zelanda" },
  { code: "ZA", nameFr: "Afrique du Sud", nameEs: "Sudáfrica" },
  { code: "NG", nameFr: "Nigeria", nameEs: "Nigeria" },
  { code: "HK", nameFr: "Hong Kong", nameEs: "Hong Kong" },
  { code: "TW", nameFr: "Taïwan", nameEs: "Taiwán" },
  { code: "TH", nameFr: "Thaïlande", nameEs: "Tailandia" },
  { code: "ID", nameFr: "Indonésie", nameEs: "Indonesia" },
  { code: "MY", nameFr: "Malaisie", nameEs: "Malasia" },
  { code: "PH", nameFr: "Philippines", nameEs: "Filipinas" },
  { code: "SA", nameFr: "Arabie saoudite", nameEs: "Arabia Saudí" },
  { code: "QA", nameFr: "Qatar", nameEs: "Catar" },
  { code: "TR", nameFr: "Turquie", nameEs: "Turquía" },
  { code: "UA", nameFr: "Ukraine", nameEs: "Ucrania" },
  { code: "DE", nameFr: "Allemagne", nameEs: "Alemania" },
  { code: "FR", nameFr: "France", nameEs: "Francia" },
  { code: "IT", nameFr: "Italie", nameEs: "Italia" },
  { code: "NL", nameFr: "Pays-Bas", nameEs: "Países Bajos" },
  { code: "BE", nameFr: "Belgique", nameEs: "Bélgica" },
  { code: "PT", nameFr: "Portugal", nameEs: "Portugal" },
  { code: "IE", nameFr: "Irlande", nameEs: "Irlanda" },
  { code: "AT", nameFr: "Autriche", nameEs: "Austria" },
  { code: "SE", nameFr: "Suède", nameEs: "Suecia" },
  { code: "PL", nameFr: "Pologne", nameEs: "Polonia" },
  { code: "ES", nameFr: "Espagne", nameEs: "España" },
];

export const COUNTRIES: Country[] = NAMES.map((c) => ({
  ...c,
  horsUE: !EU.has(c.code),
}));

export function countryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export function countryName(codeOrCountry: string | Country | undefined, locale: Locale): string {
  const c = typeof codeOrCountry === "string" ? countryByCode(codeOrCountry) : codeOrCountry;
  if (!c) return typeof codeOrCountry === "string" ? codeOrCountry : "";
  return locale === "fr" ? c.nameFr : c.nameEs;
}

export const DEFAULT_CLIENT_COUNTRY = "US";
