/**
 * Utility functions for data cleaning and string normalization.
 */

/**
 * Trims leading/trailing whitespace, replaces multiple spaces with a single space,
 * and formats words in Title/Proper Casing.
 * Example: "  jUAN   dela   CRUZ  " -> "Juan Dela Cruz"
 */
export function cleanAndProperCase(str) {
  if (!str || typeof str !== "string") return "";
  
  // Normalize whitespace
  const normalized = str.trim().replace(/\s+/g, " ");
  if (!normalized) return "";

  // Title case each word, respecting hyphenated names (e.g., "Mary-Jane")
  return normalized
    .split(" ")
    .map((word) => {
      return word
        .split("-")
        .map((subWord) => {
          if (!subWord) return "";
          return subWord.charAt(0).toUpperCase() + subWord.slice(1).toLowerCase();
        })
        .join("-");
    })
    .join(" ");
}

/**
 * Normalizes a string for strict matching by stripping all spaces, special characters,
 * and converting to lower case.
 * Example: "  Juan  Dela Cruz Jr. " -> "juandelacruzjr"
 */
export function cleanNameForMatching(str) {
  if (!str || typeof str !== "string") return "";
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * List of standard membership status options.
 */
export const MEMBERSHIP_STATUS_OPTIONS = [
  "HO HVNA member",
  "HO not HVNA member",
  "HO NON HANJIN (Commercial)",
  "RENTER",
  "CARETAKER",
  "IN HOUSE",
  "SECURITY",
  "HVNA ABANDON",
  "SURRENDER",
  "OTHER"
];
