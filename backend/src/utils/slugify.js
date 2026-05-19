'use strict';

/**
 * Convert a human-readable name into a URL-friendly slug.
 *
 * Rules:
 *   1. Lowercase
 *   2. Strip diacritics (é → e, à → a, ç → c) — crucial for French/Moroccan names
 *   3. Replace any run of non-alphanumeric chars with a single hyphen
 *   4. Trim leading/trailing hyphens
 *   5. Truncate to maxLength (default 100, matches DB column size)
 *
 * Examples:
 *   "Plats Chauds"          → "plats-chauds"
 *   "Pâtisserie Marocaine"  → "patisserie-marocaine"
 *   "Tajine & Couscous"     → "tajine-couscous"
 *   "   Soupes   "          → "soupes"
 *   ""                      → ""
 *   "!!!"                   → ""
 */
const slugify = (text, maxLength = 100) => {
  if (typeof text !== 'string') return '';

  return text
    .normalize('NFD')                        // decompose combined characters
    .replace(/[̀-ͯ]/g, '')          // strip diacritic marks
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')              // any non-alnum run → single hyphen
    .replace(/^-+|-+$/g, '')                  // trim leading/trailing hyphens
    .slice(0, maxLength);
};

module.exports = { slugify };
