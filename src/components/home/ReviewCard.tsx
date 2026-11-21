/**
 * ReviewCard.tsx
 * Small card showing a user's review and rating.
 */

import React from 'react'

interface ReviewCardProps {
  avatar?: string
  name: string
  title?: string
  rating: number
  text: string
}

export default function ReviewCard({
  avatar,
  name,
  title,
  rating,
  text
}: ReviewCardProps) {
  const stars = Array.from({ length: 5 }).map((_, i) => (i < rating ? '★' : '☆'))

  return (
    <div className="bg-white rounded-xl p-5 shadow border border-black/5">
      <div className="flex items-start gap-4">
        <img
          src={
            avatar ||
            '/assets/uranius-placeholders/card.png?id=3fcbc6f703dcd43c'
          }
          alt={name}
          className="w-12 h-12 rounded-full object-cover"
        />

        <div className="flex-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-gray-900">{name}</div>
              {title && <div className="text-xs text-gray-500">{title}</div>}
            </div>

            <div className="text-yellow-500 text-lg whitespace-nowrap">
              {stars.join(' ')}
            </div>
          </div>

          <p className="mt-3 text-sm text-gray-700">{text}</p>
        </div>
      </div>
    </div>
  )
}