export interface CountryCode {
  country: string;
  code: string;
  iso: string;
  flag: string;
  popular?: boolean;
}

export const COUNTRY_CODES: CountryCode[] = [
  { country: "United States", code: "1", iso: "US", flag: "\u{1F1FA}\u{1F1F8}", popular: true },
  { country: "United Kingdom", code: "44", iso: "GB", flag: "\u{1F1EC}\u{1F1E7}", popular: true },
  { country: "India", code: "91", iso: "IN", flag: "\u{1F1EE}\u{1F1F3}", popular: true },
  { country: "Canada", code: "1", iso: "CA", flag: "\u{1F1E8}\u{1F1E6}", popular: true },
  { country: "Australia", code: "61", iso: "AU", flag: "\u{1F1E6}\u{1F1FA}", popular: true },
  { country: "Germany", code: "49", iso: "DE", flag: "\u{1F1E9}\u{1F1EA}" },
  { country: "France", code: "33", iso: "FR", flag: "\u{1F1EB}\u{1F1F7}" },
  { country: "Japan", code: "81", iso: "JP", flag: "\u{1F1EF}\u{1F1F5}" },
  { country: "Brazil", code: "55", iso: "BR", flag: "\u{1F1E7}\u{1F1F7}" },
  { country: "Mexico", code: "52", iso: "MX", flag: "\u{1F1F2}\u{1F1FD}" },
  { country: "China", code: "86", iso: "CN", flag: "\u{1F1E8}\u{1F1F3}" },
  { country: "South Korea", code: "82", iso: "KR", flag: "\u{1F1F0}\u{1F1F7}" },
  { country: "Indonesia", code: "62", iso: "ID", flag: "\u{1F1EE}\u{1F1E9}" },
  { country: "Nigeria", code: "234", iso: "NG", flag: "\u{1F1F3}\u{1F1EC}" },
  { country: "Pakistan", code: "92", iso: "PK", flag: "\u{1F1F5}\u{1F1F0}" },
  { country: "Philippines", code: "63", iso: "PH", flag: "\u{1F1F5}\u{1F1ED}" },
  { country: "Singapore", code: "65", iso: "SG", flag: "\u{1F1F8}\u{1F1EC}" },
  { country: "United Arab Emirates", code: "971", iso: "AE", flag: "\u{1F1E6}\u{1F1EA}" },
  { country: "Saudi Arabia", code: "966", iso: "SA", flag: "\u{1F1F8}\u{1F1E6}" },
  { country: "South Africa", code: "27", iso: "ZA", flag: "\u{1F1FF}\u{1F1E6}" },
  { country: "Italy", code: "39", iso: "IT", flag: "\u{1F1EE}\u{1F1F9}" },
  { country: "Spain", code: "34", iso: "ES", flag: "\u{1F1EA}\u{1F1F8}" },
  { country: "Netherlands", code: "31", iso: "NL", flag: "\u{1F1F3}\u{1F1F1}" },
  { country: "Sweden", code: "46", iso: "SE", flag: "\u{1F1F8}\u{1F1EA}" },
  { country: "Turkey", code: "90", iso: "TR", flag: "\u{1F1F9}\u{1F1F7}" },
];

export function getPopularCountries(): CountryCode[] {
  return COUNTRY_CODES.filter((c) => c.popular);
}

export function getAllCountries(): CountryCode[] {
  return COUNTRY_CODES;
}
