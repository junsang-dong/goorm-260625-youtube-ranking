export const REGIONS = [
  { id: 'WW', label: '전 세계', regionCode: null },
  { id: 'KR', label: '한국', regionCode: 'KR' },
  { id: 'US', label: '미국', regionCode: 'US' },
  { id: 'JP', label: '일본', regionCode: 'JP' },
  { id: 'IN', label: '인도', regionCode: 'IN' },
  { id: 'BR', label: '브라질', regionCode: 'BR' },
  { id: 'GB', label: '영국', regionCode: 'GB' },
]

export function getRegionById(id) {
  return REGIONS.find((r) => r.id === id) || REGIONS[0]
}
