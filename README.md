# zbuttons

Coleção de botões 3D para projetos **React + Tailwind CSS + shadcn/ui**.

Dois componentes prontos para uso:

| Componente | Técnica | Deps |
|---|---|---|
| `SquircleButton` | SVG squircle com depth layers | `lucide-react`, `class-variance-authority` |
| `ButtonVar` | CSS 3D com slots tailwind-variants | `lucide-react`, `tailwind-variants` |

---

## Instalação rápida

```bash
# clona e instala em qualquer projeto shadcn
bash install-squircle-button.sh ../meu-projeto
```

O script detecta o package manager (npm/pnpm/yarn/bun), instala as dependências e copia os arquivos para `src/components/ui/`.

### Instalação manual

```bash
npm install lucide-react class-variance-authority tailwind-variants
```

Copie para `src/components/ui/`:
- `src/components/ui/SquircleButton.tsx`
- `src/components/ui/squircle-button-variants.ts`
- `src/components/ui/ButtonVar.tsx`

---

## SquircleButton

Botão SVG 3D com forma squircle, efeito de profundidade animado ao pressionar e suporte a ícones Lucide.

### Uso básico

```tsx
import { Rocket } from "lucide-react"
import { SquircleButton } from "@/components/ui/SquircleButton"

<SquircleButton variant="blue" label="Launch" icon={Rocket} />
```

### Paleta completa

```tsx
import { Palette } from "lucide-react"
import { SquircleButton } from "@/components/ui/SquircleButton"
import { BUTTON_VARIANTS } from "@/components/ui/squircle-button-variants"

{BUTTON_VARIANTS.map((v) => (
  <SquircleButton key={v} variant={v} size="palette" label={v} icon={Palette} />
))}
```

### Props

| Prop | Tipo | Default | Descrição |
|---|---|---|---|
| `variant` | `ButtonVariant` | `"blue"` | Cor do botão |
| `size` | `ButtonSize` | `"default"` | Tamanho e modo |
| `label` | `string` | `""` | Texto (exibido em caixa alta) |
| `icon` | `LucideIcon` | — | Ícone Lucide |
| `onClick` | `() => void` | — | Callback de clique |
| `className` | `string` | `""` | Classes extras no wrapper |

### Variants

| `variant` | Cor |
|---|---|
| `blue` | Azul |
| `green` | Verde |
| `red` | Vermelho |
| `orange` | Laranja |
| `yellow` | Amarelo |
| `teal` | Teal |
| `pink` | Rosa |
| `purple` | Roxo |
| `slate` | Slate escuro |
| `amber` | Âmbar |
| `white` | Branco |

### Sizes

| `size` | Altura | Comportamento |
|---|---|---|
| `tiny` | 30px | Compacto |
| `default` | 44px | Padrão |
| `palette` | 44px | Para exibição em paleta |
| `large` | 60px | Grande |
| `full` | 44px | Largura total do container |
| `square` | 44px | Apenas ícone, quadrado |
| `floating` | 64px | Posição fixa, apenas ícone |

### Exemplos por size

```tsx
import { Zap, Rocket, PartyPopper, ArrowLeftRight, Fingerprint } from "lucide-react"

// Tiny
<SquircleButton variant="blue" size="tiny" label="Tiny" icon={Zap} />

// Default
<SquircleButton variant="teal" size="default" label="Standard" icon={Rocket} />

// Large
<SquircleButton variant="pink" size="large" label="Large" icon={PartyPopper} />

// Full width
<SquircleButton variant="orange" size="full" label="Full Width" icon={ArrowLeftRight} />

// Square (icon only)
<SquircleButton variant="purple" size="square" icon={Fingerprint} />

// Floating (fixed bottom-right)
<div className="fixed bottom-12 right-12 z-50">
  <SquircleButton variant="blue" size="floating" icon={Rocket} onClick={handleClick} />
</div>
```

---

## ButtonVar

Botão 3D CSS puro com face frontal, camada lateral e sombra. Animação de press via Tailwind group-active.

### Uso básico

```tsx
import { ButtonVar } from "@/components/ui/ButtonVar"

<ButtonVar variant="blue" size="default">Click Me!</ButtonVar>
```

### Props

| Prop | Tipo | Default | Descrição |
|---|---|---|---|
| `variant` | `"blue" \| "cream" \| "red" \| "green"` | `"blue"` | Cor do botão |
| `size` | `"default" \| "sm" \| "lg"` | `"default"` | Tamanho do texto |
| `children` | `ReactNode` | `"Click Me!"` | Conteúdo do botão |
| + todos os atributos de `<button>` | | | |

### Exemplos

```tsx
<ButtonVar variant="blue"  size="default">Enviar</ButtonVar>
<ButtonVar variant="cream" size="sm">Cancelar</ButtonVar>
<ButtonVar variant="red"   size="lg">Deletar</ButtonVar>
<ButtonVar variant="green" size="default">Confirmar</ButtonVar>
```

---

## Fonte recomendada (IBM Plex Sans)

Os botões usam `font-sans` do Tailwind. Para o visual do preset shadcn instale a IBM Plex Sans:

```bash
npm install @fontsource-variable/ibm-plex-sans
```

Em `src/index.css`:

```css
@import '@fontsource-variable/ibm-plex-sans/wght.css';

@theme inline {
  --font-sans: 'IBM Plex Sans Variable', sans-serif;
}
```

---

## Stack

- React 19
- TypeScript 6
- Vite 8
- Tailwind CSS 4
- shadcn/ui
- lucide-react
- class-variance-authority
- tailwind-variants

## Dev

```bash
npm install
npm run dev      # http://localhost:5175
npm run build
npm run preview
```
