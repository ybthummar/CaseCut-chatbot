import { BookOpen, ExternalLink, Star, User } from 'lucide-react'
import { motion } from 'framer-motion'

export default function BookCard({ book, index = 0 }) {
  if (!book) return null

  const authors = (book.authors || ['Unknown Author']).join(', ')
  const thumbnail = book.thumbnail
    ? book.thumbnail.replace('http://', 'https://')
    : null

  return (
    <motion.a
      href={book.previewLink || '#'}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className="group flex gap-3 rounded-2xl bg-white/50 border border-white/40 p-3 hover:shadow-lg hover:bg-white/70 transition-all duration-200 cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="shrink-0 w-16 h-22 rounded-lg overflow-hidden bg-purple-100/60 flex items-center justify-center">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={book.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <BookOpen className="size-6 text-purple-400" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-purple-700 transition-colors">
          {book.title}
        </h4>
        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 truncate">
          <User className="size-3 shrink-0" />
          {authors}
        </p>
        {book.description && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
            {book.description}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1.5">
          {book.averageRating > 0 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 font-medium bg-amber-50 px-1.5 py-0.5 rounded-full">
              <Star className="size-2.5 fill-amber-500 text-amber-500" />
              {book.averageRating}
            </span>
          )}
          {book.pageCount > 0 && (
            <span className="text-[10px] text-gray-400">{book.pageCount} pages</span>
          )}
          {book.publishedDate && (
            <span className="text-[10px] text-gray-400">{book.publishedDate.slice(0, 4)}</span>
          )}
          <ExternalLink className="size-3 text-gray-300 group-hover:text-purple-500 ml-auto transition-colors" />
        </div>
      </div>
    </motion.a>
  )
}
