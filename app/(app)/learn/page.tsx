import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LEARN_MODULES, type LearnModule } from "@/lib/learn-modules";
import { PrioritiesEditor } from "@/components/profile/priority-picker";
import { StartTourButton } from "@/components/product-tour";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LearnPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from("user_settings").select("priorities").maybeSingle();
  const priorities = settings?.priorities ?? [];

  const isRecommended = (m: LearnModule) => m.priorities.some((p) => priorities.includes(p));
  const recommended = LEARN_MODULES.filter(isRecommended);
  const rest = LEARN_MODULES.filter((m) => !isRecommended(m));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Your goals</CardTitle>
          <CardDescription>
            What do you want help with? Guides that match move to the top.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PrioritiesEditor initial={priorities} />
        </CardContent>
      </Card>

      {recommended.length > 0 && <ModuleList title="Recommended for you" modules={recommended} open />}
      <ModuleList title={recommended.length > 0 ? "More guides" : "Guides"} modules={rest} />

      <p className="text-xs text-muted-foreground">
        These guides are general education, not financial, tax, or legal advice. Your situation may
        differ, so consider talking with a qualified professional before big decisions.
      </p>
    </div>
  );
}

function ModuleList({ title, modules, open }: { title: string; modules: LearnModule[]; open?: boolean }) {
  if (modules.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {modules.map((m) => (
        <ModuleCard key={m.id} module={m} open={open} />
      ))}
    </section>
  );
}

function ModuleCard({ module: m, open }: { module: LearnModule; open?: boolean }) {
  return (
    <details id={m.id} open={open} className="group scroll-mt-24 rounded-xl border bg-card p-4">
      <summary className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium">{m.title}</p>
            <p className="text-sm text-muted-foreground">{m.summary}</p>
          </div>
          <span className="text-muted-foreground transition-transform group-open:rotate-90" aria-hidden>
            ›
          </span>
        </div>
      </summary>

      <div className="mt-4 flex flex-col gap-4 text-sm">
        {(m.bestFor || m.notFor) && (
          <div className="grid gap-2 sm:grid-cols-2">
            {m.bestFor && (
              <div className="rounded-lg bg-muted/50 p-3">
                <Badge variant="secondary" className="mb-1.5">Right for you if</Badge>
                <p>{m.bestFor}</p>
              </div>
            )}
            {m.notFor && (
              <div className="rounded-lg bg-muted/50 p-3">
                <Badge variant="outline" className="mb-1.5">Think twice if</Badge>
                <p>{m.notFor}</p>
              </div>
            )}
          </div>
        )}

        {m.sections.map((s) => (
          <div key={s.heading} className="flex flex-col gap-1.5">
            <h3 className="font-semibold">{s.heading}</h3>
            {s.paragraphs?.map((p) => (
              <p key={p} className="text-muted-foreground">
                {p}
              </p>
            ))}
            {s.bullets && (
              <ul className="ml-5 list-disc space-y-1 text-muted-foreground">
                {s.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
          </div>
        ))}

        {m.action &&
          ("tour" in m.action ? (
            <StartTourButton tour={m.action.tour}>{m.action.label}</StartTourButton>
          ) : (
            <Link href={m.action.href} className={buttonVariants({ size: "sm", className: "w-fit" })}>
              {m.action.label}
            </Link>
          ))}
      </div>
    </details>
  );
}
