# Refatoração SquircleButton → divisão em componentes ↓ seguindo SOLID

## Nova estrutura

```markdown
  src/components/ui/
  ├── SquircleButton.tsx              # barrel export (compatibilidade)
  └── squircle-button/
      ├── index.ts                    # re-exports
      ├── SquircleButton.tsx          # componente principal (~80 linhas)
      ├── SquircleButtonSvg.tsx       # renderização SVG (~80 linhas)
      ├── SquircleButtonContent.tsx   # ícone + label (~50 linhas)
      ├── use-squircle-button.ts      # hook de estado/largura (~55 linhas)
      ├── variants.ts                 # configurações de variantes/tamanhos
      ├── utils.ts                    # squirclePath, colorMix, computeButtonWidth
      └── types.ts                    # props e tipos
```

## Responsabilidades separadas (SOLID)

┌───────────────────────┬────────────────────────────────────────────────────┐
│ Componente/Hook       │ Responsabilidade única                             │
├───────────────────────┼────────────────────────────────────────────────────┤                                 
│ SquircleButton        │ Composição e eventos do botão                      │                                 
├───────────────────────┼────────────────────────────────────────────────────┤                                 
│ SquircleButtonSvg     │ Geração/renderização do SVG squircle               │                                 
├───────────────────────┼────────────────────────────────────────────────────┤                                 
│ SquircleButtonContent │ Ícone e texto sobrepostos                          │                                 
├───────────────────────┼────────────────────────────────────────────────────┤                                 
│ useSquircleButton     │ Estado pressed, cálculo de largura, ResizeObserver │                                 
├───────────────────────┼────────────────────────────────────────────────────┤                                 
│ utils.ts              │ Funções puras de geometria/cores/largura           │                                 
├───────────────────────┼────────────────────────────────────────────────────┤                                 
│ variants.ts           │ Configuração de variantes/tamanhos                 │                                 
└───────────────────────┴────────────────────────────────────────────────────┘

## Convenções adotadas

• Todas as funções ficaram com menos de 60 linhas (a maioria abaixo de 50).
• Nenhuma função faz mais de uma coisa.
• Props especializadas por componente (Interface Segregation).
• O componente principal depende de abstrações (sub-componentes), não de detalhes de SVG/gradientes.

### Validação

• ✅ npx tsc --noEmit → OK
• ✅ npm run build → OK
• ✅ npm test → 19 passed (6 arquivos de teste)

### Uso

A importação antiga continua funcionando:

```tsx
import { SquircleButton } from "@ui/squircle-button/index";
```

Ou pela pasta nova:

```tsx
import { SquircleButton } from "@/components/ui/squircle-button";
```