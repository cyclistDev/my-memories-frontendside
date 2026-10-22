export interface Memory {
  id: string
  title: string
  content: string
  updatedAt: string
}

export const initialMemories: Memory[] = [
  {
    id: 'sample-sunday',
    title: 'A slow Sunday morning',
    content: 'Coffee went cold while we talked about everything and nothing. The light came through the kitchen window just right, and for once, nobody was in a hurry.',
    updatedAt: '2026-10-18T09:30:00.000Z',
  },
  {
    id: 'sample-coast',
    title: 'The little blue café by the sea',
    content: 'We found it by accident, tucked between the bookshop and the harbor. The lemon cake was a little too sweet, the breeze was salty, and I wished the afternoon would last longer.',
    updatedAt: '2026-10-14T14:15:00.000Z',
  },
  {
    id: 'sample-flowers',
    title: 'Flowers from the market',
    content: 'Peonies, even though they weren’t in season. The kind shopkeeper tucked in a sprig of rosemary and said it would make the whole kitchen smell like summer.',
    updatedAt: '2026-10-07T11:00:00.000Z',
  },
]
