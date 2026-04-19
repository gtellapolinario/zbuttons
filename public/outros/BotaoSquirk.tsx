// App.tsx
import { SquircleButton } from "@/components/ui/SquircleButton";

const PALETTE = ["blue","green","red","orange","yellow","teal","pink","purple","slate","amber","white"] as const;

export default function BotaoSquirk() {
  return (
    <div className="min-h-screen p-4 md:p-12 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-12 pb-12">

        <section>
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6">Button Palette</h2>
          <div className="flex flex-wrap gap-4">
            {PALETTE.map((c) => <SquircleButton key={c} color={c} label={c} icon="palette" />)}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6">Square Icons</h2>
          <div className="flex flex-wrap gap-4">
            {PALETTE.map((c) => <SquircleButton key={c} color={c} icon="fingerprint" square />)}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6">Sizing & Layouts</h2>
          <div className="flex flex-wrap gap-4">
            <SquircleButton color="blue"   label="Tiny"               height={30} icon="bolt" />
            <SquircleButton color="teal"   label="Standard"           height={44} icon="rocket_launch" />
            <SquircleButton color="pink"   label="Large & Long Label" height={60} icon="celebration" />
            <SquircleButton color="orange" label="Full Width Button"  height={44} icon="width_full" fullWidth className="mt-4" />
          </div>
        </section>

      </div>

      {/* Floating Button */}
      <div className="fixed bottom-12 right-12 z-50">
        <SquircleButton color="blue" icon="rocket" height={64} square floating />
      </div>
    </div>
  );
}