export interface MenuListProps {
  title?: React.ReactNode;
  subtitle?: string;
  sections: Array<{
    title: string;
    items: Array<{ name: string; description?: string; price?: string; tag?: string }>;
  }>;
}

/** Price/menu/service lists: restaurant menus, salon services, class schedules. */
export function MenuList({ title, subtitle, sections }: MenuListProps) {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
      {(title || subtitle) && (
        <div className="mb-10 text-center">
          {title && (
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
          )}
          {subtitle && <p className="mt-3 text-lg text-muted-foreground">{subtitle}</p>}
        </div>
      )}
      <div className="space-y-12">
        {sections.map((s) => (
          <div key={s.title}>
            <h3 className="mb-5 text-sm font-medium uppercase tracking-widest text-primary">
              {s.title}
            </h3>
            <ul className="space-y-5">
              {s.items.map((item) => (
                <li key={item.name} className="flex items-baseline gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {item.name}
                      {item.tag && (
                        <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-normal text-primary">
                          {item.tag}
                        </span>
                      )}
                    </p>
                    {item.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
                    )}
                  </div>
                  {item.price && (
                    <>
                      <span className="mx-1 flex-1 border-b border-dotted border-border" />
                      <span className="font-medium tabular-nums">{item.price}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
