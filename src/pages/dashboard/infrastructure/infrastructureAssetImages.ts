export type InfrastructureVisualAssetKey =
  | 'team_car'
  | 'team_bus'
  | 'equipment_van'
  | 'mobile_workshop'
  | 'medical_van'

/**
 * Central visual catalogue for purchasable infrastructure assets.
 *
 * Asset artwork is intentionally mapped directly in code so the catalogue and
 * detail views always know which image belongs to a specific asset type/level.
 * Missing entries resolve to null and are handled by the UI fallback.
 */
const infrastructureAssetImageUrls: Partial<
  Record<InfrastructureVisualAssetKey, Record<number, string>>
> = {
  team_car: {
    1: '/assets/uranius-placeholders/infrastructure.png?id=1fe0535ba24f41a4',
    2: '/assets/uranius-placeholders/infrastructure.png?id=e1b859f764358c6e',
    3: '/assets/uranius-placeholders/infrastructure.png?id=a5a2636ce59f3670',
    4: '/assets/uranius-placeholders/infrastructure.png?id=8e7d653c36fbb4d6',
    5: '/assets/uranius-placeholders/infrastructure.png?id=805ea3861ad694fd',
  },
  team_bus: {
    1: '/assets/uranius-placeholders/infrastructure.png?id=3adf3089bf786910',
    2: '/assets/uranius-placeholders/infrastructure.png?id=385199d228a22eb1',
    3: '/assets/uranius-placeholders/infrastructure.png?id=2877b2784e1aca80',
  },
  equipment_van: {
    1: '/assets/uranius-placeholders/infrastructure.png?id=2f3dfd4b97144e75',
    2: '/assets/uranius-placeholders/infrastructure.png?id=ab040c6beaa55ddd',
    3: '/assets/uranius-placeholders/infrastructure.png?id=7399a605a0076b03',
  },
  mobile_workshop: {
    1: '/assets/uranius-placeholders/infrastructure.png?id=2e83052132345802',
    2: '/assets/uranius-placeholders/infrastructure.png?id=47de1334028336fd',
  },
  medical_van: {
    1: '/assets/uranius-placeholders/infrastructure.png?id=912cb74c33944e21',
    2: '/assets/uranius-placeholders/infrastructure.png?id=e13c4dfed72bb514',
    3: '/assets/uranius-placeholders/infrastructure.png?id=ffc1aa7e10622d28',
  },
}

export function getInfrastructureAssetImageUrl(
  assetKey: InfrastructureVisualAssetKey,
  assetLevel: number,
): string | null {
  return infrastructureAssetImageUrls[assetKey]?.[assetLevel] ?? null
}
