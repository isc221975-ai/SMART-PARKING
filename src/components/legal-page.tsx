import { SiteNav } from "@/components/landing/site-nav";
import { SiteFooter } from "@/components/landing/site-footer";

export function LegalPage({ title, updated, sections }: { title: string; updated: string; sections: { h: string; p: string[] }[] }) {
  return (
    <>
      <SiteNav />
      <main id="contenido" className="px-6 pb-24 pt-32 md:pt-40">
        <article className="mx-auto max-w-2xl">
          <p className="caption-1 text-ink2">Actualizado el {updated}</p>
          <h1 className="heading-3 pt-2 text-ink">{title}</h1>
          <div className="flex flex-col gap-8 pt-10">
            {sections.map((s) => (
              <section key={s.h} className="flex flex-col gap-3">
                <h2 className="heading-6 text-ink">{s.h}</h2>
                {s.p.map((t, i) => (
                  <p key={i} className="body-3 text-ink2">{t}</p>
                ))}
              </section>
            ))}
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
