import React from 'react';

/**
 * Wrapper per icone Lucide in variante fill (fill="currentColor", strokeWidth={0}).
 * Uso: <IconFill as={Home} className="w-5 h-5" />
 */
export function IconFill({ as: Icon, ...props }) {
  if (!Icon) return null;
  return <Icon fill="currentColor" strokeWidth={0} {...props} />;
}

export default IconFill;
