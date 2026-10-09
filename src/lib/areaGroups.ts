export const AREA_GROUP_ORDER = [
  "Markets & Bazaars",
  "Colonies & Towns",
  "Villages",
  "Other",
] as const;

const MARKET_SLUGS = new Set([
  "anarkali-bazaar",
  "jinnah-market",
  "zia-market",
  "katchery-bazar",
  "gol-chowk-market",
  "nehar-bazaar",
  "mandi-bazaar",
  "qasim-bazaar",
  "kashmiri-bazaar",
  "chaki-bazaar",
  "ghallah-mandi",
]);

const TOWN_SLUGS = new Set([
  "babar-town",
  "canal-town",
  "model-city",
  "housing-colony-no-1",
  "housing-colony-no-2",
  "zam-zam",
  "bilal-town",
  "new-samundri",
  "sharifabad",
  "kehkeshan-colony",
  "ghausia-colony",
]);

export function getAreaGroup(slug: string): string {
  if (MARKET_SLUGS.has(slug)) return "Markets & Bazaars";
  if (TOWN_SLUGS.has(slug)) return "Colonies & Towns";
  if (slug === "khushpur" || slug.startsWith("chak-")) return "Villages";
  return "Other";
}

export type GroupableOption = { group?: string };

export type OptionGroup<T> = {
  group?: string;
  options: T[];
};

export function groupAreaOptions<T extends GroupableOption>(
  options: readonly T[],
): OptionGroup<T>[] {
  if (!options.some((option) => option.group)) {
    return [{ options: [...options] }];
  }

  const groupedOptions = new Map<string, T[]>();
  const ungroupedOptions: T[] = [];

  for (const option of options) {
    if (!option.group) {
      ungroupedOptions.push(option);
      continue;
    }

    const groupOptions = groupedOptions.get(option.group) ?? [];
    groupOptions.push(option);
    groupedOptions.set(option.group, groupOptions);
  }

  const extraGroups = [...groupedOptions.keys()].filter(
    (group) =>
      !AREA_GROUP_ORDER.includes(group as (typeof AREA_GROUP_ORDER)[number]),
  );
  const groupOrder = [
    ...AREA_GROUP_ORDER.filter((group) => groupedOptions.has(group)),
    ...extraGroups,
  ];

  return [
    ...groupOrder.map((group) => ({
      group,
      options: groupedOptions.get(group) ?? [],
    })),
    ...(ungroupedOptions.length > 0 ? [{ options: ungroupedOptions }] : []),
  ];
}
