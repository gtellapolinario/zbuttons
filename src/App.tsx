// App.tsx
import { Palette, Fingerprint, Zap, Rocket, PartyPopper, ArrowLeftRight } from "lucide-react";
import { SquircleButton } from "@/components/ui/SquircleButton";
import { BUTTON_VARIANTS } from "@/components/ui/squircle-button-variants";
import { ButtonVar } from "@/components/ui/buttonVar";

function handleTesteButton() {
  console.log("TesteButton clicked");
}

export default function App() {
  return (
    <div className="min-h-screen p-4 md:p-12 flex flex-col items-center">
      <div className="w-full max-w-4xl space-y-12 pb-12">

        <section>
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6">Button Palette</h2>
          <div className="flex flex-wrap gap-4">
            {BUTTON_VARIANTS.map((v) => (
              <SquircleButton key={v} variant={v} size="palette" label={v} icon={Palette} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6">Square Icons</h2>
          <div className="flex flex-wrap gap-4">
            {BUTTON_VARIANTS.map((v) => (
              <SquircleButton key={v} variant={v} size="square" icon={Fingerprint} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6">Sizing & Layouts</h2>
          <div className="flex flex-wrap gap-4">
            <SquircleButton variant="blue"   size="tiny"    label="Tiny"               icon={Zap} />
            <SquircleButton variant="teal"   size="default" label="Standard"           icon={Rocket} />
            <SquircleButton variant="pink"   size="large"   label="Large & Long Label" icon={PartyPopper} />
            <SquircleButton variant="orange" size="full"    label="Full Width Button"  icon={ArrowLeftRight} className="mt-4" />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6">Sizing & Layouts</h2>
          <div className="flex flex-wrap gap-4">
            <ButtonVar variant="blue" size="default">Click Me!</ButtonVar>
            <ButtonVar variant="cream" size="sm">Small</ButtonVar>
            <ButtonVar variant="red" size="lg">Large</ButtonVar>
            <ButtonVar variant="green" size="default">Green</ButtonVar>
          </div>
        </section>

      </div>

      <div className="fixed bottom-12 right-12 z-50">
        <SquircleButton variant="blue" size="floating" icon={Rocket} onClick={handleTesteButton} />
      </div>
    </div>
  );
}
