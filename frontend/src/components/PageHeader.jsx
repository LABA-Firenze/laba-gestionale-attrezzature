import { NotificationBell } from '../contexts/NotificationPanelContext';

/**
 * Header unificato per tutte le sezioni dell'app.
 * Design compatto: py-5 px-6, titolo text-xl, sottotitolo text-base.
 * showNotificationBell: mostra il pulsante notifiche nell'area destra (fuso con header).
 */
export default function PageHeader({ title, subtitle, action, meta, showNotificationBell = false, className = '' }) {
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
        {(action || showNotificationBell) && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {action}
            {showNotificationBell && <NotificationBell />}
          </div>
        )}
      </div>
    </div>
  );
}
