/**
 * Header unificato per tutte le sezioni dell'app.
 * Design compatto: py-5 px-6, titolo text-xl, sottotitolo text-base.
 */
export default function PageHeader({ title, subtitle, action, meta, className = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow border border-gray-200 py-5 px-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-base text-gray-600 mt-1">{subtitle}</p>
          )}
          {meta && (
            <div className="mt-2 text-sm text-gray-500">{meta}</div>
          )}
        </div>
        {action && (
          <div className="flex items-center flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
