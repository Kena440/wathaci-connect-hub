import React from 'react';

export type ComingSoonCardProps = {
  title?: string;
  body?: string;
};

export const ComingSoonCard: React.FC<ComingSoonCardProps> = ({
  title = 'Coming Soon',
  body = 'This section is being finalised and will be available soon.',
}) => {
  return (
    <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 px-4 py-6 text-center text-sm md:text-base text-slate-700">
      <h3 className="text-base md:text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 max-w-xl mx-auto">{body}</p>
    </div>
  );
};

export default ComingSoonCard;
