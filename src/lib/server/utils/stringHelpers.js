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

/**
 * Derives occupant_status from a membership status value.
 */
const MEMBERSHIP_TO_OCCUPANT_MAP = {
  "HO HVNA member": "Owner",
  "HO not HVNA member": "Owner",
  "HO NON HANJIN (Commercial)": "Owner",
  "HO NON HANJIN": "Owner",
  "RENTER": "Renter",
  "CARETAKER": "Care taker",
  "IN HOUSE": "In House",
  "SECURITY": "Security",
  "HVNA ABANDON": "Other",
  "SURRENDER": "Surrendered",
  "OTHER": "Other",
  "Other": "Other",
};

export function occupantStatusFromMembership(membershipStatus) {
  if (!membershipStatus || typeof membershipStatus !== "string") return "Other";
  const trimmed = membershipStatus.trim();
  return MEMBERSHIP_TO_OCCUPANT_MAP[trimmed] || "Other";
}
