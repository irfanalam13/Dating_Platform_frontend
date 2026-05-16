export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
      <span>Typing</span>
      <span className="flex gap-0.5 ml-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
    </div>
  )
}