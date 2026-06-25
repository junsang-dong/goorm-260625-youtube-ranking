export const CATEGORIES = [
  { id: 'entertainment', label: '엔터테인먼트', videoCategoryId: '24' },
  { id: 'gaming', label: '게임', videoCategoryId: '20' },
  { id: 'music', label: '음악', videoCategoryId: '10' },
  { id: 'education', label: '교육', videoCategoryId: '27' },
  { id: 'tech', label: '테크', videoCategoryId: '28' },
  { id: 'sports', label: '스포츠', videoCategoryId: '17' },
  { id: 'food', label: '푸드', videoCategoryId: '26', query: 'food cooking' },
  { id: 'beauty', label: '뷰티·라이프스타일', videoCategoryId: '26', query: 'beauty lifestyle' },
]

export function getCategoryById(id) {
  return CATEGORIES.find((c) => c.id === id) || CATEGORIES[0]
}
