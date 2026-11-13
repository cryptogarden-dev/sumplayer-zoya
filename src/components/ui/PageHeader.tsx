interface PageHeaderProps {
  title: string;
  description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="font-display text-slate text-[34px] leading-[1.15] font-semibold">{title}</h1>
      {description ? <p className="text-muted mt-1 text-[13px]">{description}</p> : null}
    </div>
  );
}
