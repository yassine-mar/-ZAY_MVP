/**
 * Curated list of Moroccan cities for the Checkout address picker.
 * Sorted by population — the user is much more likely to be in the first
 * five than the last five, and an ordered list reduces scroll friction.
 */
export const MOROCCAN_CITIES = [
  'Casablanca',
  'Rabat',
  'Marrakech',
  'Fes',
  'Tangier',
  'Agadir',
  'Meknes',
  'Oujda',
  'Kenitra',
  'Tetouan',
  'Sale',
  'Nador',
  'Mohammedia',
  'El Jadida',
  'Beni Mellal',
  'Khouribga',
  'Settat',
  'Larache',
  'Ksar el-Kebir',
  'Khemisset',
] as const;

export type MoroccanCity = (typeof MOROCCAN_CITIES)[number];
