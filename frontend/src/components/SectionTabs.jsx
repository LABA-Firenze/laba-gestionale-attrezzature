/**
 * Barra tab per le sezioni del gestionale.
 * Design: sfondo bianco, tabs in stile pill con stato attivo evidente.
 */
export default function SectionTabs({ children, rightContent }) {
  return (
    <div className="bg-white rounded-xl shadow border border-gray-200 px-4 py-3">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <nav
          role="tablist"
          className="flex flex-wrap gap-2 p-1.5 bg-gray-100 rounded-full"
        >
          {children}
        </nav>
        {rightContent && (
          <div className="flex items-center w-full min-w-0 sm:w-auto sm:shrink-0">{rightContent}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Singolo tab button - usare con SectionTabs
 */
export function Tab({ isActive, onClick, children, className = '' }) {
  return (
    <button
      role="tab"
      onClick={onClick}
      className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-white text-blue-600 shadow-sm'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      } ${className}`}
    >
      {children}
    </button>
  );
}
