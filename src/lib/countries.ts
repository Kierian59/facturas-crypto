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
  { code: "BG", nameFr: "Bulgarie", nameEs: "Bulgaria" },
  { code: "HR", nameFr: "Croatie", nameEs: "Croacia" },
  { code: "CY", nameFr: "Chypre", nameEs: "Chipre" },
  { code: "CZ", nameFr: "Tchéquie", nameEs: "Chequia" },
  { code: "DK", nameFr: "Danemark", nameEs: "Dinamarca" },
  { code: "EE", nameFr: "Estonie", nameEs: "Estonia" },
  { code: "FI", nameFr: "Finlande", nameEs: "Finlandia" },
  { code: "GR", nameFr: "Grèce", nameEs: "Grecia" },
  { code: "HU", nameFr: "Hongrie", nameEs: "Hungría" },
  { code: "LV", nameFr: "Lettonie", nameEs: "Letonia" },
  { code: "LT", nameFr: "Lituanie", nameEs: "Lituania" },
  { code: "LU", nameFr: "Luxembourg", nameEs: "Luxemburgo" },
  { code: "MT", nameFr: "Malte", nameEs: "Malta" },
  { code: "RO", nameFr: "Roumanie", nameEs: "Rumanía" },
  { code: "SK", nameFr: "Slovaquie", nameEs: "Eslovaquia" },
  { code: "SI", nameFr: "Slovénie", nameEs: "Eslovenia" },
];

/** Variantes courantes (EN, abréviations, sans accents) → code ISO. */
const ALIASES: Record<string, string> = {
  usa: "US", "u.s.a.": "US", "u.s.": "US", "united states": "US", "united states of america": "US",
  "etats unis": "US", eeuu: "US", "ee.uu.": "US", "ee. uu.": "US", "estados unidos de america": "US",
  uk: "GB", "u.k.": "GB", "united kingdom": "GB", "great britain": "GB", "grande bretagne": "GB",
  "gran bretana": "GB", england: "GB", angleterre: "GB", inglaterra: "GB", scotland: "GB", ecosse: "GB",
  escocia: "GB", wales: "GB",
  switzerland: "CH", schweiz: "CH", uae: "AE", eau: "AE", dubai: "AE", "emirats arabes unis": "AE",
  japan: "JP", "south korea": "KR", korea: "KR", coree: "KR", mexico: "MX", brazil: "BR",
  argentina: "AR", chile: "CL", colombia: "CO", india: "IN", norway: "NO", iceland: "IS",
  "new zealand": "NZ", "south africa": "ZA", "hong kong": "HK", taiwan: "TW", thailand: "TH",
  singapore: "SG", australia: "AU", canada: "CA", israel: "IL", turkey: "TR", turkiye: "TR",
  ukraine: "UA", "saudi arabia": "SA", qatar: "QA", malaysia: "MY", philippines: "PH", indonesia: "ID",
  germany: "DE", deutschland: "DE", france: "FR", italy: "IT", italia: "IT", netherlands: "NL",
  holland: "NL", hollande: "NL", holanda: "NL", nederland: "NL", belgium: "BE", portugal: "PT",
  ireland: "IE", austria: "AT", osterreich: "AT", sweden: "SE", poland: "PL", polska: "PL",
  spain: "ES", espana: "ES", bulgaria: "BG", croatia: "HR", cyprus: "CY", "czech republic": "CZ",
  czechia: "CZ", "republique tcheque": "CZ", "republica checa": "CZ", denmark: "DK", estonia: "EE",
  finland: "FI", greece: "GR", hungary: "HU", latvia: "LV", lithuania: "LT", luxembourg: "LU",
  malta: "MT", romania: "RO", slovakia: "SK", slovenia: "SI",
};

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

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Pays saisi librement → pays connu (code ISO, nom FR/ES ou variante courante).
 * Retourne undefined si le texte n'est pas reconnu (le client est alors traité hors UE par défaut).
 */
export function resolveCountry(text: string): Country | undefined {
  const raw = text.trim();
  if (!raw) return undefined;
  if (/^[A-Za-z]{2}$/.test(raw)) {
    const byCode = countryByCode(raw.toUpperCase());
    if (byCode) return byCode;
  }
  const n = norm(raw);
  const byName = COUNTRIES.find((c) => norm(c.nameFr) === n || norm(c.nameEs) === n);
  if (byName) return byName;
  const alias = ALIASES[n];
  return alias ? countryByCode(alias) : undefined;
}

/**
 * Libellé d'affichage du pays d'un client : le texte saisi tel quel ; pour les anciennes données
 * sans texte (code ISO seul), le nom est retrouvé via le code.
 */
export function clientCountryLabel(
  client: { country?: string; countryCode?: string } | null | undefined,
  locale: Locale,
): string {
  if (!client) return "";
  const typed = (client.country ?? "").trim();
  if (typed) return typed;
  return client.countryCode ? countryName(client.countryCode, locale) : "";
}

/**
 * Libellé du pays pour la factura (PDF en espagnol) : nom officiel espagnol si le pays est reconnu,
 * sinon le texte saisi.
 */
export function clientCountryEs(client: { country?: string; countryCode?: string } | null | undefined): string {
  if (!client) return "";
  const known =
    (client.countryCode ? countryByCode(client.countryCode) : undefined) ?? resolveCountry(client.country ?? "");
  return known ? known.nameEs : clientCountryLabel(client, "es");
}
