export type Country = {
  code: string;
  name: string;
  horsUE: boolean;
};

const EU = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
]);

const NAMES: { code: string; name: string }[] = [
  { code: "US", name: "États-Unis" },
  { code: "GB", name: "Royaume-Uni" },
  { code: "CH", name: "Suisse" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australie" },
  { code: "AE", name: "Émirats arabes unis" },
  { code: "SG", name: "Singapour" },
  { code: "JP", name: "Japon" },
  { code: "KR", name: "Corée du Sud" },
  { code: "MX", name: "Mexique" },
  { code: "BR", name: "Brésil" },
  { code: "AR", name: "Argentine" },
  { code: "CL", name: "Chili" },
  { code: "CO", name: "Colombie" },
  { code: "IN", name: "Inde" },
  { code: "IL", name: "Israël" },
  { code: "NO", name: "Norvège" },
  { code: "IS", name: "Islande" },
  { code: "LI", name: "Liechtenstein" },
  { code: "NZ", name: "Nouvelle-Zélande" },
  { code: "ZA", name: "Afrique du Sud" },
  { code: "NG", name: "Nigeria" },
  { code: "HK", name: "Hong Kong" },
  { code: "TW", name: "Taïwan" },
  { code: "TH", name: "Thaïlande" },
  { code: "ID", name: "Indonésie" },
  { code: "MY", name: "Malaisie" },
  { code: "PH", name: "Philippines" },
  { code: "SA", name: "Arabie saoudite" },
  { code: "QA", name: "Qatar" },
  { code: "TR", name: "Turquie" },
  { code: "UA", name: "Ukraine" },
  { code: "DE", name: "Allemagne" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italie" },
  { code: "NL", name: "Pays-Bas" },
  { code: "BE", name: "Belgique" },
  { code: "PT", name: "Portugal" },
  { code: "IE", name: "Irlande" },
  { code: "AT", name: "Autriche" },
  { code: "SE", name: "Suède" },
  { code: "PL", name: "Pologne" },
  { code: "ES", name: "Espagne" },
];

export const COUNTRIES: Country[] = NAMES.map((c) => ({
  ...c,
  horsUE: !EU.has(c.code),
}));

export function countryByCode(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export const DEFAULT_CLIENT_COUNTRY = "US";
