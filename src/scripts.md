## src/stores/command-store.ts
// src/stores/command-store.ts
// Tiny zustand store for the global ⌘K palette. Hook a global key listener
// to `toggle` at the app root (see src/App.tsx).

import { create } from "zustand";

type CommandState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

export const useCommandStore = create<CommandState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));

---

## src/stores/theme-store.ts
// src/stores/theme-store.ts
// Zustand store for theme + accent + density.
// Syncs to [data-theme] / [data-accent] on <html> and persists to localStorage.

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark";
export type AccentKey = "azul-aco" | "verde-petroleo" | "vermelho-tijolo";
export type Density   = "compact" | "comfortable";

export const ACCENT_META: Record<AccentKey, { hex: string; name: string }> = {
  "azul-aco":         { hex: "#3D5A80", name: "Azul-aço" },
  "verde-petroleo":   { hex: "#3A6B5A", name: "Verde-petróleo" },
  "vermelho-tijolo":  { hex: "#8A3A2F", name: "Vermelho-tijolo" },
};

type ThemeState = {
  mode: ThemeMode;
  accent: AccentKey;
  density: Density;
  setMode: (m: ThemeMode) => void;
  setAccent: (a: AccentKey) => void;
  setDensity: (d: Density) => void;
  toggleMode: () => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: "light",
      accent: "azul-aco",
      density: "comfortable",
      setMode: (mode) => set({ mode }),
      setAccent: (accent) => set({ accent }),
      setDensity: (density) => set({ density }),
      toggleMode: () =>
        set((s) => ({ mode: s.mode === "light" ? "dark" : "light" })),
    }),
    { name: "gtmedic-theme" }
  )
);

/** Mount once at app root; keeps html data-attributes in sync with the store. */
export function useThemeSync() {
  const { mode, accent } = useThemeStore();
  if (typeof document !== "undefined") {
    const html = document.documentElement;
    if (html.dataset.theme !== mode)    html.dataset.theme = mode;
    if (html.dataset.accent !== accent) html.dataset.accent = accent;
  }
}

---

## src/stores/use-consulta-store.ts
// ═══════════════════════════════════════════════════════════════════════════
// Zustand Store — Estado Global da Consulta
// Compartilha identificação do paciente e dados entre módulos
// ═══════════════════════════════════════════════════════════════════════════

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface IdentificacaoPaciente {
  paciente: string;
  dataNascimento: string;
  sexo: string;
  escolaridade: string;
  ocupacao: string;
  queixa: string;
}

export interface ConsultaState {
  // Identificação do paciente (compartilhada entre todos os módulos)
  identificacao: IdentificacaoPaciente;
  setIdentificacao: (identificacao: IdentificacaoPaciente) => void;
  setIdentificacaoField: (field: keyof IdentificacaoPaciente, value: string) => void;

  // Módulo atualmente ativo
  moduloAtual: string | null;
  setModuloAtual: (id: string | null) => void;

  // Payload da última consulta (para exportação/PDF)
  ultimoPayload: string | null;
  setUltimoPayload: (payload: string | null) => void;

  // Flag: dados foram modificados desde último salvamento
  dirty: boolean;
  setDirty: (v: boolean) => void;

  // Reset completo
  reset: () => void;
}

const initialIdentificacao: IdentificacaoPaciente = {
  paciente: "",
  dataNascimento: "",
  sexo: "",
  escolaridade: "",
  ocupacao: "",
  queixa: "",
};

export const useConsultaStore = create<ConsultaState>()(
  persist(
    (set) => ({
      identificacao: { ...initialIdentificacao },
      setIdentificacao: (identificacao) =>
        set({ identificacao, dirty: true }),
      setIdentificacaoField: (field, value) =>
        set((state) => ({
          identificacao: { ...state.identificacao, [field]: value },
          dirty: true,
        })),

      moduloAtual: null,
      setModuloAtual: (moduloAtual) => set({ moduloAtual }),

      ultimoPayload: null,
      setUltimoPayload: (ultimoPayload) => set({ ultimoPayload }),

      dirty: false,
      setDirty: (dirty) => set({ dirty }),

      reset: () =>
        set({
          identificacao: { ...initialIdentificacao },
          ultimoPayload: null,
          dirty: false,
        }),
    }),
    {
      name: "gtmedics-consulta",
      partialize: (state) => ({
        identificacao: state.identificacao,
        moduloAtual: state.moduloAtual,
        ultimoPayload: state.ultimoPayload,
      }),
    }
  )
);

---

## src/schemas/schemas.ts
// src/lib/schemas.ts
// Zod schemas for clinical entities. Mirror PocketBase collections.

import { z } from "zod";
import { ChapterKey, Structure } from "../lib/dsm";

// ─── Patient ──────────────────────────────────────────────────
export const Patient = z.object({
  id: z.string(),                       // pocketbase id
  fullName: z.string().min(2),
  birthDate: z.iso.date(),
  sex: z.enum(["F", "M", "outro", "nao-informado"]),
  education: z.string().optional(),
  occupation: z.string().optional(),
  origin: z.string().optional(),        // naturalidade
  insurance: z.string().optional(),
  referredBy: z.string().optional(),
  status: z.enum(["em-acompanhamento", "em-avaliacao", "alta", "encaminhado"]),
  notes: z.string().optional(),
  created: z.iso.datetime(),
  updated: z.iso.datetime(),
});
export type Patient = z.infer<typeof Patient>;

// ─── Disorder (catalog) ──────────────────────────────────────
export const Disorder = z.object({
  id: z.string(),
  code: z.string(),                     // F90, F32.0, etc.
  dsm5Code: z.string(),                 // 314.00, etc.
  name: z.string(),
  shortName: z.string().optional(),     // "TDAH"
  chapter: ChapterKey,
  structure: Structure,
});
export type Disorder = z.infer<typeof Disorder>;

// ─── Criterion ───────────────────────────────────────────────
export const Criterion = z.object({
  id: z.string(),                       // "A1.1", "B", etc.
  domain: z.string(),                   // "A1", "B"
  label: z.string(),
  fullText: z.string(),                 // DSM verbatim
});
export type Criterion = z.infer<typeof Criterion>;

// ─── Assessment ──────────────────────────────────────────────
export const CriterionResponse = z.object({
  criterionId: z.string(),
  checked: z.boolean(),
  note: z.string().optional(),          // clinician free text
});
export type CriterionResponse = z.infer<typeof CriterionResponse>;

export const AssessmentState = z.enum([
  "em-andamento", "finalizada", "descartada", "provisoria",
]);
export type AssessmentState = z.infer<typeof AssessmentState>;

export const Assessment = z.object({
  id: z.string(),
  patientId: z.string(),
  disorderId: z.string(),
  state: AssessmentState,
  responses: z.array(CriterionResponse),
  inferredSubtype: z.string().optional(),
  inferredCode: z.string().optional(),
  functionalImpact: z.record(z.string(), z.number().int().min(0).max(4)).optional(),
  freeText: z.object({
    chiefComplaint: z.string().optional(),
    courseAndDevelopment: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
  reportMarkdown: z.string().optional(),
  sessionNumber: z.number().int().positive().optional(),
  lastEditedAt: z.iso.datetime(),
  created: z.iso.datetime(),
  updated: z.iso.datetime(),
});
export type Assessment = z.infer<typeof Assessment>;

// ─── Threshold rule (TDAH-style) ─────────────────────────────
export const ThresholdRule = z.object({
  domain: z.string(),                   // "A1"
  adult: z.number().int().positive(),
  child: z.number().int().positive(),
  total: z.number().int().positive(),
});
export type ThresholdRule = z.infer<typeof ThresholdRule>;

---

## src/infra/disease-registry.ts
// Auto-generated wrapper. Custom logic should live outside this file.
export * from "./disease-registry.generated";

---

## src/infra/store/use-consulta-store.ts
// ═══════════════════════════════════════════════════════════════════════════
// Zustand Store — Estado Global da Consulta
// Compartilha identificação do paciente e dados entre módulos
// ═══════════════════════════════════════════════════════════════════════════

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface IdentificacaoPaciente {
  paciente: string;
  dataNascimento: string;
  sexo: string;
  escolaridade: string;
  ocupacao: string;
  queixa: string;
}

export interface ConsultaState {
  // Identificação do paciente (compartilhada entre todos os módulos)
  identificacao: IdentificacaoPaciente;
  setIdentificacao: (identificacao: IdentificacaoPaciente) => void;
  setIdentificacaoField: (field: keyof IdentificacaoPaciente, value: string) => void;

  // Módulo atualmente ativo
  moduloAtual: string | null;
  setModuloAtual: (id: string | null) => void;

  // Payload da última consulta (para exportação/PDF)
  ultimoPayload: string | null;
  setUltimoPayload: (payload: string | null) => void;

  // Flag: dados foram modificados desde último salvamento
  dirty: boolean;
  setDirty: (v: boolean) => void;

  // Reset completo
  reset: () => void;
}

const initialIdentificacao: IdentificacaoPaciente = {
  paciente: "",
  dataNascimento: "",
  sexo: "",
  escolaridade: "",
  ocupacao: "",
  queixa: "",
};

export const useConsultaStore = create<ConsultaState>()(
  persist(
    (set) => ({
      identificacao: { ...initialIdentificacao },
      setIdentificacao: (identificacao) =>
        set({ identificacao, dirty: true }),
      setIdentificacaoField: (field, value) =>
        set((state) => ({
          identificacao: { ...state.identificacao, [field]: value },
          dirty: true,
        })),

      moduloAtual: null,
      setModuloAtual: (moduloAtual) => set({ moduloAtual }),

      ultimoPayload: null,
      setUltimoPayload: (ultimoPayload) => set({ ultimoPayload }),

      dirty: false,
      setDirty: (dirty) => set({ dirty }),

      reset: () =>
        set({
          identificacao: { ...initialIdentificacao },
          ultimoPayload: null,
          dirty: false,
        }),
    }),
    {
      name: "gtmedics-consulta",
      partialize: (state) => ({
        identificacao: state.identificacao,
        moduloAtual: state.moduloAtual,
        ultimoPayload: state.ultimoPayload,
      }),
    }
  )
);

---

## src/infra/components/ui/nivel-impacto.tsx
import { getIcone } from "@/infra/utils/mapear-icones";
import type { DominioImpacto } from "@/infra/types";

interface NivelImpactoProps {
  dominio: DominioImpacto;
  value: string;
  onChange: (value: string) => void;
}

const niveis = [
  { value: "0", label: "Sem prejuízo" },
  { value: "1", label: "Leve" },
  { value: "2", label: "Moderado" },
  { value: "3", label: "Grave" },
];

export function NivelImpacto({ dominio, value, onChange }: NivelImpactoProps) {
  const Icon = getIcone(dominio.icone_fa);

  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-slate-400 shrink-0" />
      <label className="text-xs text-slate-600 flex-1 truncate">
        {dominio.label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-xs border border-slate-200 rounded-md bg-slate-50 px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-w-[130px]"
      >
        {niveis.map((n) => (
          <option key={n.value} value={n.value}>
            {n.value} — {n.label}
          </option>
        ))}
      </select>
    </div>
  );
}

---

## src/infra/components/ui/count-badge.tsx
import { cn } from "@/lib/utils";

interface CountBadgeProps {
  current: number;
  target: number;
  className?: string;
}

export function CountBadge({ current, target, className }: CountBadgeProps) {
  const atingiu = current >= target;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold px-2.5 py-0.5 rounded-full transition-colors",
        atingiu
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-100 text-slate-500",
        className
      )}
    >
      {current}/{target}
    </span>
  );
}

---

## src/infra/components/ui/toggle-chip.tsx
import { cn } from "@/lib/utils";
import { getIcone } from "@/infra/utils/mapear-icones";

interface ToggleChipProps {
  label: string;
  icon?: string;
  active: boolean;
  onToggle: () => void;
  variant?: "brand" | "amber" | "red" | "green";
  description?: string;
}

const variantMap = {
  brand: {
    active: "bg-blue-100 border-blue-500 text-blue-700",
    inactive: "bg-white border-slate-200 text-stone-700 hover:border-blue-300",
  },
  amber: {
    active: "bg-amber-100 border-amber-500 text-amber-700",
    inactive: "bg-white border-slate-200 text-stone-700 hover:border-amber-300",
  },
  red: {
    active: "bg-red-100 border-red-500 text-red-700",
    inactive: "bg-white border-slate-200 text-stone-700 hover:border-red-300",
  },
  green: {
    active: "bg-emerald-100 border-emerald-500 text-emerald-700",
    inactive: "bg-white border-slate-200 text-stone-700 hover:border-emerald-300",
  },
};

export function ToggleChip({
  label,
  icon,
  active,
  onToggle,
  variant = "brand",
  description,
}: ToggleChipProps) {
  const Icon = icon ? getIcone(icon) : null;

  return (
    <button
      type="button"
      onClick={onToggle}
      title={description}
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold border shadow-sm rounded-full px-3 py-1.5 transition select-none cursor-pointer",
        variantMap[variant][active ? "active" : "inactive"]
      )}
    >
      {Icon && <Icon className="w-3 h-3" />}
      <span>{label}</span>
    </button>
  );
}

---

## src/infra/components/ui/fallback-avaliacao.tsx
// ═══════════════════════════════════════════════════════════════════════════
// FallbackAvaliacao — Para doenças sem clusters formais
// Ex: "Não Especificado", "Outro ... Especificado", fallback_classe
// ═══════════════════════════════════════════════════════════════════════════

import { ClipboardList, AlertCircle, FileText, BookOpen } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { TranstornoDSM } from "@/infra/types";

interface FallbackAvaliacaoProps {
  data: TranstornoDSM;
  criteriosValues: Record<string, boolean>;
  onToggleCriterio: (id: string) => void;
  impactoValues: Record<string, string>;
  onSetImpacto: (id: string, val: string) => void;
  notasHistoria: string;
  onChangeHistoria: (val: string) => void;
  notasGerais: string;
  onChangeNotasGerais: (val: string) => void;
}

export function FallbackAvaliacao({
  data,
  criteriosValues,
  onToggleCriterio,
  impactoValues: _impactoValues,
  onSetImpacto: _onSetImpacto,
  notasHistoria,
  onChangeHistoria,
  notasGerais,
  onChangeNotasGerais,
}: FallbackAvaliacaoProps) {
  const hasCriterios = data.criterios_condicionais.length > 0;

  return (
    <div className="space-y-5">
      {/* Banner explicativo */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-blue-800 mb-1">
              Avaliação Qualitativa — Critérios Não Padronizados
            </h3>
            <p className="text-xs text-blue-700 leading-relaxed">
              Este transtorno não possui critérios formais com lista de sintomas no DSM-5.
              O diagnóstico é estabelecido por avaliação clínica qualitativa, documentação
              do quadro e exclusão de outras condições. Preencha os campos abaixo conforme
              a entrevista.
            </p>
          </div>
        </div>
      </div>

      {/* Critérios descritivos */}
      {hasCriterios && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-stone-100 px-5 py-3 flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-slate-700">Critérios Descritivos</span>
          </div>
          <div className="p-5 space-y-3">
            {data.criterios_condicionais.map((c) => {
              const active = !!criteriosValues[c.id];
              return (
                <div
                  key={c.id}
                  className={`rounded-lg border p-3 transition ${
                    active
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {active ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {c.letra}
                        </span>
                        <span className="text-sm font-semibold text-stone-700">
                          {c.rotulo}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed mb-2">
                        {c.descricao_completa}
                      </p>
                      <button
                        onClick={() => onToggleCriterio(c.id)}
                        className={`text-xs h-7 px-3 rounded-md border transition ${
                          active
                            ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {active ? "Confirmado" : "Confirmar critério"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notas clínicas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-stone-100 px-5 py-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-bold text-slate-700">Anotações Clínicas</span>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">
              História e motivo da consulta
            </label>
            <Textarea
              value={notasHistoria}
              onChange={(e) => onChangeHistoria(e.target.value)}
              rows={4}
              placeholder="Descreva o quadro clínico, história do paciente e observações relevantes..."
              className="text-sm resize-y"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">
              Observações gerais
            </label>
            <Textarea
              value={notasGerais}
              onChange={(e) => onChangeNotasGerais(e.target.value)}
              rows={3}
              placeholder="DDx, plano, notas adicionais..."
              className="text-sm resize-y"
            />
          </div>
        </div>
      </div>

      {/* Diagnóstico diferencial */}
      {data.diagnostico_diferencial.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-stone-100 px-5 py-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-bold text-slate-700">Diagnóstico Diferencial</span>
          </div>
          <div className="p-5 space-y-2">
            {data.diagnostico_diferencial.map((ddx) => (
              <div
                key={ddx.condicao}
                className="text-xs text-slate-600 bg-slate-50 rounded border border-slate-200 p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] h-5">
                    {ddx.pertence_a_classe ? "Interno" : "Externo"}
                  </Badge>
                  <strong className="text-stone-700">{ddx.condicao}</strong>
                </div>
                <p className="text-slate-400 leading-relaxed">{ddx.ponto_distincao}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

---

## src/infra/components/ui/symptom-item.tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Sintoma } from "@/infra/types";

interface SymptomItemProps {
  sintoma: Sintoma;
  checked: boolean;
  severity: string;
  onToggle: (checked: boolean) => void;
  onSeverityChange: (severity: string) => void;
}

export function SymptomItem({
  sintoma,
  checked,
  severity,
  onToggle,
  onSeverityChange,
}: SymptomItemProps) {
  // Fallback para dados incompletos
  const rotulo = sintoma.rotulo?.trim() || `Sintoma ${sintoma.id}`;
  const desc = sintoma.desc?.trim() || "";
  const pergunta = sintoma.pergunta?.trim() || "";

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-2.5 rounded-lg transition",
        checked ? "bg-blue-50/50" : "hover:bg-slate-50"
      )}
    >
      {/* Checkbox customizado mais visível */}
      <button
        type="button"
        onClick={() => onToggle(!checked)}
        className={cn(
          "mt-0.5 shrink-0 w-5 h-5 rounded border-2 transition-all duration-150 flex items-center justify-center",
          checked
            ? "bg-blue-600 border-blue-600 shadow-sm"
            : "bg-white border-slate-300 hover:border-blue-400"
        )}
        aria-checked={checked}
        role="checkbox"
      >
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onToggle(!checked)}>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-semibold tracking-wide uppercase text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
            {sintoma.id}
          </span>
          <span className={cn(
            "text-sm font-semibold",
            checked ? "text-blue-800" : "text-slate-700"
          )}>
            {rotulo}
          </span>
        </div>
        {desc && (
          <p className={cn(
            "text-xs leading-relaxed mb-1",
            checked ? "text-blue-700/80" : "text-stone-600"
          )}>
            {desc}
          </p>
        )}
        {pergunta && (
          <p className="text-xs text-slate-400 italic leading-relaxed flex items-center gap-1">
            <span className="text-slate-300">&ldquo;</span>
            {pergunta}
            <span className="text-slate-300">&rdquo;</span>
          </p>
        )}
      </div>

      <Select value={severity} onValueChange={onSeverityChange}>
        <SelectTrigger className={cn(
          "w-24 h-7 text-xs border-slate-200",
          checked ? "bg-white border-blue-200" : "bg-slate-50"
        )}>
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_none">—</SelectItem>
          <SelectItem value="leve">Leve</SelectItem>
          <SelectItem value="moderado">Moderado</SelectItem>
          <SelectItem value="grave">Grave</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

---

## src/infra/components/ui/accordion-section.tsx
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { getIcone } from "@/infra/utils/mapear-icones";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionSectionProps {
  title: string;
  icon?: string | LucideIcon;
  badge?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  color?: "blue" | "amber" | "red" | "green" | "slate";
  className?: string;
}

const colorMap = {
  blue: "text-blue-600",
  amber: "text-amber-600",
  red: "text-red-600",
  green: "text-emerald-600",
  slate: "text-slate-600",
};

export function AccordionSection({
  title,
  icon,
  badge,
  children,
  defaultOpen = true,
  color = "blue",
  className,
}: AccordionSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  const IconComponent = typeof icon === "string" ? getIcone(icon) : icon;
  const hasIcon = IconComponent !== undefined;

  return (
    <section
      className={cn(
        "bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="bg-stone-100 w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-stone-200 transition-colors"
        aria-expanded={open}
      >
        <div className={cn("flex items-center gap-2 font-bold", colorMap[color])}>
          {hasIcon && <IconComponent className="w-4 h-4" />}
          <span>{title}</span>
        </div>
        <span className="flex items-center gap-2">
          {badge}
          <ChevronDown
            className={cn(
              "w-4 h-4 text-slate-400 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </span>
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-200 ease-out",
          open ? "max-h-[3000px]" : "max-h-0"
        )}
      >
        <div className="p-5 space-y-3 border-t border-slate-100">{children}</div>
      </div>
    </section>
  );
}

---

## src/infra/components/consulta-renderer.tsx
// ═══════════════════════════════════════════════════════════════════════════
// ConsultaRenderer — Componente UNIVERSAL para TODOS os transtornos DSM-5
// Recebe TranstornoDSM e renderiza: header, identificação, content (FULL/SHORT), sidebar
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from "react";
import { useDSMAvaliacao } from "@/infra/hooks/use-dsm-avaliacao";
import { ConsultaFull } from "./consulta-full";
import { ConsultaShort } from "./consulta-short";
import { IdentificacaoPaciente } from "./identificacao-paciente";
import type { TranstornoDSM } from "@/infra/types";
import { FileText, ChevronUp } from "lucide-react";

interface Props {
  data: TranstornoDSM;
}

export function ConsultaRenderer({ data }: Props) {
  const hook = useDSMAvaliacao(data);
  const isFull = data.category === "FULL";
  const [showMarkdown, setShowMarkdown] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-slate-800 truncate">{data.name}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${isFull ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                  {data.category}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {data.estrutura_diagnostica} • {data.diagnostic_rule.length > 80 ? data.diagnostic_rule.slice(0, 80) + "..." : data.diagnostic_rule}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${hook.allConfirmed ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                {hook.confirmedCount}/{hook.totalCriterios} critérios
              </span>
              <button onClick={() => setShowMarkdown(!showMarkdown)}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {showMarkdown ? "Ocultar" : "Relatório"}
              </button>
              <button onClick={hook.reset}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
                Limpar
              </button>
              <button onClick={hook.copiarMarkdown}
                className="text-xs px-3 py-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition">
                Copiar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Markdown Preview (expandible) */}
      {showMarkdown && (
        <div className="bg-slate-800 text-slate-100 border-b border-slate-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pré-visualização do Relatório</span>
              <button onClick={() => setShowMarkdown(false)} className="text-slate-400 hover:text-white">
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
            <pre className="text-xs leading-relaxed whitespace-pre-wrap font-mono text-slate-300 max-h-96 overflow-auto">{hook.markdown}</pre>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-10 gap-6">
          {/* Main content */}
          <div className="xl:col-span-7 space-y-4">
            {/* Identificação do paciente */}
            <IdentificacaoPaciente identificacao={hook.identificacao} setField={hook.setIdentificacaoField} />

            {/* Consulta Full ou Short */}
            {isFull
              ? <ConsultaFull data={data} hook={hook} />
              : <ConsultaShort data={data} hook={hook} />
            }
          </div>

          {/* Right sidebar */}
          <aside className="xl:col-span-3 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sticky top-20">
              <h3 className="text-sm font-bold text-slate-700 mb-3">Resumo da Avaliação</h3>

              <div className="space-y-3">
                {/* Identificação resumo */}
                {hook.identificacao.paciente && (
                  <div className="bg-blue-50 rounded-lg p-2.5">
                    <p className="text-sm font-semibold text-blue-800">{hook.identificacao.paciente}</p>
                    {hook.identificacao.data_nascimento && <p className="text-xs text-blue-600">Nasc: {hook.identificacao.data_nascimento}</p>}
                    {hook.identificacao.sexo && <p className="text-xs text-blue-600">Sexo: {hook.identificacao.sexo}</p>}
                  </div>
                )}

                {/* Contagem de sintomas por cluster */}
                {hook.hasClustersSintomas && data.clusters_sintomas?.map((cluster: any) => {
                  const cc = hook.clusterCounts[cluster.id];
                  if (!cc) return null;
                  const atingiu = cc.confirmed >= cc.limiar;
                  return (
                    <div key={cluster.id} className="flex justify-between text-sm items-center">
                      <span className="text-slate-500">{cluster.id} — {cluster.nome.split("—")[0].trim()}</span>
                      <span className={`font-semibold ${atingiu ? "text-emerald-600" : "text-slate-700"}`}>
                        {cc.confirmed}/{cc.total} {cc.limiar > 0 ? `(≥${cc.limiar})` : ""}
                      </span>
                    </div>
                  );
                })}

                {/* Critérios condicionais */}
                {hook.hasCriteriosCondicionais && data.criterios_condicionais && (
                  <div>
                    <span className="text-xs text-slate-500">Critérios Condicionais</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {data.criterios_condicionais.map((c: any) => (
                        <span key={c.id} className={`text-[10px] px-1.5 py-0.5 rounded ${hook.criteriosCondState[c.id] ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                          {c.letra}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Critérios simples */}
                {!hook.hasClustersSintomas && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Critérios</span>
                    <span className={`font-semibold ${hook.allConfirmed ? "text-emerald-600" : "text-slate-700"}`}>
                      {hook.confirmedCount}/{hook.totalCriterios}
                    </span>
                  </div>
                )}

                {data.severity.has_formal_severity && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Gravidade</span>
                    <span className="font-semibold text-slate-700">{hook.severityLevel || "—"}</span>
                  </div>
                )}

                {data.specifiers.length > 0 && (
                  <div>
                    <span className="text-xs text-slate-500">Especificadores</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {hook.specifiersSelected.length > 0
                        ? hook.specifiersSelected.map((s: string) => (
                            <span key={s} className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">{s}</span>
                          ))
                        : <span className="text-xs text-slate-400">Nenhum selecionado</span>
                      }
                    </div>
                  </div>
                )}

                {data.subtypes_presentations.length > 0 && (
                  <div>
                    <span className="text-xs text-slate-500">Subtipos</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {hook.subtypesSelected.length > 0
                        ? hook.subtypesSelected.map((s: string) => (
                            <span key={s} className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">{s}</span>
                          ))
                        : <span className="text-xs text-slate-400">Nenhum selecionado</span>
                      }
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-500">Status diagnóstico</span>
                  <p className={`text-sm font-semibold mt-0.5 ${hook.allConfirmed ? "text-emerald-600" : "text-slate-600"}`}>
                    {hook.allConfirmed ? "✓ Critérios completos" : "☐ Em avaliação"}
                  </p>
                </div>

                {data.age_onset && (
                  <div className="border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-500">Início típico</span>
                    <p className="text-sm text-slate-700 mt-0.5">{data.age_onset ? data.age_onset.replaceAll("**", "").trim() : ""}</p>
                  </div>
                )}

                {data.duration && (
                  <div className="border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-500">Duração mínima</span>
                    <p className="text-sm text-slate-700 mt-0.5">{data.duration}</p>
                  </div>
                )}

                {data.functional_impairment && (
                  <div className="border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-500">Impacto funcional</span>
                    <p className="text-sm text-slate-700 mt-0.5">{data.functional_impairment}</p>
                  </div>
                )}

                {data.exclusions.length > 0 && (
                  <div className="border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-500">Exclusões ({data.exclusions.length})</span>
                    <ul className="mt-1 space-y-1">
                      {data.exclusions.map((ex: string, i: number) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                          <span className="text-red-400 mt-0.5">×</span>{ex}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

---

## src/infra/components/consulta-short.tsx
// Renderer para TRANSTORNOS SHORT (81)
// Renderiza: criteria compactos, key_questions, alerts, campos especiais (resumo_clinico, linha_do_tempo, substancias)
import { CheckCircle2, XCircle, AlertTriangle, Brain, Clock, Pill, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { TranstornoDSM, DifferentialV2B } from "@/infra/types";

interface Props {
  data: TranstornoDSM;
  hook: any;
}

function isDifferentialV2BArray(arr: string[] | DifferentialV2B[]): arr is DifferentialV2B[] {
  return arr.length > 0 && typeof arr[0] === "object" && "condicao" in arr[0];
}

export function ConsultaShort({ data, hook }: Props) {
  const h = hook;

  return (
    <div className="xl:col-span-7 space-y-4">
      {/* Badge SHORT */}
      <div className="flex items-center gap-2">
        <Badge className="bg-slate-600 text-white hover:bg-slate-700">SHORT</Badge>
        <span className="text-xs text-slate-500">{data.estrutura_diagnostica}</span>
        {data.duration && (
          <Badge variant="outline" className="text-xs flex items-center gap-1">
            <Clock className="w-3 h-3" /> {data.duration}
          </Badge>
        )}
      </div>

      {/* Resumo clínico (campo especial SHORT) */}
      {data.resumo_clinico && (
        <section className="rounded-xl border border-blue-200 bg-blue-50 overflow-hidden">
          <div className="bg-blue-100 px-5 py-3 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold text-blue-800">Resumo Clínico</span>
          </div>
          <div className="p-4">
            <p className="text-sm text-blue-900 leading-relaxed">{data.resumo_clinico}</p>
          </div>
        </section>
      )}

      {/* Critérios compactos */}
      {h.criterios.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-stone-100 px-5 py-3 flex items-center gap-2">
            <Brain className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold text-slate-700">Critérios Diagnósticos</span>
            <Badge variant="outline" className="ml-auto text-slate-400">{h.confirmedCount}/{h.totalCriterios}</Badge>
          </div>
          <div className="p-4 space-y-2">
            <p className="text-xs text-slate-500 bg-blue-50 rounded p-2 mb-3">{data.diagnostic_rule}</p>
            {h.criterios.map((c: any) => {
              const active = !!h.criteriaState[c.id];
              return (
                <div key={c.id} className={`rounded-lg border p-3 transition ${active ? "border-emerald-300 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{active ? <CheckCircle2 className="w-5 h-5 text-emerald-600"/> : <XCircle className="w-5 h-5 text-slate-300"/>}</div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded mr-2 ${active ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>{c.id}</span>
                      <p className={`text-sm leading-relaxed mt-1 ${active ? "text-emerald-800" : "text-stone-700"}`}>{c.text}</p>
                      <button onClick={() => h.toggleCriterion(c.id)}
                        className={`mt-2 text-xs h-7 px-3 rounded-md border transition ${active ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                        {active ? "Confirmado ✓" : "Confirmar"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Linha do tempo (campo especial SHORT) */}
      {data.linha_do_tempo && data.linha_do_tempo.length > 0 && (
        <section className="rounded-xl border border-indigo-200 bg-indigo-50 overflow-hidden">
          <div className="bg-indigo-100 px-5 py-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-bold text-indigo-800">Linha do Tempo</span>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {data.linha_do_tempo.map((item, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="shrink-0 w-20 text-xs font-bold text-indigo-700 bg-indigo-200 rounded px-2 py-1 text-center">{item.tempo}</div>
                  <div className="flex-1">
                    {item.sintomas && <p className="text-sm text-indigo-900">{item.sintomas}</p>}
                    {item.evento && <p className="text-sm text-indigo-900">{item.evento}</p>}
                    {item.risco_mortalidade && (
                      <Badge variant="outline" className="mt-1 text-xs border-red-300 text-red-700">{item.risco_mortalidade}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Substâncias (campo especial SHORT) */}
      {data.substancias && data.substancias.length > 0 && (
        <section className="rounded-xl border border-violet-200 bg-violet-50 overflow-hidden">
          <div className="bg-violet-100 px-5 py-3 flex items-center gap-2">
            <Pill className="w-4 h-4 text-violet-600" />
            <span className="text-sm font-bold text-violet-800">Substâncias</span>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {data.substancias.map((s: string, i: number) => (
              <Badge key={i} variant="outline" className="text-xs bg-white">{s}</Badge>
            ))}
          </div>
        </section>
      )}

      {/* Sinais clínicos de triagem */}
      {data.sinais_clinicos_triagem && (
        <section className="rounded-xl border border-teal-200 bg-teal-50 overflow-hidden">
          <div className="bg-teal-100 px-5 py-3"><span className="text-sm font-bold text-teal-800">Sinais de Triagem</span></div>
          <div className="p-4"><p className="text-sm text-teal-900">{data.sinais_clinicos_triagem}</p></div>
        </section>
      )}

      {/* Perguntas chave por critério (campo especial de substâncias) */}
      {data.perguntas_chave_por_criterio && (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-stone-100 px-5 py-3"><span className="text-sm font-bold text-slate-700">Perguntas por Critério</span></div>
          <div className="p-4 space-y-4">
            {Object.entries(data.perguntas_chave_por_criterio).map(([criterio, perguntas]) => (
              <div key={criterio}>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 rounded px-2 py-0.5">{criterio}</span>
                <ul className="mt-2 space-y-1">
                  {(perguntas as string[]).map((p, i) => (
                    <li key={i} className="text-sm text-stone-700 flex items-start gap-2">
                      <span className="text-slate-400 mt-1">•</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Key Questions */}
      {data.key_questions.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-stone-100 px-5 py-3"><span className="text-sm font-bold text-slate-700">Perguntas-Chave ({h.kqAnsweredCount}/{data.key_questions.length})</span></div>
          <div className="p-4 space-y-2">
            {data.key_questions.map((q: string, i: number) => {
              const qid = `q${i}`;
              const answered = !!h.keyQuestionsAnswers[qid];
              return (
                <div key={qid} className={`flex items-start gap-3 p-2 rounded-lg ${answered ? "bg-emerald-50" : ""}`}>
                  <button onClick={() => h.toggleKeyQuestion(qid)}
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${answered ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                    {answered && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                  </button>
                  <p className={`text-sm ${answered ? "text-emerald-700" : "text-stone-700"}`}>{q}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Diferenciais (com formato objeto em substâncias SHORT) */}
      {data.critical_differentials.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-stone-100 px-5 py-3"><span className="text-sm font-bold text-slate-700">Diagnóstico Diferencial</span></div>
          <div className="p-4 space-y-2">
            {isDifferentialV2BArray(data.critical_differentials)
              ? (data.critical_differentials as DifferentialV2B[]).map((d, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-semibold text-slate-700">{d.condicao}</span>
                    <span className="text-slate-400 mx-2">→</span>
                    <span className="text-slate-500">{d.diferenciador}</span>
                  </div>
                ))
              : (data.critical_differentials as string[]).map((d, i) => (
                  <p key={i} className="text-sm text-stone-700">• {d}</p>
                ))
            }
          </div>
        </section>
      )}

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
          <div className="bg-amber-100 px-5 py-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-bold text-amber-800">Alertas Clínicos</span>
          </div>
          <div className="p-4 space-y-2">
            {data.alerts.map((alert: string, i: number) => (
              <p key={i} className="text-sm text-amber-700">• {alert}</p>
            ))}
          </div>
        </section>
      )}

      {/* Notas clínicas */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-stone-100 px-5 py-3"><span className="text-sm font-bold text-slate-700">Anotações Clínicas</span></div>
        <div className="p-4 space-y-3">
          <Textarea value={h.notasClinicas.historia || ""} rows={3}
            onChange={(e) => h.setNotasField("historia", e.target.value)}
            placeholder="História e motivo da consulta..." className="text-sm" />
          <Textarea value={h.notasClinicas.observacoes_gerais || ""} rows={2}
            onChange={(e) => h.setNotasField("observacoes_gerais", e.target.value)}
            placeholder="Observações gerais, DDx, plano..." className="text-sm" />
        </div>
      </section>
    </div>
  );
}

---

## src/infra/components/identificacao-paciente.tsx
import { User, Calendar, GraduationCap, Briefcase, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { IdentificacaoState } from "@/infra/types";

interface Props {
  identificacao: IdentificacaoState;
  setField: (field: string, value: string) => void;
}

const ESCOLARIDADES = [
  "Ensino Fundamental Incompleto",
  "Ensino Fundamental Completo",
  "Ensino Médio Incompleto",
  "Ensino Médio Completo",
  "Ensino Superior Incompleto",
  "Ensino Superior Completo",
  "Pós-graduação",
  "Não alfabetizado",
];

export function IdentificacaoPaciente({ identificacao, setField }: Props) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="bg-blue-50 px-5 py-3 flex items-center gap-2 border-b border-blue-100">
        <User className="w-4 h-4 text-blue-600" />
        <span className="text-sm font-bold text-slate-700">Identificação do Paciente</span>
      </div>
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Nome */}
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500 flex items-center gap-1">
            <User className="w-3 h-3" /> Nome completo
          </Label>
          <Input value={identificacao.paciente} onChange={(e) => setField("paciente", e.target.value)}
            placeholder="Nome do paciente" className="text-sm h-9" />
        </div>

        {/* Data de nascimento */}
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Data de nascimento
          </Label>
          <Input type="date" value={identificacao.data_nascimento}
            onChange={(e) => setField("data_nascimento", e.target.value)}
            className="text-sm h-9" />
        </div>

        {/* Sexo */}
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Sexo biológico</Label>
          <select value={identificacao.sexo} onChange={(e) => setField("sexo", e.target.value)}
            className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
            <option value="">Selecionar...</option>
            <option value="Masculino">Masculino</option>
            <option value="Feminino">Feminino</option>
            <option value="Intersexo">Intersexo</option>
          </select>
        </div>

        {/* Escolaridade */}
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500 flex items-center gap-1">
            <GraduationCap className="w-3 h-3" /> Escolaridade
          </Label>
          <select value={identificacao.escolaridade} onChange={(e) => setField("escolaridade", e.target.value)}
            className="w-full h-9 px-3 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white">
            <option value="">Selecionar...</option>
            {ESCOLARIDADES.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>

        {/* Ocupação */}
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500 flex items-center gap-1">
            <Briefcase className="w-3 h-3" /> Ocupação
          </Label>
          <Input value={identificacao.ocupacao} onChange={(e) => setField("ocupacao", e.target.value)}
            placeholder="Profissão/ocupação" className="text-sm h-9" />
        </div>

        {/* Queixa principal */}
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
          <Label className="text-xs text-slate-500 flex items-center gap-1">
            <FileText className="w-3 h-3" /> Queixa principal
          </Label>
          <Input value={identificacao.queixa} onChange={(e) => setField("queixa", e.target.value)}
            placeholder="Motivo da consulta" className="text-sm h-9" />
        </div>
      </div>
    </section>
  );
}

---

## src/infra/components/layout/dynamic-consulta.tsx
// ═══════════════════════════════════════════════════════════════════════════
// Dynamic Consulta Loader
// Recebe o módulo da doença via route loader e renderiza o componente
// ═══════════════════════════════════════════════════════════════════════════

import { useMatch } from "@tanstack/react-router";
import type { DiseaseModule } from "@/infra/disease-registry";

export default function DynamicConsulta() {
  const match = useMatch({ from: "/consulta/$doencaId" });
  const { module: mod } = match.loaderData as { module: DiseaseModule };

  const Component = mod.default;

  return <Component />;
}

---

## src/infra/components/layout/identificacao-paciente.tsx
import { User, Cake, Users, GraduationCap, Briefcase, MessageSquarePlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AccordionSection } from "@/infra/components/ui/accordion-section";

interface IdentificacaoPacienteProps {
  values: {
    paciente?: string;
    dataNascimento?: string;
    sexo?: string;
    escolaridade?: string;
    ocupacao?: string;
    queixa?: string;
  };
  onChange: (field: string, value: string) => void;
}

const opcoesSexo = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "nao-binario", label: "Não-binário" },
  { value: "trans-feminino", label: "Mulher Trans" },
  { value: "trans-masculino", label: "Homem Trans" },
  { value: "outro", label: "Outro" },
  { value: "prefiro-nao-informar", label: "Prefiro não informar" },
];

const opcoesEscolaridade = [
  { value: "fundamental-incompleto", label: "Ensino Fundamental Incompleto" },
  { value: "fundamental-completo", label: "Ensino Fundamental Completo" },
  { value: "medio-incompleto", label: "Ensino Médio Incompleto" },
  { value: "medio-completo", label: "Ensino Médio Completo" },
  { value: "tecnico", label: "Ensino Técnico" },
  { value: "superior-incompleto", label: "Ensino Superior Incompleto" },
  { value: "superior-completo", label: "Ensino Superior Completo" },
  { value: "pos-graduacao", label: "Pós-graduação" },
  { value: "mestrado", label: "Mestrado" },
  { value: "doutorado", label: "Doutorado" },
  { value: "outro", label: "Outro" },
];

export function IdentificacaoPaciente({ values, onChange }: IdentificacaoPacienteProps) {
  return (
    <AccordionSection title="Identificação do Paciente" icon="fa-user-pen" color="blue" defaultOpen>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 mb-1">
            <User className="w-3 h-3 text-slate-400" />
            Nome / ID
          </label>
          <Input
            value={values.paciente || ""}
            onChange={(e) => onChange("paciente", e.target.value)}
            placeholder="Identificação"
            className="text-sm"
          />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 mb-1">
            <Cake className="w-3 h-3 text-slate-400" />
            Data de Nascimento
          </label>
          <Input
            type="date"
            value={values.dataNascimento || ""}
            onChange={(e) => onChange("dataNascimento", e.target.value)}
            className="text-sm"
          />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 mb-1">
            <Users className="w-3 h-3 text-slate-400" />
            Sexo
          </label>
          <Select value={values.sexo || undefined} onValueChange={(v) => onChange("sexo", v)}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Não informado" />
            </SelectTrigger>
            <SelectContent>
              {opcoesSexo.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 mb-1">
            <GraduationCap className="w-3 h-3 text-slate-400" />
            Escolaridade
          </label>
          <Select value={values.escolaridade || undefined} onValueChange={(v) => onChange("escolaridade", v)}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {opcoesEscolaridade.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 mb-1">
            <Briefcase className="w-3 h-3 text-slate-400" />
            Ocupação atual
          </label>
          <Input
            value={values.ocupacao || ""}
            onChange={(e) => onChange("ocupacao", e.target.value)}
            placeholder="Ex.: analista financeiro"
            className="text-sm"
          />
        </div>
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 mb-1">
          <MessageSquarePlus className="w-3 h-3 text-slate-400" />
          Queixa principal / motivo da consulta
        </label>
        <Textarea
          value={values.queixa || ""}
          onChange={(e) => onChange("queixa", e.target.value)}
          rows={2}
          placeholder="Descreva a queixa principal que motivou a avaliação"
          className="text-sm resize-y"
        />
      </div>
    </AccordionSection>
  );
}

---

## src/infra/components/layout/consulta-shell.tsx
import { Brain, Printer, RotateCcw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface ConsultaShellProps {
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
  acoes?: React.ReactNode;
  onPrint?: () => void;
  onReset?: () => void;
  className?: string;
}

export function ConsultaShell({
  titulo,
  subtitulo,
  children,
  acoes,
  onPrint,
  onReset,
  className,
}: ConsultaShellProps) {
  return (
    <div className={cn("min-h-screen bg-lime-50/60 text-slate-700", className)}>
      {/* Header */}
      <header className="bg-stone-300 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight font-serif">
                {titulo}
              </h1>
              <p className="text-xs text-stone-700">{subtitulo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs bg-white border-stone-300 hover:bg-stone-50">
                  <ChevronDown className="w-3 h-3 mr-1" />
                  Transtornos
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <a href="#/consulta/transtorno_deficit_atencao_hiperatividade">TDAH</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="#/consulta/transtorno_tourette">Tourette</a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="#/consulta/transtorno_do_espectro_autista">TEA</a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {acoes}
            {onPrint && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPrint}
                className="text-xs bg-blue-700 text-white border-0 hover:bg-blue-800"
              >
                <Printer className="w-3 h-3 mr-1" />
                Imprimir
              </Button>
            )}
            {onReset && (
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                className="text-xs bg-orange-700 text-white border-0 hover:bg-orange-800"
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {children}
        </div>
      </main>
    </div>
  );
}

---

## src/infra/components/consulta-full.tsx
// Renderer para TRANSTORNOS FULL (79)
// Renderiza: clusters_sintomas com checkboxes, criterios_condicionais, criteria simples,
//             severity, specifiers, subtypes, key_questions, alerts
import { CheckCircle2, XCircle, AlertTriangle, Brain, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import type { TranstornoDSM, SubtypeV2B, SpecifierV2B } from "@/infra/types";

interface Props {
  data: TranstornoDSM;
  hook: any;
}

function getSubtypeKey(sub: string | SubtypeV2B): string { return typeof sub === "string" ? sub : sub.id; }
function getSubtypeLabel(sub: string | SubtypeV2B): string { return typeof sub === "string" ? sub : sub.name; }
function getSpecifierKey(sp: string | SpecifierV2B): string { return typeof sp === "string" ? sp : sp.id; }
function getSpecifierLabel(sp: string | SpecifierV2B): string { return typeof sp === "string" ? sp : sp.name; }

export function ConsultaFull({ data, hook }: Props) {
  const h = hook;

  return (
    <div className="xl:col-span-7 space-y-4">

      {/* ═══════════════════════════════════════════════
          CLUSTERS DE SINTOMAS — checkboxes individuais
          ═══════════════════════════════════════════════ */}
      {h.hasClustersSintomas && data.clusters_sintomas?.map((cluster: any) => {
        const cc = h.clusterCounts[cluster.id] || { confirmed: 0, total: 0, limiar: 0 };
        const atingiuLimiar = cc.confirmed >= cc.limiar;
        return (
          <section key={cluster.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-stone-100 px-5 py-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-bold text-slate-700">{cluster.nome}</span>
              <Badge className={`ml-auto text-xs ${atingiuLimiar ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {cc.confirmed}/{cc.total}{cc.limiar > 0 ? ` (≥${cc.limiar})` : ""}
              </Badge>
            </div>
            {cluster.descricao_qualitativa && (
              <p className="px-5 py-2 text-xs text-slate-500 bg-blue-50/50">{cluster.descricao_qualitativa}</p>
            )}
            <div className="p-4 space-y-2">
              {cluster.sintomas.map((s: any) => {
                const active = !!h.sintomasState[s.id];
                return (
                  <div key={s.id} className={`rounded-lg border p-3 transition ${active ? "border-emerald-300 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{active ? <CheckCircle2 className="w-5 h-5 text-emerald-600"/> : <XCircle className="w-5 h-5 text-slate-300"/>}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${active ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>{s.id}</span>
                          <span className="text-sm font-semibold text-slate-700">{s.rotulo}</span>
                        </div>
                        <p className={`text-sm leading-relaxed mb-2 ${active ? "text-emerald-800" : "text-stone-700"}`}>{s.desc}</p>
                        {s.pergunta && (
                          <div className="flex items-start gap-1.5 mb-2 text-xs text-slate-500 bg-slate-50 rounded p-2">
                            <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-blue-400" />
                            {s.pergunta}
                          </div>
                        )}
                        {s.exemplos_clinicos?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {s.exemplos_clinicos.map((ex: string, i: number) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">{ex}</span>
                            ))}
                          </div>
                        )}
                        <button onClick={() => h.toggleSintoma(s.id)}
                          className={`text-xs h-7 px-3 rounded-md border transition ${active ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                          {active ? "Confirmado ✓" : "Confirmar"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* ═══════════════════════════════════════════════
          CRITÉRIOS CONDICIONAIS — B, C, D, E
          ═══════════════════════════════════════════════ */}
      {h.hasCriteriosCondicionais && data.criterios_condicionais && (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-indigo-50 px-5 py-3 flex items-center gap-2 border-b border-indigo-100">
            <span className="text-sm font-bold text-indigo-800">Critérios Condicionais</span>
            <Badge variant="outline" className="ml-auto text-xs">
              {Object.values(h.criteriosCondState).filter(Boolean).length}/{data.criterios_condicionais.length}
            </Badge>
          </div>
          <div className="p-4 space-y-3">
            {data.criterios_condicionais.map((c: any) => {
              const active = !!h.criteriosCondState[c.id];
              return (
                <div key={c.id} className={`rounded-lg border p-4 transition ${active ? "border-emerald-300 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{active ? <CheckCircle2 className="w-5 h-5 text-emerald-600"/> : <XCircle className="w-5 h-5 text-slate-300"/>}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-sm font-bold px-2 py-0.5 rounded ${active ? "bg-emerald-500 text-white" : "bg-indigo-100 text-indigo-700"}`}>{c.letra}</span>
                        <span className="text-sm font-semibold text-slate-700">{c.rotulo}</span>
                        {c.obrigatorio && <Badge variant="outline" className="text-[10px] border-red-200 text-red-500">Obrigatório</Badge>}
                      </div>
                      <p className={`text-sm leading-relaxed mb-3 ${active ? "text-emerald-800" : "text-stone-700"}`}>{c.descricao_completa}</p>
                      <button onClick={() => h.toggleCriterioCondicional(c.id)}
                        className={`text-xs h-7 px-3 rounded-md border transition ${active ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                        {active ? "Confirmado ✓" : "Confirmar"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════
          CRITÉRIOS SIMPLES — para transtornos sem clusters
          ═══════════════════════════════════════════════ */}
      {!h.hasClustersSintomas && h.criterios.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-stone-100 px-5 py-3 flex items-center gap-2">
            <Brain className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-bold text-slate-700">Critérios Diagnósticos</span>
            <Badge variant="outline" className="ml-auto text-slate-400">{h.confirmedCount}/{h.totalCriterios}</Badge>
          </div>
          <div className="p-4 space-y-2">
            <p className="text-xs text-slate-500 bg-blue-50 rounded p-2 mb-3">{data.diagnostic_rule}</p>
            {h.criterios.map((c: any) => {
              const active = !!h.criteriaState[c.id];
              return (
                <div key={c.id} className={`rounded-lg border p-3 transition ${active ? "border-emerald-300 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{active ? <CheckCircle2 className="w-5 h-5 text-emerald-600"/> : <XCircle className="w-5 h-5 text-slate-300"/>}</div>
                    <div className="flex-1 min-w-0">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded mr-2 ${active ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>{c.id}</span>
                      <p className={`text-sm leading-relaxed mt-1 ${active ? "text-emerald-800" : "text-stone-700"}`}>{c.text}</p>
                      <button onClick={() => h.toggleCriterion(c.id)}
                        className={`mt-2 text-xs h-7 px-3 rounded-md border transition ${active ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                        {active ? "Confirmado ✓" : "Confirmar"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Severidade */}
      {data.severity?.has_formal_severity && data.severity.levels.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-stone-100 px-5 py-3 flex items-center gap-2">
            <span className="text-sm font-bold text-slate-700">Gravidade — {data.severity.type}</span>
          </div>
          <div className="p-4">
            {data.severity.assignment_rule && <p className="text-xs text-slate-500 mb-3">{data.severity.assignment_rule}</p>}
            <div className="flex flex-wrap gap-2">
              {data.severity.levels.map((level: string) => (
                <button key={level} onClick={() => h.setSeverityLevel(level === h.severityLevel ? "" : level)}
                  className={`text-xs px-3 py-1.5 rounded-md border transition ${h.severityLevel === level ? "bg-blue-100 text-blue-700 border-blue-300" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                  {level}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Especificadores */}
      {data.specifiers.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-stone-100 px-5 py-3"><span className="text-sm font-bold text-slate-700">Especificadores</span></div>
          <div className="p-4 flex flex-wrap gap-2">
            {data.specifiers.map((spec) => {
              const key = getSpecifierKey(spec);
              const label = getSpecifierLabel(spec);
              return (
                <button key={key} onClick={() => h.toggleSpecifier(key)}
                  className={`text-xs px-3 py-1.5 rounded-md border transition ${h.specifiersSelected.includes(key) ? "bg-amber-100 text-amber-700 border-amber-300" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                  {label}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Subtipos */}
      {data.subtypes_presentations.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-stone-100 px-5 py-3"><span className="text-sm font-bold text-slate-700">Subtipos / Apresentações</span></div>
          <div className="p-4 flex flex-wrap gap-2">
            {data.subtypes_presentations.map((sub) => {
              const key = getSubtypeKey(sub);
              const label = getSubtypeLabel(sub);
              return (
                <button key={key} onClick={() => h.toggleSubtype(key)}
                  className={`text-xs px-3 py-1.5 rounded-md border transition ${h.subtypesSelected.includes(key) ? "bg-purple-100 text-purple-700 border-purple-300" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
                  {label}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Clusters assessment (notas textuais) */}
      {data.clusters.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-stone-100 px-5 py-3"><span className="text-sm font-bold text-slate-700">Áreas de Avaliação</span></div>
          <div className="p-4 space-y-3">
            {data.clusters.map((cl: string) => (
              <div key={cl}>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">{cl}</label>
                <Textarea value={h.clustersAssessment[cl] || ""} rows={2}
                  onChange={(e) => h.setClusterNote(cl, e.target.value)}
                  placeholder={`Anotações sobre ${cl}...`} className="text-sm" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Key Questions */}
      {data.key_questions.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-stone-100 px-5 py-3"><span className="text-sm font-bold text-slate-700">Perguntas-Chave ({h.kqAnsweredCount}/{data.key_questions.length})</span></div>
          <div className="p-4 space-y-2">
            {data.key_questions.map((q: string, i: number) => {
              const qid = `q${i}`;
              const answered = !!h.keyQuestionsAnswers[qid];
              return (
                <div key={qid} className={`flex items-start gap-3 p-2 rounded-lg ${answered ? "bg-emerald-50" : ""}`}>
                  <button onClick={() => h.toggleKeyQuestion(qid)}
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${answered ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                    {answered && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                  </button>
                  <p className={`text-sm ${answered ? "text-emerald-700" : "text-stone-700"}`}>{q}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden">
          <div className="bg-amber-100 px-5 py-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-bold text-amber-800">Alertas Clínicos</span>
          </div>
          <div className="p-4 space-y-2">
            {data.alerts.map((alert: string, i: number) => (
              <p key={i} className="text-sm text-amber-700">• {alert}</p>
            ))}
          </div>
        </section>
      )}

      {/* Notas */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-stone-100 px-5 py-3"><span className="text-sm font-bold text-slate-700">Anotações Clínicas</span></div>
        <div className="p-4 space-y-3">
          <Textarea value={h.notasClinicas.historia || ""} rows={3}
            onChange={(e) => h.setNotasField("historia", e.target.value)}
            placeholder="História e motivo da consulta..." className="text-sm" />
          <Textarea value={h.notasClinicas.observacoes_gerais || ""} rows={2}
            onChange={(e) => h.setNotasField("observacoes_gerais", e.target.value)}
            placeholder="Observações gerais, DDx, plano..." className="text-sm" />
        </div>
      </section>
    </div>
  );
}

---

## src/infra/disease-registry.generated.ts
// Auto-generated from DSM operational release. Do not edit manually.
import type { ComponentType } from "react";
import type { EstruturaGeral } from "@/infra/types";

export interface DiseaseModule {
  default: ComponentType;
  meta?: {
    id: string;
    nome: string;
    sigla?: string;
    capituloId: string;
  };
  config?: {
    estrutura?: EstruturaGeral;
    route?: string;
  };
}

export const diseaseImports: Record<string, () => Promise<DiseaseModule>> = {
  "deficiencia_intelectual": () => import("@/doencas/01-neurodesenvolvimento/deficiencia_intelectual"),
  "deficit_de_atencao_hiperatividade": () => import("@/doencas/01-neurodesenvolvimento/deficit_de_atencao_hiperatividade"),
  "desenvolvimento_da_coordenacao": () => import("@/doencas/01-neurodesenvolvimento/desenvolvimento_da_coordenacao"),
  "espectro_autista": () => import("@/doencas/01-neurodesenvolvimento/espectro_autista"),
  "movimento_estereotipado": () => import("@/doencas/01-neurodesenvolvimento/movimento_estereotipado"),
  "tique_motor_ou_vocal_persistente": () => import("@/doencas/01-neurodesenvolvimento/tique_motor_ou_vocal_persistente"),
  "tique_transitorio": () => import("@/doencas/01-neurodesenvolvimento/tique_transitorio"),
  "tourette": () => import("@/doencas/01-neurodesenvolvimento/tourette"),
  "transtorno_da_comunicacao_social": () => import("@/doencas/01-neurodesenvolvimento/transtorno_da_comunicacao_social"),
  "transtorno_da_fala": () => import("@/doencas/01-neurodesenvolvimento/transtorno_da_fala"),
  "transtorno_da_fluencia_com_inicio_na_infancia": () => import("@/doencas/01-neurodesenvolvimento/transtorno_da_fluencia_com_inicio_na_infancia"),
  "transtorno_da_linguagem": () => import("@/doencas/01-neurodesenvolvimento/transtorno_da_linguagem"),
  "transtorno_especifico_da_aprendizagem": () => import("@/doencas/01-neurodesenvolvimento/transtorno_especifico_da_aprendizagem"),
  "catatonia_transtorno_catat_nico": () => import("@/doencas/02-esquizofrenia-psicoticos/catatonia_transtorno_catat_nico"),
  "esquizofrenia": () => import("@/doencas/02-esquizofrenia-psicoticos/esquizofrenia"),
  "transtorno_delirante": () => import("@/doencas/02-esquizofrenia-psicoticos/transtorno_delirante"),
  "transtorno_esquizoafe_tivo": () => import("@/doencas/02-esquizofrenia-psicoticos/transtorno_esquizoafe_tivo"),
  "transtorno_esquizofreniforme": () => import("@/doencas/02-esquizofrenia-psicoticos/transtorno_esquizofreniforme"),
  "transtorno_psic_tico_breve": () => import("@/doencas/02-esquizofrenia-psicoticos/transtorno_psic_tico_breve"),
  "transtorno_psic_tico_devido_a_outra_condi_o_m_dica": () => import("@/doencas/02-esquizofrenia-psicoticos/transtorno_psic_tico_devido_a_outra_condi_o_m_dica"),
  "transtorno_psic_tico_induzido_por_subst_ncia_medicamento": () => import("@/doencas/02-esquizofrenia-psicoticos/transtorno_psic_tico_induzido_por_subst_ncia_medicamento"),
  "transtorno_bipolar_e_relacionado_devido_a_outra_condicao_medica": () => import("@/doencas/03-bipolar-relacionados/transtorno_bipolar_e_relacionado_devido_a_outra_condicao_medica"),
  "transtorno_bipolar_e_relacionado_induzido_por_substancia_medicamento": () => import("@/doencas/03-bipolar-relacionados/transtorno_bipolar_e_relacionado_induzido_por_substancia_medicamento"),
  "transtorno_bipolar_tipo_i": () => import("@/doencas/03-bipolar-relacionados/transtorno_bipolar_tipo_i"),
  "transtorno_bipolar_tipo_ii": () => import("@/doencas/03-bipolar-relacionados/transtorno_bipolar_tipo_ii"),
  "transtorno_ciclotimico": () => import("@/doencas/03-bipolar-relacionados/transtorno_ciclotimico"),
  "transtorno_depressivo_devido_a_outra_condi_o_m_dica": () => import("@/doencas/04-depressivos/transtorno_depressivo_devido_a_outra_condi_o_m_dica"),
  "transtorno_depressivo_induzido_por_subst_ncia_medicamento": () => import("@/doencas/04-depressivos/transtorno_depressivo_induzido_por_subst_ncia_medicamento"),
  "transtorno_depressivo_maior_tdm": () => import("@/doencas/04-depressivos/transtorno_depressivo_maior_tdm"),
  "transtorno_depressivo_persistente_distimia": () => import("@/doencas/04-depressivos/transtorno_depressivo_persistente_distimia"),
  "transtorno_disf_rico_pr_menstrual_tdpm": () => import("@/doencas/04-depressivos/transtorno_disf_rico_pr_menstrual_tdpm"),
  "transtorno_disruptivo_da_desregula_o_do_humor_tddc": () => import("@/doencas/04-depressivos/transtorno_disruptivo_da_desregula_o_do_humor_tddc"),
  "agorafobia": () => import("@/doencas/05-ansiedade/agorafobia"),
  "ansiedade_de_separacao": () => import("@/doencas/05-ansiedade/ansiedade_de_separacao"),
  "ansiedade_devido_a_outra_condicao_medica": () => import("@/doencas/05-ansiedade/ansiedade_devido_a_outra_condicao_medica"),
  "ansiedade_generalizada_tag": () => import("@/doencas/05-ansiedade/ansiedade_generalizada_tag"),
  "ansiedade_induzido_por_substancia_medicamento": () => import("@/doencas/05-ansiedade/ansiedade_induzido_por_substancia_medicamento"),
  "ansiedade_social_fobia_social": () => import("@/doencas/05-ansiedade/ansiedade_social_fobia_social"),
  "fobia_especifica": () => import("@/doencas/05-ansiedade/fobia_especifica"),
  "mutismo_seletivo": () => import("@/doencas/05-ansiedade/mutismo_seletivo"),
  "panico": () => import("@/doencas/05-ansiedade/panico"),
  "acumulacao_hoarding": () => import("@/doencas/06-obsessivo-compulsivo/acumulacao_hoarding"),
  "escoriacao_skin_picking": () => import("@/doencas/06-obsessivo-compulsivo/escoriacao_skin_picking"),
  "toc_e_relacionado_devido_a_outra_condicao_medica": () => import("@/doencas/06-obsessivo-compulsivo/toc_e_relacionado_devido_a_outra_condicao_medica"),
  "toc_e_relacionado_induzido_por_substancia_medicamento": () => import("@/doencas/06-obsessivo-compulsivo/toc_e_relacionado_induzido_por_substancia_medicamento"),
  "transtorno_dismorfico_corporal_bdd": () => import("@/doencas/06-obsessivo-compulsivo/transtorno_dismorfico_corporal_bdd"),
  "transtorno_obsessivo_compulsivo_toc": () => import("@/doencas/06-obsessivo-compulsivo/transtorno_obsessivo_compulsivo_toc"),
  "tricotilomania_arrancar_o_cabelo": () => import("@/doencas/06-obsessivo-compulsivo/tricotilomania_arrancar_o_cabelo"),
  "ajustamento_varios_codigos_f432x": () => import("@/doencas/07-trauma-estressores/ajustamento_varios_codigos_f432x"),
  "apego_reativo_31389_f941": () => import("@/doencas/07-trauma-estressores/apego_reativo_31389_f941"),
  "estresse_agudo_3083_f430": () => import("@/doencas/07-trauma-estressores/estresse_agudo_3083_f430"),
  "estresse_pos_traumatico_tept_30981_f4310": () => import("@/doencas/07-trauma-estressores/estresse_pos_traumatico_tept_30981_f4310"),
  "interacao_social_desinibida_31389_f942": () => import("@/doencas/07-trauma-estressores/interacao_social_desinibida_31389_f942"),
  "amnesia_dissociativa": () => import("@/doencas/08-dissociativos/amnesia_dissociativa"),
  "dissociativos_induzidos_substancia_condicao_medica": () => import("@/doencas/08-dissociativos/dissociativos_induzidos_substancia_condicao_medica"),
  "transtorno_despersonalizacao_desrealizacao": () => import("@/doencas/08-dissociativos/transtorno_despersonalizacao_desrealizacao"),
  "transtorno_dissociativo_identidade": () => import("@/doencas/08-dissociativos/transtorno_dissociativo_identidade"),
  "fatores_psicologicos_afetam_condicoes_medicas": () => import("@/doencas/09-sintomas-somaticos/fatores_psicologicos_afetam_condicoes_medicas"),
  "transtorno_ansiedade_doenca": () => import("@/doencas/09-sintomas-somaticos/transtorno_ansiedade_doenca"),
  "transtorno_conversivo": () => import("@/doencas/09-sintomas-somaticos/transtorno_conversivo"),
  "transtorno_facticio_autoimposto": () => import("@/doencas/09-sintomas-somaticos/transtorno_facticio_autoimposto"),
  "transtorno_facticio_imposto_outro": () => import("@/doencas/09-sintomas-somaticos/transtorno_facticio_imposto_outro"),
  "transtorno_sintomas_somaticos": () => import("@/doencas/09-sintomas-somaticos/transtorno_sintomas_somaticos"),
  "anorexia_nervosa": () => import("@/doencas/10-alimentares/anorexia_nervosa"),
  "bulimia_nervosa": () => import("@/doencas/10-alimentares/bulimia_nervosa"),
  "pica": () => import("@/doencas/10-alimentares/pica"),
  "transtorno_alimentar_restritivo_evitativo": () => import("@/doencas/10-alimentares/transtorno_alimentar_restritivo_evitativo"),
  "transtorno_compulsao_alimentar": () => import("@/doencas/10-alimentares/transtorno_compulsao_alimentar"),
  "transtorno_de_rumincao": () => import("@/doencas/10-alimentares/transtorno_de_rumincao"),
  "eliminacao_induzida_substancia_condicao_medica": () => import("@/doencas/11-eliminacao/eliminacao_induzida_substancia_condicao_medica"),
  "encoprese": () => import("@/doencas/11-eliminacao/encoprese"),
  "enurese": () => import("@/doencas/11-eliminacao/enurese"),
  "apneia_central_sono": () => import("@/doencas/12-sono-vigilia/apneia_central_sono"),
  "apneia_hipopneia_obstrutiva_sono": () => import("@/doencas/12-sono-vigilia/apneia_hipopneia_obstrutiva_sono"),
  "hipoventilacao_relacionada_sono": () => import("@/doencas/12-sono-vigilia/hipoventilacao_relacionada_sono"),
  "narcolepsia": () => import("@/doencas/12-sono-vigilia/narcolepsia"),
  "sindrome_pernas_inquietas": () => import("@/doencas/12-sono-vigilia/sindrome_pernas_inquietas"),
  "transtorno_comportamental_sono_rem": () => import("@/doencas/12-sono-vigilia/transtorno_comportamental_sono_rem"),
  "transtorno_de_hipersonolencia": () => import("@/doencas/12-sono-vigilia/transtorno_de_hipersonolencia"),
  "transtorno_de_insonia": () => import("@/doencas/12-sono-vigilia/transtorno_de_insonia"),
  "transtorno_do_pesadelo": () => import("@/doencas/12-sono-vigilia/transtorno_do_pesadelo"),
  "transtorno_sono_induzido_substancia": () => import("@/doencas/12-sono-vigilia/transtorno_sono_induzido_substancia"),
  "transtorno_sono_vigilia_ritmo_circadiano": () => import("@/doencas/12-sono-vigilia/transtorno_sono_vigilia_ritmo_circadiano"),
  "transtornos_despertar_sono_nao_rem": () => import("@/doencas/12-sono-vigilia/transtornos_despertar_sono_nao_rem"),
  "disfuncao_eretil": () => import("@/doencas/13-disfuncoes-sexuais/disfuncao_eretil"),
  "disfuncao_sexual_induzida_substancia": () => import("@/doencas/13-disfuncoes-sexuais/disfuncao_sexual_induzida_substancia"),
  "ejaculacao_precoce": () => import("@/doencas/13-disfuncoes-sexuais/ejaculacao_precoce"),
  "ejaculacao_retardada": () => import("@/doencas/13-disfuncoes-sexuais/ejaculacao_retardada"),
  "transtorno_desejo_sexual_hipoativo_masculino": () => import("@/doencas/13-disfuncoes-sexuais/transtorno_desejo_sexual_hipoativo_masculino"),
  "transtorno_dor_genito_pelvica_penetracao": () => import("@/doencas/13-disfuncoes-sexuais/transtorno_dor_genito_pelvica_penetracao"),
  "transtorno_interesse_excitacao_sexual_feminino": () => import("@/doencas/13-disfuncoes-sexuais/transtorno_interesse_excitacao_sexual_feminino"),
  "transtorno_orgasmo_feminino": () => import("@/doencas/13-disfuncoes-sexuais/transtorno_orgasmo_feminino"),
  "disforia_genero_adolescentes_adultos": () => import("@/doencas/14-disforia-genero/disforia_genero_adolescentes_adultos"),
  "disforia_genero_criancas": () => import("@/doencas/14-disforia-genero/disforia_genero_criancas"),
  "disforia_genero_criterios_parcialmente_preenchidos": () => import("@/doencas/14-disforia-genero/disforia_genero_criterios_parcialmente_preenchidos"),
  "cleptomania": () => import("@/doencas/15-disruptivos-impulsos-conduta/cleptomania"),
  "piromania": () => import("@/doencas/15-disruptivos-impulsos-conduta/piromania"),
  "transtorno_da_conduta": () => import("@/doencas/15-disruptivos-impulsos-conduta/transtorno_da_conduta"),
  "transtorno_explosivo_intermittente": () => import("@/doencas/15-disruptivos-impulsos-conduta/transtorno_explosivo_intermittente"),
  "transtorno_oposicao_desafiante": () => import("@/doencas/15-disruptivos-impulsos-conduta/transtorno_oposicao_desafiante"),
  "abstinencia_de_alcool": () => import("@/doencas/16-substancias-aditivos/abstinencia_de_alcool"),
  "abstinencia_de_cafeina": () => import("@/doencas/16-substancias-aditivos/abstinencia_de_cafeina"),
  "abstinencia_de_cannabis": () => import("@/doencas/16-substancias-aditivos/abstinencia_de_cannabis"),
  "abstinencia_de_estimulantes": () => import("@/doencas/16-substancias-aditivos/abstinencia_de_estimulantes"),
  "abstinencia_de_opioides": () => import("@/doencas/16-substancias-aditivos/abstinencia_de_opioides"),
  "abstinencia_de_sedativos_hipnoticos_ansioliticos": () => import("@/doencas/16-substancias-aditivos/abstinencia_de_sedativos_hipnoticos_ansioliticos"),
  "abstinencia_de_tabaco": () => import("@/doencas/16-substancias-aditivos/abstinencia_de_tabaco"),
  "intoxicacao_por_alcool": () => import("@/doencas/16-substancias-aditivos/intoxicacao_por_alcool"),
  "intoxicacao_por_cafeina": () => import("@/doencas/16-substancias-aditivos/intoxicacao_por_cafeina"),
  "intoxicacao_por_cannabis": () => import("@/doencas/16-substancias-aditivos/intoxicacao_por_cannabis"),
  "intoxicacao_por_estimulantes": () => import("@/doencas/16-substancias-aditivos/intoxicacao_por_estimulantes"),
  "intoxicacao_por_fenciclidina": () => import("@/doencas/16-substancias-aditivos/intoxicacao_por_fenciclidina"),
  "intoxicacao_por_inalantes": () => import("@/doencas/16-substancias-aditivos/intoxicacao_por_inalantes"),
  "intoxicacao_por_opioides": () => import("@/doencas/16-substancias-aditivos/intoxicacao_por_opioides"),
  "intoxicacao_por_outros_alucinogenos": () => import("@/doencas/16-substancias-aditivos/intoxicacao_por_outros_alucinogenos"),
  "intoxicacao_por_sedativos_hipnoticos_ansioliticos": () => import("@/doencas/16-substancias-aditivos/intoxicacao_por_sedativos_hipnoticos_ansioliticos"),
  "transtorno_do_jogo": () => import("@/doencas/16-substancias-aditivos/transtorno_do_jogo"),
  "transtorno_persistente_da_percepcao_induzido_por_alucinogenos": () => import("@/doencas/16-substancias-aditivos/transtorno_persistente_da_percepcao_induzido_por_alucinogenos"),
  "transtorno_por_uso_de_alcool": () => import("@/doencas/16-substancias-aditivos/transtorno_por_uso_de_alcool"),
  "transtorno_por_uso_de_cannabis": () => import("@/doencas/16-substancias-aditivos/transtorno_por_uso_de_cannabis"),
  "transtorno_por_uso_de_estimulantes": () => import("@/doencas/16-substancias-aditivos/transtorno_por_uso_de_estimulantes"),
  "transtorno_por_uso_de_fenciclidina": () => import("@/doencas/16-substancias-aditivos/transtorno_por_uso_de_fenciclidina"),
  "transtorno_por_uso_de_inalantes": () => import("@/doencas/16-substancias-aditivos/transtorno_por_uso_de_inalantes"),
  "transtorno_por_uso_de_opioides": () => import("@/doencas/16-substancias-aditivos/transtorno_por_uso_de_opioides"),
  "transtorno_por_uso_de_outra_substancia": () => import("@/doencas/16-substancias-aditivos/transtorno_por_uso_de_outra_substancia"),
  "transtorno_por_uso_de_outros_alucinogenos": () => import("@/doencas/16-substancias-aditivos/transtorno_por_uso_de_outros_alucinogenos"),
  "transtorno_por_uso_de_sedativos_hipnoticos_ansioliticos": () => import("@/doencas/16-substancias-aditivos/transtorno_por_uso_de_sedativos_hipnoticos_ansioliticos"),
  "transtorno_por_uso_de_tabaco": () => import("@/doencas/16-substancias-aditivos/transtorno_por_uso_de_tabaco"),
  "delirium": () => import("@/doencas/17-neurocognitivos/delirium"),
  "tnc_leve": () => import("@/doencas/17-neurocognitivos/tnc_leve"),
  "tnc_maior": () => import("@/doencas/17-neurocognitivos/tnc_maior"),
  "mudanca_personalidade_condicao_medica": () => import("@/doencas/18-personalidade/mudanca_personalidade_condicao_medica"),
  "transtorno_personalidade_antissocial": () => import("@/doencas/18-personalidade/transtorno_personalidade_antissocial"),
  "transtorno_personalidade_borderline": () => import("@/doencas/18-personalidade/transtorno_personalidade_borderline"),
  "transtorno_personalidade_dependente": () => import("@/doencas/18-personalidade/transtorno_personalidade_dependente"),
  "transtorno_personalidade_esquizoide": () => import("@/doencas/18-personalidade/transtorno_personalidade_esquizoide"),
  "transtorno_personalidade_esquizotipica": () => import("@/doencas/18-personalidade/transtorno_personalidade_esquizotipica"),
  "transtorno_personalidade_evitativa": () => import("@/doencas/18-personalidade/transtorno_personalidade_evitativa"),
  "transtorno_personalidade_histrionica": () => import("@/doencas/18-personalidade/transtorno_personalidade_histrionica"),
  "transtorno_personalidade_narcisista": () => import("@/doencas/18-personalidade/transtorno_personalidade_narcisista"),
  "transtorno_personalidade_obsessivo_compulsiva": () => import("@/doencas/18-personalidade/transtorno_personalidade_obsessivo_compulsiva"),
  "transtorno_personalidade_paranoide": () => import("@/doencas/18-personalidade/transtorno_personalidade_paranoide"),
  "transtorno_exibicionista": () => import("@/doencas/19-parafilicos/transtorno_exibicionista"),
  "transtorno_fetichista": () => import("@/doencas/19-parafilicos/transtorno_fetichista"),
  "transtorno_frotteurista": () => import("@/doencas/19-parafilicos/transtorno_frotteurista"),
  "transtorno_masoquismo_sexual": () => import("@/doencas/19-parafilicos/transtorno_masoquismo_sexual"),
  "transtorno_pedofilico": () => import("@/doencas/19-parafilicos/transtorno_pedofilico"),
  "transtorno_sadismo_sexual": () => import("@/doencas/19-parafilicos/transtorno_sadismo_sexual"),
  "transtorno_transvestico": () => import("@/doencas/19-parafilicos/transtorno_transvestico"),
  "transtorno_voyeurista": () => import("@/doencas/19-parafilicos/transtorno_voyeurista"),
  "acatisia_aguda_induzida_medicamento": () => import("@/doencas/21-movimento-medicamentos/acatisia_aguda_induzida_medicamento"),
  "acatisia_tardia": () => import("@/doencas/21-movimento-medicamentos/acatisia_tardia"),
  "discinesia_tardia": () => import("@/doencas/21-movimento-medicamentos/discinesia_tardia"),
  "distonia_aguda_induzida_medicamento": () => import("@/doencas/21-movimento-medicamentos/distonia_aguda_induzida_medicamento"),
  "distonia_tardia": () => import("@/doencas/21-movimento-medicamentos/distonia_tardia"),
  "parkinsonismo_induzido_neuroleptico": () => import("@/doencas/21-movimento-medicamentos/parkinsonismo_induzido_neuroleptico"),
  "parkinsonismo_induzido_outro_medicamento": () => import("@/doencas/21-movimento-medicamentos/parkinsonismo_induzido_outro_medicamento"),
  "sindrome_descontinuacao_antidepressivos": () => import("@/doencas/21-movimento-medicamentos/sindrome_descontinuacao_antidepressivos"),
  "sindrome_neuroleptica_maligna": () => import("@/doencas/21-movimento-medicamentos/sindrome_neuroleptica_maligna"),
  "tremor_postural_induzido_medicamento": () => import("@/doencas/21-movimento-medicamentos/tremor_postural_induzido_medicamento"),
};

export function isDiseaseRegistered(id: string): boolean {
  return id in diseaseImports;
}

export async function loadDiseaseModule(id: string): Promise<DiseaseModule> {
  const importer = diseaseImports[id];
  if (!importer) {
    throw new Error(`Doença não encontrada no registro: "${id}"`);
  }
  return importer();
}

export function listRegisteredDiseases(): string[] {
  return Object.keys(diseaseImports);
}

export function getDiseaseImporter(id: string): (() => Promise<DiseaseModule>) | undefined {
  return diseaseImports[id];
}

export const structureHookMap: Record<string, { hook: string; renderer: string }> = {
  "categorico_por_subtipo": { hook: "useCategoricoPorSubtipo", renderer: "CategoricoPorSubtipoRenderer" },
  "conjuncao_temporal_complexa": { hook: "useConjuncaoTemporalComplexa", renderer: "ConjuncaoTemporalComplexaRenderer" },
  "episodico": { hook: "useQualitativoDescritivo", renderer: "EpisodicoRenderer" },
  "episodico_com_sintomas": { hook: "usePolytheticSimetricos", renderer: "EpisodicoComSintomasRenderer" },
  "etiologico_externo": { hook: "useEtiologicoExterno", renderer: "EtiologicoExternoRenderer" },
  "mixed_monothetic_polythetic": { hook: "usePolytheticComAncora", renderer: "MixedMonotheticPolytheticRenderer" },
  "monothetic_puro": { hook: "useMonotheticPuro", renderer: "MonotheticPuroRenderer" },
  "monothetic_tripartite": { hook: "useTripartiteFuncional", renderer: "MonotheticTripartiteRenderer" },
  "polythetic_clusters_assimetricos": { hook: "usePolytheticAssimetricos", renderer: "PolytheticAssimetricosRenderer" },
  "polythetic_clusters_simetricos": { hook: "usePolytheticSimetricos", renderer: "PolytheticSimetricosRenderer" },
  "polythetic_com_ancora": { hook: "usePolytheticComAncora", renderer: "PolytheticComAncoraRenderer" },
  "polythetic_monocluster": { hook: "usePolytheticSimetricos", renderer: "PolytheticMonoclusterRenderer" },
  "psicomotor_polythetic": { hook: "usePsicomotorPolythetic", renderer: "PsicomotorPolytheticRenderer" },
  "qualitativo_descritivo": { hook: "useQualitativoDescritivo", renderer: "QualitativoDescritivoRenderer" },
  "temporal_topografico": { hook: "useTemporalTopografico", renderer: "TemporalTopograficoRenderer" },
  "tripartite_funcional": { hook: "useTripartiteFuncional", renderer: "TripartiteFuncionalRenderer" },
};

export function getStructureInfo(estrutura: EstruturaGeral | string) {
  return structureHookMap[estrutura] || { hook: "useQualitativoDescritivo", renderer: "QualitativoDescritivoRenderer" };
}

---

## src/infra/dsm-residual-registry.generated.ts
// Auto-generated residual DSM registry. Do not edit manually.

export const minimalRegistry = {
  registry_type: "minimal",
  normalization_round: "2B",
  total_entries: 26,
  generated_at: "2026-05-24",
  source_files: 6,
  entries: [
    {
      id: "01_atraso_global_do_desenvolvimento",
      name: "Atraso Global do Desenvolvimento",
      chapter_id: "01",
      chapter_name: "Transtornos do Neurodesenvolvimento",
      codigo_dsm5: "315.8 (F88)",
      codigo_cid10: "F88",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "areas_do_desenvolvimento_afetadas",
        "marcos_nao_atingidos",
        "justificativa_para_nao_testabilidade",
        "data_prevista_para_reavaliacao",
        "intervencoes_precoces_em_andamento"
      ]
    },
    {
      id: "01_deficiencia_intelectual_nao_especificada",
      name: "Deficiencia Intelectual (Transtorno do Desenvolvimento Intelectual) Nao Especificada",
      chapter_id: "01",
      chapter_name: "Transtornos do Neurodesenvolvimento",
      codigo_dsm5: "319 (F79)",
      codigo_cid10: "F79",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "barreiras_para_avaliacao",
        "prejuizos_sensoriais_fisicos_presentes",
        "evidencias_indiretas_de_deficit_intelectual",
        "data_prevista_para_reavaliacao"
      ]
    },
    {
      id: "01_outro_transtorno_de_deficit_de_atencao_hiperatividade_especi",
      name: "Outro Transtorno de Deficit de Atencao/Hiperatividade Especificado",
      chapter_id: "01",
      chapter_name: "Transtornos do Neurodesenvolvimento",
      codigo_dsm5: "314.01 (F90.8)",
      codigo_cid10: "F90.8",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "sintomas_presentes_e_quantidade",
        "razao_para_nao_atendimento_de_criterios",
        "ambientes_afetados",
        "historia_de_inicio",
        "prejuizo_funcional_observado"
      ]
    },
    {
      id: "01_outro_transtorno_de_tique_especificado",
      name: "Outro Transtorno de Tique Especificado",
      chapter_id: "01",
      chapter_name: "Transtornos do Neurodesenvolvimento",
      codigo_dsm5: "307.20 (F95.8)",
      codigo_cid10: "F95.8",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "tipo_de_tique_motor_vocal",
        "razao_para_nao_atendimento_de_criterios",
        "idade_de_inicio",
        "etiologia_presumida",
        "associacoes_medicas"
      ]
    },
    {
      id: "01_outro_transtorno_do_neurodesenvolvimento_especificado",
      name: "Outro Transtorno do Neurodesenvolvimento Especificado",
      chapter_id: "01",
      chapter_name: "Transtornos do Neurodesenvolvimento",
      codigo_dsm5: "315.8 (F88)",
      codigo_cid10: "F88",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "sintomas_neurodesenvolvimentais_presentes",
        "razao_para_nao_atendimento_de_criterios_especificos",
        "antecedentes_de_exposicao_prenatal",
        "historia_genetica_e_medica",
        "dominios_funcionais_afetados"
      ]
    },
    {
      id: "02_outro_transtorno_do_espectro_da_esquizofrenia_outro_transtor",
      name: "Outro Transtorno do Espectro da Esquizofrenia e Outro Transtorno Psicótico Especificado",
      chapter_id: "02",
      chapter_name: "Transtornos do Espectro da Esquizofrenia e Outros Transtornos Psicoticos",
      codigo_dsm5: "298.8 (F28)",
      codigo_cid10: "F28",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "Razão específica pela qual critérios não foram satisfeitos",
        "Sintomas presentes que justificam a categoria",
        "Exemplos típicos: alucinações auditivas persistentes isoladas; delírios com episódios de humor significativos sobrepostos; síndrome psicótica atenuada; sintomas delirantes em parceiro de pessoa com transtorno delirante (folie à deux)"
      ]
    },
    {
      id: "04_outro_transtorno_depressivo_especificado",
      name: "Outro Transtorno Depressivo Especificado",
      chapter_id: "04",
      chapter_name: "Transtornos Depressivos",
      codigo_dsm5: "311 (F32.8)",
      codigo_cid10: "F32.8",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "Razão específica pela qual critérios não foram satisfeitos",
        "Sintomas presentes que justificam a categoria",
        "Exemplos típicos: depressão breve recorrente (humor deprimido + 4 sintomas por 2-13 dias ≥1x/mês por 12 meses); episódio depressivo de curta duração (4-13 dias com sofrimento/prejuíço); episódio depressivo com sintomas insuficientes (humor deprimido + ≥1 sintoma por ≥2 semanas com prejuíço mas <5 sintomas totais)"
      ]
    },
    {
      id: "09_outro_transtorno_de_sintomas_somaticos_transtorno_relacionad",
      name: "Outro Transtorno de Sintomas Somaticos e Transtorno Relacionado Especificado",
      chapter_id: "09",
      chapter_name: "Transtornos Somáticos e Relacionados",
      codigo_dsm5: "300.89 (F45.8)",
      codigo_cid10: "F45.8",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "descricao_da_apresentacao_clinica",
        "sintomas_presentes_e_limiares_nao_atingidos",
        "razao_especifica_nao_adequacao",
        "duracao_dos_sintomas",
        "prejuizo_funcional_observado",
        "condicao_medica_comorbida_se_houver"
      ]
    },
    {
      id: "15_outro_transtorno_disruptivo_do_controle_de_impulsos_ou",
      name: "Outro Transtorno Disruptivo, do Controle de Impulsos ou da Conduta Especificado",
      chapter_id: "15",
      chapter_name: "Transtornos Disruptivos, de Controle de Impulsos e de Conduta",
      codigo_dsm5: "312.89 (F91.8)",
      codigo_cid10: "F91.8",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "descricao_da_apresentacao_clinica",
        "sintomas_presentes_e_limiares_nao_atingidos",
        "razao_especifica_nao_adequacao",
        "funcao_clinica_sugerida",
        "prejuizo_funcional_observado"
      ]
    },
    {
      id: "16_transtorno_por_uso_de_fenciclidina_especificado",
      name: "Transtorno por Uso de Fenciclidina Especificado",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "F16.10/F16.20",
      codigo_cid10: "F16.1/F16.2",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "substancia_especifica",
        "severidade",
        "especificadores_remissao",
        "comorbidades"
      ]
    },
    {
      id: "16_transtorno_por_uso_de_outros_alucinogenos_especificado",
      name: "Transtorno por Uso de Outros Alucinógenos Especificado",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "F16.10/F16.20",
      codigo_cid10: "F16.1/F16.2",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "substancia_especifica_LSD_Psilocibina_MDMA_DMT_etc",
        "severidade",
        "historico_uso"
      ]
    },
    {
      id: "16_transtorno_por_uso_de_inalantes_especificado",
      name: "Transtorno por Uso de Inalantes Especificado",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "F18.10/F18.20",
      codigo_cid10: "F18.1/F18.2",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "substancia_inalada_tolueno_gasolina_spray_colas",
        "via_administracao",
        "idade_inicio",
        "comorbidades_conducta"
      ]
    },
    {
      id: "16_transtorno_por_uso_de_outra_substancia_especificado",
      name: "Transtorno por Uso de Outra Substância Especificado",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "F19.10/F19.20",
      codigo_cid10: "F19.1/F19.2",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "substancia_especifica",
        "fonte_prescricao_ilicita",
        "motivacao_uso",
        "comorbidades"
      ]
    },
    {
      id: "16_transtorno_por_uso_de_cocaina_especificado",
      name: "Transtorno por Uso de Cocaína Especificado",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "F14.10/F14.20",
      codigo_cid10: "F14.1/F14.2",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "forma_cloridrato_crack_pasta",
        "via_administracao_IV_fumada_nasal",
        "padrao_uso_binge_diario"
      ]
    },
    {
      id: "16_transtorno_por_uso_de_anfetamina_metanfetamina_especificado",
      name: "Transtorno por Uso de Anfetamina/Metanfetamina Especificado",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "F15.10/F15.20",
      codigo_cid10: "F15.1/F15.2",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "substancia_metanfetamina_dexanfetamina_MDMA_Ritalin",
        "fonte_prescricao_ilicita",
        "via_administracao"
      ]
    },
    {
      id: "16_outros_transtornos_induzidos_por_alcool",
      name: "Outros Transtornos Induzidos por Álcool",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "Varia por condição",
      codigo_cid10: "F10.1-F10.9",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "tipo_transtorno_induzido",
        "duracao_sintomas",
        "persistencia_apos_1mes_abstinencia",
        "gravidade"
      ]
    },
    {
      id: "16_outros_transtornos_induzidos_por_cannabis",
      name: "Outros Transtornos Induzidos por Cannabis",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "Varia por condição",
      codigo_cid10: "F12.1-F12.9",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "tipo_induzido_ansiedade_psicose_humor",
        "inicio_duracao_intoxicacao_vs_persistente",
        "teste_realidade"
      ]
    },
    {
      id: "16_outros_transtornos_induzidos_por_opioides",
      name: "Outros Transtornos Induzidos por Opioides",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "Varia por condição",
      codigo_cid10: "F11.1-F11.9",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "tipo_induzido",
        "relacao_temporal_intoxicacao_vs_abstinencia",
        "duracao"
      ]
    },
    {
      id: "16_outros_transtornos_induzidos_por_estimulantes",
      name: "Outros Transtornos Induzidos por Estimulantes",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "Varia por condição",
      codigo_cid10: "F14.1-F14.9 / F15.1-F15.9",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "tipo_induzido",
        "substancia_cocaina_vs_anfetamina",
        "duracao",
        "resolucao_com_abstinencia"
      ]
    },
    {
      id: "16_outros_transtornos_induzidos_por_sedativos",
      name: "Outros Transtornos Induzidos por Sedativos",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "Varia por condição",
      codigo_cid10: "F13.1-F13.9",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "tipo_induzido",
        "periodo_intoxicacao_vs_abstinencia",
        "comorbidade_TUA"
      ]
    },
    {
      id: "16_outros_transtornos_induzidos_por_fenciclidina",
      name: "Outros Transtornos Induzidos por Fenciclidina",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "Varia por condição",
      codigo_cid10: "F16.1-F16.9",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "tipo_induzido",
        "persistencia_sintomas",
        "teste_realidade"
      ]
    },
    {
      id: "16_outros_transtornos_induzidos_por_alucinogenos",
      name: "Outros Transtornos Induzidos por Alucinógenos",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "Varia por condição",
      codigo_cid10: "F16.1-F16.9",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "tipo_induzido",
        "substancia_LSD_psilocibina_MDMA",
        "teste_realidade"
      ]
    },
    {
      id: "16_outros_transtornos_induzidos_por_inalantes",
      name: "Outros Transtornos Induzidos por Inalantes",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "Varia por condição",
      codigo_cid10: "F18.1-F18.9",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "tipo_induzido",
        "substancia_inalada",
        "deficits_cognitivos_avaliados"
      ]
    },
    {
      id: "16_outros_transtornos_induzidos_por_cafeina",
      name: "Outros Transtornos Induzidos por Cafeína",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "F15.1-F15.9",
      codigo_cid10: "F15.1-F15.9",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "tipo_induzido",
        "quantidade_mg_dia",
        "fontes_cafe"
      ]
    },
    {
      id: "16_outros_transtornos_induzidos_por_tabaco",
      name: "Outros Transtornos Induzidos por Tabaco",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "F17.208",
      codigo_cid10: "F17.2",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "padrao_uso_noturno",
        "relacao_sintomas_com_fumo"
      ]
    },
    {
      id: "16_outros_transtornos_induzidos_por_outra_substancia",
      name: "Outros Transtornos Induzidos por Outra Substância",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "F19.1-F19.9",
      codigo_cid10: "F19.1-F19.9",
      category: "MINIMAL",
      type: "categoria_residual_especificada",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: true,
      reason: "Usar quando ha sintomas clinicamente relevantes, mas o quadro nao preenche criterios para transtorno especifico",
      suggested_free_fields: [
        "substancia_especifica",
        "tipo_induzido",
        "contexto_de_uso"
      ]
    }
  ]
} as const;

export const excludedRegistry = {
  registry_type: "excluded",
  normalization_round: "2B",
  total_entries: 24,
  generated_at: "2026-05-24",
  source_files: 6,
  entries: [
    {
      id: "01_transtorno_da_comunicacao_nao_especificado",
      name: "Transtorno da Comunicacao Nao Especificado",
      chapter_id: "01",
      chapter_name: "Transtornos do Neurodesenvolvimento",
      codigo_dsm5: "307.9 (F80.9)",
      codigo_cid10: "F80.9",
      category: "EXCLUDE",
      type: "categoria_residual_nao_especificada",
      canonical_chapter_id: "",
      canonical_chapter_name: null,
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: false,
      preserve_in_technical_index: true,
      reason: "Categoria residual administrativa sem criterios proprios. Usada quando o clinico opta por NAO especificar a razao pela qual os criterios para transtorno da comunicacao ou qualquer transtorno do neurodesenvolvimento nao sao satisfeitos, ou quando ha informacoes insuficientes."
    },
    {
      id: "01_transtorno_de_deficit_de_atencao_hiperatividade_nao_especifi",
      name: "Transtorno de Deficit de Atencao/Hiperatividade Nao Especificado",
      chapter_id: "01",
      chapter_name: "Transtornos do Neurodesenvolvimento",
      codigo_dsm5: "314.01 (F90.9)",
      codigo_cid10: "F90.9",
      category: "EXCLUDE",
      type: "categoria_residual_nao_especificada",
      canonical_chapter_id: "",
      canonical_chapter_name: null,
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: false,
      preserve_in_technical_index: true,
      reason: "Categoria residual administrativa sem criterios proprios. Usada quando o clinico opta por NAO especificar a razao pela qual criterios para TDAH ou qualquer transtorno do neurodesenvolvimento nao sao satisfeitos."
    },
    {
      id: "01_transtorno_de_tique_nao_especificado",
      name: "Transtorno de Tique Nao Especificado",
      chapter_id: "01",
      chapter_name: "Transtornos do Neurodesenvolvimento",
      codigo_dsm5: "307.20 (F95.9)",
      codigo_cid10: "F95.9",
      category: "EXCLUDE",
      type: "categoria_residual_nao_especificada",
      canonical_chapter_id: "",
      canonical_chapter_name: null,
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: false,
      preserve_in_technical_index: true,
      reason: "Categoria residual administrativa sem criterios proprios. Usada quando o clinico opta por NAO especificar a razao pela qual criterios para transtorno de tique ou qualquer transtorno do neurodesenvolvimento nao sao satisfeitos."
    },
    {
      id: "01_transtorno_do_neurodesenvolvimento_nao_especificado",
      name: "Transtorno do Neurodesenvolvimento Nao Especificado",
      chapter_id: "01",
      chapter_name: "Transtornos do Neurodesenvolvimento",
      codigo_dsm5: "315.9 (F89)",
      codigo_cid10: "F89",
      category: "EXCLUDE",
      type: "categoria_residual_nao_especificada",
      canonical_chapter_id: "",
      canonical_chapter_name: null,
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: false,
      preserve_in_technical_index: true,
      reason: "Categoria residual administrativa de nivel de capitulo. Usada quando o clinico opta por NAO especificar a razao pela qual criterios para qualquer transtorno do neurodesenvolvimento nao sao satisfeitos. Inclui situacoes de emergencia onde informacoes sao insuficientes."
    },
    {
      id: "02_transtorno_do_espectro_da_esquizofrenia_outro_transtorno_psi",
      name: "Transtorno do Espectro da Esquizofrenia e Outro Transtorno Psicótico Não Especificado",
      chapter_id: "02",
      chapter_name: "Transtornos do Espectro da Esquizofrenia e Outros Transtornos Psicoticos",
      codigo_dsm5: "298.9 (F29)",
      codigo_cid10: "F29",
      category: "EXCLUDE",
      type: "categoria_residual_nao_especificada",
      canonical_chapter_id: "",
      canonical_chapter_name: null,
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: false,
      preserve_in_technical_index: true,
      reason: "Categoria residual sem critérios próprios; clínico opta por NÃO especificar razão pela qual critérios não são atendidos; inclui situações com informações insuficientes (ex: sala de emergência). NÃO deve ser transformado em checklist operacional."
    },
    {
      id: "02_catatonia_nao_especificada",
      name: "Catatonia Não Especificada",
      chapter_id: "02",
      chapter_name: "Transtornos do Espectro da Esquizofrenia e Outros Transtornos Psicoticos",
      codigo_dsm5: "293.89 (F06.1) com código adicional 781.99 (R29.818)",
      codigo_cid10: "F06.1 + R29.818",
      category: "EXCLUDE",
      type: "categoria_residual_nao_especificada",
      canonical_chapter_id: "",
      canonical_chapter_name: null,
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: false,
      preserve_in_technical_index: true,
      reason: "Aplicada quando há sintomas catatônicos causando sofrimento/prejuízo mas sem clareza do transtorno mental subjacente ou condição médica, ou quando critérios completos para catatonia não são satisfeitos, ou informações insuficientes. Categoria administrativa."
    },
    {
      id: "04_transtorno_depressivo_nao_especificado",
      name: "Transtorno Depressivo Não Especificado",
      chapter_id: "04",
      chapter_name: "Transtornos Depressivos",
      codigo_dsm5: "311 (F32.9)",
      codigo_cid10: "F32.9",
      category: "EXCLUDE",
      type: "categoria_residual_nao_especificada",
      canonical_chapter_id: "",
      canonical_chapter_name: null,
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: false,
      preserve_in_technical_index: true,
      reason: "Categoria residual sem critérios próprios; clínico opta por NÃO especificar razão pela qual critérios depressivos específicos não são atendidos. Inclui situações com informações insuficientes (ex: sala de emergência). NÃO deve ser transformado em checklist operacional. Uso para apresentações depressivas que claramente existem mas não podem ser melhor caracterizadas no momento."
    },
    {
      id: "09_transtorno_de_sintomas_somaticos_transtorno_relacionado_nao_",
      name: "Transtorno de Sintomas Somaticos e Transtorno Relacionado Nao Especificado",
      chapter_id: "09",
      chapter_name: "Transtornos Somáticos e Relacionados",
      codigo_dsm5: "300.82 (F45.9)",
      codigo_cid10: null,
      category: "EXCLUDE",
      type: "categoria_residual_nao_especificada",
      canonical_chapter_id: "",
      canonical_chapter_name: null,
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: false,
      preserve_in_technical_index: true,
      reason: "Categoria administrativa para situacoes incomuns sem informacoes suficientes. NAO deve ser usada a menos que haja situacoes definitivamente incomuns. Inclui apresentacoes para as quais nao ha informacoes suficientes para diagnostico mais especifico (ex: salas de emergencia). Nao possui criterios proprios, checklist ou estrutura diagnostica operacional."
    },
    {
      id: "09_transtorno_de_sensibilidade_quimica_multipla_idiopatia_ambie",
      name: "Transtorno de Sensibilidade Quimica Multipla (MCS) / Idiopatia Ambiental",
      chapter_id: "09",
      chapter_name: "Transtornos Somáticos e Relacionados",
      codigo_dsm5: "Nao reconhecido formalmente",
      codigo_cid10: null,
      category: "EXCLUDE",
      type: "categoria_residual_nao_especificada",
      canonical_chapter_id: "",
      canonical_chapter_name: null,
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: false,
      preserve_in_technical_index: true,
      reason: "O DSM-5 nao reconhece formalmente a Sensibilidade Quimica Multipla como diagnostico. Sintomas atribuidos a MCS podem se encaixar em: Transtorno de Sintomas Somaticos (se com resposta excessiva), Transtorno de Ansiedade de Doenca (se preocupacao com exposicao ambiental), ou Outro Especificado (se criterios parciais). Nao ha codigo especifico no DSM-5."
    },
    {
      id: "15_transtorno_disruptivo_do_controle_de_impulsos_da_conduta",
      name: "Transtorno Disruptivo, do Controle de Impulsos e da Conduta Nao Especificado",
      chapter_id: "15",
      chapter_name: "Transtornos Disruptivos, de Controle de Impulsos e de Conduta",
      codigo_dsm5: "312.9 (F91.9)",
      codigo_cid10: null,
      category: "EXCLUDE",
      type: "categoria_residual_nao_especificada",
      canonical_chapter_id: "",
      canonical_chapter_name: null,
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: false,
      preserve_in_technical_index: true,
      reason: "Categoria administrativa para situacoes incomuns sem informacoes suficientes. Nao possui criterios proprios, checklist ou estrutura diagnostica operacional. Uso restrito a contextos de emergencia ou falta de dados. Nao deve ser transformado em ficha de entrevista."
    },
    {
      id: "15_transtorno_da_personalidade_antissocial",
      name: "Transtorno da Personalidade Antissocial",
      chapter_id: "15",
      chapter_name: "Transtornos Disruptivos, de Controle de Impulsos e de Conduta",
      codigo_dsm5: "301.7 (F60.2)",
      codigo_cid10: null,
      category: "EXCLUDE",
      type: "referencia_cruzada_outro_capitulo",
      canonical_chapter_id: "18",
      canonical_chapter_name: "Transtornos de Personalidade",
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: false,
      preserve_in_technical_index: true,
      reason: "Este transtorno e classificado no Capitulo 'Transtornos da Personalidade', nao neste capitulo. Aparece aqui como referencia cruzada (dupla codificacao) por vinculo com o espectro externalizante. Seu processamento FULL sera realizado no pipeline do Capitulo de Transtornos da Personalidade. Criterios incluem: padrao pervasivo de desprezo e violacao dos direitos dos outros desde a idade de 15 anos + evidencia de transtorno da conduta com inicio antes dos 15 anos + ≥3 de 7 criterios de personalidade (falha em conformar-se, decepcao, irresponsabilidade, irritabilidade/agressividade, descuidado, falta de remorso)."
    },
    {
      id: "16_transtorno_relacionado_ao_alcool_nao_especificado",
      name: "Transtorno Relacionado ao Álcool Não Especificado",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "291.9 (F10.99)",
      codigo_cid10: null,
      category: "EXCLUDE",
      type: "categoria_residual_nao_especificada",
      canonical_chapter_id: "",
      canonical_chapter_name: null,
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: false,
      preserve_in_technical_index: true,
      reason: "Categoria residual sem critérios próprios. Usada quando sintomas causam sofrimento/prejuízo mas não satisfazem critérios para nenhum transtorno alcoólico específico. NÃO é um checklist operacional."
    },
    {
      id: "16_transtorno_relacionado_cafeina_nao_especificado",
      name: "Transtorno Relacionado à Cafeína Não Especificado",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "292.9 (F15.99)",
      codigo_cid10: null,
      category: "EXCLUDE",
      type: "categoria_residual_nao_especificada",
      canonical_chapter_id: "",
      canonical_chapter_name: null,
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: false,
      preserve_in_technical_index: true,
      reason: "Categoria residual. Sintomas relacionados à cafeína que não se encaixam em intoxicação ou abstinência específicas."
    },
    {
      id: "16_transtorno_relacionado_cannabis_nao_especificado",
      name: "Transtorno Relacionado a Cannabis Não Especificado",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "292.9 (F12.99)",
      codigo_cid10: null,
      category: "EXCLUDE",
      type: "categoria_residual_nao_especificada",
      canonical_chapter_id: "",
      canonical_chapter_name: null,
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: false,
      preserve_in_technical_index: true,
      reason: "Categoria residual para casos que não se encaixam em TUC, intoxicação, abstinência ou transtornos induzidos."
    },
    {
      id: "16_transtorno_relacionado_fenciclidina_nao_especificado",
      name: "Transtorno Relacionado a Fenciclidina Não Especificado",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "292.9 (F16.99)",
      codigo_cid10: null,
      category: "EXCLUDE",
      type: "categoria_residual_nao_especificada",
      canonical_chapter_id: "",
      canonical_chapter_name: null,
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: false,
      preserve_in_technical_index: true,
      reason: "Categoria residual sem critérios próprios."
    },
    {
      id: "16_transtorno_relacionado_alucinogenos_nao_especificado",
      name: "Transtorno Relacionado a Alucinógenos Não Especificado",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "292.9 (F16.99)",
      codigo_cid10: null,
      category: "EXCLUDE",
      type: "categoria_residual_nao_especificada",
      canonical_chapter_id: "",
      canonical_chapter_name: null,
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: false,
      preserve_in_technical_index: true,
      reason: "Categoria residual sem critérios próprios."
    },
    {
      id: "16_transtorno_relacionado_inalantes_nao_especificado",
      name: "Transtorno Relacionado a Inalantes Não Especificado",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "292.9 (F18.99)",
      codigo_cid10: null,
      category: "EXCLUDE",
      type: "categoria_residual_nao_especificada",
      canonical_chapter_id: "",
      canonical_chapter_name: null,
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: false,
      preserve_in_technical_index: true,
      reason: "Categoria residual sem critérios próprios."
    },
    {
      id: "16_transtorno_relacionado_opioides_nao_especificado",
      name: "Transtorno Relacionado a Opioides Não Especificado",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "292.9 (F11.99)",
      codigo_cid10: null,
      category: "EXCLUDE",
      type: "categoria_residual_nao_especificada",
      canonical_chapter_id: "",
      canonical_chapter_name: null,
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: false,
      preserve_in_technical_index: true,
      reason: "Categoria residual sem critérios próprios."
    },
    {
      id: "16_transtorno_relacionado_estimulantes_nao_especificado",
      name: "Transtorno Relacionado a Estimulantes Não Especificado",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "292.9 (F14.99 / F15.99)",
      codigo_cid10: null,
      category: "EXCLUDE",
      type: "categoria_residual_nao_especificada",
      canonical_chapter_id: "",
      canonical_chapter_name: null,
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: false,
      preserve_in_technical_index: true,
      reason: "Categoria residual sem critérios próprios."
    },
    {
      id: "16_transtorno_relacionado_ao_tabaco_nao_especificado",
      name: "Transtorno Relacionado ao Tabaco Não Especificado",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "292.9 (F17.209)",
      codigo_cid10: null,
      category: "EXCLUDE",
      type: "categoria_residual_nao_especificada",
      canonical_chapter_id: "",
      canonical_chapter_name: null,
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: false,
      preserve_in_technical_index: true,
      reason: "Categoria residual sem critérios próprios. Tabaco não tem intoxicação formal no DSM-5."
    },
    {
      id: "16_transtorno_relacionado_outra_substancia_nao_especificado",
      name: "Transtorno Relacionado a Outra Substância Não Especificado",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "292.9 (F19.99)",
      codigo_cid10: null,
      category: "EXCLUDE",
      type: "categoria_residual_nao_especificada",
      canonical_chapter_id: "",
      canonical_chapter_name: null,
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: false,
      preserve_in_technical_index: true,
      reason: "Categoria residual sem critérios próprios. Usada quando a substância é desconhecida ou não classificada."
    },
    {
      id: "16_intoxicacao_por_outra_substancia",
      name: "Intoxicação por Outra Substância (ou Substância Desconhecida)",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "292.89 (F19.929/929)",
      codigo_cid10: null,
      category: "EXCLUDE",
      type: "categoria_residual_nao_especificada",
      canonical_chapter_id: "",
      canonical_chapter_name: null,
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: false,
      preserve_in_technical_index: true,
      reason: "Categoria residual para intoxicação por substância não classificada. Não tem critérios específicos próprios."
    },
    {
      id: "16_abstinencia_de_outra_substancia",
      name: "Abstinência de Outra Substância (ou Substância Desconhecida)",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "292.0 (F19.239)",
      codigo_cid10: null,
      category: "EXCLUDE",
      type: "categoria_residual_nao_especificada",
      canonical_chapter_id: "",
      canonical_chapter_name: null,
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: false,
      preserve_in_technical_index: true,
      reason: "Categoria residual para abstinência por substância não classificada. Não tem critérios específicos próprios."
    },
    {
      id: "16_transtornos_adicoes_comportamentais_nao_incluidos",
      name: "Transtornos Adições Comportamentais Não Incluídos",
      chapter_id: "16",
      chapter_name: "Transtornos Relacionados a Substancias",
      codigo_dsm5: "N/A",
      codigo_cid10: null,
      category: "EXCLUDE",
      type: "categoria_residual_nao_especificada",
      canonical_chapter_id: "",
      canonical_chapter_name: null,
      render_structured_interview: false,
      show_in_main_picker: false,
      show_in_residual_panel: false,
      preserve_in_technical_index: true,
      reason: "Adições comportamentais (adição sexual, exercício, compras, internet) foram EXCLUÍDAS do DSM-5 por falta de evidências revisadas por pares suficientes para estabelecer critérios diagnósticos. Apenas o Transtorno do Jogo foi incluído."
    }
  ]
} as const;

---

## src/infra/hooks/use-qualitativo-descritivo.ts
// ═══════════════════════════════════════════════════════════════════════════
// Hook: useQualitativoDescritivo
// Para transtornos puramente descritivos — sem clusters de sintomas,
// sem criterios checkboxes. O clinico descreve o funcionamento em areas.
// Ex: Atraso Global do Desenvolvimento, TARE, TDC
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import type { TranstornoDSM } from "@/infra/types";
import { buildPayload } from "@/infra/utils/payload-builder";
import { generateMarkdown } from "@/infra/utils/markdown-generator";

export interface IdentificacaoState {
  paciente: string;
  dataNascimento: string;
  sexo: string;
  escolaridade: string;
  ocupacao: string;
  queixa: string;
}

interface FormState {
  descricao_global: string;
  funcionamento_adaptativo: string;
  funcionamento_comunicacao: string;
  funcionamento_social: string;
  funcionamento_academico: string;
  funcionamento_motor: string;
  nivel_suporte: string;
  impacto: { [dominioId: string]: string };
  comorbidades_selecionadas: string[];
  observacoes_gerais: string;
}

export function useQualitativoDescritivo(data: TranstornoDSM) {
  const [identificacao, setIdentificacao] = useState<IdentificacaoState>({
    paciente: "",
    dataNascimento: "",
    sexo: "",
    escolaridade: "",
    ocupacao: "",
    queixa: "",
  });

  const setIdentificacaoField = useCallback(
    (field: string, value: string) =>
      setIdentificacao((prev) => ({ ...prev, [field]: value })),
    []
  );

  const [formValues, setFormValues] = useState<FormState>(() => {
    const impacto: { [k: string]: string } = {};
    for (const d of data.dominios_impacto) {
      impacto[d.id] = "0";
    }
    return {
      descricao_global: "",
      funcionamento_adaptativo: "",
      funcionamento_comunicacao: "",
      funcionamento_social: "",
      funcionamento_academico: "",
      funcionamento_motor: "",
      nivel_suporte: "",
      impacto,
      comorbidades_selecionadas: [],
      observacoes_gerais: "",
    };
  });

  const setField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setImpacto = useCallback((dominioId: string, value: string) => {
    setFormValues((prev) => {
      const newImpacto = { ...prev.impacto };
      newImpacto[dominioId] = value;
      return { ...prev, impacto: newImpacto };
    });
  }, []);

  const toggleComorbidade = useCallback((condicao: string) => {
    setFormValues((prev) => {
      const atual = prev.comorbidades_selecionadas;
      const inclui = atual.includes(condicao);
      return {
        ...prev,
        comorbidades_selecionadas: inclui
          ? atual.filter((c) => c !== condicao)
          : [...atual, condicao],
      };
    });
  }, []);

  const payloadFormValues = useMemo(
    () => ({
      clusters: {},
      criterios_condicionais: {} as Record<string, boolean>,
      subtipo_selecionado: null,
      gravidade: formValues.nivel_suporte,
      especificadores: {},
      impacto: formValues.impacto,
      comorbidades_selecionadas: formValues.comorbidades_selecionadas,
      notas_clinicas: {
        historia: formValues.descricao_global,
        observacoes_gerais: formValues.observacoes_gerais,
        observacoes_clusters: {
          adaptativo: formValues.funcionamento_adaptativo,
          comunicacao: formValues.funcionamento_comunicacao,
          social: formValues.funcionamento_social,
          academico: formValues.funcionamento_academico,
          motor: formValues.funcionamento_motor,
        },
      },
    }),
    [formValues]
  );

  const payload = useMemo(
    () => buildPayload(data, payloadFormValues as any),
    [data, payloadFormValues]
  );

  const markdown = useMemo(
    () => generateMarkdown(data, payloadFormValues as any, payload, identificacao),
    [data, payloadFormValues, payload, identificacao]
  );

  const reset = useCallback(() => {
    if (!window.confirm("Limpar todos os dados preenchidos?")) return;
    setIdentificacao({
      paciente: "",
      dataNascimento: "",
      sexo: "",
      escolaridade: "",
      ocupacao: "",
      queixa: "",
    });
    const impacto: { [k: string]: string } = {};
    for (const d of data.dominios_impacto) {
      impacto[d.id] = "0";
    }
    setFormValues({
      descricao_global: "",
      funcionamento_adaptativo: "",
      funcionamento_comunicacao: "",
      funcionamento_social: "",
      funcionamento_academico: "",
      funcionamento_motor: "",
      nivel_suporte: "",
      impacto,
      comorbidades_selecionadas: [],
      observacoes_gerais: "",
    });
  }, [data]);

  const copiarMarkdown = useCallback(async () => {
    try { await navigator.clipboard.writeText(markdown); return true; } catch { return false; }
  }, [markdown]);

  return {
    identificacao,
    formValues,
    payload,
    markdown,
    setIdentificacaoField,
    setField,
    setImpacto,
    toggleComorbidade,
    reset,
    copiarMarkdown,
  };
}

---

## src/infra/hooks/use-conjuncao-temporal-complexa.ts
// ═══════════════════════════════════════════════════════════════════════════
// Hook: useConjuncaoTemporalComplexa
// Para transtornos que exigem coexistencia temporal de dois eixos:
// eixo A (humor) e eixo B (psicose/manicia), com regras de exclusividade.
// Ex: Transtorno Esquizoafetivo (mania/depressao + psicose),
//     Transtorno Ciclotimico (hipomania + depressao sub-sindromica)
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import type { TranstornoDSM } from "@/infra/types";
import { buildPayload } from "@/infra/utils/payload-builder";
import { generateMarkdown } from "@/infra/utils/markdown-generator";

export interface IdentificacaoState {
  paciente: string;
  dataNascimento: string;
  sexo: string;
  escolaridade: string;
  ocupacao: string;
  queixa: string;
}

interface EixoState {
  [sintomaId: string]: boolean;
}

interface CriteriosState {
  [criterioId: string]: boolean;
}

interface FormState {
  eixo_a: EixoState;       // humor: mania/depressao
  eixo_b: EixoState;       // psicose ou sintomas complementares
  criterios_condicionais: CriteriosState;
  duracao_psicose_sem_humor_semanas: string;
  duracao_total_episodio_semanas: string;
  gravidade: string;
  impacto: { [dominioId: string]: string };
  comorbidades_selecionadas: string[];
  notas_clinicas: {
    historia: string;
    observacoes_eixos: string;
    observacoes_gerais: string;
  };
}

export function useConjuncaoTemporalComplexa(data: TranstornoDSM) {
  const [identificacao, setIdentificacao] = useState<IdentificacaoState>({
    paciente: "",
    dataNascimento: "",
    sexo: "",
    escolaridade: "",
    ocupacao: "",
    queixa: "",
  });

  const setIdentificacaoField = useCallback(
    (field: string, value: string) =>
      setIdentificacao((prev) => ({ ...prev, [field]: value })),
    []
  );

  const [formValues, setFormValues] = useState<FormState>(() => {
    const eixoA: EixoState = {};
    const eixoB: EixoState = {};
    for (const cluster of data.clusters_sintomas) {
      const target = cluster.id === "A" ? eixoA : eixoB;
      for (const s of cluster.sintomas) {
        target[s.id] = false;
      }
    }
    const criterios: CriteriosState = {};
    for (const c of data.criterios_condicionais) {
      criterios[c.id] = false;
    }
    const impacto: { [k: string]: string } = {};
    for (const d of data.dominios_impacto) {
      impacto[d.id] = "0";
    }
    return {
      eixo_a: eixoA,
      eixo_b: eixoB,
      criterios_condicionais: criterios,
      duracao_psicose_sem_humor_semanas: "",
      duracao_total_episodio_semanas: "",
      gravidade: "",
      impacto,
      comorbidades_selecionadas: [],
      notas_clinicas: {
        historia: "",
        observacoes_eixos: "",
        observacoes_gerais: "",
      },
    };
  });

  const toggleEixoA = useCallback((sintomaId: string) => {
    setFormValues((prev) => {
      const newEixo = { ...prev.eixo_a };
      newEixo[sintomaId] = !newEixo[sintomaId];
      return { ...prev, eixo_a: newEixo };
    });
  }, []);

  const toggleEixoB = useCallback((sintomaId: string) => {
    setFormValues((prev) => {
      const newEixo = { ...prev.eixo_b };
      newEixo[sintomaId] = !newEixo[sintomaId];
      return { ...prev, eixo_b: newEixo };
    });
  }, []);

  const toggleCriterio = useCallback((criterioId: string) => {
    setFormValues((prev) => {
      const newCriterios = { ...prev.criterios_condicionais };
      newCriterios[criterioId] = !newCriterios[criterioId];
      return { ...prev, criterios_condicionais: newCriterios };
    });
  }, []);

  const setGravidade = useCallback((gravidade: string) => {
    setFormValues((prev) => ({ ...prev, gravidade }));
  }, []);

  const setImpacto = useCallback((dominioId: string, value: string) => {
    setFormValues((prev) => {
      const newImpacto = { ...prev.impacto };
      newImpacto[dominioId] = value;
      return { ...prev, impacto: newImpacto };
    });
  }, []);

  const setNotasClinicas = useCallback((field: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      notas_clinicas: { ...prev.notas_clinicas, [field]: value },
    }));
  }, []);

  const toggleComorbidade = useCallback((condicao: string) => {
    setFormValues((prev) => {
      const atual = prev.comorbidades_selecionadas;
      const inclui = atual.includes(condicao);
      return {
        ...prev,
        comorbidades_selecionadas: inclui
          ? atual.filter((c) => c !== condicao)
          : [...atual, condicao],
      };
    });
  }, []);

  // Contadores
  const contadores = useMemo(() => {
    const clusters = data.clusters_sintomas;
    const eixoA_limiar = clusters[0]?.limiar?.adulto || 0;
    const eixoB_limiar = clusters[1]?.limiar?.adulto || 0;
    const eixoA_count = Object.values(formValues.eixo_a).filter(Boolean).length;
    const eixoB_count = Object.values(formValues.eixo_b).filter(Boolean).length;
    return {
      eixoA: { selecionados: eixoA_count, limiar: eixoA_limiar, satisfeito: eixoA_count >= eixoA_limiar },
      eixoB: { selecionados: eixoB_count, limiar: eixoB_limiar, satisfeito: eixoB_count >= eixoB_limiar },
    };
  }, [formValues.eixo_a, formValues.eixo_b, data.clusters_sintomas]);

  const criteriosBECount = useMemo(
    () => Object.values(formValues.criterios_condicionais).filter(Boolean).length,
    [formValues.criterios_condicionais]
  );

  const criteriosBETotal = data.criterios_condicionais.length;

  const payloadFormValues = useMemo(
    () => ({
      clusters: {
        A: Object.fromEntries(
          Object.entries(formValues.eixo_a).map(([k, v]) => [k, { checked: v, severity: "" }])
        ),
        B: Object.fromEntries(
          Object.entries(formValues.eixo_b).map(([k, v]) => [k, { checked: v, severity: "" }])
        ),
      },
      criterios_condicionais: formValues.criterios_condicionais,
      subtipo_selecionado: null,
      gravidade: formValues.gravidade,
      especificadores: {
        duracao_psicose_sem_humor: formValues.duracao_psicose_sem_humor_semanas,
        duracao_total: formValues.duracao_total_episodio_semanas,
      },
      impacto: formValues.impacto,
      comorbidades_selecionadas: formValues.comorbidades_selecionadas,
      notas_clinicas: formValues.notas_clinicas,
    }),
    [formValues]
  );

  const payload = useMemo(
    () => buildPayload(data, payloadFormValues as any),
    [data, payloadFormValues]
  );

  const markdown = useMemo(
    () => generateMarkdown(data, payloadFormValues as any, payload, identificacao),
    [data, payloadFormValues, payload, identificacao]
  );

  const reset = useCallback(() => {
    if (!window.confirm("Limpar todos os dados preenchidos?")) return;
    setIdentificacao({
      paciente: "",
      dataNascimento: "",
      sexo: "",
      escolaridade: "",
      ocupacao: "",
      queixa: "",
    });
    const eixoA: EixoState = {};
    const eixoB: EixoState = {};
    for (const cluster of data.clusters_sintomas) {
      const target = cluster.id === "A" ? eixoA : eixoB;
      for (const s of cluster.sintomas) {
        target[s.id] = false;
      }
    }
    const criterios: CriteriosState = {};
    for (const c of data.criterios_condicionais) {
      criterios[c.id] = false;
    }
    const impacto: { [k: string]: string } = {};
    for (const d of data.dominios_impacto) {
      impacto[d.id] = "0";
    }
    setFormValues({
      eixo_a: eixoA,
      eixo_b: eixoB,
      criterios_condicionais: criterios,
      duracao_psicose_sem_humor_semanas: "",
      duracao_total_episodio_semanas: "",
      gravidade: "",
      impacto,
      comorbidades_selecionadas: [],
      notas_clinicas: {
        historia: "",
        observacoes_eixos: "",
        observacoes_gerais: "",
      },
    });
  }, [data]);

  const copiarMarkdown = useCallback(async () => {
    try { await navigator.clipboard.writeText(markdown); return true; } catch { return false; }
  }, [markdown]);

  return {
    identificacao,
    formValues,
    contadores,
    criteriosBECount,
    criteriosBETotal,
    payload,
    markdown,
    setIdentificacaoField,
    toggleEixoA,
    toggleEixoB,
    toggleCriterio,
    setGravidade,
    setImpacto,
    toggleComorbidade,
    setNotasClinicas,
    reset,
    copiarMarkdown,
  };
}

---

## src/infra/hooks/use-tripartite-funcional.ts
// ═══════════════════════════════════════════════════════════════════════════
// Hook: useTripartiteFuncional
// Para transtornos com tres dominios funcionais avaliados numericamente
// Ex: Deficiencia Intelectual (A=QI, B=funcionamento adaptativo, C=inicio<18)
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import type { TranstornoDSM } from "@/infra/types";
import { buildPayload } from "@/infra/utils/payload-builder";
import { generateMarkdown } from "@/infra/utils/markdown-generator";

export interface IdentificacaoState {
  paciente: string;
  dataNascimento: string;
  sexo: string;
  escolaridade: string;
  ocupacao: string;
  queixa: string;
}

interface FormState {
  qi: string;
  escore_conceitual: string;
  escore_social: string;
  escore_pratico: string;
  inicio_antes_18: boolean;
  gravidade: string;
  impacto: { [dominioId: string]: string };
  comorbidades_selecionadas: string[];
  notas_clinicas: {
    historia: string;
    observacoes_gerais: string;
  };
}

export function useTripartiteFuncional(data: TranstornoDSM) {
  const [identificacao, setIdentificacao] = useState<IdentificacaoState>({
    paciente: "",
    dataNascimento: "",
    sexo: "",
    escolaridade: "",
    ocupacao: "",
    queixa: "",
  });

  const setIdentificacaoField = useCallback(
    (field: string, value: string) =>
      setIdentificacao((prev) => ({ ...prev, [field]: value })),
    []
  );

  const [formValues, setFormValues] = useState<FormState>(() => {
    const impacto: { [k: string]: string } = {};
    for (const d of data.dominios_impacto) {
      impacto[d.id] = "0";
    }
    return {
      qi: "",
      escore_conceitual: "",
      escore_social: "",
      escore_pratico: "",
      inicio_antes_18: false,
      gravidade: "",
      impacto,
      comorbidades_selecionadas: [],
      notas_clinicas: {
        historia: "",
        observacoes_gerais: "",
      },
    };
  });

  const setField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  const setImpacto = useCallback((dominioId: string, value: string) => {
    setFormValues((prev) => {
      const newImpacto = { ...prev.impacto };
      newImpacto[dominioId] = value;
      return { ...prev, impacto: newImpacto };
    });
  }, []);

  const toggleComorbidade = useCallback((condicao: string) => {
    setFormValues((prev) => {
      const atual = prev.comorbidades_selecionadas;
      const inclui = atual.includes(condicao);
      return {
        ...prev,
        comorbidades_selecionadas: inclui
          ? atual.filter((c) => c !== condicao)
          : [...atual, condicao],
      };
    });
  }, []);

  const setNotasClinicas = useCallback((field: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      notas_clinicas: { ...prev.notas_clinicas, [field]: value },
    }));
  }, []);

  const qiNum = parseInt(formValues.qi) || 0;
  const conceitualNum = parseInt(formValues.escore_conceitual) || 0;
  const socialNum = parseInt(formValues.escore_social) || 0;
  const praticoNum = parseInt(formValues.escore_pratico) || 0;
  const adaptativoDeficitario = conceitualNum < 70 || socialNum < 70 || praticoNum < 70;
  const qiValido = qiNum > 0 && qiNum < 70;

  const diagnosticoProvavel = useMemo(() => {
    return qiValido && adaptativoDeficitario && formValues.inicio_antes_18;
  }, [qiValido, adaptativoDeficitario, formValues.inicio_antes_18]);

  const payloadFormValues = useMemo(
    () => ({
      clusters: {} as Record<string, Record<string, { checked: boolean; severity: string }>>,
      criterios_condicionais: {
        qi_menor_70: qiValido,
        funcionamento_adaptativo_deficitario: adaptativoDeficitario,
        inicio_antes_18: formValues.inicio_antes_18,
      },
      subtipo_selecionado: null,
      gravidade: formValues.gravidade,
      especificadores: {},
      impacto: formValues.impacto,
      comorbidades_selecionadas: formValues.comorbidades_selecionadas,
      notas_clinicas: {
        historia: formValues.notas_clinicas.historia,
        observacoes_gerais: formValues.notas_clinicas.observacoes_gerais,
        observacoes_clusters: {
          qi: formValues.qi,
          conceitual: formValues.escore_conceitual,
          social: formValues.escore_social,
          pratico: formValues.escore_pratico,
        },
      },
    }),
    [formValues, qiValido, adaptativoDeficitario]
  );

  const payload = useMemo(
    () => buildPayload(data, payloadFormValues as any),
    [data, payloadFormValues]
  );

  const markdown = useMemo(
    () => generateMarkdown(data, payloadFormValues as any, payload, identificacao),
    [data, payloadFormValues, payload, identificacao]
  );

  const reset = useCallback(() => {
    if (!window.confirm("Limpar todos os dados preenchidos?")) return;
    setIdentificacao({
      paciente: "",
      dataNascimento: "",
      sexo: "",
      escolaridade: "",
      ocupacao: "",
      queixa: "",
    });
    const impacto: { [k: string]: string } = {};
    for (const d of data.dominios_impacto) {
      impacto[d.id] = "0";
    }
    setFormValues({
      qi: "",
      escore_conceitual: "",
      escore_social: "",
      escore_pratico: "",
      inicio_antes_18: false,
      gravidade: "",
      impacto,
      comorbidades_selecionadas: [],
      notas_clinicas: {
        historia: "",
        observacoes_gerais: "",
      },
    });
  }, [data]);

  const copiarMarkdown = useCallback(async () => {
    try { await navigator.clipboard.writeText(markdown); return true; } catch { return false; }
  }, [markdown]);

  return {
    identificacao,
    formValues,
    qiNum,
    adaptativoDeficitario,
    diagnosticoProvavel,
    payload,
    markdown,
    setIdentificacaoField,
    setField,
    setImpacto,
    toggleComorbidade,
    setNotasClinicas,
    reset,
    copiarMarkdown,
  };
}

---

## src/infra/hooks/use-psicomotor-polythetic.ts
// ═══════════════════════════════════════════════════════════════════════════
// Hook: usePsicomotorPolythetic
// Para transtornos com sintomas psicomotores que exigem observação clínica
// direta (achados objetivos obrigatórios). Ex: Transtornos do movimento
// induzidos por medicamentos, catatonia.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import type { TranstornoDSM, SintomaFormState } from "@/infra/types";
import { buildPayload } from "@/infra/utils/payload-builder";
import { generateMarkdown } from "@/infra/utils/markdown-generator";

export interface IdentificacaoState {
  paciente: string;
  dataNascimento: string;
  sexo: string;
  escolaridade: string;
  ocupacao: string;
  queixa: string;
}

interface ClusterState {
  [sintomaId: string]: SintomaFormState;
}

interface FormState {
  clusters: { [clusterId: string]: ClusterState };
  criterios_condicionais: { [criterioId: string]: boolean };
  subtipo_selecionado: string | null;
  gravidade: string;
  especificadores: { [espId: string]: boolean | string };
  impacto: { [dominioId: string]: string };
  comorbidades_selecionadas: string[];
  notas_clinicas: {
    historia: string;
    observacoes_clusters: { [clusterId: string]: string };
    observacoes_gerais: string;
    achados_objetivos: string[];
  };
}

export function usePsicomotorPolythetic(data: TranstornoDSM) {
  const [identificacao, setIdentificacao] = useState<IdentificacaoState>({
    paciente: "",
    dataNascimento: "",
    sexo: "",
    escolaridade: "",
    ocupacao: "",
    queixa: "",
  });

  const setIdentificacaoField = useCallback(
    (field: string, value: string) => {
      setIdentificacao((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const [formValues, setFormValues] = useState<FormState>(() => {
    const clusters: { [clusterId: string]: ClusterState } = {};
    for (const cluster of data.clusters_sintomas) {
      clusters[cluster.id] = {};
      for (const sintoma of cluster.sintomas) {
        clusters[cluster.id][sintoma.id] = { checked: false, severity: "" };
      }
    }

    const criterios: { [criterioId: string]: boolean } = {};
    for (const c of data.criterios_condicionais) {
      criterios[c.id] = false;
    }

    const impacto: { [dominioId: string]: string } = {};
    for (const d of data.dominios_impacto) {
      impacto[d.id] = "0";
    }

    return {
      clusters,
      criterios_condicionais: criterios,
      subtipo_selecionado: null,
      gravidade: "",
      especificadores: {},
      impacto,
      comorbidades_selecionadas: [],
      notas_clinicas: {
        historia: "",
        observacoes_clusters: {},
        observacoes_gerais: "",
        achados_objetivos: [],
      },
    };
  });

  const toggleSintoma = useCallback(
    (clusterId: string, sintomaId: string, checked: boolean) => {
      setFormValues((prev) => {
        const newClusters = { ...prev.clusters };
        newClusters[clusterId] = { ...newClusters[clusterId] };
        newClusters[clusterId][sintomaId] = {
          ...newClusters[clusterId][sintomaId],
          checked,
        };
        return { ...prev, clusters: newClusters };
      });
    },
    []
  );

  const setSeverity = useCallback(
    (clusterId: string, sintomaId: string, severity: string) => {
      setFormValues((prev) => {
        const newClusters = { ...prev.clusters };
        newClusters[clusterId] = { ...newClusters[clusterId] };
        newClusters[clusterId][sintomaId] = {
          ...newClusters[clusterId][sintomaId],
          severity: severity as SintomaFormState["severity"],
        };
        return { ...prev, clusters: newClusters };
      });
    },
    []
  );

  const toggleCriterio = useCallback((criterioId: string) => {
    setFormValues((prev) => {
      const newCriterios = { ...prev.criterios_condicionais };
      newCriterios[criterioId] = !newCriterios[criterioId];
      return { ...prev, criterios_condicionais: newCriterios };
    });
  }, []);

  const setGravidade = useCallback((gravidade: string) => {
    setFormValues((prev) => ({ ...prev, gravidade }));
  }, []);

  const setImpacto = useCallback((dominioId: string, value: string) => {
    setFormValues((prev) => {
      const newImpacto = { ...prev.impacto };
      newImpacto[dominioId] = value;
      return { ...prev, impacto: newImpacto };
    });
  }, []);

  const toggleComorbidade = useCallback((condicao: string) => {
    setFormValues((prev) => {
      const atual = prev.comorbidades_selecionadas;
      const inclui = atual.includes(condicao);
      return {
        ...prev,
        comorbidades_selecionadas: inclui
          ? atual.filter((c) => c !== condicao)
          : [...atual, condicao],
      };
    });
  }, []);

  const setNotasClinicas = useCallback(
    (field: string, value: string, clusterId?: string) => {
      setFormValues((prev) => {
        if (clusterId) {
          const newObs = { ...prev.notas_clinicas.observacoes_clusters };
          newObs[clusterId] = value;
          return {
            ...prev,
            notas_clinicas: {
              ...prev.notas_clinicas,
              observacoes_clusters: newObs,
            },
          };
        }
        return {
          ...prev,
          notas_clinicas: { ...prev.notas_clinicas, [field]: value },
        };
      });
    },
    []
  );

  const toggleAchadoObjetivo = useCallback((achado: string) => {
    setFormValues((prev) => {
      const atual = prev.notas_clinicas.achados_objetivos;
      const inclui = atual.includes(achado);
      return {
        ...prev,
        notas_clinicas: {
          ...prev.notas_clinicas,
          achados_objetivos: inclui
            ? atual.filter((a) => a !== achado)
            : [...atual, achado],
        },
      };
    });
  }, []);

  const contadores = useMemo(() => {
    const result: Record<string, { selecionados: number; limiar: number }> = {};
    for (const cluster of data.clusters_sintomas) {
      const clusterState = formValues.clusters[cluster.id] || {};
      const selecionados = Object.values(clusterState).filter(
        (s: SintomaFormState) => s.checked
      ).length;
      const limiar = cluster.limiar?.adulto || cluster.limiar?.pediatria || 0;
      result[cluster.id] = { selecionados, limiar };
    }
    return result;
  }, [formValues.clusters, data.clusters_sintomas]);

  const criteriosBECount = useMemo(() => {
    return Object.values(formValues.criterios_condicionais).filter(Boolean).length;
  }, [formValues.criterios_condicionais]);

  const criteriosBETotal = data.criterios_condicionais.length;

  const payload = useMemo(
    () => buildPayload(data, formValues as any),
    [data, formValues]
  );

  const markdown = useMemo(
    () => generateMarkdown(data, formValues as any, payload, identificacao),
    [data, formValues, payload, identificacao]
  );

  const reset = useCallback(() => {
    if (!window.confirm("Limpar todos os dados preenchidos?")) return;
    setIdentificacao({
      paciente: "",
      dataNascimento: "",
      sexo: "",
      escolaridade: "",
      ocupacao: "",
      queixa: "",
    });
    const newClusters: { [clusterId: string]: ClusterState } = {};
    for (const cluster of data.clusters_sintomas) {
      newClusters[cluster.id] = {};
      for (const sintoma of cluster.sintomas) {
        newClusters[cluster.id][sintoma.id] = { checked: false, severity: "" };
      }
    }
    const newCriterios: { [criterioId: string]: boolean } = {};
    for (const c of data.criterios_condicionais) {
      newCriterios[c.id] = false;
    }
    const newImpacto: { [dominioId: string]: string } = {};
    for (const d of data.dominios_impacto) {
      newImpacto[d.id] = "0";
    }
    setFormValues({
      clusters: newClusters,
      criterios_condicionais: newCriterios,
      subtipo_selecionado: null,
      gravidade: "",
      especificadores: {},
      impacto: newImpacto,
      comorbidades_selecionadas: [],
      notas_clinicas: {
        historia: "",
        observacoes_clusters: {},
        observacoes_gerais: "",
        achados_objetivos: [],
      },
    });
  }, [data]);

  const copiarMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      return true;
    } catch {
      return false;
    }
  }, [markdown]);

  return {
    identificacao,
    formValues,
    contadores,
    criteriosBECount,
    criteriosBETotal,
    payload,
    markdown,
    setIdentificacaoField,
    toggleSintoma,
    setSeverity,
    toggleCriterio,
    setGravidade,
    setImpacto,
    toggleComorbidade,
    setNotasClinicas,
    toggleAchadoObjetivo,
    reset,
    copiarMarkdown,
  };
}

---

## src/infra/hooks/use-polythetic-simetricos.ts
// ═══════════════════════════════════════════════════════════════════════════
// Hook: usePolytheticSimetricos
// Para transtornos com clusters paralelos e limiares independentes
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import type { TranstornoDSM, SintomaFormState } from "@/infra/types";
import { buildPayload } from "@/infra/utils/payload-builder";
import { generateMarkdown } from "@/infra/utils/markdown-generator";

export interface IdentificacaoState {
  paciente: string;
  dataNascimento: string;
  sexo: string;
  escolaridade: string;
  ocupacao: string;
  queixa: string;
}

interface ClusterState {
  [sintomaId: string]: SintomaFormState;
}

interface ClustersState {
  [clusterId: string]: ClusterState;
}

interface CriteriosState {
  [criterioId: string]: boolean;
}

interface ImpactoState {
  [dominioId: string]: string;
}

interface NotasClinicasState {
  historia: string;
  observacoes_clusters: { [clusterId: string]: string };
  observacoes_gerais: string;
}

interface FormState {
  clusters: ClustersState;
  criterios_condicionais: CriteriosState;
  subtipo_selecionado: string | null;
  gravidade: string;
  especificadores: { [espId: string]: boolean | string };
  impacto: ImpactoState;
  comorbidades_selecionadas: string[];
  notas_clinicas: NotasClinicasState;
}

export function usePolytheticSimetricos(data: TranstornoDSM) {
  const [identificacao, setIdentificacao] = useState<IdentificacaoState>({
    paciente: "",
    dataNascimento: "",
    sexo: "",
    escolaridade: "",
    ocupacao: "",
    queixa: "",
  });

  const setIdentificacaoField = useCallback(
    (field: string, value: string) => {
      setIdentificacao((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const [formValues, setFormValues] = useState<FormState>(() => {
    const clusters: ClustersState = {};
    for (const cluster of data.clusters_sintomas) {
      clusters[cluster.id] = {};
      for (const sintoma of cluster.sintomas) {
        clusters[cluster.id][sintoma.id] = { checked: false, severity: "" };
      }
    }

    const criterios: CriteriosState = {};
    for (const c of data.criterios_condicionais) {
      criterios[c.id] = false;
    }

    const impacto: ImpactoState = {};
    for (const d of data.dominios_impacto) {
      impacto[d.id] = "0";
    }

    return {
      clusters,
      criterios_condicionais: criterios,
      subtipo_selecionado: null,
      gravidade: "",
      especificadores: {},
      impacto,
      comorbidades_selecionadas: [],
      notas_clinicas: {
        historia: "",
        observacoes_clusters: {},
        observacoes_gerais: "",
      },
    };
  });

  const toggleSintoma = useCallback(
    (clusterId: string, sintomaId: string, checked: boolean) => {
      setFormValues((prev) => {
        const newClusters = { ...prev.clusters };
        newClusters[clusterId] = { ...newClusters[clusterId] };
        newClusters[clusterId][sintomaId] = {
          ...newClusters[clusterId][sintomaId],
          checked,
        };
        return { ...prev, clusters: newClusters };
      });
    },
    []
  );

  const setSeverity = useCallback(
    (clusterId: string, sintomaId: string, severity: string) => {
      setFormValues((prev) => {
        const newClusters = { ...prev.clusters };
        newClusters[clusterId] = { ...newClusters[clusterId] };
        newClusters[clusterId][sintomaId] = {
          ...newClusters[clusterId][sintomaId],
          severity: severity as SintomaFormState["severity"],
        };
        return { ...prev, clusters: newClusters };
      });
    },
    []
  );

  const toggleCriterio = useCallback((criterioId: string) => {
    setFormValues((prev) => {
      const newCriterios = { ...prev.criterios_condicionais };
      newCriterios[criterioId] = !newCriterios[criterioId];
      return { ...prev, criterios_condicionais: newCriterios };
    });
  }, []);

  const setSubtipo = useCallback((subtipoId: string | null) => {
    setFormValues((prev) => ({ ...prev, subtipo_selecionado: subtipoId }));
  }, []);

  const setGravidade = useCallback((gravidade: string) => {
    setFormValues((prev) => ({ ...prev, gravidade }));
  }, []);

  const setImpacto = useCallback((dominioId: string, value: string) => {
    setFormValues((prev) => {
      const newImpacto = { ...prev.impacto };
      newImpacto[dominioId] = value;
      return { ...prev, impacto: newImpacto };
    });
  }, []);

  const toggleComorbidade = useCallback((condicao: string) => {
    setFormValues((prev) => {
      const atual = prev.comorbidades_selecionadas;
      const inclui = atual.includes(condicao);
      return {
        ...prev,
        comorbidades_selecionadas: inclui
          ? atual.filter((c) => c !== condicao)
          : [...atual, condicao],
      };
    });
  }, []);

  const setNotasClinicas = useCallback(
    (field: string, value: string, clusterId?: string) => {
      setFormValues((prev) => {
        if (clusterId) {
          const newObs = { ...prev.notas_clinicas.observacoes_clusters };
          newObs[clusterId] = value;
          return {
            ...prev,
            notas_clinicas: {
              ...prev.notas_clinicas,
              observacoes_clusters: newObs,
            },
          };
        }
        return {
          ...prev,
          notas_clinicas: { ...prev.notas_clinicas, [field]: value },
        };
      });
    },
    []
  );

  const contadores = useMemo(() => {
    const result: Record<string, { selecionados: number; limiar: number }> = {};
    for (const cluster of data.clusters_sintomas) {
      const clusterState = formValues.clusters[cluster.id] || {};
      const selecionados = Object.values(clusterState).filter(
        (s: SintomaFormState) => s.checked
      ).length;
      const limiar = cluster.limiar?.adulto || cluster.limiar?.pediatria || 0;
      result[cluster.id] = { selecionados, limiar };
    }
    return result;
  }, [formValues.clusters, data.clusters_sintomas]);

  const criteriosBECount = useMemo(() => {
    return Object.values(formValues.criterios_condicionais).filter(Boolean).length;
  }, [formValues.criterios_condicionais]);

  const criteriosBETotal = data.criterios_condicionais.length;

  const payload = useMemo(
    () => buildPayload(data, formValues as any),
    [data, formValues]
  );

  const markdown = useMemo(
    () => generateMarkdown(data, formValues as any, payload, identificacao),
    [data, formValues, payload, identificacao]
  );

  const apresentacao = useMemo(() => {
    if (data.estrutura_geral !== "polythetic_clusters_simetricos") return null;
    const cA1 = contadores["A1"];
    const cA2 = contadores["A2"];
    if (!cA1 || !cA2) return null;
    const atingeA1 = cA1.selecionados >= cA1.limiar;
    const atingeA2 = cA2.selecionados >= cA2.limiar;
    if (atingeA1 && atingeA2) return "Apresentação combinada";
    if (atingeA1) return "Predominantemente desatentiva";
    if (atingeA2) return "Predominantemente hiperativa/impulsiva";
    return "Abaixo do limiar para apresentações formais";
  }, [contadores, data.estrutura_geral]);

  const reset = useCallback(() => {
    if (!window.confirm("Limpar todos os dados preenchidos?")) return;

    setIdentificacao({
      paciente: "",
      dataNascimento: "",
      sexo: "",
      escolaridade: "",
      ocupacao: "",
      queixa: "",
    });

    const newClusters: ClustersState = {};
    for (const cluster of data.clusters_sintomas) {
      newClusters[cluster.id] = {};
      for (const sintoma of cluster.sintomas) {
        newClusters[cluster.id][sintoma.id] = { checked: false, severity: "" };
      }
    }
    const newCriterios: CriteriosState = {};
    for (const c of data.criterios_condicionais) {
      newCriterios[c.id] = false;
    }
    const newImpacto: ImpactoState = {};
    for (const d of data.dominios_impacto) {
      newImpacto[d.id] = "0";
    }

    setFormValues({
      clusters: newClusters,
      criterios_condicionais: newCriterios,
      subtipo_selecionado: null,
      gravidade: "",
      especificadores: {},
      impacto: newImpacto,
      comorbidades_selecionadas: [],
      notas_clinicas: {
        historia: "",
        observacoes_clusters: {},
        observacoes_gerais: "",
      },
    });
  }, [data]);

  const copiarMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      return true;
    } catch {
      return false;
    }
  }, [markdown]);

  return {
    identificacao,
    formValues,
    contadores,
    criteriosBECount,
    criteriosBETotal,
    apresentacao,
    payload,
    markdown,
    setIdentificacaoField,
    toggleSintoma,
    setSeverity,
    toggleCriterio,
    setSubtipo,
    setGravidade,
    setImpacto,
    toggleComorbidade,
    setNotasClinicas,
    reset,
    copiarMarkdown,
  };
}

---

## src/infra/hooks/use-polythetic-assimetricos.ts
// ═══════════════════════════════════════════════════════════════════════════
// Hook: usePolytheticAssimetricos
// Para transtornos com clusters de tipos diferentes (assimetricos)
// Ex: TEA — Cluster A: monothetic (todos obrigatorios), Cluster B: polythetic (2/4)
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import type { TranstornoDSM, SintomaFormState } from "@/infra/types";
import { buildPayload } from "@/infra/utils/payload-builder";
import { generateMarkdown } from "@/infra/utils/markdown-generator";

export interface IdentificacaoState {
  paciente: string;
  dataNascimento: string;
  sexo: string;
  escolaridade: string;
  ocupacao: string;
  queixa: string;
}

interface ClusterState {
  [sintomaId: string]: SintomaFormState;
}

interface CriteriosState {
  [criterioId: string]: boolean;
}

interface FormState {
  clusters: { [clusterId: string]: ClusterState };
  criterios_condicionais: CriteriosState;
  subtipo_selecionado: string | null;
  gravidade: string;
  impacto: { [dominioId: string]: string };
  comorbidades_selecionadas: string[];
  especificadores: { [id: string]: boolean | string };
  notas_clinicas: {
    historia: string;
    observacoes_clusters: { [clusterId: string]: string };
    observacoes_gerais: string;
  };
}

export function usePolytheticAssimetricos(data: TranstornoDSM) {
  const [identificacao, setIdentificacao] = useState<IdentificacaoState>({
    paciente: "",
    dataNascimento: "",
    sexo: "",
    escolaridade: "",
    ocupacao: "",
    queixa: "",
  });

  const setIdentificacaoField = useCallback(
    (field: string, value: string) =>
      setIdentificacao((prev) => ({ ...prev, [field]: value })),
    []
  );

  const [formValues, setFormValues] = useState<FormState>(() => {
    const clusters: { [k: string]: ClusterState } = {};
    for (const cluster of data.clusters_sintomas) {
      clusters[cluster.id] = {};
      for (const s of cluster.sintomas) {
        clusters[cluster.id][s.id] = { checked: false, severity: "" };
      }
    }
    const criterios: CriteriosState = {};
    for (const c of data.criterios_condicionais) criterios[c.id] = false;
    const impacto: { [k: string]: string } = {};
    for (const d of data.dominios_impacto) impacto[d.id] = "0";
    const especificadores: { [id: string]: boolean | string } = {};
    for (const e of data.especificadores) {
      especificadores[e.id] = e.tipo === "booleano" ? false : "";
    }
    return {
      clusters,
      criterios_condicionais: criterios,
      subtipo_selecionado: null,
      gravidade: "",
      impacto,
      comorbidades_selecionadas: [],
      especificadores,
      notas_clinicas: { historia: "", observacoes_clusters: {}, observacoes_gerais: "" },
    };
  });

  const toggleSintoma = useCallback(
    (clusterId: string, sintomaId: string, checked: boolean) => {
      setFormValues((prev) => {
        const newClusters = { ...prev.clusters };
        newClusters[clusterId] = { ...newClusters[clusterId] };
        newClusters[clusterId][sintomaId] = {
          ...newClusters[clusterId][sintomaId],
          checked,
        };
        return { ...prev, clusters: newClusters };
      });
    },
    []
  );

  const toggleCriterio = useCallback((criterioId: string) => {
    setFormValues((prev) => {
      const newCriterios = { ...prev.criterios_condicionais };
      newCriterios[criterioId] = !newCriterios[criterioId];
      return { ...prev, criterios_condicionais: newCriterios };
    });
  }, []);

  const setGravidade = useCallback((gravidade: string) => {
    setFormValues((prev) => ({ ...prev, gravidade }));
  }, []);

  const setImpacto = useCallback((dominioId: string, value: string) => {
    setFormValues((prev) => {
      const newImpacto = { ...prev.impacto };
      newImpacto[dominioId] = value;
      return { ...prev, impacto: newImpacto };
    });
  }, []);

  const toggleComorbidade = useCallback((condicao: string) => {
    setFormValues((prev) => {
      const atual = prev.comorbidades_selecionadas;
      const inclui = atual.includes(condicao);
      return {
        ...prev,
        comorbidades_selecionadas: inclui
          ? atual.filter((c) => c !== condicao)
          : [...atual, condicao],
      };
    });
  }, []);

  const setEspecificador = useCallback((id: string, value: boolean | string) => {
    setFormValues((prev) => ({
      ...prev,
      especificadores: { ...prev.especificadores, [id]: value },
    }));
  }, []);

  const setNotasClinicas = useCallback(
    (field: string, value: string, clusterId?: string) => {
      setFormValues((prev) => {
        if (clusterId) {
          const newObs = { ...prev.notas_clinicas.observacoes_clusters };
          newObs[clusterId] = value;
          return {
            ...prev,
            notas_clinicas: {
              ...prev.notas_clinicas,
              observacoes_clusters: newObs,
            },
          };
        }
        return {
          ...prev,
          notas_clinicas: { ...prev.notas_clinicas, [field]: value },
        };
      });
    },
    []
  );

  // Contadores com suporte a tipos diferentes de cluster
  const contadores = useMemo(() => {
    const result: Record<string, { selecionados: number; total: number; limiar: number; tipo: string; satisfeito: boolean }> = {};
    for (const cluster of data.clusters_sintomas) {
      const cs = formValues.clusters[cluster.id] || {};
      const selecionados = Object.values(cs).filter((s: SintomaFormState) => s.checked).length;
      const total = cluster.sintomas.length;
      const tipo = cluster.tipo;

      let satisfeito = false;
      if (tipo === "monothetic_obrigatorio") {
        // TODOS os sintomas devem estar marcados
        satisfeito = selecionados === total;
      } else if (cluster.limiar) {
        // Polythetic com limiar
        const limiar = cluster.limiar.adulto || cluster.limiar.pediatria || 0;
        satisfeito = selecionados >= limiar;
      }

      result[cluster.id] = { selecionados, total, limiar: cluster.limiar?.adulto || total, tipo, satisfeito };
    }
    return result;
  }, [formValues.clusters, data.clusters_sintomas]);

  const criteriosBECount = useMemo(
    () => Object.values(formValues.criterios_condicionais).filter(Boolean).length,
    [formValues.criterios_condicionais]
  );

  const criteriosBETotal = data.criterios_condicionais.length;

  const payload = useMemo(
    () => buildPayload(data, formValues as any),
    [data, formValues]
  );

  const markdown = useMemo(
    () => generateMarkdown(data, formValues as any, payload, identificacao),
    [data, formValues, payload, identificacao]
  );

  const reset = useCallback(() => {
    if (!window.confirm("Limpar todos os dados preenchidos?")) return;
    setIdentificacao({ paciente: "", dataNascimento: "", sexo: "", escolaridade: "", ocupacao: "", queixa: "" });
    const clusters: { [k: string]: ClusterState } = {};
    for (const cluster of data.clusters_sintomas) {
      clusters[cluster.id] = {};
      for (const s of cluster.sintomas) clusters[cluster.id][s.id] = { checked: false, severity: "" };
    }
    const criterios: CriteriosState = {};
    for (const c of data.criterios_condicionais) criterios[c.id] = false;
    const impacto: { [k: string]: string } = {};
    for (const d of data.dominios_impacto) impacto[d.id] = "0";
    const especificadores: { [id: string]: boolean | string } = {};
    for (const e of data.especificadores) especificadores[e.id] = e.tipo === "booleano" ? false : "";
    setFormValues({
      clusters,
      criterios_condicionais: criterios,
      subtipo_selecionado: null,
      gravidade: "",
      impacto,
      comorbidades_selecionadas: [],
      especificadores,
      notas_clinicas: { historia: "", observacoes_clusters: {}, observacoes_gerais: "" },
    });
  }, [data]);

  const copiarMarkdown = useCallback(async () => {
    try { await navigator.clipboard.writeText(markdown); return true; } catch { return false; }
  }, [markdown]);

  return {
    identificacao,
    formValues,
    contadores,
    criteriosBECount,
    criteriosBETotal,
    payload,
    markdown,
    setIdentificacaoField,
    toggleSintoma,
    toggleCriterio,
    setGravidade,
    setImpacto,
    toggleComorbidade,
    setEspecificador,
    setNotasClinicas,
    reset,
    copiarMarkdown,
  };
}

---

## src/infra/hooks/use-polythetic-monocluster.ts
// ═══════════════════════════════════════════════════════════════════════════
// Hook: usePolytheticMonocluster
// Para transtornos com um único cluster polytetic (um conjunto de sintomas
// com limiar único). Ex: Transtornos da personalidade com critérios gerais.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import type { TranstornoDSM, SintomaFormState } from "@/infra/types";
import { buildPayload } from "@/infra/utils/payload-builder";
import { generateMarkdown } from "@/infra/utils/markdown-generator";

export interface IdentificacaoState {
  paciente: string;
  dataNascimento: string;
  sexo: string;
  escolaridade: string;
  ocupacao: string;
  queixa: string;
}

interface ClusterState {
  [sintomaId: string]: SintomaFormState;
}

interface FormState {
  clusters: { [clusterId: string]: ClusterState };
  criterios_condicionais: { [criterioId: string]: boolean };
  subtipo_selecionado: string | null;
  gravidade: string;
  especificadores: { [espId: string]: boolean | string };
  impacto: { [dominioId: string]: string };
  comorbidades_selecionadas: string[];
  notas_clinicas: {
    historia: string;
    observacoes_clusters: { [clusterId: string]: string };
    observacoes_gerais: string;
  };
}

export function usePolytheticMonocluster(data: TranstornoDSM) {
  const [identificacao, setIdentificacao] = useState<IdentificacaoState>({
    paciente: "",
    dataNascimento: "",
    sexo: "",
    escolaridade: "",
    ocupacao: "",
    queixa: "",
  });

  const setIdentificacaoField = useCallback(
    (field: string, value: string) => {
      setIdentificacao((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const [formValues, setFormValues] = useState<FormState>(() => {
    const clusters: { [clusterId: string]: ClusterState } = {};
    for (const cluster of data.clusters_sintomas) {
      clusters[cluster.id] = {};
      for (const sintoma of cluster.sintomas) {
        clusters[cluster.id][sintoma.id] = { checked: false, severity: "" };
      }
    }

    const criterios: { [criterioId: string]: boolean } = {};
    for (const c of data.criterios_condicionais) {
      criterios[c.id] = false;
    }

    const impacto: { [dominioId: string]: string } = {};
    for (const d of data.dominios_impacto) {
      impacto[d.id] = "0";
    }

    return {
      clusters,
      criterios_condicionais: criterios,
      subtipo_selecionado: null,
      gravidade: "",
      especificadores: {},
      impacto,
      comorbidades_selecionadas: [],
      notas_clinicas: {
        historia: "",
        observacoes_clusters: {},
        observacoes_gerais: "",
      },
    };
  });

  const toggleSintoma = useCallback(
    (clusterId: string, sintomaId: string, checked: boolean) => {
      setFormValues((prev) => {
        const newClusters = { ...prev.clusters };
        newClusters[clusterId] = { ...newClusters[clusterId] };
        newClusters[clusterId][sintomaId] = {
          ...newClusters[clusterId][sintomaId],
          checked,
        };
        return { ...prev, clusters: newClusters };
      });
    },
    []
  );

  const setSeverity = useCallback(
    (clusterId: string, sintomaId: string, severity: string) => {
      setFormValues((prev) => {
        const newClusters = { ...prev.clusters };
        newClusters[clusterId] = { ...newClusters[clusterId] };
        newClusters[clusterId][sintomaId] = {
          ...newClusters[clusterId][sintomaId],
          severity: severity as SintomaFormState["severity"],
        };
        return { ...prev, clusters: newClusters };
      });
    },
    []
  );

  const toggleCriterio = useCallback((criterioId: string) => {
    setFormValues((prev) => {
      const newCriterios = { ...prev.criterios_condicionais };
      newCriterios[criterioId] = !newCriterios[criterioId];
      return { ...prev, criterios_condicionais: newCriterios };
    });
  }, []);

  const setGravidade = useCallback((gravidade: string) => {
    setFormValues((prev) => ({ ...prev, gravidade }));
  }, []);

  const setImpacto = useCallback((dominioId: string, value: string) => {
    setFormValues((prev) => {
      const newImpacto = { ...prev.impacto };
      newImpacto[dominioId] = value;
      return { ...prev, impacto: newImpacto };
    });
  }, []);

  const toggleComorbidade = useCallback((condicao: string) => {
    setFormValues((prev) => {
      const atual = prev.comorbidades_selecionadas;
      const inclui = atual.includes(condicao);
      return {
        ...prev,
        comorbidades_selecionadas: inclui
          ? atual.filter((c) => c !== condicao)
          : [...atual, condicao],
      };
    });
  }, []);

  const setNotasClinicas = useCallback(
    (field: string, value: string, clusterId?: string) => {
      setFormValues((prev) => {
        if (clusterId) {
          const newObs = { ...prev.notas_clinicas.observacoes_clusters };
          newObs[clusterId] = value;
          return {
            ...prev,
            notas_clinicas: {
              ...prev.notas_clinicas,
              observacoes_clusters: newObs,
            },
          };
        }
        return {
          ...prev,
          notas_clinicas: { ...prev.notas_clinicas, [field]: value },
        };
      });
    },
    []
  );

  const contadores = useMemo(() => {
    const result: Record<string, { selecionados: number; limiar: number }> = {};
    for (const cluster of data.clusters_sintomas) {
      const clusterState = formValues.clusters[cluster.id] || {};
      const selecionados = Object.values(clusterState).filter(
        (s: SintomaFormState) => s.checked
      ).length;
      const limiar = cluster.limiar?.adulto || cluster.limiar?.pediatria || 0;
      result[cluster.id] = { selecionados, limiar };
    }
    return result;
  }, [formValues.clusters, data.clusters_sintomas]);

  const criteriosBECount = useMemo(() => {
    return Object.values(formValues.criterios_condicionais).filter(Boolean).length;
  }, [formValues.criterios_condicionais]);

  const criteriosBETotal = data.criterios_condicionais.length;

  const payload = useMemo(
    () => buildPayload(data, formValues as any),
    [data, formValues]
  );

  const markdown = useMemo(
    () => generateMarkdown(data, formValues as any, payload, identificacao),
    [data, formValues, payload, identificacao]
  );

  const reset = useCallback(() => {
    if (!window.confirm("Limpar todos os dados preenchidos?")) return;
    setIdentificacao({
      paciente: "",
      dataNascimento: "",
      sexo: "",
      escolaridade: "",
      ocupacao: "",
      queixa: "",
    });
    const newClusters: { [clusterId: string]: ClusterState } = {};
    for (const cluster of data.clusters_sintomas) {
      newClusters[cluster.id] = {};
      for (const sintoma of cluster.sintomas) {
        newClusters[cluster.id][sintoma.id] = { checked: false, severity: "" };
      }
    }
    const newCriterios: { [criterioId: string]: boolean } = {};
    for (const c of data.criterios_condicionais) {
      newCriterios[c.id] = false;
    }
    const newImpacto: { [dominioId: string]: string } = {};
    for (const d of data.dominios_impacto) {
      newImpacto[d.id] = "0";
    }
    setFormValues({
      clusters: newClusters,
      criterios_condicionais: newCriterios,
      subtipo_selecionado: null,
      gravidade: "",
      especificadores: {},
      impacto: newImpacto,
      comorbidades_selecionadas: [],
      notas_clinicas: {
        historia: "",
        observacoes_clusters: {},
        observacoes_gerais: "",
      },
    });
  }, [data]);

  const copiarMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      return true;
    } catch {
      return false;
    }
  }, [markdown]);

  return {
    identificacao,
    formValues,
    contadores,
    criteriosBECount,
    criteriosBETotal,
    payload,
    markdown,
    setIdentificacaoField,
    toggleSintoma,
    setSeverity,
    toggleCriterio,
    setGravidade,
    setImpacto,
    toggleComorbidade,
    setNotasClinicas,
    reset,
    copiarMarkdown,
  };
}

---

## src/infra/hooks/use-categorico-por-subtipo.ts
// ═══════════════════════════════════════════════════════════════════════════
// Hook: useCategoricoPorSubtipo
// Para transtornos onde o diagnóstico é determinado pela seleção de subtipo
// que define quais critérios aplicar. Ex: Transtornos por uso de substância.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import type { TranstornoDSM, SintomaFormState } from "@/infra/types";
import { buildPayload } from "@/infra/utils/payload-builder";
import { generateMarkdown } from "@/infra/utils/markdown-generator";

export interface IdentificacaoState {
  paciente: string;
  dataNascimento: string;
  sexo: string;
  escolaridade: string;
  ocupacao: string;
  queixa: string;
}

interface ClusterState {
  [sintomaId: string]: SintomaFormState;
}

interface FormState {
  clusters: { [clusterId: string]: ClusterState };
  criterios_condicionais: { [criterioId: string]: boolean };
  subtipo_selecionado: string | null;
  gravidade: string;
  especificadores: { [espId: string]: boolean | string };
  impacto: { [dominioId: string]: string };
  comorbidades_selecionadas: string[];
  notas_clinicas: {
    historia: string;
    observacoes_clusters: { [clusterId: string]: string };
    observacoes_gerais: string;
  };
}

export function useCategoricoPorSubtipo(data: TranstornoDSM) {
  const [identificacao, setIdentificacao] = useState<IdentificacaoState>({
    paciente: "",
    dataNascimento: "",
    sexo: "",
    escolaridade: "",
    ocupacao: "",
    queixa: "",
  });

  const setIdentificacaoField = useCallback(
    (field: string, value: string) => {
      setIdentificacao((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const [formValues, setFormValues] = useState<FormState>(() => {
    const clusters: { [clusterId: string]: ClusterState } = {};
    for (const cluster of data.clusters_sintomas) {
      clusters[cluster.id] = {};
      for (const sintoma of cluster.sintomas) {
        clusters[cluster.id][sintoma.id] = { checked: false, severity: "" };
      }
    }

    const criterios: { [criterioId: string]: boolean } = {};
    for (const c of data.criterios_condicionais) {
      criterios[c.id] = false;
    }

    const impacto: { [dominioId: string]: string } = {};
    for (const d of data.dominios_impacto) {
      impacto[d.id] = "0";
    }

    return {
      clusters,
      criterios_condicionais: criterios,
      subtipo_selecionado: null,
      gravidade: "",
      especificadores: {},
      impacto,
      comorbidades_selecionadas: [],
      notas_clinicas: {
        historia: "",
        observacoes_clusters: {},
        observacoes_gerais: "",
      },
    };
  });

  const setSubtipo = useCallback((subtipoId: string | null) => {
    setFormValues((prev) => ({ ...prev, subtipo_selecionado: subtipoId }));
  }, []);

  const toggleSintoma = useCallback(
    (clusterId: string, sintomaId: string, checked: boolean) => {
      setFormValues((prev) => {
        const newClusters = { ...prev.clusters };
        newClusters[clusterId] = { ...newClusters[clusterId] };
        newClusters[clusterId][sintomaId] = {
          ...newClusters[clusterId][sintomaId],
          checked,
        };
        return { ...prev, clusters: newClusters };
      });
    },
    []
  );

  const setSeverity = useCallback(
    (clusterId: string, sintomaId: string, severity: string) => {
      setFormValues((prev) => {
        const newClusters = { ...prev.clusters };
        newClusters[clusterId] = { ...newClusters[clusterId] };
        newClusters[clusterId][sintomaId] = {
          ...newClusters[clusterId][sintomaId],
          severity: severity as SintomaFormState["severity"],
        };
        return { ...prev, clusters: newClusters };
      });
    },
    []
  );

  const toggleCriterio = useCallback((criterioId: string) => {
    setFormValues((prev) => {
      const newCriterios = { ...prev.criterios_condicionais };
      newCriterios[criterioId] = !newCriterios[criterioId];
      return { ...prev, criterios_condicionais: newCriterios };
    });
  }, []);

  const setGravidade = useCallback((gravidade: string) => {
    setFormValues((prev) => ({ ...prev, gravidade }));
  }, []);

  const setImpacto = useCallback((dominioId: string, value: string) => {
    setFormValues((prev) => {
      const newImpacto = { ...prev.impacto };
      newImpacto[dominioId] = value;
      return { ...prev, impacto: newImpacto };
    });
  }, []);

  const toggleComorbidade = useCallback((condicao: string) => {
    setFormValues((prev) => {
      const atual = prev.comorbidades_selecionadas;
      const inclui = atual.includes(condicao);
      return {
        ...prev,
        comorbidades_selecionadas: inclui
          ? atual.filter((c) => c !== condicao)
          : [...atual, condicao],
      };
    });
  }, []);

  const setNotasClinicas = useCallback(
    (field: string, value: string, clusterId?: string) => {
      setFormValues((prev) => {
        if (clusterId) {
          const newObs = { ...prev.notas_clinicas.observacoes_clusters };
          newObs[clusterId] = value;
          return {
            ...prev,
            notas_clinicas: {
              ...prev.notas_clinicas,
              observacoes_clusters: newObs,
            },
          };
        }
        return {
          ...prev,
          notas_clinicas: { ...prev.notas_clinicas, [field]: value },
        };
      });
    },
    []
  );

  const contadores = useMemo(() => {
    const result: Record<string, { selecionados: number; limiar: number }> = {};
    for (const cluster of data.clusters_sintomas) {
      const clusterState = formValues.clusters[cluster.id] || {};
      const selecionados = Object.values(clusterState).filter(
        (s: SintomaFormState) => s.checked
      ).length;
      const limiar = cluster.limiar?.adulto || cluster.limiar?.pediatria || 0;
      result[cluster.id] = { selecionados, limiar };
    }
    return result;
  }, [formValues.clusters, data.clusters_sintomas]);

  const criteriosBECount = useMemo(() => {
    return Object.values(formValues.criterios_condicionais).filter(Boolean).length;
  }, [formValues.criterios_condicionais]);

  const criteriosBETotal = data.criterios_condicionais.length;

  const payload = useMemo(
    () => buildPayload(data, formValues as any),
    [data, formValues]
  );

  const markdown = useMemo(
    () => generateMarkdown(data, formValues as any, payload, identificacao),
    [data, formValues, payload, identificacao]
  );

  const subtipoAtual = useMemo(() => {
    if (!formValues.subtipo_selecionado || !data.subtipos?.subtipos) return null;
    return data.subtipos.subtipos.find(
      (s) => s.id === formValues.subtipo_selecionado
    );
  }, [formValues.subtipo_selecionado, data.subtipos]);

  const reset = useCallback(() => {
    if (!window.confirm("Limpar todos os dados preenchidos?")) return;
    setIdentificacao({
      paciente: "",
      dataNascimento: "",
      sexo: "",
      escolaridade: "",
      ocupacao: "",
      queixa: "",
    });
    const newClusters: { [clusterId: string]: ClusterState } = {};
    for (const cluster of data.clusters_sintomas) {
      newClusters[cluster.id] = {};
      for (const sintoma of cluster.sintomas) {
        newClusters[cluster.id][sintoma.id] = { checked: false, severity: "" };
      }
    }
    const newCriterios: { [criterioId: string]: boolean } = {};
    for (const c of data.criterios_condicionais) {
      newCriterios[c.id] = false;
    }
    const newImpacto: { [dominioId: string]: string } = {};
    for (const d of data.dominios_impacto) {
      newImpacto[d.id] = "0";
    }
    setFormValues({
      clusters: newClusters,
      criterios_condicionais: newCriterios,
      subtipo_selecionado: null,
      gravidade: "",
      especificadores: {},
      impacto: newImpacto,
      comorbidades_selecionadas: [],
      notas_clinicas: {
        historia: "",
        observacoes_clusters: {},
        observacoes_gerais: "",
      },
    });
  }, [data]);

  const copiarMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      return true;
    } catch {
      return false;
    }
  }, [markdown]);

  return {
    identificacao,
    formValues,
    contadores,
    criteriosBECount,
    criteriosBETotal,
    subtipoAtual,
    payload,
    markdown,
    setIdentificacaoField,
    setSubtipo,
    toggleSintoma,
    setSeverity,
    toggleCriterio,
    setGravidade,
    setImpacto,
    toggleComorbidade,
    setNotasClinicas,
    reset,
    copiarMarkdown,
  };
}

---

## src/infra/hooks/use-polythetic-com-ancora.ts
// ═══════════════════════════════════════════════════════════════════════════
// Hook: usePolytheticComAncora
// Para transtornos com cluster polytetic que exige um sintoma-âncora obrigatório
// Ex: Transtorno do Espectro Autista (sintomas de comunicação social são âncora)
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import type { TranstornoDSM, SintomaFormState } from "@/infra/types";
import { buildPayload } from "@/infra/utils/payload-builder";
import { generateMarkdown } from "@/infra/utils/markdown-generator";

export interface IdentificacaoState {
  paciente: string;
  dataNascimento: string;
  sexo: string;
  escolaridade: string;
  ocupacao: string;
  queixa: string;
}

interface ClusterState {
  [sintomaId: string]: SintomaFormState;
}

interface CriteriosState {
  [criterioId: string]: boolean;
}

interface FormState {
  clusters: { [clusterId: string]: ClusterState };
  criterios_condicionais: CriteriosState;
  subtipo_selecionado: string | null;
  gravidade: string;
  impacto: { [dominioId: string]: string };
  comorbidades_selecionadas: string[];
  notas_clinicas: {
    historia: string;
    observacoes_clusters: { [clusterId: string]: string };
    observacoes_gerais: string;
  };
}

export function usePolytheticComAncora(data: TranstornoDSM) {
  const [identificacao, setIdentificacao] = useState<IdentificacaoState>({
    paciente: "",
    dataNascimento: "",
    sexo: "",
    escolaridade: "",
    ocupacao: "",
    queixa: "",
  });

  const setIdentificacaoField = useCallback(
    (field: string, value: string) => {
      setIdentificacao((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const [formValues, setFormValues] = useState<FormState>(() => {
    const clusters: { [k: string]: ClusterState } = {};
    for (const cluster of data.clusters_sintomas) {
      clusters[cluster.id] = {};
      for (const sintoma of cluster.sintomas) {
        clusters[cluster.id][sintoma.id] = { checked: false, severity: "" };
      }
    }
    const criterios: CriteriosState = {};
    for (const c of data.criterios_condicionais) {
      criterios[c.id] = false;
    }
    const impacto: { [k: string]: string } = {};
    for (const d of data.dominios_impacto) {
      impacto[d.id] = "0";
    }
    return {
      clusters,
      criterios_condicionais: criterios,
      subtipo_selecionado: null,
      gravidade: "",
      impacto,
      comorbidades_selecionadas: [],
      notas_clinicas: {
        historia: "",
        observacoes_clusters: {},
        observacoes_gerais: "",
      },
    };
  });

  const toggleSintoma = useCallback(
    (clusterId: string, sintomaId: string, checked: boolean) => {
      setFormValues((prev) => {
        const newClusters = { ...prev.clusters };
        newClusters[clusterId] = { ...newClusters[clusterId] };
        newClusters[clusterId][sintomaId] = {
          ...newClusters[clusterId][sintomaId],
          checked,
        };
        return { ...prev, clusters: newClusters };
      });
    },
    []
  );

  const setSeverity = useCallback(
    (clusterId: string, sintomaId: string, severity: string) => {
      setFormValues((prev) => {
        const newClusters = { ...prev.clusters };
        newClusters[clusterId] = { ...newClusters[clusterId] };
        newClusters[clusterId][sintomaId] = {
          ...newClusters[clusterId][sintomaId],
          severity: severity as SintomaFormState["severity"],
        };
        return { ...prev, clusters: newClusters };
      });
    },
    []
  );

  const toggleCriterio = useCallback((criterioId: string) => {
    setFormValues((prev) => {
      const newCriterios = { ...prev.criterios_condicionais };
      newCriterios[criterioId] = !newCriterios[criterioId];
      return { ...prev, criterios_condicionais: newCriterios };
    });
  }, []);

  const setSubtipo = useCallback((subtipoId: string | null) => {
    setFormValues((prev) => ({ ...prev, subtipo_selecionado: subtipoId }));
  }, []);

  const setGravidade = useCallback((gravidade: string) => {
    setFormValues((prev) => ({ ...prev, gravidade }));
  }, []);

  const setImpacto = useCallback((dominioId: string, value: string) => {
    setFormValues((prev) => {
      const newImpacto = { ...prev.impacto };
      newImpacto[dominioId] = value;
      return { ...prev, impacto: newImpacto };
    });
  }, []);

  const toggleComorbidade = useCallback((condicao: string) => {
    setFormValues((prev) => {
      const atual = prev.comorbidades_selecionadas;
      const inclui = atual.includes(condicao);
      return {
        ...prev,
        comorbidades_selecionadas: inclui
          ? atual.filter((c) => c !== condicao)
          : [...atual, condicao],
      };
    });
  }, []);

  const setNotasClinicas = useCallback(
    (field: string, value: string, clusterId?: string) => {
      setFormValues((prev) => {
        if (clusterId) {
          const newObs = { ...prev.notas_clinicas.observacoes_clusters };
          newObs[clusterId] = value;
          return {
            ...prev,
            notas_clinicas: {
              ...prev.notas_clinicas,
              observacoes_clusters: newObs,
            },
          };
        }
        return {
          ...prev,
          notas_clinicas: { ...prev.notas_clinicas, [field]: value },
        };
      });
    },
    []
  );

  // Contadores com verificação de âncora
  const contadores = useMemo(() => {
    const result: Record<
      string,
      { selecionados: number; limiar: number; ancoraSatisfeita: boolean }
    > = {};
    for (const cluster of data.clusters_sintomas) {
      const clusterState = formValues.clusters[cluster.id] || {};
      const selecionados = Object.values(clusterState).filter(
        (s: SintomaFormState) => s.checked
      ).length;
      const limiar = cluster.limiar?.adulto || cluster.limiar?.pediatria || 0;

      // Verifica se âncora obrigatória está satisfeita
      let ancoraSatisfeita = true;
      if (cluster.ancora_obrigatoria) {
        const ancoraIds = cluster.ancora_obrigatoria.ids_obrigatorios;
        const ancoraMin = cluster.ancora_obrigatoria.n_minimo;
        const ancoraCount = ancoraIds.filter(
          (id) => clusterState[id]?.checked
        ).length;
        ancoraSatisfeita = ancoraCount >= ancoraMin;
      }

      result[cluster.id] = { selecionados, limiar, ancoraSatisfeita };
    }
    return result;
  }, [formValues.clusters, data.clusters_sintomas]);

  const criteriosBECount = useMemo(
    () => Object.values(formValues.criterios_condicionais).filter(Boolean).length,
    [formValues.criterios_condicionais]
  );

  const criteriosBETotal = data.criterios_condicionais.length;

  const payload = useMemo(
    () => buildPayload(data, formValues as any),
    [data, formValues]
  );

  const markdown = useMemo(
    () => generateMarkdown(data, formValues as any, payload, identificacao),
    [data, formValues, payload, identificacao]
  );

  const reset = useCallback(() => {
    if (!window.confirm("Limpar todos os dados preenchidos?")) return;
    setIdentificacao({
      paciente: "",
      dataNascimento: "",
      sexo: "",
      escolaridade: "",
      ocupacao: "",
      queixa: "",
    });
    const clusters: { [k: string]: ClusterState } = {};
    for (const cluster of data.clusters_sintomas) {
      clusters[cluster.id] = {};
      for (const sintoma of cluster.sintomas) {
        clusters[cluster.id][sintoma.id] = { checked: false, severity: "" };
      }
    }
    const criterios: CriteriosState = {};
    for (const c of data.criterios_condicionais) {
      criterios[c.id] = false;
    }
    const impacto: { [k: string]: string } = {};
    for (const d of data.dominios_impacto) {
      impacto[d.id] = "0";
    }
    setFormValues({
      clusters,
      criterios_condicionais: criterios,
      subtipo_selecionado: null,
      gravidade: "",
      impacto,
      comorbidades_selecionadas: [],
      notas_clinicas: {
        historia: "",
        observacoes_clusters: {},
        observacoes_gerais: "",
      },
    });
  }, [data]);

  const copiarMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      return true;
    } catch {
      return false;
    }
  }, [markdown]);

  return {
    identificacao,
    formValues,
    contadores,
    criteriosBECount,
    criteriosBETotal,
    payload,
    markdown,
    setIdentificacaoField,
    toggleSintoma,
    setSeverity,
    toggleCriterio,
    setSubtipo,
    setGravidade,
    setImpacto,
    toggleComorbidade,
    setNotasClinicas,
    reset,
    copiarMarkdown,
  };
}

---

## src/infra/hooks/use-monothetic-puro.ts
// ═══════════════════════════════════════════════════════════════════════════
// Hook: useMonotheticPuro
// Para transtornos onde TODOS os critérios são obrigatórios (monothetic puro)
// Ex: Delirium, alguns transtornos da personalidade, critérios de exclusão
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import type { TranstornoDSM } from "@/infra/types";
import { buildPayload } from "@/infra/utils/payload-builder";
import { generateMarkdown } from "@/infra/utils/markdown-generator";

export interface IdentificacaoState {
  paciente: string;
  dataNascimento: string;
  sexo: string;
  escolaridade: string;
  ocupacao: string;
  queixa: string;
}

interface CriteriosState {
  [criterioId: string]: boolean;
}

interface NotasClinicasState {
  historia: string;
  observacoes_gerais: string;
}

interface FormState {
  criterios: CriteriosState;
  gravidade: string;
  impacto: { [dominioId: string]: string };
  comorbidades_selecionadas: string[];
  notas_clinicas: NotasClinicasState;
}

export function useMonotheticPuro(data: TranstornoDSM) {
  const [identificacao, setIdentificacao] = useState<IdentificacaoState>({
    paciente: "",
    dataNascimento: "",
    sexo: "",
    escolaridade: "",
    ocupacao: "",
    queixa: "",
  });

  const setIdentificacaoField = useCallback(
    (field: string, value: string) => {
      setIdentificacao((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Initialize all criteria as unchecked
  const [formValues, setFormValues] = useState<FormState>(() => {
    const criterios: CriteriosState = {};
    for (const c of data.clusters_sintomas[0]?.sintomas || []) {
      criterios[c.id] = false;
    }
    const impacto: { [k: string]: string } = {};
    for (const d of data.dominios_impacto) {
      impacto[d.id] = "0";
    }
    return {
      criterios,
      gravidade: "",
      impacto,
      comorbidades_selecionadas: [],
      notas_clinicas: { historia: "", observacoes_gerais: "" },
    };
  });

  const toggleCriterio = useCallback((criterioId: string) => {
    setFormValues((prev) => {
      const newCriterios = { ...prev.criterios };
      newCriterios[criterioId] = !newCriterios[criterioId];
      return { ...prev, criterios: newCriterios };
    });
  }, []);

  const setGravidade = useCallback((gravidade: string) => {
    setFormValues((prev) => ({ ...prev, gravidade }));
  }, []);

  const setImpacto = useCallback((dominioId: string, value: string) => {
    setFormValues((prev) => {
      const newImpacto = { ...prev.impacto };
      newImpacto[dominioId] = value;
      return { ...prev, impacto: newImpacto };
    });
  }, []);

  const toggleComorbidade = useCallback((condicao: string) => {
    setFormValues((prev) => {
      const atual = prev.comorbidades_selecionadas;
      const inclui = atual.includes(condicao);
      return {
        ...prev,
        comorbidades_selecionadas: inclui
          ? atual.filter((c) => c !== condicao)
          : [...atual, condicao],
      };
    });
  }, []);

  const setNotasClinicas = useCallback((field: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      notas_clinicas: { ...prev.notas_clinicas, [field]: value },
    }));
  }, []);

  // All criteria must be met
  const criteriosCount = useMemo(
    () => Object.values(formValues.criterios).filter(Boolean).length,
    [formValues.criterios]
  );

  const criteriosTotal = useMemo(
    () => Object.keys(formValues.criterios).length,
    [formValues.criterios]
  );

  const todosCriteriosAtendidos = criteriosCount === criteriosTotal && criteriosTotal > 0;

  // Build payload-compatible form values
  const payloadFormValues = useMemo(
    () => ({
      clusters: { A1: formValues.criterios },
      criterios_condicionais: {},
      subtipo_selecionado: null,
      gravidade: formValues.gravidade,
      especificadores: {},
      impacto: formValues.impacto,
      comorbidades_selecionadas: formValues.comorbidades_selecionadas,
      notas_clinicas: {
        historia: formValues.notas_clinicas.historia,
        observacoes_gerais: formValues.notas_clinicas.observacoes_gerais,
        observacoes_clusters: {} as Record<string, string>,
      },
    }),
    [formValues]
  );

  const payload = useMemo(
    () => buildPayload(data, payloadFormValues as any),
    [data, payloadFormValues]
  );

  const markdown = useMemo(
    () => generateMarkdown(data, payloadFormValues as any, payload, identificacao),
    [data, payloadFormValues, payload, identificacao]
  );

  const reset = useCallback(() => {
    if (!window.confirm("Limpar todos os dados preenchidos?")) return;
    setIdentificacao({
      paciente: "",
      dataNascimento: "",
      sexo: "",
      escolaridade: "",
      ocupacao: "",
      queixa: "",
    });
    const criterios: CriteriosState = {};
    for (const c of data.clusters_sintomas[0]?.sintomas || []) {
      criterios[c.id] = false;
    }
    const impacto: { [k: string]: string } = {};
    for (const d of data.dominios_impacto) {
      impacto[d.id] = "0";
    }
    setFormValues({
      criterios,
      gravidade: "",
      impacto,
      comorbidades_selecionadas: [],
      notas_clinicas: { historia: "", observacoes_gerais: "" },
    });
  }, [data]);

  const copiarMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      return true;
    } catch {
      return false;
    }
  }, [markdown]);

  return {
    identificacao,
    formValues,
    criteriosCount,
    criteriosTotal,
    todosCriteriosAtendidos,
    payload,
    markdown,
    setIdentificacaoField,
    toggleCriterio,
    setGravidade,
    setImpacto,
    toggleComorbidade,
    setNotasClinicas,
    reset,
    copiarMarkdown,
  };
}

---

## src/infra/hooks/use-fallback-classe.ts
// ═══════════════════════════════════════════════════════════════════════════
// Hook: useFallbackClasse
// Para transtornos "Outro ... Especificado" e "... Não Especificado"
// que não têm critérios formais — avaliação qualitativa com checklist mínimo
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import type { TranstornoDSM } from "@/infra/types";
import { buildPayload } from "@/infra/utils/payload-builder";
import { generateMarkdown } from "@/infra/utils/markdown-generator";

export interface IdentificacaoState {
  paciente: string;
  dataNascimento: string;
  sexo: string;
  escolaridade: string;
  ocupacao: string;
  queixa: string;
}

interface FormState {
  criterios_condicionais: { [criterioId: string]: boolean };
  gravidade: string;
  impacto: { [dominioId: string]: string };
  comorbidades_selecionadas: string[];
  notas_clinicas: {
    historia: string;
    observacoes_gerais: string;
  };
}

export function useFallbackClasse(data: TranstornoDSM) {
  const [identificacao, setIdentificacao] = useState<IdentificacaoState>({
    paciente: "",
    dataNascimento: "",
    sexo: "",
    escolaridade: "",
    ocupacao: "",
    queixa: "",
  });

  const setIdentificacaoField = useCallback(
    (field: string, value: string) => {
      setIdentificacao((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const [formValues, setFormValues] = useState<FormState>(() => {
    const criterios: { [criterioId: string]: boolean } = {};
    for (const c of data.criterios_condicionais) {
      criterios[c.id] = false;
    }

    const impacto: { [dominioId: string]: string } = {};
    for (const d of data.dominios_impacto) {
      impacto[d.id] = "0";
    }

    return {
      criterios_condicionais: criterios,
      gravidade: "",
      impacto,
      comorbidades_selecionadas: [],
      notas_clinicas: {
        historia: "",
        observacoes_gerais: "",
      },
    };
  });

  const toggleCriterio = useCallback((criterioId: string) => {
    setFormValues((prev) => {
      const newCriterios = { ...prev.criterios_condicionais };
      newCriterios[criterioId] = !newCriterios[criterioId];
      return { ...prev, criterios_condicionais: newCriterios };
    });
  }, []);

  const setGravidade = useCallback((gravidade: string) => {
    setFormValues((prev) => ({ ...prev, gravidade }));
  }, []);

  const setImpacto = useCallback((dominioId: string, value: string) => {
    setFormValues((prev) => {
      const newImpacto = { ...prev.impacto };
      newImpacto[dominioId] = value;
      return { ...prev, impacto: newImpacto };
    });
  }, []);

  const toggleComorbidade = useCallback((condicao: string) => {
    setFormValues((prev) => {
      const atual = prev.comorbidades_selecionadas;
      const inclui = atual.includes(condicao);
      return {
        ...prev,
        comorbidades_selecionadas: inclui
          ? atual.filter((c) => c !== condicao)
          : [...atual, condicao],
      };
    });
  }, []);

  const setNotasClinicas = useCallback(
    (field: string, value: string) => {
      setFormValues((prev) => ({
        ...prev,
        notas_clinicas: { ...prev.notas_clinicas, [field]: value },
      }));
    },
    []
  );

  const criteriosBECount = useMemo(() => {
    return Object.values(formValues.criterios_condicionais).filter(Boolean).length;
  }, [formValues.criterios_condicionais]);

  const criteriosBETotal = data.criterios_condicionais.length;

  const payload = useMemo(
    () => buildPayload(data, formValues as any),
    [data, formValues]
  );

  const markdown = useMemo(
    () => generateMarkdown(data, formValues as any, payload, identificacao),
    [data, formValues, payload, identificacao]
  );

  const reset = useCallback(() => {
    if (!window.confirm("Limpar todos os dados preenchidos?")) return;
    setIdentificacao({
      paciente: "",
      dataNascimento: "",
      sexo: "",
      escolaridade: "",
      ocupacao: "",
      queixa: "",
    });
    const newCriterios: { [criterioId: string]: boolean } = {};
    for (const c of data.criterios_condicionais) {
      newCriterios[c.id] = false;
    }
    const newImpacto: { [dominioId: string]: string } = {};
    for (const d of data.dominios_impacto) {
      newImpacto[d.id] = "0";
    }
    setFormValues({
      criterios_condicionais: newCriterios,
      gravidade: "",
      impacto: newImpacto,
      comorbidades_selecionadas: [],
      notas_clinicas: {
        historia: "",
        observacoes_gerais: "",
      },
    });
  }, [data]);

  const copiarMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      return true;
    } catch {
      return false;
    }
  }, [markdown]);

  return {
    identificacao,
    formValues,
    criteriosBECount,
    criteriosBETotal,
    payload,
    markdown,
    setIdentificacaoField,
    toggleCriterio,
    setGravidade,
    setImpacto,
    toggleComorbidade,
    setNotasClinicas,
    reset,
    copiarMarkdown,
  };
}

---

## src/infra/hooks/use-temporal-topografico.ts
// ═══════════════════════════════════════════════════════════════════════════
// Hook: useTemporalTopografico
// Para transtornos baseados em critérios temporais/topográficos
// sem clusters de sintomas — apenas critérios condicionais obrigatórios
// Ex: Tourette, Transtornos de Tique, alguns transtornos do movimento
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import type { TranstornoDSM } from "@/infra/types";
import { buildPayload } from "@/infra/utils/payload-builder";
import { generateMarkdown } from "@/infra/utils/markdown-generator";

export interface IdentificacaoState {
  paciente: string;
  dataNascimento: string;
  sexo: string;
  escolaridade: string;
  ocupacao: string;
  queixa: string;
}

interface CriteriosState {
  [criterioId: string]: boolean;
}

interface ImpactoState {
  [dominioId: string]: string;
}

interface NotasClinicasState {
  historia: string;
  observacoes_gerais: string;
}

interface FormState {
  criterios_condicionais: CriteriosState;
  impacto: ImpactoState;
  comorbidades_selecionadas: string[];
  notas_clinicas: NotasClinicasState;
}

export function useTemporalTopografico(data: TranstornoDSM) {
  const [identificacao, setIdentificacao] = useState<IdentificacaoState>({
    paciente: "",
    dataNascimento: "",
    sexo: "",
    escolaridade: "",
    ocupacao: "",
    queixa: "",
  });

  const setIdentificacaoField = useCallback(
    (field: string, value: string) => {
      setIdentificacao((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Initialize from criteria_condicionais (these ARE the diagnostic criteria)
  const [formValues, setFormValues] = useState<FormState>(() => {
    const criterios: CriteriosState = {};
    for (const c of data.criterios_condicionais) {
      criterios[c.id] = false;
    }
    const impacto: { [k: string]: string } = {};
    for (const d of data.dominios_impacto) {
      impacto[d.id] = "0";
    }
    return {
      criterios_condicionais: criterios,
      impacto,
      comorbidades_selecionadas: [],
      notas_clinicas: { historia: "", observacoes_gerais: "" },
    };
  });

  const toggleCriterio = useCallback((criterioId: string) => {
    setFormValues((prev) => {
      const newCriterios = { ...prev.criterios_condicionais };
      newCriterios[criterioId] = !newCriterios[criterioId];
      return { ...prev, criterios_condicionais: newCriterios };
    });
  }, []);

  const setImpacto = useCallback((dominioId: string, value: string) => {
    setFormValues((prev) => {
      const newImpacto = { ...prev.impacto };
      newImpacto[dominioId] = value;
      return { ...prev, impacto: newImpacto };
    });
  }, []);

  const toggleComorbidade = useCallback((condicao: string) => {
    setFormValues((prev) => {
      const atual = prev.comorbidades_selecionadas;
      const inclui = atual.includes(condicao);
      return {
        ...prev,
        comorbidades_selecionadas: inclui
          ? atual.filter((c) => c !== condicao)
          : [...atual, condicao],
      };
    });
  }, []);

  const setNotasClinicas = useCallback((field: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      notas_clinicas: { ...prev.notas_clinicas, [field]: value },
    }));
  }, []);

  // All criteria must be met (monothetic)
  const criteriosCount = useMemo(
    () => Object.values(formValues.criterios_condicionais).filter(Boolean).length,
    [formValues.criterios_condicionais]
  );

  const criteriosTotal = data.criterios_condicionais.length;
  const todosCriteriosAtendidos = criteriosCount === criteriosTotal && criteriosTotal > 0;

  // Build payload-compatible form values
  const payloadFormValues = useMemo(
    () => ({
      clusters: {},
      criterios_condicionais: formValues.criterios_condicionais,
      subtipo_selecionado: null,
      gravidade: "",
      especificadores: {},
      impacto: formValues.impacto,
      comorbidades_selecionadas: formValues.comorbidades_selecionadas,
      notas_clinicas: {
        historia: formValues.notas_clinicas.historia,
        observacoes_gerais: formValues.notas_clinicas.observacoes_gerais,
        observacoes_clusters: {},
      },
    }),
    [formValues]
  );

  const payload = useMemo(
    () => buildPayload(data, payloadFormValues as any),
    [data, payloadFormValues]
  );

  const markdown = useMemo(
    () => generateMarkdown(data, payloadFormValues as any, payload, identificacao),
    [data, payloadFormValues, payload, identificacao]
  );

  const reset = useCallback(() => {
    if (!window.confirm("Limpar todos os dados preenchidos?")) return;
    setIdentificacao({
      paciente: "",
      dataNascimento: "",
      sexo: "",
      escolaridade: "",
      ocupacao: "",
      queixa: "",
    });
    const criterios: CriteriosState = {};
    for (const c of data.criterios_condicionais) {
      criterios[c.id] = false;
    }
    const impacto: { [k: string]: string } = {};
    for (const d of data.dominios_impacto) {
      impacto[d.id] = "0";
    }
    setFormValues({
      criterios_condicionais: criterios,
      impacto,
      comorbidades_selecionadas: [],
      notas_clinicas: { historia: "", observacoes_gerais: "" },
    });
  }, [data]);

  const copiarMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      return true;
    } catch {
      return false;
    }
  }, [markdown]);

  return {
    identificacao,
    formValues,
    criteriosCount,
    criteriosTotal,
    todosCriteriosAtendidos,
    payload,
    markdown,
    setIdentificacaoField,
    toggleCriterio,
    setImpacto,
    toggleComorbidade,
    setNotasClinicas,
    reset,
    copiarMarkdown,
  };
}

---

## src/infra/hooks/use-etiologico-externo.ts
// ═══════════════════════════════════════════════════════════════════════════
// Hook: useEtiologicoExterno
// Para transtornos causados por substancia, medicamento ou condicao medica
// Ex: Intoxicacoes, abstinencias, TNCs organicos, T bipolar/devido a cond medica
// O agente etiologico (substancia/condicao) e informado pelo clinico
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import type { TranstornoDSM } from "@/infra/types";
import { buildPayload } from "@/infra/utils/payload-builder";
import { generateMarkdown } from "@/infra/utils/markdown-generator";

export interface IdentificacaoState {
  paciente: string;
  dataNascimento: string;
  sexo: string;
  escolaridade: string;
  ocupacao: string;
  queixa: string;
}

interface CriteriosState {
  [criterioId: string]: boolean;
}

interface ImpactoState {
  [dominioId: string]: string;
}

interface NotasClinicasState {
  historia: string;
  observacoes_gerais: string;
  observacoes_agente: string;
}

interface FormState {
  criterios_condicionais: CriteriosState;
  agente_etiologico: string;
  data_inicio: string;
  impacto: ImpactoState;
  comorbidades_selecionadas: string[];
  notas_clinicas: NotasClinicasState;
}

export function useEtiologicoExterno(data: TranstornoDSM) {
  const [identificacao, setIdentificacao] = useState<IdentificacaoState>({
    paciente: "",
    dataNascimento: "",
    sexo: "",
    escolaridade: "",
    ocupacao: "",
    queixa: "",
  });

  const setIdentificacaoField = useCallback(
    (field: string, value: string) =>
      setIdentificacao((prev) => ({ ...prev, [field]: value })),
    []
  );

  const [formValues, setFormValues] = useState<FormState>(() => {
    const criterios: CriteriosState = {};
    for (const c of data.criterios_condicionais) {
      criterios[c.id] = false;
    }
    const impacto: { [k: string]: string } = {};
    for (const d of data.dominios_impacto) {
      impacto[d.id] = "0";
    }
    return {
      criterios_condicionais: criterios,
      agente_etiologico: "",
      data_inicio: "",
      impacto,
      comorbidades_selecionadas: [],
      notas_clinicas: {
        historia: "",
        observacoes_gerais: "",
        observacoes_agente: "",
      },
    };
  });

  const toggleCriterio = useCallback((criterioId: string) => {
    setFormValues((prev) => {
      const newCriterios = { ...prev.criterios_condicionais };
      newCriterios[criterioId] = !newCriterios[criterioId];
      return { ...prev, criterios_condicionais: newCriterios };
    });
  }, []);

  const setAgenteEtiologico = useCallback((value: string) => {
    setFormValues((prev) => ({ ...prev, agente_etiologico: value }));
  }, []);

  const setDataInicio = useCallback((value: string) => {
    setFormValues((prev) => ({ ...prev, data_inicio: value }));
  }, []);

  const setImpacto = useCallback((dominioId: string, value: string) => {
    setFormValues((prev) => {
      const newImpacto = { ...prev.impacto };
      newImpacto[dominioId] = value;
      return { ...prev, impacto: newImpacto };
    });
  }, []);

  const toggleComorbidade = useCallback((condicao: string) => {
    setFormValues((prev) => {
      const atual = prev.comorbidades_selecionadas;
      const inclui = atual.includes(condicao);
      return {
        ...prev,
        comorbidades_selecionadas: inclui
          ? atual.filter((c) => c !== condicao)
          : [...atual, condicao],
      };
    });
  }, []);

  const setNotasClinicas = useCallback((field: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      notas_clinicas: { ...prev.notas_clinicas, [field]: value },
    }));
  }, []);

  const criteriosCount = useMemo(
    () => Object.values(formValues.criterios_condicionais).filter(Boolean).length,
    [formValues.criterios_condicionais]
  );

  const criteriosTotal = data.criterios_condicionais.length;
  const todosCriteriosAtendidos = criteriosCount === criteriosTotal && criteriosTotal > 0;

  const payloadFormValues = useMemo(
    () => ({
      clusters: {},
      criterios_condicionais: formValues.criterios_condicionais,
      subtipo_selecionado: null,
      gravidade: "",
      especificadores: { agente_etiologico: formValues.agente_etiologico },
      impacto: formValues.impacto,
      comorbidades_selecionadas: formValues.comorbidades_selecionadas,
      notas_clinicas: {
        historia: formValues.notas_clinicas.historia,
        observacoes_gerais: formValues.notas_clinicas.observacoes_gerais,
        observacoes_clusters: {
          agente_etiologico: formValues.agente_etiologico,
          data_inicio: formValues.data_inicio,
          observacoes_agente: formValues.notas_clinicas.observacoes_agente,
        },
      },
    }),
    [formValues]
  );

  const payload = useMemo(
    () => buildPayload(data, payloadFormValues as any),
    [data, payloadFormValues]
  );

  const markdown = useMemo(
    () => generateMarkdown(data, payloadFormValues as any, payload, identificacao),
    [data, payloadFormValues, payload, identificacao]
  );

  const reset = useCallback(() => {
    if (!window.confirm("Limpar todos os dados preenchidos?")) return;
    setIdentificacao({
      paciente: "",
      dataNascimento: "",
      sexo: "",
      escolaridade: "",
      ocupacao: "",
      queixa: "",
    });
    const criterios: CriteriosState = {};
    for (const c of data.criterios_condicionais) {
      criterios[c.id] = false;
    }
    const impacto: { [k: string]: string } = {};
    for (const d of data.dominios_impacto) {
      impacto[d.id] = "0";
    }
    setFormValues({
      criterios_condicionais: criterios,
      agente_etiologico: "",
      data_inicio: "",
      impacto,
      comorbidades_selecionadas: [],
      notas_clinicas: {
        historia: "",
        observacoes_gerais: "",
        observacoes_agente: "",
      },
    });
  }, [data]);

  const copiarMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      return true;
    } catch {
      return false;
    }
  }, [markdown]);

  return {
    identificacao,
    formValues,
    criteriosCount,
    criteriosTotal,
    todosCriteriosAtendidos,
    payload,
    markdown,
    setIdentificacaoField,
    toggleCriterio,
    setAgenteEtiologico,
    setDataInicio,
    setImpacto,
    toggleComorbidade,
    setNotasClinicas,
    reset,
    copiarMarkdown,
  };
}

---

## src/infra/hooks/use-unico-obrigatorio.ts
// ═══════════════════════════════════════════════════════════════════════════
// Hook: useUnicoObrigatorio
// Para transtornos com um único critério obrigatório que define o diagnóstico.
// Ex: Mútismo seletivo (incapacidade de falar em situações sociais específicas).
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import type { TranstornoDSM } from "@/infra/types";
import { buildPayload } from "@/infra/utils/payload-builder";
import { generateMarkdown } from "@/infra/utils/markdown-generator";

export interface IdentificacaoState {
  paciente: string;
  dataNascimento: string;
  sexo: string;
  escolaridade: string;
  ocupacao: string;
  queixa: string;
}

interface FormState {
  criterios_condicionais: { [criterioId: string]: boolean };
  gravidade: string;
  impacto: { [dominioId: string]: string };
  comorbidades_selecionadas: string[];
  notas_clinicas: {
    historia: string;
    observacoes_gerais: string;
  };
}

export function useUnicoObrigatorio(data: TranstornoDSM) {
  const [identificacao, setIdentificacao] = useState<IdentificacaoState>({
    paciente: "",
    dataNascimento: "",
    sexo: "",
    escolaridade: "",
    ocupacao: "",
    queixa: "",
  });

  const setIdentificacaoField = useCallback(
    (field: string, value: string) => {
      setIdentificacao((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const [formValues, setFormValues] = useState<FormState>(() => {
    const criterios: { [criterioId: string]: boolean } = {};
    for (const c of data.criterios_condicionais) {
      criterios[c.id] = false;
    }

    const impacto: { [dominioId: string]: string } = {};
    for (const d of data.dominios_impacto) {
      impacto[d.id] = "0";
    }

    return {
      criterios_condicionais: criterios,
      gravidade: "",
      impacto,
      comorbidades_selecionadas: [],
      notas_clinicas: {
        historia: "",
        observacoes_gerais: "",
      },
    };
  });

  const toggleCriterio = useCallback((criterioId: string) => {
    setFormValues((prev) => {
      const newCriterios = { ...prev.criterios_condicionais };
      newCriterios[criterioId] = !newCriterios[criterioId];
      return { ...prev, criterios_condicionais: newCriterios };
    });
  }, []);

  const setGravidade = useCallback((gravidade: string) => {
    setFormValues((prev) => ({ ...prev, gravidade }));
  }, []);

  const setImpacto = useCallback((dominioId: string, value: string) => {
    setFormValues((prev) => {
      const newImpacto = { ...prev.impacto };
      newImpacto[dominioId] = value;
      return { ...prev, impacto: newImpacto };
    });
  }, []);

  const toggleComorbidade = useCallback((condicao: string) => {
    setFormValues((prev) => {
      const atual = prev.comorbidades_selecionadas;
      const inclui = atual.includes(condicao);
      return {
        ...prev,
        comorbidades_selecionadas: inclui
          ? atual.filter((c) => c !== condicao)
          : [...atual, condicao],
      };
    });
  }, []);

  const setNotasClinicas = useCallback(
    (field: string, value: string) => {
      setFormValues((prev) => ({
        ...prev,
        notas_clinicas: { ...prev.notas_clinicas, [field]: value },
      }));
    },
    []
  );

  const criteriosBECount = useMemo(() => {
    return Object.values(formValues.criterios_condicionais).filter(Boolean).length;
  }, [formValues.criterios_condicionais]);

  const criteriosBETotal = data.criterios_condicionais.length;

  const diagnosticoAtingido = useMemo(() => {
    if (data.criterios_condicionais.length === 0) return false;
    const obrigatorios = data.criterios_condicionais.filter((c) => c.obrigatorio);
    if (obrigatorios.length === 0) return criteriosBECount > 0;
    return obrigatorios.every((c) => formValues.criterios_condicionais[c.id]);
  }, [formValues.criterios_condicionais, data.criterios_condicionais, criteriosBECount]);

  const payload = useMemo(
    () => buildPayload(data, formValues as any),
    [data, formValues]
  );

  const markdown = useMemo(
    () => generateMarkdown(data, formValues as any, payload, identificacao),
    [data, formValues, payload, identificacao]
  );

  const reset = useCallback(() => {
    if (!window.confirm("Limpar todos os dados preenchidos?")) return;
    setIdentificacao({
      paciente: "",
      dataNascimento: "",
      sexo: "",
      escolaridade: "",
      ocupacao: "",
      queixa: "",
    });
    const newCriterios: { [criterioId: string]: boolean } = {};
    for (const c of data.criterios_condicionais) {
      newCriterios[c.id] = false;
    }
    const newImpacto: { [dominioId: string]: string } = {};
    for (const d of data.dominios_impacto) {
      newImpacto[d.id] = "0";
    }
    setFormValues({
      criterios_condicionais: newCriterios,
      gravidade: "",
      impacto: newImpacto,
      comorbidades_selecionadas: [],
      notas_clinicas: {
        historia: "",
        observacoes_gerais: "",
      },
    });
  }, [data]);

  const copiarMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      return true;
    } catch {
      return false;
    }
  }, [markdown]);

  return {
    identificacao,
    formValues,
    criteriosBECount,
    criteriosBETotal,
    diagnosticoAtingido,
    payload,
    markdown,
    setIdentificacaoField,
    toggleCriterio,
    setGravidade,
    setImpacto,
    toggleComorbidade,
    setNotasClinicas,
    reset,
    copiarMarkdown,
  };
}

---

## src/infra/hooks/use-dsm-avaliacao.ts
// ═══════════════════════════════════════════════════════════════════════════
// Hook: useDSMAvaliacao
// Hook ÚNICO genérico para FULL e SHORT.
// Suporta: criteria simples, clusters_sintomas com checkboxes, criterios_condicionais,
//          identificação do paciente, severidade, especificadores, subtipos, key questions.
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import type {
  TranstornoDSM,
  IdentificacaoState,
  NotasClinicas,
} from "@/infra/types";

/** Gera IDs estáveis para cada critério baseado na letra (A, B, C...) */
function parseCriteriaIds(criteria: string[]): { id: string; text: string }[] {
  return criteria.map((text, i) => {
    const match = text.match(/^([A-Z0-9]+)[.\s)]/i);
    const id = match ? match[1] : `C${i + 1}`;
    return { id, text };
  });
}

export function useDSMAvaliacao(data: TranstornoDSM) {
  // ── IDs dos critérios simples ──
  const criterios = useMemo(
    () => parseCriteriaIds(data.criteria),
    [data.criteria],
  );
  const totalCriterios = criterios.length;

  // ── Estado: Identificação do paciente ──
  const [identificacao, setIdentificacao] = useState<IdentificacaoState>({
    paciente: "",
    data_nascimento: "",
    sexo: "",
    escolaridade: "",
    ocupacao: "",
    queixa: "",
  });

  const setIdentificacaoField = useCallback((field: string, value: string) => {
    setIdentificacao((prev) => ({ ...prev, [field]: value }));
  }, []);

  // ── Estado: Critérios simples (checkboxes) ──
  const [criteriaState, setCriteriaState] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      criterios.forEach((c) => {
        initial[c.id] = false;
      });
      return initial;
    },
  );

  const toggleCriterion = useCallback((id: string) => {
    setCriteriaState((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // ── Estado: Clusters de sintomas (checkboxes individuais) ──
  const hasClustersSintomas = (data.clusters_sintomas?.length || 0) > 0;
  const [sintomasState, setSintomasState] = useState<Record<string, boolean>>(
    () => {
      const initial: Record<string, boolean> = {};
      data.clusters_sintomas?.forEach((cluster) => {
        cluster.sintomas.forEach((s) => {
          initial[s.id] = false;
        });
      });
      return initial;
    },
  );

  const toggleSintoma = useCallback((id: string) => {
    setSintomasState((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // Contagem de sintomas por cluster
  const clusterCounts = useMemo(() => {
    const counts: Record<
      string,
      { confirmed: number; total: number; limiar: number }
    > = {};
    data.clusters_sintomas?.forEach((cluster) => {
      const limiarAdulto = cluster.limiar?.adulto || 0;
      const confirmed = cluster.sintomas.filter(
        (s) => sintomasState[s.id],
      ).length;
      counts[cluster.id] = {
        confirmed,
        total: cluster.sintomas.length,
        limiar: limiarAdulto,
      };
    });
    return counts;
  }, [data.clusters_sintomas, sintomasState]);

  // ── Estado: Critérios condicionais ──
  const hasCriteriosCondicionais =
    (data.criterios_condicionais?.length || 0) > 0;
  const [criteriosCondState, setCriteriosCondState] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    data.criterios_condicionais?.forEach((c) => {
      initial[c.id] = false;
    });
    return initial;
  });

  const toggleCriterioCondicional = useCallback((id: string) => {
    setCriteriosCondState((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // ── Estado: Severidade ──
  const [severityLevel, setSeverityLevel] = useState("");

  // ── Estado: Especificadores ──
  const [specifiersSelected, setSpecifiersSelected] = useState<string[]>([]);
  const toggleSpecifier = useCallback((spec: string) => {
    setSpecifiersSelected((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec],
    );
  }, []);

  // ── Estado: Subtipos ──
  const [subtypesSelected, setSubtypesSelected] = useState<string[]>([]);
  const toggleSubtype = useCallback((sub: string) => {
    setSubtypesSelected((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub],
    );
  }, []);

  // ── Estado: Clusters assessment (notas textuais) ──
  const [clustersAssessment, setClustersAssessment] = useState<
    Record<string, string>
  >(() => {
    const initial: Record<string, string> = {};
    data.clusters.forEach((cl) => {
      initial[cl] = "";
    });
    return initial;
  });

  const setClusterNote = useCallback((cluster: string, note: string) => {
    setClustersAssessment((prev) => ({ ...prev, [cluster]: note }));
  }, []);

  // ── Estado: Key questions ──
  const [keyQuestionsAnswers, setKeyQuestionsAnswers] = useState<
    Record<string, boolean>
  >(() => {
    const initial: Record<string, boolean> = {};
    data.key_questions.forEach((_, i) => {
      initial[`q${i}`] = false;
    });
    return initial;
  });

  const toggleKeyQuestion = useCallback((id: string) => {
    setKeyQuestionsAnswers((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  // ── Estado: Notas clínicas ──
  const [notasClinicas, setNotasClinicas] = useState<NotasClinicas>({
    historia: "",
    observacoes_gerais: "",
    observacoes_clusters: {},
    observacoes_agente: "",
  });

  const setNotasField = useCallback((field: string, value: string) => {
    setNotasClinicas((prev) => ({ ...prev, [field]: value }));
  }, []);

  // ── Estado: Dados etiológicos ──
  const [agenteEtiologico, setAgenteEtiologico] = useState("");
  const [dataInicio, setDataInicio] = useState("");

  // ── Contadores ──
  const confirmedCount = useMemo(
    () => Object.values(criteriaState).filter(Boolean).length,
    [criteriaState],
  );

  const allConfirmed = useMemo(
    () => confirmedCount === totalCriterios && totalCriterios > 0,
    [confirmedCount, totalCriterios],
  );

  const kqAnsweredCount = useMemo(
    () => Object.values(keyQuestionsAnswers).filter(Boolean).length,
    [keyQuestionsAnswers],
  );

  // ── Payload ──
  const payload = useMemo(() => {
    const confirmedCriteria = criterios
      .filter((c) => criteriaState[c.id])
      .map((c) => ({ id: c.id, text: c.text }));
    return {
      id: data.id,
      name: data.name,
      category: data.category,
      identificacao,
      confirmed_criteria_count: confirmedCount,
      total_criteria: totalCriterios,
      all_criteria_confirmed: allConfirmed,
      severity: severityLevel || null,
      specifiers: specifiersSelected,
      subtypes: subtypesSelected,
      confirmed_criteria: confirmedCriteria,
      clusters_sintomas: clusterCounts,
      criterios_condicionais: criteriosCondState,
      key_questions_answered: kqAnsweredCount,
      notas: notasClinicas,
      agente_etiologico: agenteEtiologico || null,
      data_inicio: dataInicio || null,
    };
  }, [
    data,
    identificacao,
    criterios,
    criteriaState,
    confirmedCount,
    totalCriterios,
    allConfirmed,
    severityLevel,
    specifiersSelected,
    subtypesSelected,
    clusterCounts,
    criteriosCondState,
    kqAnsweredCount,
    notasClinicas,
    agenteEtiologico,
    dataInicio,
  ]);

  // ── Markdown ──
  const markdown = useMemo(() => {
    const lines: string[] = [];
    lines.push(`# ${data.name}`);
    lines.push(
      `**Categoria:** ${data.category} | **Estrutura:** ${data.estrutura_diagnostica}`,
    );
    lines.push("");

    // Identificação
    if (identificacao.paciente) {
      lines.push(`**Paciente:** ${identificacao.paciente}`);
      if (identificacao.data_nascimento)
        lines.push(`**Nascimento:** ${identificacao.data_nascimento}`);
      if (identificacao.sexo) lines.push(`**Sexo:** ${identificacao.sexo}`);
      if (identificacao.escolaridade)
        lines.push(`**Escolaridade:** ${identificacao.escolaridade}`);
      lines.push("");
    }

    // Clusters de sintomas
    if (hasClustersSintomas && data.clusters_sintomas) {
      data.clusters_sintomas.forEach((cluster) => {
        const cc = clusterCounts[cluster.id];
        lines.push(
          `## ${cluster.nome} (${cc?.confirmed || 0}/${cc?.total || 0})`,
        );
        if (cluster.limiar)
          lines.push(
            `_Limiar: ${cluster.limiar.adulto} em adultos, ${cluster.limiar.pediatria} em pediatria_`,
          );
        cluster.sintomas.forEach((s) => {
          const ok = sintomasState[s.id] ? "✓" : "☐";
          lines.push(`${ok} **${s.id}** — ${s.rotulo}`);
        });
        lines.push("");
      });
    }

    // Critérios condicionais
    if (hasCriteriosCondicionais && data.criterios_condicionais) {
      lines.push(`## Critérios Condicionais`);
      data.criterios_condicionais.forEach((c) => {
        const ok = criteriosCondState[c.id] ? "✓" : "☐";
        lines.push(`${ok} **${c.letra}** — ${c.rotulo}`);
      });
      lines.push("");
    }

    // Critérios simples
    if (criterios.length > 0) {
      lines.push(`## Critérios (${confirmedCount}/${totalCriterios})`);
      criterios.forEach((c) => {
        const ok = criteriaState[c.id] ? "✓" : "☐";
        lines.push(`${ok} **${c.id}** — ${c.text}`);
      });
      lines.push("");
    }

    if (severityLevel) {
      lines.push(`## Gravidade: ${severityLevel}`);
      lines.push("");
    }
    if (specifiersSelected.length > 0) {
      lines.push(`## Especificadores: ${specifiersSelected.join(", ")}`);
      lines.push("");
    }
    if (subtypesSelected.length > 0) {
      lines.push(`## Subtipos: ${subtypesSelected.join(", ")}`);
      lines.push("");
    }
    lines.push(`## Diagnóstico`);
    lines.push(`Regra: ${data.diagnostic_rule}`);
    lines.push(
      `Status: ${allConfirmed ? "✓ Todos critérios atendidos" : `☐ ${confirmedCount}/${totalCriterios} critérios`}`,
    );
    if (notasClinicas.historia) {
      lines.push("");
      lines.push("## Notas");
      lines.push(notasClinicas.historia);
    }
    return lines.join("\n");
  }, [
    data,
    identificacao,
    hasClustersSintomas,
    hasCriteriosCondicionais,
    clusterCounts,
    sintomasState,
    criteriosCondState,
    criterios,
    criteriaState,
    confirmedCount,
    totalCriterios,
    allConfirmed,
    severityLevel,
    specifiersSelected,
    subtypesSelected,
    notasClinicas,
  ]);

  // ── Reset ──
  const reset = useCallback(() => {
    if (!window.confirm("Limpar todos os dados?")) return;
    setIdentificacao({
      paciente: "",
      data_nascimento: "",
      sexo: "",
      escolaridade: "",
      ocupacao: "",
      queixa: "",
    });
    const initialCriteria: Record<string, boolean> = {};
    criterios.forEach((c) => {
      initialCriteria[c.id] = false;
    });
    setCriteriaState(initialCriteria);
    const initialSintomas: Record<string, boolean> = {};
    data.clusters_sintomas?.forEach((cl) =>
      cl.sintomas.forEach((s) => {
        initialSintomas[s.id] = false;
      }),
    );
    setSintomasState(initialSintomas);
    const initialCond: Record<string, boolean> = {};
    data.criterios_condicionais?.forEach((c) => {
      initialCond[c.id] = false;
    });
    setCriteriosCondState(initialCond);
    setSeverityLevel("");
    setSpecifiersSelected([]);
    setSubtypesSelected([]);
    setKeyQuestionsAnswers({});
    setNotasClinicas({
      historia: "",
      observacoes_gerais: "",
      observacoes_clusters: {},
      observacoes_agente: "",
    });
    setAgenteEtiologico("");
    setDataInicio("");
  }, [criterios, data.clusters_sintomas, data.criterios_condicionais]);

  const copiarMarkdown = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      return true;
    } catch {
      return false;
    }
  }, [markdown]);

  return {
    // Dados
    data,
    criterios,
    totalCriterios,
    // Identificação
    identificacao,
    setIdentificacaoField,
    // Critérios simples
    criteriaState,
    toggleCriterion,
    // Clusters de sintomas
    hasClustersSintomas,
    sintomasState,
    toggleSintoma,
    clusterCounts,
    // Critérios condicionais
    hasCriteriosCondicionais,
    criteriosCondState,
    toggleCriterioCondicional,
    // Severidade
    severityLevel,
    setSeverityLevel,
    // Especificadores
    specifiersSelected,
    toggleSpecifier,
    // Subtipos
    subtypesSelected,
    toggleSubtype,
    // Clusters assessment
    clustersAssessment,
    setClusterNote,
    // Key questions
    keyQuestionsAnswers,
    toggleKeyQuestion,
    kqAnsweredCount,
    // Notas
    notasClinicas,
    setNotasField,
    // Etiológico
    agenteEtiologico,
    setAgenteEtiologico,
    dataInicio,
    setDataInicio,
    // Saída
    payload,
    markdown,
    // Contadores
    confirmedCount,
    allConfirmed,
    // Ações
    reset,
    copiarMarkdown,
  };
}

---

## src/infra/types/index.ts
// ═══════════════════════════════════════════════════════════════════════════
// Tipos TypeScript — GTMedics DSM
// Baseados no schema Zod do dataset DSM-5
// ═══════════════════════════════════════════════════════════════════════════

export type FaixaEtaria =
  | "adulto"
  | "pediatria"
  | "ambos"
  | "pediatria_apenas_menor_5"
  | "transversal";

export type EstruturaGeral =
  | "polythetic_clusters_simetricos"
  | "polythetic_clusters_assimetricos"
  | "polythetic_monocluster"
  | "polythetic_com_ancora"
  | "monothetic_puro"
  | "unico_obrigatorio"
  | "tripartite_funcional"
  | "temporal_topografico"
  | "categorico_por_subtipo"
  | "conjuncao_temporal_complexa"
  | "etiologico_externo"
  | "qualitativo_descritivo"
  | "psicomotor_polythetic"
  | "fallback_classe"
  | "indeterminado_revisar";

export type TipoCluster =
  | "monothetic_obrigatorio"
  | "polythetic_com_limiar"
  | "polythetic_com_ancora"
  | "qualitativo_sem_lista"
  | "unico_obrigatorio";

export type TipoCriterio =
  | "temporal_idade_inicio"
  | "temporal_duracao_minima"
  | "temporal_duracao_janela"
  | "temporal_proporcao"
  | "temporal_conjuncao"
  | "multicontexto"
  | "prejuizo_funcional"
  | "exclusao_diagnostica"
  | "exclusao_substancia_medica"
  | "exclusao_outro_transtorno_da_classe"
  | "condicao_associada_obrigatoria"
  | "informante_obrigatorio"
  | "achado_objetivo_obrigatorio"
  | "qualitativo_descritivo";

export type UIWidget =
  | "toggle_simples"
  | "toggle_com_justificativa_obrigatoria"
  | "select_multiplos_ddx"
  | "campo_data"
  | "campo_duracao_meses"
  | "campo_duracao_anos"
  | "campo_informante"
  | "campo_textual_obrigatorio"
  | "campo_textual_opcional"
  | "checklist_achados_objetivos";

export type TipoEspecificador =
  | "booleano"
  | "select_unico"
  | "multi_select"
  | "texto_livre"
  | "curso_temporal"
  | "gravidade_ordinal"
  | "gravidade_dimensional";

export type GravidadeTipo =
  | "nao_aplica"
  | "ordinal_simples"
  | "tabular_multidimensional"
  | "dimensional_psicose";

export interface MetadadosExtracao {
  completo: boolean;
  lacunas: string[];
  notas_agente: string | null;
  fonte_passada_1: boolean;
}

export interface Codigo {
  dsm5: string;
  cid10: string | null;
  cid11: string | null;
}

export interface MetaTranstorno {
  id: string;
  nome_completo: string;
  sigla: string | null;
  codigo: Codigo;
  capitulo: string;
  capitulo_id: string;
  grupo: string | null;
  faixa_etaria_alvo: FaixaEtaria;
  versao_complementar_existe: boolean;
  sinonimos_historicos: string[];
}

export interface Sintoma {
  id: string;
  rotulo: string;
  desc: string;
  pergunta: string;
  exemplos_clinicos?: string[];
  faixa_aplicavel?: FaixaEtaria | null;
}

export interface Limiar {
  adulto: number | null;
  pediatria: number | null;
}

export interface AncoraObrigatoria {
  descricao: string;
  ids_obrigatorios: string[];
  n_minimo: number;
}

export interface ClusterSintomas {
  id: string;
  nome: string;
  tipo: TipoCluster;
  limiar: Limiar | null;
  ancora_obrigatoria: AncoraObrigatoria | null;
  sintomas: Sintoma[];
  descricao_qualitativa: string | null;
  metadados: MetadadosExtracao;
}

export interface CriterioCondicional {
  id: string;
  letra: string;
  rotulo: string;
  tipo: TipoCriterio;
  ui_widget: UIWidget;
  obrigatorio: boolean;
  icone_fa: string | null;
  ddx_sugeridos: string[];
  descricao_completa: string;
  metadados: MetadadosExtracao;
}

export interface Subtipo {
  id: string;
  codigo: Codigo | null;
  label: string;
  descricao: string;
  sintomas_caracteristicos: string[];
}

export interface ConjuntoSubtipos {
  presente: boolean;
  nome: string | null;
  mutuamente_exclusivos: boolean;
  subtipos: Subtipo[];
  metadados: MetadadosExtracao;
}

export interface OpcaoEspecificador {
  id: string;
  label: string;
  codigo_adicional: string | null;
}

export interface Especificador {
  id: string;
  nome: string;
  tipo: TipoEspecificador;
  ortogonal: boolean;
  opcoes: OpcaoEspecificador[];
  metadados: MetadadosExtracao;
}

export type Gravidade =
  | { tipo: "nao_aplica"; metadados: MetadadosExtracao }
  | {
      tipo: "ordinal_simples";
      niveis: { id: string; label: string; descritor: string }[];
      regra_atribuicao: string | null;
      metadados: MetadadosExtracao;
    }
  | {
      tipo: "tabular_multidimensional";
      dimensoes: { id: string; label: string }[];
      niveis: { id: string; label: string; codigo: Codigo | null }[];
      celulas: { nivel_id: string; dimensao_id: string; descritor: string }[];
      metadados: MetadadosExtracao;
    }
  | {
      tipo: "dimensional_psicose";
      sintomas_avaliados: string[];
      escala: { min: number; max: number; labels: string[] };
      metadados: MetadadosExtracao;
    };

export interface RelacaoHierarquica {
  presente: boolean;
  exclui_se_diagnosticado: string[];
  exclui_diagnostico_de: string[];
  notas: string | null;
  metadados: MetadadosExtracao;
}

export interface DominioImpacto {
  id: string;
  label: string;
  icone_fa: string;
  relevante_para: FaixaEtaria | null;
}

export interface EntradaDDx {
  condicao: string;
  ponto_distincao: string;
  pertence_a_classe: boolean;
}

export interface Comorbidade {
  condicao: string;
  frequencia: "alta" | "moderada" | "baixa" | "nao_especificada";
  nota: string | null;
}

export interface Instrumento {
  nome: string;
  sigla: string | null;
  uso:
    | "triagem"
    | "diagnostico"
    | "monitoramento"
    | "informante"
    | "neuropsicologico";
  obrigatorio_para_diagnostico: boolean;
  fonte: "mencionado_no_dsm" | "sugestao_clinica_padrao";
}

export interface Prevalencia {
  populacao_geral: string | null;
  proporcao_sexo: string | null;
  variacoes_culturais: string | null;
  notas: string | null;
  metadados: MetadadosExtracao;
}

export interface CursoDesenvolvimento {
  idade_inicio_tipica: string | null;
  trajetoria: string | null;
  prognostico: string | null;
  metadados: MetadadosExtracao;
}

export interface TemplateProntuario {
  cabecalho: string;
  rodape_metodologico: string;
}

export interface TranstornoDSM {
  $schema_version: "1.0.0";
  meta: MetaTranstorno;
  estrutura_geral: EstruturaGeral;
  clusters_sintomas: ClusterSintomas[];
  criterios_condicionais: CriterioCondicional[];
  subtipos: ConjuntoSubtipos;
  especificadores: Especificador[];
  gravidade: Gravidade;
  hierarquia: RelacaoHierarquica;
  dominios_impacto: DominioImpacto[];
  diagnostico_diferencial: EntradaDDx[];
  comorbidades_frequentes: Comorbidade[];
  instrumentos_complementares: Instrumento[];
  prevalencia: Prevalencia;
  curso_desenvolvimento: CursoDesenvolvimento;
  template_prontuario: TemplateProntuario;
  metadados_globais: {
    fonte_capitulo_md: string;
    fonte_inventario_md: string | null;
    data_extracao: string;
    modelo_agente: string;
    lacunas_globais: string[];
    inconsistencias_detectadas: { campo: string; descricao: string }[];
    notas_agente_globais: string | null;
    revisao_humana_necessaria: boolean;
  };
}

// ─── Tipos de Formulário ──────────────────────────────────────────────────

export interface SintomaFormState {
  checked: boolean;
  severity: "" | "leve" | "moderado" | "grave";
}

export interface ClusterFormState {
  [sintomaId: string]: SintomaFormState;
}

export interface FormValues {
  clusters: { [clusterId: string]: ClusterFormState };
  criterios_condicionais: { [criterioId: string]: boolean };
  subtipo_selecionado: string | null;
  gravidade: string;
  especificadores: { [espId: string]: boolean | string };
  impacto: { [dominioId: string]: "0" | "1" | "2" | "3" };
  comorbidades_selecionadas: string[];
  notas_clinicas: {
    historia: string;
    observacoes_clusters: { [clusterId: string]: string };
    observacoes_gerais: string;
  };
}

// ─── Payload de Saída ─────────────────────────────────────────────────────

export interface PayloadSaida {
  consulta_id?: string;
  transtorno_id: string;
  transtorno_nome: string;
  data_consulta: string;
  paciente_id: string;
  profissional_id: string;
  clusters_avaliados: {
    [clusterId: string]: {
      sintomas_selecionados: string[];
      severidades: Record<string, "leve" | "moderado" | "grave">;
      observacoes?: string;
    };
  };
  criterios_condicionais: Record<string, boolean>;
  subtipo_selecionado: string | null;
  gravidade: string | null;
  especificadores_ativos: string[];
  dominios_impacto: Record<string, "0" | "1" | "2" | "3">;
  comorbidades_investigadas: string[];
  notas_clinicas: {
    historia: string;
    observacoes_gerais: string;
  };
  inferencias: {
    apresentacao?: string;
    criterios_minimos_atingidos: boolean;
    clusters_atingidos: string[];
  };
  relatorio_markdown: string;
  template_cabecalho: string;
  template_rodape: string;
  capitulo_id: string;
  versao_schema: string;
}

// ── Item de linha do tempo (apenas SHORT de substâncias/etiologico) ──
export interface LinhaTempoItem {
  tempo: string;
  sintomas?: string;
  evento?: string;
  icone?: string;
  risco_mortalidade?: string;
  [key: string]: string | undefined;
}

// ── Severity v2B — levels são strings simples ──
export interface SeverityV2B {
  has_formal_severity: boolean;
  type: string;
  levels: string[];
  assignment_rule: string | null;
  domains: string[];
}

// ── Source trace ──
export interface SourceTrace {
  markdown_section: string;
  patches_applied: string[];
}

// ── Differential v2B (apenas SHORT de substâncias) ──
export interface DifferentialV2B {
  condicao: string;
  diferenciador: string;
}

// ── Transtorno DSM v2B — Estrutura unificada FULL + SHORT ──
export interface TranstornoDSM {
  /** Identificador único */
  id: string;
  /** Nome completo */
  name: string;
  /** FULL ou SHORT */
  category: "FULL" | "SHORT";
  /** Estrutura diagnóstica para seleção de renderer */
  estrutura_diagnostica: string;
  /** Se deve renderizar entrevista estruturada */
  render_structured_interview: boolean;
  /** Modo de UI: "structured_full" ou "structured_compact" */
  ui_mode: string;

  // ── Critérios: lista de strings simples ──
  criteria: string[];
  /** Regra diagnóstica em linguagem natural */
  diagnostic_rule: string;

  // ── Clusters: lista de nomes (vazio na maioria) ──
  clusters: string[];

  // ── Duração, início, impacto (podem ser null) ──
  duration: string | null;
  age_onset: string | null;
  functional_impairment: string | null;

  // ── Exclusões, subtipos, especificadores ──
  exclusions: string[];
  subtypes_presentations: (string | SubtypeV2B)[];
  specifiers: (string | SpecifierV2B)[];

  // ── Perfis operacionais ──
  operational_profiles: (string | OperationalProfileV2B)[];

  // ── Severity ──
  severity: SeverityV2B;

  // ── Diferenciais: string[] na maioria, DifferentialV2B[] em substâncias SHORT ──
  critical_differentials: string[] | DifferentialV2B[];

  // ── Entrevista clínica ──
  key_questions: string[];
  alerts: string[];

  // ── Metadados ──
  source_trace: SourceTrace;

  // ═══════════════════════════════════════════════
  // Campos opcionais — enriquecidos para experiência completa
  // ═══════════════════════════════════════════════

  /** Resumo clínico (SHORT de substâncias) */
  resumo_clinico?: string;
  /** Linha do tempo (SHORT de abstinências/intoxicações) */
  linha_do_tempo?: LinhaTempoItem[];
  /** Substâncias relacionadas (SHORT) */
  substancias?: string[];
  /** Sinais de triagem (SHORT) */
  sinais_clinicos_triagem?: string;
  /** Níveis de BAC (SHORT de álcool) */
  niveis_bac?: string[];
  /** Fontes comuns (SHORT de intoxicações) */
  fontes_comuns?: string[];
  /** Sinais diferenciadores (SHORT) */
  sinais_diferenciadores?: string[];
  /** Características (SHORT) */
  caracteristicas?: string;
  /** Sinais de uso (SHORT) */
  sinais_de_uso?: string;
  /** Exemplos de substâncias (SHORT) */
  exemplos_substancias?: string;
  /** Perguntas chave por critério (SHORT de substâncias) */
  perguntas_chave_por_criterio?: Record<string, string[]>;
  /** Padrões de uso (FULL de substâncias) */
  padroes_de_uso?: string;
  /** Gravidade por substância (FULL de substâncias) */
  gravidade_por_substancia?: string;
  /** Marcadores de severidade (FULL de substâncias) */
  marcadores_severidade?: string[];
}

export interface OperationalProfileV2B {
  id: string;
  description: string;
}

export interface SubtypeV2B {
  id: string;
  name: string;
  description?: string;
}

export interface SpecifierV2B {
  id: string;
  name: string;
  description?: string;
}

// ── Estado do formulário ──

export interface FormState {
  identificacao: IdentificacaoState;
  criteria: Record<string, boolean>;
  severity_level: string;
  specifiers_selected: string[];
  subtypes_selected: string[];
  clusters_assessment: Record<string, string>;
  key_questions_answers: Record<string, boolean>;
  impacto: Record<string, number>;
  notas_clinicas: NotasClinicas;
  dados_etiologicos?: DadosEtiologicos;
  // Campos SHORT
  triagem_completada?: boolean;
  linha_do_tempo_notas?: string;
  resumo_preencido?: boolean;
}

export interface IdentificacaoState {
  paciente: string;
  data_nascimento: string;
  sexo: string;
  escolaridade: string;
  ocupacao: string;
  queixa: string;
}

export interface NotasClinicas {
  historia: string;
  observacoes_gerais: string;
  observacoes_clusters: Record<string, string>;
  observacoes_agente?: string;
}

export interface DadosEtiologicos {
  agente: string;
  data_inicio: string;
  observacoes: string;
}

---

## src/infra/utils/markdown-generator.ts
// ═══════════════════════════════════════════════════════════════════════════
// Markdown Generator — Estado do Form → Relatório Clínico
// ═══════════════════════════════════════════════════════════════════════════

import type { TranstornoDSM, FormValues, PayloadSaida } from "@/infra/types";

export function generateMarkdown(
  transtorno: TranstornoDSM,
  values: FormValues,
  payload: PayloadSaida,
  identificacao?: {
    nome?: string;
    dataNascimento?: string;
    sexo?: string;
    escolaridade?: string;
    ocupacao?: string;
    queixa?: string;
  }
): string {
  const data = new Date().toLocaleDateString("pt-BR");
  const nome = identificacao?.nome || "Paciente";

  let md = `${transtorno.template_prontuario.cabecalho.replace("{nome}", nome)}\n\n`;
  md += `- **Data:** ${data}\n`;

  if (identificacao?.dataNascimento) {
    md += `- **Data de Nascimento:** ${identificacao.dataNascimento}\n`;
  }
  if (identificacao?.sexo) md += `- **Sexo:** ${identificacao.sexo}\n`;
  if (identificacao?.escolaridade) md += `- **Escolaridade:** ${identificacao.escolaridade}\n`;
  if (identificacao?.ocupacao) md += `- **Ocupação:** ${identificacao.ocupacao}\n`;
  if (identificacao?.queixa) md += `- **Queixa principal:** ${identificacao.queixa}\n`;
  md += `\n---\n\n`;

  // Critério A — Clusters de sintomas
  if (transtorno.clusters_sintomas.length > 0) {
    md += `### Critério A — Sintomas\n\n`;

    for (const cluster of transtorno.clusters_sintomas) {
      const clusterState = values.clusters[cluster.id] || {};
      const selecionados = cluster.sintomas.filter(
        (s) => clusterState[s.id]?.checked
      );
      const n = selecionados.length;
      const limiar = cluster.limiar;

      md += `**${cluster.nome} (${cluster.id}):** ${n} sintoma(s)`;
      if (limiar) {
        const lim = limiar.adulto || limiar.pediatria || 0;
        md += ` (limiar: ${lim})`;
      }
      md += `\n`;

      if (selecionados.length > 0) {
        for (const s of selecionados) {
          const sev = clusterState[s.id]?.severity;
          md += `  - **${s.id}** — ${s.rotulo}${sev ? ` (${sev})` : ""}\n`;
        }
      }

      // Observações do cluster
      const obs = values.notas_clinicas.observacoes_clusters[cluster.id];
      if (obs) {
        md += `  - *Observação clínica:* ${obs}\n`;
      }
      md += `\n`;
    }

    // Apresentação inferida
    if (payload.inferencias.apresentacao) {
      md += `**Apresentação inferida:** ${payload.inferencias.apresentacao}\n\n`;
    }
  }

  // Critérios B–E (condicionais)
  if (transtorno.criterios_condicionais.length > 0) {
    md += `### Critérios Condicionais\n\n`;
    md += `| Critério | Status |\n|---|---|\n`;
    for (const c of transtorno.criterios_condicionais) {
      const ok = values.criterios_condicionais[c.id] || false;
      md += `| ${c.letra} — ${c.rotulo} | ${ok ? "✓ Confirmado" : "✗ Não confirmado"} |\n`;
    }
    md += `\n`;
  }

  // História
  if (values.notas_clinicas.historia) {
    md += `**Desenvolvimento e curso:** ${values.notas_clinicas.historia}\n\n`;
  }

  // Subtipo
  if (payload.subtipo_selecionado) {
    const sub = transtorno.subtipos.subtipos.find(
      (s) => s.id === payload.subtipo_selecionado
    );
    if (sub) md += `**Subtipo:** ${sub.label}\n\n`;
  }

  // Gravidade
  if (payload.gravidade) {
    md += `**Gravidade:** ${payload.gravidade}\n\n`;
  }

  // Impacto funcional
  const impactoEntries = Object.entries(values.impacto).filter(([, v]) => v !== "0");
  if (impactoEntries.length > 0) {
    md += `### Impacto Funcional\n\n`;
    const niveis = ["Sem prejuízo", "Leve", "Moderado", "Grave"];
    for (const dom of transtorno.dominios_impacto) {
      const val = parseInt(values.impacto[dom.id] || "0");
      if (val > 0) md += `- **${dom.label}:** ${niveis[val]}\n`;
    }
    md += `\n`;
  }

  // Observações gerais
  if (values.notas_clinicas.observacoes_gerais) {
    md += `**Observações:** ${values.notas_clinicas.observacoes_gerais}\n\n`;
  }

  // Comorbidades
  if (payload.comorbidades_investigadas.length > 0) {
    md += `### Comorbidades em investigação\n\n`;
    md += `${payload.comorbidades_investigadas.join(", ")}\n\n`;
  }

  // Rodapé metodológico
  md += `---\n\n`;
  md += `> ${transtorno.template_prontuario.rodape_metodologico}\n`;

  return md;
}

---

## src/infra/utils/mapear-icones.ts
// ═══════════════════════════════════════════════════════════════════════════
// Mapeamento Font Awesome → Lucide React
// ═══════════════════════════════════════════════════════════════════════════

import {
  type LucideIcon,
  User, UserPen, Cake, Users, GraduationCap, Briefcase,
  MessageSquarePlus, History, Baby, GitBranch, AlertTriangle,
  Ban, ClipboardList, UsersRound, EyeOff, Zap, TrendingUp,
  Layers, Pill, ClipboardCheck, FileText, Copy, Tag,
  ListChecks, BarChart3, Info, ChevronUp, RefreshCw, School,
  Laptop, Heart, Wallet, Home, Moon, ShieldAlert, HeartPulse,
  PersonStanding, MessageCircle, BookOpen, PenTool, Calculator,
  Hand, Footprints, Accessibility, Clock, Megaphone, Shield,
  MapPin, HandMetal, CircleDot, CheckCircle2, XCircle,
  Printer, RotateCcw, ChevronDown, Brain,
} from "lucide-react";

const mapaIcones: Record<string, LucideIcon> = {
  "fa-user": User,
  "fa-user-pen": UserPen,
  "fa-cake-candles": Cake,
  "fa-venus-mars": Users,
  "fa-graduation-cap": GraduationCap,
  "fa-briefcase": Briefcase,
  "fa-comment-medical": MessageSquarePlus,
  "fa-clock-rotate-left": History,
  "fa-child": Baby,
  "fa-arrows-split-up-and-left": GitBranch,
  "fa-triangle-exclamation": AlertTriangle,
  "fa-ban": Ban,
  "fa-notes-medical": ClipboardList,
  "fa-people-roof": UsersRound,
  "fa-eye-slash": EyeOff,
  "fa-bolt": Zap,
  "fa-chart-line": TrendingUp,
  "fa-layer-group": Layers,
  "fa-pills": Pill,
  "fa-clipboard-check": ClipboardCheck,
  "fa-brands fa-markdown": FileText,
  "fa-copy": Copy,
  "fa-tag": Tag,
  "fa-list-check": ListChecks,
  "fa-chart-bar": BarChart3,
  "fa-circle-info": Info,
  "fa-chevron-up": ChevronUp,
  "fa-chevron-down": ChevronDown,
  "fa-arrows-rotate": RefreshCw,
  "fa-school": School,
  "fa-laptop": Laptop,
  "fa-heart": Heart,
  "fa-wallet": Wallet,
  "fa-home": Home,
  "fa-moon": Moon,
  "fa-shield-halved": ShieldAlert,
  "fa-hand-holding-medical": HeartPulse,
  "fa-running": PersonStanding,
  "fa-comments": MessageCircle,
  "fa-book": BookOpen,
  "fa-book-open": BookOpen,
  "fa-pen-nib": PenTool,
  "fa-calculator": Calculator,
  "fa-hand-paper": Hand,
  "fa-shoe-prints": Footprints,
  "fa-wheelchair": Accessibility,
  "fa-clock": Clock,
  "fa-baby": Baby,
  "fa-baby-carriage": Baby,
  "fa-exclamation-triangle": AlertTriangle,
  "fa-heartbeat": HeartPulse,
  "fa-shield-alt": Shield,
  "fa-user-friends": Users,
  "fa-users": Users,
  "fa-sync-alt": RefreshCw,
  "fa-pen": PenTool,
  "fa-map-marker-alt": MapPin,
  "fa-hands": HandMetal,
  "fa-circle-check": CheckCircle2,
  "fa-circle-xmark": XCircle,
  "fa-message": MessageCircle,
  "fa-print": Printer,
  "fa-rotate-left": RotateCcw,
  "fa-bullhorn": Megaphone,
  "fa-brain": Brain,
};

export function getIcone(iconeFA: string | null): LucideIcon {
  if (!iconeFA) return CircleDot;
  return mapaIcones[iconeFA] || CircleDot;
}

---

## src/infra/utils/payload-builder.ts
// ═══════════════════════════════════════════════════════════════════════════
// Payload Builder — Estado do Form → JSON Payload
// ═══════════════════════════════════════════════════════════════════════════

import type { TranstornoDSM, FormValues, PayloadSaida } from "@/infra/types";

export function buildPayload(
  transtorno: TranstornoDSM,
  values: FormValues,
  pacienteId: string = "anon",
  profissionalId: string = "anon"
): PayloadSaida {
  // Clusters avaliados
  const clustersAvaliados: PayloadSaida["clusters_avaliados"] = {};
  const clustersAtingidos: string[] = [];

  for (const cluster of transtorno.clusters_sintomas) {
    const clusterState = values.clusters[cluster.id] || {};
    const sintomasSelecionados: string[] = [];
    const severidades: Record<string, "leve" | "moderado" | "grave"> = {};

    for (const sintoma of cluster.sintomas) {
      const s = clusterState[sintoma.id];
      if (s?.checked) {
        sintomasSelecionados.push(sintoma.id);
        if (s.severity) severidades[sintoma.id] = s.severity;
      }
    }

    const n = sintomasSelecionados.length;
    const limiar = cluster.limiar;

    clustersAvaliados[cluster.id] = {
      sintomas_selecionados: sintomasSelecionados,
      severidades,
      observacoes: values.notas_clinicas.observacoes_clusters[cluster.id] || undefined,
    };

    // Verifica se atingiu limiar
    if (limiar && n >= (limiar.adulto || limiar.pediatria || 0)) {
      clustersAtingidos.push(cluster.id);
    }
  }

  // Criterios condicionais
  const criteriosCondicionais = { ...values.criterios_condicionais };

  // Inferir subtipo para polythetic_clusters_simetricos (TDAH)
  let apresentacao: string | undefined;
  if (transtorno.estrutura_geral === "polythetic_clusters_simetricos") {
    const clusters = transtorno.clusters_sintomas;
    let atingeA1 = false;
    let atingeA2 = false;

    for (const cluster of clusters) {
      const sel = clustersAvaliados[cluster.id]?.sintomas_selecionados.length || 0;
      const lim = cluster.limiar?.adulto || cluster.limiar?.pediatria || 0;
      if (cluster.id === "A1") atingeA1 = sel >= lim;
      if (cluster.id === "A2") atingeA2 = sel >= lim;
    }

    if (atingeA1 && atingeA2) apresentacao = "Apresentação combinada";
    else if (atingeA1) apresentacao = "Predominantemente desatentiva";
    else if (atingeA2) apresentacao = "Predominantemente hiperativa/impulsiva";
  }

  // Subtipo selecionado
  const subtipoSelecionado = values.subtipo_selecionado;

  // Gravidade
  const gravidade = values.gravidade || null;

  // Especificadores ativos
  const especificadoresAtivos = Object.entries(values.especificadores)
    .filter(([, v]) => (typeof v === "boolean" ? v : !!v))
    .map(([k]) => k);

  // Impacto
  const dominiosImpacto = { ...values.impacto };

  // Comorbidades
  const comorbidadesInvestigadas = [...values.comorbidades_selecionadas];

  // Critérios mínimos atingidos
  const criteriosMinimosAtingidos = clustersAtingidos.length > 0;

  return {
    transtorno_id: transtorno.meta.id,
    transtorno_nome: transtorno.meta.nome_completo,
    data_consulta: new Date().toISOString(),
    paciente_id: pacienteId,
    profissional_id: profissionalId,
    clusters_avaliados: clustersAvaliados,
    criterios_condicionais: criteriosCondicionais,
    subtipo_selecionado: subtipoSelecionado,
    gravidade,
    especificadores_ativos: especificadoresAtivos,
    dominios_impacto: dominiosImpacto as Record<string, "0" | "1" | "2" | "3">,
    comorbidades_investigadas: comorbidadesInvestigadas,
    notas_clinicas: {
      historia: values.notas_clinicas.historia,
      observacoes_gerais: values.notas_clinicas.observacoes_gerais,
    },
    inferencias: {
      apresentacao,
      criterios_minimos_atingidos: criteriosMinimosAtingidos,
      clusters_atingidos: clustersAtingidos,
    },
    relatorio_markdown: "", // preenchido separadamente
    template_cabecalho: transtorno.template_prontuario.cabecalho,
    template_rodape: transtorno.template_prontuario.rodape_metodologico,
    capitulo_id: transtorno.meta.capitulo_id,
    versao_schema: "1.0.0",
  };
}

---

## src/lib/googleIdentity.ts
export async function requestGoogleIdToken() {
  return "stub-google-token";
}

export async function renderGoogleButton(containerId: string, callback: (res: any) => void) {
  const container = document.getElementById(containerId);
  if (container) {
    container.innerHTML = `<button type="button" style="padding: 8px 16px; border: 1px solid #ccc; border-radius: 4px;">Sign in with Google (Stub)</button>`;
    container.onclick = () => callback({ credential: "stub-credential" });
  }
}

---

## src/lib/dsm.ts
// src/lib/dsm.ts
// DSM-5 chapter catalog + clinical structure types.
// Counts are the canonical "modeled disorder" numbers for the platform.

import { z } from "zod";
import type { LucideIcon } from "lucide-react";
import {
  Brain,
  Sparkles,
  Activity,
  CloudRain,
  Wind,
  Repeat,
  Flame,
  Split,
  HeartPulse,
  Utensils,
  Droplet,
  Moon,
  Heart,
  User,
  Zap,
  Pill,
  Cpu,
  Users,
  EyeOff,
  HelpCircle,
  Waves,
} from "lucide-react";

export const ChapterKey = z.enum([
  "neuro",
  "psico",
  "bipo",
  "depr",
  "ansi",
  "toc",
  "trau",
  "diss",
  "soma",
  "alim",
  "elim",
  "sono",
  "sexo",
  "gene",
  "disr",
  "subs",
  "neco",
  "pers",
  "para",
  "outr",
  "movi",
]);
export type ChapterKey = z.infer<typeof ChapterKey>;

export const ChapterData = z.object({
  key: ChapterKey,
  title: z.string(),
  count: z.number().int().nonnegative(),
  hue: z.string(),
});
export type ChapterData = z.infer<typeof ChapterData>;

export type Chapter = ChapterData & {
  icon: LucideIcon;
};

export const CHAPTERS: readonly Chapter[] = [
  {
    key: "neuro",
    icon: Brain,
    title: "Neurodesenvolvimento",
    count: 15,
    hue: "#4A6FA5",
  },
  {
    key: "psico",
    icon: Sparkles,
    title: "Espectro Esquizofrenia e Psicóticos",
    count: 12,
    hue: "#7B5EA0",
  },
  {
    key: "bipo",
    icon: Activity,
    title: "Transtornos Bipolares",
    count: 7,
    hue: "#A05E7B",
  },
  {
    key: "depr",
    icon: CloudRain,
    title: "Transtornos Depressivos",
    count: 8,
    hue: "#5E7BA0",
  },
  {
    key: "ansi",
    icon: Wind,
    title: "Transtornos de Ansiedade",
    count: 11,
    hue: "#A07B5E",
  },
  {
    key: "toc",
    icon: Repeat,
    title: "TOC e Relacionados",
    count: 8,
    hue: "#6B8E7B",
  },
  {
    key: "trau",
    icon: Flame,
    title: "Trauma e Estressores",
    count: 7,
    hue: "#8A5A4A",
  },
  {
    key: "diss",
    icon: Split,
    title: "Dissociativos",
    count: 4,
    hue: "#6B6E8E",
  },
  {
    key: "soma",
    icon: HeartPulse,
    title: "Sintomas Somáticos",
    count: 7,
    hue: "#8E8A6B",
  },
  {
    key: "alim",
    icon: Utensils,
    title: "Alimentares",
    count: 8,
    hue: "#7B9C8A",
  },
  { key: "elim", icon: Droplet, title: "Eliminação", count: 5, hue: "#9C8A7B" },
  { key: "sono", icon: Moon, title: "Sono-Vigília", count: 14, hue: "#5A8A9E" },
  {
    key: "sexo",
    icon: Heart,
    title: "Disfunções Sexuais",
    count: 10,
    hue: "#9E5A8A",
  },
  {
    key: "gene",
    icon: User,
    title: "Disforia de Gênero",
    count: 3,
    hue: "#8E7B5A",
  },
  {
    key: "disr",
    icon: Zap,
    title: "Disruptivos, Controle de Impulsos",
    count: 9,
    hue: "#9C7B6E",
  },
  {
    key: "subs",
    icon: Pill,
    title: "Substâncias e Adições",
    count: 28,
    hue: "#6E8A6E",
  },
  {
    key: "neco",
    icon: Cpu,
    title: "Neurocognitivos",
    count: 18,
    hue: "#5E5E8E",
  },
  {
    key: "pers",
    icon: Users,
    title: "Personalidade",
    count: 12,
    hue: "#7B5A5A",
  },
  { key: "para", icon: EyeOff, title: "Parafílicos", count: 9, hue: "#6B7B9C" },
  {
    key: "outr",
    icon: HelpCircle,
    title: "Outros Mentais",
    count: 5,
    hue: "#8A8A8A",
  },
  {
    key: "movi",
    icon: Waves,
    title: "Movimentos Induzidos por Medicação",
    count: 5,
    hue: "#5A8A7B",
  },
] as const;

export const TOTAL_DISORDERS = CHAPTERS.reduce((sum, c) => sum + c.count, 0);

/** Lookup by ChapterKey */
export const CHAPTER_BY_KEY: Record<ChapterKey, Chapter> = CHAPTERS.reduce(
  (acc, c) => {
    acc[c.key] = c;
    return acc;
  },
  {} as Record<ChapterKey, Chapter>,
);

/** The 14 canonical diagnostic structures supported by the platform. */
export const Structure = z.enum([
  "polythetic-threshold",
  "monothetic-pure",
  "tripartite-functional",
  "categorical-by-subtype",
  "temporal-conjunction",
  "polythetic-multi-domain",
  "duration-based",
  "severity-graded",
  "etiology-defined",
  "developmental-trajectory",
  "episodic-recurrent",
  "specifier-driven",
  "exclusion-hierarchy",
  "phenomenological-cluster",
]);
export type Structure = z.infer<typeof Structure>;

export const STRUCTURE_LABEL: Record<Structure, string> = {
  "polythetic-threshold": "Polythetic com limiar",
  "monothetic-pure": "Monothetic puro",
  "tripartite-functional": "Tripartite funcional",
  "categorical-by-subtype": "Categórico por subtipo",
  "temporal-conjunction": "Conjunção temporal",
  "polythetic-multi-domain": "Polythetic multi-domínio",
  "duration-based": "Baseado em duração",
  "severity-graded": "Graduado por gravidade",
  "etiology-defined": "Definido por etiologia",
  "developmental-trajectory": "Trajetória do desenvolvimento",
  "episodic-recurrent": "Episódico-recorrente",
  "specifier-driven": "Conduzido por especificador",
  "exclusion-hierarchy": "Hierarquia de exclusão",
  "phenomenological-cluster": "Cluster fenomenológico",
};

---

## src/lib/authClient.ts
export function getPostAuthPath(user?: any) {
  return "/app";
}

---

## src/lib/mapear-icones.ts
// ═══════════════════════════════════════════════════════════════════════════
// Mapeamento Font Awesome → Lucide React
// ═══════════════════════════════════════════════════════════════════════════

import {
  type LucideIcon,
  User, UserPen, Cake, Users, GraduationCap, Briefcase,
  MessageSquarePlus, History, Baby, GitBranch, AlertTriangle,
  Ban, ClipboardList, UsersRound, EyeOff, Zap, TrendingUp,
  Layers, Pill, ClipboardCheck, FileText, Copy, Tag,
  ListChecks, BarChart3, Info, ChevronUp, RefreshCw, School,
  Laptop, Heart, Wallet, Home, Moon, ShieldAlert, HeartPulse,
  PersonStanding, MessageCircle, BookOpen, PenTool, Calculator,
  Hand, Footprints, Accessibility, Clock, Megaphone, Shield,
  MapPin, HandMetal, CircleDot, CheckCircle2, XCircle,
  Printer, RotateCcw, ChevronDown, Brain,
} from "lucide-react";

const mapaIcones: Record<string, LucideIcon> = {
  "fa-user": User,
  "fa-user-pen": UserPen,
  "fa-cake-candles": Cake,
  "fa-venus-mars": Users,
  "fa-graduation-cap": GraduationCap,
  "fa-briefcase": Briefcase,
  "fa-comment-medical": MessageSquarePlus,
  "fa-clock-rotate-left": History,
  "fa-child": Baby,
  "fa-arrows-split-up-and-left": GitBranch,
  "fa-triangle-exclamation": AlertTriangle,
  "fa-ban": Ban,
  "fa-notes-medical": ClipboardList,
  "fa-people-roof": UsersRound,
  "fa-eye-slash": EyeOff,
  "fa-bolt": Zap,
  "fa-chart-line": TrendingUp,
  "fa-layer-group": Layers,
  "fa-pills": Pill,
  "fa-clipboard-check": ClipboardCheck,
  "fa-brands fa-markdown": FileText,
  "fa-copy": Copy,
  "fa-tag": Tag,
  "fa-list-check": ListChecks,
  "fa-chart-bar": BarChart3,
  "fa-circle-info": Info,
  "fa-chevron-up": ChevronUp,
  "fa-chevron-down": ChevronDown,
  "fa-arrows-rotate": RefreshCw,
  "fa-school": School,
  "fa-laptop": Laptop,
  "fa-heart": Heart,
  "fa-wallet": Wallet,
  "fa-home": Home,
  "fa-moon": Moon,
  "fa-shield-halved": ShieldAlert,
  "fa-hand-holding-medical": HeartPulse,
  "fa-running": PersonStanding,
  "fa-comments": MessageCircle,
  "fa-book": BookOpen,
  "fa-book-open": BookOpen,
  "fa-pen-nib": PenTool,
  "fa-calculator": Calculator,
  "fa-hand-paper": Hand,
  "fa-shoe-prints": Footprints,
  "fa-wheelchair": Accessibility,
  "fa-clock": Clock,
  "fa-baby": Baby,
  "fa-baby-carriage": Baby,
  "fa-exclamation-triangle": AlertTriangle,
  "fa-heartbeat": HeartPulse,
  "fa-shield-alt": Shield,
  "fa-user-friends": Users,
  "fa-users": Users,
  "fa-sync-alt": RefreshCw,
  "fa-pen": PenTool,
  "fa-map-marker-alt": MapPin,
  "fa-hands": HandMetal,
  "fa-circle-check": CheckCircle2,
  "fa-circle-xmark": XCircle,
  "fa-message": MessageCircle,
  "fa-print": Printer,
  "fa-rotate-left": RotateCcw,
  "fa-bullhorn": Megaphone,
  "fa-brain": Brain,
};

export function getIcone(iconeFA: string | null): LucideIcon {
  if (!iconeFA) return CircleDot;
  return mapaIcones[iconeFA] || CircleDot;
}

---

## src/lib/schemas.ts
// src/lib/schemas.ts
// Zod schemas for clinical entities. Mirror PocketBase collections.

import { z } from "zod";
import { ChapterKey, Structure } from "./dsm";

// ─── Patient ──────────────────────────────────────────────────
export const Patient = z.object({
  id: z.string(),                       // pocketbase id
  fullName: z.string().min(2),
  birthDate: z.iso.date(),
  sex: z.enum(["F", "M", "outro", "nao-informado"]),
  education: z.string().optional(),
  occupation: z.string().optional(),
  origin: z.string().optional(),        // naturalidade
  insurance: z.string().optional(),
  referredBy: z.string().optional(),
  status: z.enum(["em-acompanhamento", "em-avaliacao", "alta", "encaminhado"]),
  notes: z.string().optional(),
  created: z.iso.datetime(),
  updated: z.iso.datetime(),
});
export type Patient = z.infer<typeof Patient>;

// ─── Disorder (catalog) ──────────────────────────────────────
export const Disorder = z.object({
  id: z.string(),
  code: z.string(),                     // F90, F32.0, etc.
  dsm5Code: z.string(),                 // 314.00, etc.
  name: z.string(),
  shortName: z.string().optional(),     // "TDAH"
  chapter: ChapterKey,
  structure: Structure,
});
export type Disorder = z.infer<typeof Disorder>;

// ─── Criterion ───────────────────────────────────────────────
export const Criterion = z.object({
  id: z.string(),                       // "A1.1", "B", etc.
  domain: z.string(),                   // "A1", "B"
  label: z.string(),
  fullText: z.string(),                 // DSM verbatim
});
export type Criterion = z.infer<typeof Criterion>;

// ─── Assessment ──────────────────────────────────────────────
export const CriterionResponse = z.object({
  criterionId: z.string(),
  checked: z.boolean(),
  note: z.string().optional(),          // clinician free text
});
export type CriterionResponse = z.infer<typeof CriterionResponse>;

export const AssessmentState = z.enum([
  "em-andamento", "finalizada", "descartada", "provisoria",
]);
export type AssessmentState = z.infer<typeof AssessmentState>;

export const Assessment = z.object({
  id: z.string(),
  patientId: z.string(),
  disorderId: z.string(),
  state: AssessmentState,
  responses: z.array(CriterionResponse),
  inferredSubtype: z.string().optional(),
  inferredCode: z.string().optional(),
  functionalImpact: z.record(z.string(), z.number().int().min(0).max(4)).optional(),
  freeText: z.object({
    chiefComplaint: z.string().optional(),
    courseAndDevelopment: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
  reportMarkdown: z.string().optional(),
  sessionNumber: z.number().int().positive().optional(),
  lastEditedAt: z.iso.datetime(),
  created: z.iso.datetime(),
  updated: z.iso.datetime(),
});
export type Assessment = z.infer<typeof Assessment>;

// ─── Threshold rule (TDAH-style) ─────────────────────────────
export const ThresholdRule = z.object({
  domain: z.string(),                   // "A1"
  adult: z.number().int().positive(),
  child: z.number().int().positive(),
  total: z.number().int().positive(),
});
export type ThresholdRule = z.infer<typeof ThresholdRule>;

---

## src/lib/cn.ts
// src/lib/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Concat Tailwind classNames, dedup'd by twMerge. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

---

## src/lib/disease-catalog.ts
// ═══════════════════════════════════════════════════════════════════════════
// Disease Catalog v2B — 160 transtornos renderizáveis (79 FULL + 81 SHORT)
// Gerado automaticamente dos JSONs *_full_short.json (Rodada 2B)
// ═══════════════════════════════════════════════════════════════════════════

import { CHAPTERS } from "./dsm";

export interface DiseaseItem {
  id: string;
  nome: string;
  sigla: string | null;
  dsm5: string | null;
  cid10: string | null;
  capituloId: string;
  capituloNome: string;
  categoria: "FULL" | "SHORT";
  estrutura: string;
  route: string;
  folder: string;
}

export const RENDERABLE_DISEASES: DiseaseItem[] = [
  {
    id: "deficiencia_intelectual",
    nome: "Deficiencia Intelectual",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "01",
    capituloNome: "Transtornos do Neurodesenvolvimento",
    categoria: "FULL",
    estrutura: "monothetic_tripartite",
    route: "/consulta/deficiencia_intelectual",
    folder: "01-neurodesenvolvimento",
  },
  {
    id: "espectro_autista",
    nome: "Transtorno do Espectro Autista",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "01",
    capituloNome: "Transtornos do Neurodesenvolvimento",
    categoria: "FULL",
    estrutura: "polythetic_com_ancora",
    route: "/consulta/espectro_autista",
    folder: "01-neurodesenvolvimento",
  },
  {
    id: "deficit_de_atencao_hiperatividade",
    nome: "Transtorno de Deficit de Atencao/Hiperatividade",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "01",
    capituloNome: "Transtornos do Neurodesenvolvimento",
    categoria: "FULL",
    estrutura: "polythetic_clusters_simetricos",
    route: "/consulta/deficit_de_atencao_hiperatividade",
    folder: "01-neurodesenvolvimento",
  },
  {
    id: "transtorno_especifico_da_aprendizagem",
    nome: "Transtorno Especifico da Aprendizagem",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "01",
    capituloNome: "Transtornos do Neurodesenvolvimento",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_especifico_da_aprendizagem",
    folder: "01-neurodesenvolvimento",
  },
  {
    id: "transtorno_da_linguagem",
    nome: "Transtorno da Linguagem",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "01",
    capituloNome: "Transtornos do Neurodesenvolvimento",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_da_linguagem",
    folder: "01-neurodesenvolvimento",
  },
  {
    id: "transtorno_da_fala",
    nome: "Transtorno da Fala",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "01",
    capituloNome: "Transtornos do Neurodesenvolvimento",
    categoria: "FULL",
    estrutura: "qualitativo_descritivo",
    route: "/consulta/transtorno_da_fala",
    folder: "01-neurodesenvolvimento",
  },
  {
    id: "transtorno_da_fluencia_com_inicio_na_infancia",
    nome: "Transtorno da Fluencia com Inicio na Infancia",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "01",
    capituloNome: "Transtornos do Neurodesenvolvimento",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_da_fluencia_com_inicio_na_infancia",
    folder: "01-neurodesenvolvimento",
  },
  {
    id: "transtorno_da_comunicacao_social",
    nome: "Transtorno da Comunicacao Social",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "01",
    capituloNome: "Transtornos do Neurodesenvolvimento",
    categoria: "FULL",
    estrutura: "monothetic_puro",
    route: "/consulta/transtorno_da_comunicacao_social",
    folder: "01-neurodesenvolvimento",
  },
  {
    id: "movimento_estereotipado",
    nome: "Transtorno do Movimento Estereotipado",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "01",
    capituloNome: "Transtornos do Neurodesenvolvimento",
    categoria: "FULL",
    estrutura: "qualitativo_descritivo",
    route: "/consulta/movimento_estereotipado",
    folder: "01-neurodesenvolvimento",
  },
  {
    id: "tourette",
    nome: "Transtorno de Tourette",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "01",
    capituloNome: "Transtornos do Neurodesenvolvimento",
    categoria: "SHORT",
    estrutura: "temporal_topografico",
    route: "/consulta/tourette",
    folder: "01-neurodesenvolvimento",
  },
  {
    id: "tique_motor_ou_vocal_persistente",
    nome: "Transtorno de Tique Motor ou Vocal Persistente",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "01",
    capituloNome: "Transtornos do Neurodesenvolvimento",
    categoria: "SHORT",
    estrutura: "temporal_topografico",
    route: "/consulta/tique_motor_ou_vocal_persistente",
    folder: "01-neurodesenvolvimento",
  },
  {
    id: "tique_transitorio",
    nome: "Transtorno de Tique Transitorio",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "01",
    capituloNome: "Transtornos do Neurodesenvolvimento",
    categoria: "SHORT",
    estrutura: "temporal_topografico",
    route: "/consulta/tique_transitorio",
    folder: "01-neurodesenvolvimento",
  },
  {
    id: "desenvolvimento_da_coordenacao",
    nome: "Transtorno do Desenvolvimento da Coordenacao",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "01",
    capituloNome: "Transtornos do Neurodesenvolvimento",
    categoria: "SHORT",
    estrutura: "qualitativo_descritivo",
    route: "/consulta/desenvolvimento_da_coordenacao",
    folder: "01-neurodesenvolvimento",
  },
  {
    id: "esquizofrenia",
    nome: "ESQUIZOFRENIA",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "02",
    capituloNome: "Espectro da Esquizofrenia e Outros Transtornos Psicoticos",
    categoria: "FULL",
    estrutura: "polythetic_clusters_assimetricos",
    route: "/consulta/esquizofrenia",
    folder: "02-espectro-esquizofrenia-psicoticos",
  },
  {
    id: "transtorno_esquizofreniforme",
    nome: "TRANSTORNO ESQUIZOFRENIFORME",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "02",
    capituloNome: "Espectro da Esquizofrenia e Outros Transtornos Psicoticos",
    categoria: "FULL",
    estrutura: "polythetic_clusters_assimetricos",
    route: "/consulta/transtorno_esquizofreniforme",
    folder: "02-espectro-esquizofrenia-psicoticos",
  },
  {
    id: "transtorno_delirante",
    nome: "TRANSTORNO DELIRANTE",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "02",
    capituloNome: "Espectro da Esquizofrenia e Outros Transtornos Psicoticos",
    categoria: "FULL",
    estrutura: "monothetic_puro",
    route: "/consulta/transtorno_delirante",
    folder: "02-espectro-esquizofrenia-psicoticos",
  },
  {
    id: "transtorno_esquizoafe_tivo",
    nome: "TRANSTORNO ESQUIZOAFE TIVO",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "02",
    capituloNome: "Espectro da Esquizofrenia e Outros Transtornos Psicoticos",
    categoria: "FULL",
    estrutura: "polythetic_com_ancora",
    route: "/consulta/transtorno_esquizoafe_tivo",
    folder: "02-espectro-esquizofrenia-psicoticos",
  },
  {
    id: "transtorno_psicótico_breve",
    nome: "TRANSTORNO PSICÓTICO BREVE",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "02",
    capituloNome: "Espectro da Esquizofrenia e Outros Transtornos Psicoticos",
    categoria: "SHORT",
    estrutura: "temporal_topografico",
    route: "/consulta/transtorno_psicótico_breve",
    folder: "02-espectro-esquizofrenia-psicoticos",
  },
  {
    id: "transtorno_psicótico_induzido_por_substância_medicamento",
    nome: "TRANSTORNO PSICÓTICO INDUZIDO POR SUBSTÂNCIA/MEDICAMENTO",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "02",
    capituloNome: "Espectro da Esquizofrenia e Outros Transtornos Psicoticos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/transtorno_psicótico_induzido_por_substância_medicamento",
    folder: "02-espectro-esquizofrenia-psicoticos",
  },
  {
    id: "transtorno_psicótico_devido_a_outra_condição_médica",
    nome: "TRANSTORNO PSICÓTICO DEVIDO A OUTRA CONDIÇÃO MÉDICA",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "02",
    capituloNome: "Espectro da Esquizofrenia e Outros Transtornos Psicoticos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/transtorno_psicótico_devido_a_outra_condição_médica",
    folder: "02-espectro-esquizofrenia-psicoticos",
  },
  {
    id: "catatonia_transtorno_catatônico",
    nome: "CATATONIA / TRANSTORNO CATATÔNICO",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "02",
    capituloNome: "Espectro da Esquizofrenia e Outros Transtornos Psicoticos",
    categoria: "SHORT",
    estrutura: "qualitativo_descritivo",
    route: "/consulta/catatonia_transtorno_catatônico",
    folder: "02-espectro-esquizofrenia-psicoticos",
  },
  {
    id: "transtorno_bipolar_tipo_i",
    nome: "TRANSTORNO BIPOLAR TIPO I",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "03",
    capituloNome: "Transtorno Bipolar e Transtornos Relacionados",
    categoria: "FULL",
    estrutura: "episodico_com_sintomas",
    route: "/consulta/transtorno_bipolar_tipo_i",
    folder: "03-bipolar-relacionados",
  },
  {
    id: "transtorno_bipolar_tipo_ii",
    nome: "TRANSTORNO BIPOLAR TIPO II",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "03",
    capituloNome: "Transtorno Bipolar e Transtornos Relacionados",
    categoria: "FULL",
    estrutura: "episodico_com_sintomas",
    route: "/consulta/transtorno_bipolar_tipo_ii",
    folder: "03-bipolar-relacionados",
  },
  {
    id: "transtorno_ciclotimico",
    nome: "TRANSTORNO CICLOTIMICO",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "03",
    capituloNome: "Transtorno Bipolar e Transtornos Relacionados",
    categoria: "SHORT",
    estrutura: "episodico_com_sintomas",
    route: "/consulta/transtorno_ciclotimico",
    folder: "03-bipolar-relacionados",
  },
  {
    id: "transtorno_bipolar_e_relacionado_induzido_por_substancia_medicamento",
    nome: "TRANSTORNO BIPOLAR E RELACIONADO INDUZIDO POR SUBSTANCIA/MEDICAMENTO",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "03",
    capituloNome: "Transtorno Bipolar e Transtornos Relacionados",
    categoria: "SHORT",
    estrutura: "episodico_com_sintomas",
    route: "/consulta/transtorno_bipolar_e_relacionado_induzido_por_substancia_medicamento",
    folder: "03-bipolar-relacionados",
  },
  {
    id: "transtorno_bipolar_e_relacionado_devido_a_outra_condicao_medica",
    nome: "TRANSTORNO BIPOLAR E RELACIONADO DEVIDO A OUTRA CONDICAO MEDICA",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "03",
    capituloNome: "Transtorno Bipolar e Transtornos Relacionados",
    categoria: "SHORT",
    estrutura: "episodico_com_sintomas",
    route: "/consulta/transtorno_bipolar_e_relacionado_devido_a_outra_condicao_medica",
    folder: "03-bipolar-relacionados",
  },
  {
    id: "transtorno_disruptivo_da_desregulação_do_humor_tddc",
    nome: "Transtorno DISRUPTIVO DA DESREGULAÇÃO DO HUMOR (TDDC)",
    sigla: "TDDC",
    dsm5: "",
    cid10: "",
    capituloId: "04",
    capituloNome: "Transtornos Depressivos",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_disruptivo_da_desregulação_do_humor_tddc",
    folder: "04-depressivos",
  },
  {
    id: "transtorno_depressivo_maior_tdm",
    nome: "Transtorno DEPRESSIVO MAIOR (TDM)",
    sigla: "TDM",
    dsm5: "",
    cid10: "",
    capituloId: "04",
    capituloNome: "Transtornos Depressivos",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_depressivo_maior_tdm",
    folder: "04-depressivos",
  },
  {
    id: "transtorno_depressivo_persistente_distimia",
    nome: "Transtorno DEPRESSIVO PERSISTENTE (DISTIMIA)",
    sigla: "DISTIMIA",
    dsm5: "",
    cid10: "",
    capituloId: "04",
    capituloNome: "Transtornos Depressivos",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_depressivo_persistente_distimia",
    folder: "04-depressivos",
  },
  {
    id: "transtorno_disfórico_pré_menstrual_tdpm",
    nome: "Transtorno DISFÓRICO PRÉ-MENSTRUAL (TDPM)",
    sigla: "TDPM",
    dsm5: "",
    cid10: "",
    capituloId: "04",
    capituloNome: "Transtornos Depressivos",
    categoria: "FULL",
    estrutura: "polythetic_clusters_assimetricos",
    route: "/consulta/transtorno_disfórico_pré_menstrual_tdpm",
    folder: "04-depressivos",
  },
  {
    id: "transtorno_depressivo_induzido_por_substância_medicamento",
    nome: "Transtorno DEPRESSIVO INDUZIDO POR SUBSTÂNCIA/MEDICAMENTO",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "04",
    capituloNome: "Transtornos Depressivos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/transtorno_depressivo_induzido_por_substância_medicamento",
    folder: "04-depressivos",
  },
  {
    id: "transtorno_depressivo_devido_a_outra_condição_médica",
    nome: "Transtorno DEPRESSIVO DEVIDO A OUTRA CONDIÇÃO MÉDICA",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "04",
    capituloNome: "Transtornos Depressivos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/transtorno_depressivo_devido_a_outra_condição_médica",
    folder: "04-depressivos",
  },
  {
    id: "ansiedade_generalizada_tag",
    nome: "Transtorno de Ansiedade Generalizada (TAG)",
    sigla: "TAG",
    dsm5: "",
    cid10: "",
    capituloId: "05",
    capituloNome: "Transtornos de Ansiedade",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/ansiedade_generalizada_tag",
    folder: "05-ansiedade",
  },
  {
    id: "panico",
    nome: "Transtorno de Panico",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "05",
    capituloNome: "Transtornos de Ansiedade",
    categoria: "FULL",
    estrutura: "episodico_com_sintomas",
    route: "/consulta/panico",
    folder: "05-ansiedade",
  },
  {
    id: "agorafobia",
    nome: "Agorafobia",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "05",
    capituloNome: "Transtornos de Ansiedade",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/agorafobia",
    folder: "05-ansiedade",
  },
  {
    id: "ansiedade_social_fobia_social",
    nome: "Transtorno de Ansiedade Social (Fobia Social)",
    sigla: "Fobia Social",
    dsm5: "",
    cid10: "",
    capituloId: "05",
    capituloNome: "Transtornos de Ansiedade",
    categoria: "FULL",
    estrutura: "monothetic_tripartite",
    route: "/consulta/ansiedade_social_fobia_social",
    folder: "05-ansiedade",
  },
  {
    id: "ansiedade_de_separacao",
    nome: "Transtorno de Ansiedade de Separacao",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "05",
    capituloNome: "Transtornos de Ansiedade",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/ansiedade_de_separacao",
    folder: "05-ansiedade",
  },
  {
    id: "fobia_especifica",
    nome: "Fobia Especifica",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "05",
    capituloNome: "Transtornos de Ansiedade",
    categoria: "SHORT",
    estrutura: "monothetic_tripartite",
    route: "/consulta/fobia_especifica",
    folder: "05-ansiedade",
  },
  {
    id: "mutismo_seletivo",
    nome: "Mutismo Seletivo",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "05",
    capituloNome: "Transtornos de Ansiedade",
    categoria: "SHORT",
    estrutura: "monothetic_puro",
    route: "/consulta/mutismo_seletivo",
    folder: "05-ansiedade",
  },
  {
    id: "ansiedade_induzido_por_substancia_medicamento",
    nome: "Transtorno de Ansiedade Induzido por Substancia/Medicamento",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "05",
    capituloNome: "Transtornos de Ansiedade",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/ansiedade_induzido_por_substancia_medicamento",
    folder: "05-ansiedade",
  },
  {
    id: "ansiedade_devido_a_outra_condicao_medica",
    nome: "Transtorno de Ansiedade Devido a Outra Condicao Medica",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "05",
    capituloNome: "Transtornos de Ansiedade",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/ansiedade_devido_a_outra_condicao_medica",
    folder: "05-ansiedade",
  },
  {
    id: "transtorno_obsessivo_compulsivo_toc",
    nome: "TRANSTORNO OBSESSIVO-COMPULSIVO / TOC",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "06",
    capituloNome: "Transtorno Obsessivo-Compulsivo e Transtornos Relacionados",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_obsessivo_compulsivo_toc",
    folder: "06-obsessivo-compulsivo",
  },
  {
    id: "transtorno_dismorfico_corporal_bdd",
    nome: "TRANSTORNO DISMORFICO CORPORAL / BDD",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "06",
    capituloNome: "Transtorno Obsessivo-Compulsivo e Transtornos Relacionados",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_dismorfico_corporal_bdd",
    folder: "06-obsessivo-compulsivo",
  },
  {
    id: "acumulacao_hoarding",
    nome: "TRANSTORNO DE ACUMULACAO / HOARDING",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "06",
    capituloNome: "Transtorno Obsessivo-Compulsivo e Transtornos Relacionados",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/acumulacao_hoarding",
    folder: "06-obsessivo-compulsivo",
  },
  {
    id: "tricotilomania_arrancar_o_cabelo",
    nome: "TRICOTILOMANIA / TRANSTORNO DE ARRANCAR O CABELO",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "06",
    capituloNome: "Transtorno Obsessivo-Compulsivo e Transtornos Relacionados",
    categoria: "SHORT",
    estrutura: "polythetic_monocluster",
    route: "/consulta/tricotilomania_arrancar_o_cabelo",
    folder: "06-obsessivo-compulsivo",
  },
  {
    id: "escoriacao_skin_picking",
    nome: "TRANSTORNO DE ESCORIACAO / SKIN-PICKING",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "06",
    capituloNome: "Transtorno Obsessivo-Compulsivo e Transtornos Relacionados",
    categoria: "SHORT",
    estrutura: "polythetic_monocluster",
    route: "/consulta/escoriacao_skin_picking",
    folder: "06-obsessivo-compulsivo",
  },
  {
    id: "toc_e_relacionado_induzido_por_substancia_medicamento",
    nome: "TOC E RELACIONADO INDUZIDO POR SUBSTANCIA/MEDICAMENTO",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "06",
    capituloNome: "Transtorno Obsessivo-Compulsivo e Transtornos Relacionados",
    categoria: "SHORT",
    estrutura: "polythetic_monocluster",
    route: "/consulta/toc_e_relacionado_induzido_por_substancia_medicamento",
    folder: "06-obsessivo-compulsivo",
  },
  {
    id: "toc_e_relacionado_devido_a_outra_condicao_medica",
    nome: "TOC E RELACIONADO DEVIDO A OUTRA CONDICAO MEDICA",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "06",
    capituloNome: "Transtorno Obsessivo-Compulsivo e Transtornos Relacionados",
    categoria: "SHORT",
    estrutura: "polythetic_monocluster",
    route: "/consulta/toc_e_relacionado_devido_a_outra_condicao_medica",
    folder: "06-obsessivo-compulsivo",
  },
  {
    id: "estresse_pos_traumatico_tept_30981_f4310",
    nome: "TRANSTORNO DE ESTRESSE POS-TRAUMATICO (TEPT) - 309.81 (F43.10)",
    sigla: "F43.10",
    dsm5: "",
    cid10: "",
    capituloId: "07",
    capituloNome: "Transtornos Relacionados a Trauma e Estressores",
    categoria: "FULL",
    estrutura: "polythetic_clusters_assimetricos",
    route: "/consulta/estresse_pos_traumatico_tept_30981_f4310",
    folder: "07-trauma-estressores",
  },
  {
    id: "estresse_agudo_3083_f430",
    nome: "TRANSTORNO DE ESTRESSE AGUDO - 308.3 (F43.0)",
    sigla: "F43.0",
    dsm5: "",
    cid10: "",
    capituloId: "07",
    capituloNome: "Transtornos Relacionados a Trauma e Estressores",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/estresse_agudo_3083_f430",
    folder: "07-trauma-estressores",
  },
  {
    id: "ajustamento_varios_codigos_f432x",
    nome: "TRANSTORNO DE AJUSTAMENTO - Varios codigos (F43.2x)",
    sigla: "F43.2x",
    dsm5: "",
    cid10: "",
    capituloId: "07",
    capituloNome: "Transtornos Relacionados a Trauma e Estressores",
    categoria: "FULL",
    estrutura: "etiologico_externo",
    route: "/consulta/ajustamento_varios_codigos_f432x",
    folder: "07-trauma-estressores",
  },
  {
    id: "apego_reativo_31389_f941",
    nome: "TRANSTORNO DE APEGO REATIVO - 313.89 (F94.1)",
    sigla: "F94.1",
    dsm5: "",
    cid10: "",
    capituloId: "07",
    capituloNome: "Transtornos Relacionados a Trauma e Estressores",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/apego_reativo_31389_f941",
    folder: "07-trauma-estressores",
  },
  {
    id: "interacao_social_desinibida_31389_f942",
    nome: "TRANSTORNO DE INTERACAO SOCIAL DESINIBIDA - 313.89 (F94.2)",
    sigla: "F94.2",
    dsm5: "",
    cid10: "",
    capituloId: "07",
    capituloNome: "Transtornos Relacionados a Trauma e Estressores",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/interacao_social_desinibida_31389_f942",
    folder: "07-trauma-estressores",
  },
  {
    id: "transtorno_dissociativo_identidade",
    nome: "Transtorno Dissociativo de Identidade",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "08",
    capituloNome: "Transtornos Dissociativos",
    categoria: "FULL",
    estrutura: "polythetic_com_ancora",
    route: "/consulta/transtorno_dissociativo_identidade",
    folder: "08-dissociativos",
  },
  {
    id: "transtorno_despersonalizacao_desrealizacao",
    nome: "Transtorno de Despersonalizacao/Desrealizacao",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "08",
    capituloNome: "Transtornos Dissociativos",
    categoria: "FULL",
    estrutura: "monothetic_tripartite",
    route: "/consulta/transtorno_despersonalizacao_desrealizacao",
    folder: "08-dissociativos",
  },
  {
    id: "amnesia_dissociativa",
    nome: "Amnesia Dissociativa",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "08",
    capituloNome: "Transtornos Dissociativos",
    categoria: "FULL",
    estrutura: "monothetic_tripartite",
    route: "/consulta/amnesia_dissociativa",
    folder: "08-dissociativos",
  },
  {
    id: "dissociativos_induzidos_substancia_condicao_medica",
    nome: "Transtornos Dissociativos Induzidos por Substancia ou Condicao Medica",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "08",
    capituloNome: "Transtornos Dissociativos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/dissociativos_induzidos_substancia_condicao_medica",
    folder: "08-dissociativos",
  },
  {
    id: "transtorno_sintomas_somaticos",
    nome: "Transtorno de Sintomas Somaticos",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "09",
    capituloNome: "Transtornos de Sintomas Somaticos e Relacionados",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_sintomas_somaticos",
    folder: "09-sintomas-somaticos",
  },
  {
    id: "transtorno_ansiedade_doenca",
    nome: "Transtorno de Ansiedade de Doenca",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "09",
    capituloNome: "Transtornos de Sintomas Somaticos e Relacionados",
    categoria: "FULL",
    estrutura: "monothetic_tripartite",
    route: "/consulta/transtorno_ansiedade_doenca",
    folder: "09-sintomas-somaticos",
  },
  {
    id: "transtorno_conversivo",
    nome: "Transtorno Conversivo (Transtorno de Sintomas Neurologicos Funcionais)",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "09",
    capituloNome: "Transtornos de Sintomas Somaticos e Relacionados",
    categoria: "FULL",
    estrutura: "qualitativo_descritivo",
    route: "/consulta/transtorno_conversivo",
    folder: "09-sintomas-somaticos",
  },
  {
    id: "transtorno_facticio_autoimposto",
    nome: "Transtorno Facticio Autoimposto",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "09",
    capituloNome: "Transtornos de Sintomas Somaticos e Relacionados",
    categoria: "FULL",
    estrutura: "monothetic_tripartite",
    route: "/consulta/transtorno_facticio_autoimposto",
    folder: "09-sintomas-somaticos",
  },
  {
    id: "transtorno_facticio_imposto_outro",
    nome: "Transtorno Facticio Imposto a Outro (Munchausen by Proxy)",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "09",
    capituloNome: "Transtornos de Sintomas Somaticos e Relacionados",
    categoria: "FULL",
    estrutura: "monothetic_tripartite",
    route: "/consulta/transtorno_facticio_imposto_outro",
    folder: "09-sintomas-somaticos",
  },
  {
    id: "fatores_psicologicos_afetam_condicoes_medicas",
    nome: "Fatores Psicologicos que Afetam Outras Condicoes Medicas",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "09",
    capituloNome: "Transtornos de Sintomas Somaticos e Relacionados",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/fatores_psicologicos_afetam_condicoes_medicas",
    folder: "09-sintomas-somaticos",
  },
  {
    id: "anorexia_nervosa",
    nome: "Anorexia Nervosa",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "10",
    capituloNome: "Transtornos Alimentares",
    categoria: "FULL",
    estrutura: "monothetic_tripartite",
    route: "/consulta/anorexia_nervosa",
    folder: "10-alimentares",
  },
  {
    id: "bulimia_nervosa",
    nome: "Bulimia Nervosa",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "10",
    capituloNome: "Transtornos Alimentares",
    categoria: "FULL",
    estrutura: "monothetic_tripartite",
    route: "/consulta/bulimia_nervosa",
    folder: "10-alimentares",
  },
  {
    id: "transtorno_compulsao_alimentar",
    nome: "Transtorno de Compulsao Alimentar (TCA)",
    sigla: "TCA",
    dsm5: "",
    cid10: "",
    capituloId: "10",
    capituloNome: "Transtornos Alimentares",
    categoria: "FULL",
    estrutura: "monothetic_tripartite",
    route: "/consulta/transtorno_compulsao_alimentar",
    folder: "10-alimentares",
  },
  {
    id: "transtorno_alimentar_restritivo_evitativo",
    nome: "Transtorno Alimentar Restritivo/Evitativo (ARFID)",
    sigla: "ARFID",
    dsm5: "",
    cid10: "",
    capituloId: "10",
    capituloNome: "Transtornos Alimentares",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_alimentar_restritivo_evitativo",
    folder: "10-alimentares",
  },
  {
    id: "pica",
    nome: "Pica",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "10",
    capituloNome: "Transtornos Alimentares",
    categoria: "SHORT",
    estrutura: "qualitativo_descritivo",
    route: "/consulta/pica",
    folder: "10-alimentares",
  },
  {
    id: "transtorno_de_rumincao",
    nome: "Transtorno de Ruminacao",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "10",
    capituloNome: "Transtornos Alimentares",
    categoria: "SHORT",
    estrutura: "qualitativo_descritivo",
    route: "/consulta/transtorno_de_rumincao",
    folder: "10-alimentares",
  },
  {
    id: "enurese",
    nome: "Enurese",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "11",
    capituloNome: "Transtornos da Eliminacao",
    categoria: "SHORT",
    estrutura: "temporal_topografico",
    route: "/consulta/enurese",
    folder: "11-eliminacao",
  },
  {
    id: "encoprese",
    nome: "Encoprese",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "11",
    capituloNome: "Transtornos da Eliminacao",
    categoria: "SHORT",
    estrutura: "temporal_topografico",
    route: "/consulta/encoprese",
    folder: "11-eliminacao",
  },
  {
    id: "eliminacao_induzida_substancia_condicao_medica",
    nome: "Transtornos da Eliminacao Induzidos por Substancia ou Condicao Medica",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "11",
    capituloNome: "Transtornos da Eliminacao",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/eliminacao_induzida_substancia_condicao_medica",
    folder: "11-eliminacao",
  },
  {
    id: "transtorno_de_insonia",
    nome: "Transtorno de Insonia",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "12",
    capituloNome: "Transtornos do Sono-Vigilia",
    categoria: "FULL",
    estrutura: "monothetic_tripartite",
    route: "/consulta/transtorno_de_insonia",
    folder: "12-sono-vigilia",
  },
  {
    id: "transtorno_de_hipersonolencia",
    nome: "Transtorno de Hipersonolencia",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "12",
    capituloNome: "Transtornos do Sono-Vigilia",
    categoria: "FULL",
    estrutura: "monothetic_tripartite",
    route: "/consulta/transtorno_de_hipersonolencia",
    folder: "12-sono-vigilia",
  },
  {
    id: "narcolepsia",
    nome: "Narcolepsia",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "12",
    capituloNome: "Transtornos do Sono-Vigilia",
    categoria: "FULL",
    estrutura: "polythetic_com_ancora",
    route: "/consulta/narcolepsia",
    folder: "12-sono-vigilia",
  },
  {
    id: "apneia_hipopneia_obstrutiva_sono",
    nome: "Apneia e Hipopneia Obstrutivas do Sono",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "12",
    capituloNome: "Transtornos do Sono-Vigilia",
    categoria: "FULL",
    estrutura: "etiologico_externo",
    route: "/consulta/apneia_hipopneia_obstrutiva_sono",
    folder: "12-sono-vigilia",
  },
  {
    id: "transtorno_comportamental_sono_rem",
    nome: "Transtorno Comportamental do Sono REM",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "12",
    capituloNome: "Transtornos do Sono-Vigilia",
    categoria: "FULL",
    estrutura: "qualitativo_descritivo",
    route: "/consulta/transtorno_comportamental_sono_rem",
    folder: "12-sono-vigilia",
  },
  {
    id: "sindrome_pernas_inquietas",
    nome: "Sindrome das Pernas Inquietas",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "12",
    capituloNome: "Transtornos do Sono-Vigilia",
    categoria: "FULL",
    estrutura: "qualitativo_descritivo",
    route: "/consulta/sindrome_pernas_inquietas",
    folder: "12-sono-vigilia",
  },
  {
    id: "transtorno_sono_vigilia_ritmo_circadiano",
    nome: "Transtorno do Sono-Vigilia do Ritmo Circadiano",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "12",
    capituloNome: "Transtornos do Sono-Vigilia",
    categoria: "SHORT",
    estrutura: "temporal_topografico",
    route: "/consulta/transtorno_sono_vigilia_ritmo_circadiano",
    folder: "12-sono-vigilia",
  },
  {
    id: "transtornos_despertar_sono_nao_rem",
    nome: "Transtornos de Despertar do Sono Nao REM (Sonambulismo/Terrores)",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "12",
    capituloNome: "Transtornos do Sono-Vigilia",
    categoria: "SHORT",
    estrutura: "qualitativo_descritivo",
    route: "/consulta/transtornos_despertar_sono_nao_rem",
    folder: "12-sono-vigilia",
  },
  {
    id: "transtorno_do_pesadelo",
    nome: "Transtorno do Pesadelo",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "12",
    capituloNome: "Transtornos do Sono-Vigilia",
    categoria: "SHORT",
    estrutura: "qualitativo_descritivo",
    route: "/consulta/transtorno_do_pesadelo",
    folder: "12-sono-vigilia",
  },
  {
    id: "apneia_central_sono",
    nome: "Apneia Central do Sono",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "12",
    capituloNome: "Transtornos do Sono-Vigilia",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/apneia_central_sono",
    folder: "12-sono-vigilia",
  },
  {
    id: "hipoventilacao_relacionada_sono",
    nome: "Hipoventilacao Relacionada ao Sono",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "12",
    capituloNome: "Transtornos do Sono-Vigilia",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/hipoventilacao_relacionada_sono",
    folder: "12-sono-vigilia",
  },
  {
    id: "transtorno_sono_induzido_substancia",
    nome: "Transtorno do Sono Induzido por Substancia/Medicamento",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "12",
    capituloNome: "Transtornos do Sono-Vigilia",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/transtorno_sono_induzido_substancia",
    folder: "12-sono-vigilia",
  },
  {
    id: "transtorno_desejo_sexual_hipoativo_masculino",
    nome: "Transtorno do Desejo Sexual Hipoativo (Masculino)",
    sigla: "Masculino",
    dsm5: "",
    cid10: "",
    capituloId: "13",
    capituloNome: "Disfuncoes Sexuais",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_desejo_sexual_hipoativo_masculino",
    folder: "13-disfuncoes-sexuais",
  },
  {
    id: "transtorno_interesse_excitacao_sexual_feminino",
    nome: "Transtorno do Interesse/Excitacao Sexual Feminino",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "13",
    capituloNome: "Disfuncoes Sexuais",
    categoria: "FULL",
    estrutura: "polythetic_clusters_assimetricos",
    route: "/consulta/transtorno_interesse_excitacao_sexual_feminino",
    folder: "13-disfuncoes-sexuais",
  },
  {
    id: "disfuncao_eretil",
    nome: "Disfuncao Eretil",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "13",
    capituloNome: "Disfuncoes Sexuais",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/disfuncao_eretil",
    folder: "13-disfuncoes-sexuais",
  },
  {
    id: "transtorno_orgasmo_feminino",
    nome: "Transtorno do Orgasmo Feminino",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "13",
    capituloNome: "Disfuncoes Sexuais",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_orgasmo_feminino",
    folder: "13-disfuncoes-sexuais",
  },
  {
    id: "ejaculacao_precoce",
    nome: "Ejaculacao Precoce",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "13",
    capituloNome: "Disfuncoes Sexuais",
    categoria: "FULL",
    estrutura: "temporal_topografico",
    route: "/consulta/ejaculacao_precoce",
    folder: "13-disfuncoes-sexuais",
  },
  {
    id: "ejaculacao_retardada",
    nome: "Ejaculacao Retardada (Transtorno Orgasmico Masculino)",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "13",
    capituloNome: "Disfuncoes Sexuais",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/ejaculacao_retardada",
    folder: "13-disfuncoes-sexuais",
  },
  {
    id: "transtorno_dor_genito_pelvica_penetracao",
    nome: "Transtorno da Dor Genito-pelvica/Penetracao",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "13",
    capituloNome: "Disfuncoes Sexuais",
    categoria: "FULL",
    estrutura: "polythetic_clusters_assimetricos",
    route: "/consulta/transtorno_dor_genito_pelvica_penetracao",
    folder: "13-disfuncoes-sexuais",
  },
  {
    id: "disfuncao_sexual_induzida_substancia",
    nome: "Disfuncao Sexual Induzida por Substancia/Medicamento",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "13",
    capituloNome: "Disfuncoes Sexuais",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/disfuncao_sexual_induzida_substancia",
    folder: "13-disfuncoes-sexuais",
  },
  {
    id: "disforia_genero_criancas",
    nome: "Disforia de Genero em Criancas",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "14",
    capituloNome: "Disforia de Genero",
    categoria: "FULL",
    estrutura: "polythetic_com_ancora",
    route: "/consulta/disforia_genero_criancas",
    folder: "14-disforia-genero",
  },
  {
    id: "disforia_genero_adolescentes_adultos",
    nome: "Disforia de Genero em Adolescentes e Adultos",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "14",
    capituloNome: "Disforia de Genero",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/disforia_genero_adolescentes_adultos",
    folder: "14-disforia-genero",
  },
  {
    id: "disforia_genero_criterios_parcialmente_preenchidos",
    nome: "Disforia de Genero - Apresentacao com Criterios Parcialmente Preenchidos",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "14",
    capituloNome: "Disforia de Genero",
    categoria: "SHORT",
    estrutura: "qualitativo_descritivo",
    route: "/consulta/disforia_genero_criterios_parcialmente_preenchidos",
    folder: "14-disforia-genero",
  },
  {
    id: "transtorno_oposicao_desafiante",
    nome: "Transtorno de Oposicao Desafiante",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "15",
    capituloNome: "Transtornos Disruptivos, do Controle de Impulsos e da Conduta",
    categoria: "FULL",
    estrutura: "polythetic_clusters_assimetricos",
    route: "/consulta/transtorno_oposicao_desafiante",
    folder: "15-disruptivos-impulsos-conduta",
  },
  {
    id: "transtorno_explosivo_intermittente",
    nome: "Transtorno Explosivo Intermitente",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "15",
    capituloNome: "Transtornos Disruptivos, do Controle de Impulsos e da Conduta",
    categoria: "FULL",
    estrutura: "polythetic_com_ancora",
    route: "/consulta/transtorno_explosivo_intermittente",
    folder: "15-disruptivos-impulsos-conduta",
  },
  {
    id: "transtorno_da_conduta",
    nome: "Transtorno da Conduta",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "15",
    capituloNome: "Transtornos Disruptivos, do Controle de Impulsos e da Conduta",
    categoria: "FULL",
    estrutura: "polythetic_clusters_assimetricos",
    route: "/consulta/transtorno_da_conduta",
    folder: "15-disruptivos-impulsos-conduta",
  },
  {
    id: "piromania",
    nome: "Piromania",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "15",
    capituloNome: "Transtornos Disruptivos, do Controle de Impulsos e da Conduta",
    categoria: "SHORT",
    estrutura: "monothetic_puro",
    route: "/consulta/piromania",
    folder: "15-disruptivos-impulsos-conduta",
  },
  {
    id: "cleptomania",
    nome: "Cleptomania",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "15",
    capituloNome: "Transtornos Disruptivos, do Controle de Impulsos e da Conduta",
    categoria: "SHORT",
    estrutura: "monothetic_puro",
    route: "/consulta/cleptomania",
    folder: "15-disruptivos-impulsos-conduta",
  },
  {
    id: "transtorno_por_uso_de_alcool",
    nome: "Transtorno por Uso de Alcool",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_por_uso_de_alcool",
    folder: "16-substancias-aditivos",
  },
  {
    id: "intoxicacao_por_alcool",
    nome: "Intoxicacao por Alcool",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/intoxicacao_por_alcool",
    folder: "16-substancias-aditivos",
  },
  {
    id: "abstinencia_de_alcool",
    nome: "Abstinencia de Alcool",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/abstinencia_de_alcool",
    folder: "16-substancias-aditivos",
  },
  {
    id: "transtorno_por_uso_de_cannabis",
    nome: "Transtorno por Uso de Cannabis",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_por_uso_de_cannabis",
    folder: "16-substancias-aditivos",
  },
  {
    id: "intoxicacao_por_cannabis",
    nome: "Intoxicacao por Cannabis",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/intoxicacao_por_cannabis",
    folder: "16-substancias-aditivos",
  },
  {
    id: "abstinencia_de_cannabis",
    nome: "Abstinencia de Cannabis",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/abstinencia_de_cannabis",
    folder: "16-substancias-aditivos",
  },
  {
    id: "transtorno_por_uso_de_opioides",
    nome: "Transtorno por Uso de Opioides",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_por_uso_de_opioides",
    folder: "16-substancias-aditivos",
  },
  {
    id: "intoxicacao_por_opioides",
    nome: "Intoxicacao por Opioides",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/intoxicacao_por_opioides",
    folder: "16-substancias-aditivos",
  },
  {
    id: "abstinencia_de_opioides",
    nome: "Abstinencia de Opioides",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/abstinencia_de_opioides",
    folder: "16-substancias-aditivos",
  },
  {
    id: "transtorno_por_uso_de_estimulantes",
    nome: "Transtorno por Uso de Estimulantes",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_por_uso_de_estimulantes",
    folder: "16-substancias-aditivos",
  },
  {
    id: "intoxicacao_por_estimulantes",
    nome: "Intoxicacao por Estimulantes",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/intoxicacao_por_estimulantes",
    folder: "16-substancias-aditivos",
  },
  {
    id: "abstinencia_de_estimulantes",
    nome: "Abstinencia de Estimulantes",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/abstinencia_de_estimulantes",
    folder: "16-substancias-aditivos",
  },
  {
    id: "transtorno_por_uso_de_tabaco",
    nome: "Transtorno por Uso de Tabaco",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_por_uso_de_tabaco",
    folder: "16-substancias-aditivos",
  },
  {
    id: "abstinencia_de_tabaco",
    nome: "Abstinencia de Tabaco",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/abstinencia_de_tabaco",
    folder: "16-substancias-aditivos",
  },
  {
    id: "transtorno_do_jogo",
    nome: "Transtorno do Jogo",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_do_jogo",
    folder: "16-substancias-aditivos",
  },
  {
    id: "transtorno_por_uso_de_sedativos_hipnoticos_ansioliticos",
    nome: "Transtorno por Uso de Sedativos, Hipnoticos ou Ansioliticos",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "SHORT",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_por_uso_de_sedativos_hipnoticos_ansioliticos",
    folder: "16-substancias-aditivos",
  },
  {
    id: "intoxicacao_por_sedativos_hipnoticos_ansioliticos",
    nome: "Intoxicacao por Sedativos, Hipnoticos ou Ansioliticos",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/intoxicacao_por_sedativos_hipnoticos_ansioliticos",
    folder: "16-substancias-aditivos",
  },
  {
    id: "abstinencia_de_sedativos_hipnoticos_ansioliticos",
    nome: "Abstinencia de Sedativos, Hipnoticos ou Ansioliticos",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/abstinencia_de_sedativos_hipnoticos_ansioliticos",
    folder: "16-substancias-aditivos",
  },
  {
    id: "intoxicacao_por_cafeina",
    nome: "Intoxicacao por Cafeina",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/intoxicacao_por_cafeina",
    folder: "16-substancias-aditivos",
  },
  {
    id: "abstinencia_de_cafeina",
    nome: "Abstinencia de Cafeina",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/abstinencia_de_cafeina",
    folder: "16-substancias-aditivos",
  },
  {
    id: "transtorno_por_uso_de_fenciclidina",
    nome: "Transtorno por Uso de Fenciclidina",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "SHORT",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_por_uso_de_fenciclidina",
    folder: "16-substancias-aditivos",
  },
  {
    id: "intoxicacao_por_fenciclidina",
    nome: "Intoxicacao por Fenciclidina",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/intoxicacao_por_fenciclidina",
    folder: "16-substancias-aditivos",
  },
  {
    id: "transtorno_por_uso_de_outros_alucinogenos",
    nome: "Transtorno por Uso de Outros Alucinogenos",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "SHORT",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_por_uso_de_outros_alucinogenos",
    folder: "16-substancias-aditivos",
  },
  {
    id: "intoxicacao_por_outros_alucinogenos",
    nome: "Intoxicacao por Outros Alucinogenos",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/intoxicacao_por_outros_alucinogenos",
    folder: "16-substancias-aditivos",
  },
  {
    id: "transtorno_persistente_da_percepcao_induzido_por_alucinogenos",
    nome: "Transtorno Persistente da Percepcao Induzido por Alucinogenos (flashbacks)",
    sigla: "flashbacks",
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "SHORT",
    estrutura: "temporal_topografico",
    route: "/consulta/transtorno_persistente_da_percepcao_induzido_por_alucinogenos",
    folder: "16-substancias-aditivos",
  },
  {
    id: "transtorno_por_uso_de_inalantes",
    nome: "Transtorno por Uso de Inalantes",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "SHORT",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_por_uso_de_inalantes",
    folder: "16-substancias-aditivos",
  },
  {
    id: "intoxicacao_por_inalantes",
    nome: "Intoxicacao por Inalantes",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/intoxicacao_por_inalantes",
    folder: "16-substancias-aditivos",
  },
  {
    id: "transtorno_por_uso_de_outra_substancia",
    nome: "Transtorno por Uso de Outra Substancia",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "16",
    capituloNome: "Transtornos Relacionados a Substancias e Transtornos Aditivos",
    categoria: "SHORT",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_por_uso_de_outra_substancia",
    folder: "16-substancias-aditivos",
  },
  {
    id: "delirium",
    nome: "Delirium",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "17",
    capituloNome: "Transtornos Neurocognitivos",
    categoria: "FULL",
    estrutura: "etiologico_externo",
    route: "/consulta/delirium",
    folder: "17-neurocognitivos",
  },
  {
    id: "tnc_maior",
    nome: "Transtorno Neurocognitivo Maior",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "17",
    capituloNome: "Transtornos Neurocognitivos",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/tnc_maior",
    folder: "17-neurocognitivos",
  },
  {
    id: "tnc_leve",
    nome: "Transtorno Neurocognitivo Leve",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "17",
    capituloNome: "Transtornos Neurocognitivos",
    categoria: "SHORT",
    estrutura: "polythetic_monocluster",
    route: "/consulta/tnc_leve",
    folder: "17-neurocognitivos",
  },
  {
    id: "transtorno_personalidade_paranoide",
    nome: "Transtorno da Personalidade Paranoide",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "18",
    capituloNome: "Transtornos da Personalidade",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_personalidade_paranoide",
    folder: "18-personalidade",
  },
  {
    id: "transtorno_personalidade_esquizoide",
    nome: "Transtorno da Personalidade Esquizoide",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "18",
    capituloNome: "Transtornos da Personalidade",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_personalidade_esquizoide",
    folder: "18-personalidade",
  },
  {
    id: "transtorno_personalidade_esquizotipica",
    nome: "Transtorno da Personalidade Esquizotipica",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "18",
    capituloNome: "Transtornos da Personalidade",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_personalidade_esquizotipica",
    folder: "18-personalidade",
  },
  {
    id: "transtorno_personalidade_antissocial",
    nome: "Transtorno da Personalidade Antissocial",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "18",
    capituloNome: "Transtornos da Personalidade",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_personalidade_antissocial",
    folder: "18-personalidade",
  },
  {
    id: "transtorno_personalidade_borderline",
    nome: "Transtorno da Personalidade Borderline",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "18",
    capituloNome: "Transtornos da Personalidade",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_personalidade_borderline",
    folder: "18-personalidade",
  },
  {
    id: "transtorno_personalidade_histrionica",
    nome: "Transtorno da Personalidade Histrionica",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "18",
    capituloNome: "Transtornos da Personalidade",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_personalidade_histrionica",
    folder: "18-personalidade",
  },
  {
    id: "transtorno_personalidade_narcisista",
    nome: "Transtorno da Personalidade Narcisista",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "18",
    capituloNome: "Transtornos da Personalidade",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_personalidade_narcisista",
    folder: "18-personalidade",
  },
  {
    id: "transtorno_personalidade_evitativa",
    nome: "Transtorno da Personalidade Evitativa",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "18",
    capituloNome: "Transtornos da Personalidade",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_personalidade_evitativa",
    folder: "18-personalidade",
  },
  {
    id: "transtorno_personalidade_dependente",
    nome: "Transtorno da Personalidade Dependente",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "18",
    capituloNome: "Transtornos da Personalidade",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_personalidade_dependente",
    folder: "18-personalidade",
  },
  {
    id: "transtorno_personalidade_obsessivo_compulsiva",
    nome: "Transtorno da Personalidade Obsessivo-Compulsiva",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "18",
    capituloNome: "Transtornos da Personalidade",
    categoria: "FULL",
    estrutura: "polythetic_monocluster",
    route: "/consulta/transtorno_personalidade_obsessivo_compulsiva",
    folder: "18-personalidade",
  },
  {
    id: "mudanca_personalidade_condicao_medica",
    nome: "Mudanca de Personalidade Devido a Outra Condicao Medica",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "18",
    capituloNome: "Transtornos da Personalidade",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/mudanca_personalidade_condicao_medica",
    folder: "18-personalidade",
  },
  {
    id: "transtorno_pedofilico",
    nome: "Transtorno Pedofilico",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "19",
    capituloNome: "Transtornos Parafilicos",
    categoria: "FULL",
    estrutura: "qualitativo_descritivo",
    route: "/consulta/transtorno_pedofilico",
    folder: "19-parafilicos",
  },
  {
    id: "transtorno_voyeurista",
    nome: "Transtorno Voyeurista",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "19",
    capituloNome: "Transtornos Parafilicos",
    categoria: "SHORT",
    estrutura: "qualitativo_descritivo",
    route: "/consulta/transtorno_voyeurista",
    folder: "19-parafilicos",
  },
  {
    id: "transtorno_exibicionista",
    nome: "Transtorno Exibicionista",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "19",
    capituloNome: "Transtornos Parafilicos",
    categoria: "SHORT",
    estrutura: "qualitativo_descritivo",
    route: "/consulta/transtorno_exibicionista",
    folder: "19-parafilicos",
  },
  {
    id: "transtorno_frotteurista",
    nome: "Transtorno Frotteurista",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "19",
    capituloNome: "Transtornos Parafilicos",
    categoria: "SHORT",
    estrutura: "qualitativo_descritivo",
    route: "/consulta/transtorno_frotteurista",
    folder: "19-parafilicos",
  },
  {
    id: "transtorno_fetichista",
    nome: "Transtorno Fetichista",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "19",
    capituloNome: "Transtornos Parafilicos",
    categoria: "SHORT",
    estrutura: "qualitativo_descritivo",
    route: "/consulta/transtorno_fetichista",
    folder: "19-parafilicos",
  },
  {
    id: "transtorno_transvestico",
    nome: "Transtorno Transvestico",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "19",
    capituloNome: "Transtornos Parafilicos",
    categoria: "SHORT",
    estrutura: "qualitativo_descritivo",
    route: "/consulta/transtorno_transvestico",
    folder: "19-parafilicos",
  },
  {
    id: "transtorno_masoquismo_sexual",
    nome: "Transtorno do Masoquismo Sexual",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "19",
    capituloNome: "Transtornos Parafilicos",
    categoria: "SHORT",
    estrutura: "qualitativo_descritivo",
    route: "/consulta/transtorno_masoquismo_sexual",
    folder: "19-parafilicos",
  },
  {
    id: "transtorno_sadismo_sexual",
    nome: "Transtorno do Sadismo Sexual",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "19",
    capituloNome: "Transtornos Parafilicos",
    categoria: "SHORT",
    estrutura: "qualitativo_descritivo",
    route: "/consulta/transtorno_sadismo_sexual",
    folder: "19-parafilicos",
  },
  {
    id: "parkinsonismo_induzido_neuroleptico",
    nome: "Parkinsonismo Induzido por Neuroleptico",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "21",
    capituloNome: "Transtornos do Movimento Induzidos por Medicamentos e Outros Efeitos Adversos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/parkinsonismo_induzido_neuroleptico",
    folder: "21-movimento-medicamentos",
  },
  {
    id: "parkinsonismo_induzido_outro_medicamento",
    nome: "Parkinsonismo Induzido por Outro Medicamento",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "21",
    capituloNome: "Transtornos do Movimento Induzidos por Medicamentos e Outros Efeitos Adversos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/parkinsonismo_induzido_outro_medicamento",
    folder: "21-movimento-medicamentos",
  },
  {
    id: "sindrome_neuroleptica_maligna",
    nome: "Sindrome Neuroleptica Maligna",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "21",
    capituloNome: "Transtornos do Movimento Induzidos por Medicamentos e Outros Efeitos Adversos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/sindrome_neuroleptica_maligna",
    folder: "21-movimento-medicamentos",
  },
  {
    id: "distonia_aguda_induzida_medicamento",
    nome: "Distonia Aguda Induzida por Medicamento",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "21",
    capituloNome: "Transtornos do Movimento Induzidos por Medicamentos e Outros Efeitos Adversos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/distonia_aguda_induzida_medicamento",
    folder: "21-movimento-medicamentos",
  },
  {
    id: "acatisia_aguda_induzida_medicamento",
    nome: "Acatisia Aguda Induzida por Medicamento",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "21",
    capituloNome: "Transtornos do Movimento Induzidos por Medicamentos e Outros Efeitos Adversos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/acatisia_aguda_induzida_medicamento",
    folder: "21-movimento-medicamentos",
  },
  {
    id: "discinesia_tardia",
    nome: "Discinesia Tardia",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "21",
    capituloNome: "Transtornos do Movimento Induzidos por Medicamentos e Outros Efeitos Adversos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/discinesia_tardia",
    folder: "21-movimento-medicamentos",
  },
  {
    id: "distonia_tardia",
    nome: "Distonia Tardia",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "21",
    capituloNome: "Transtornos do Movimento Induzidos por Medicamentos e Outros Efeitos Adversos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/distonia_tardia",
    folder: "21-movimento-medicamentos",
  },
  {
    id: "acatisia_tardia",
    nome: "Acatisia Tardia",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "21",
    capituloNome: "Transtornos do Movimento Induzidos por Medicamentos e Outros Efeitos Adversos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/acatisia_tardia",
    folder: "21-movimento-medicamentos",
  },
  {
    id: "tremor_postural_induzido_medicamento",
    nome: "Tremor Postural Induzido por Medicamento",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "21",
    capituloNome: "Transtornos do Movimento Induzidos por Medicamentos e Outros Efeitos Adversos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/tremor_postural_induzido_medicamento",
    folder: "21-movimento-medicamentos",
  },
  {
    id: "sindrome_descontinuacao_antidepressivos",
    nome: "Sindrome da Descontinuacao de Antidepressivos",
    sigla: null,
    dsm5: "",
    cid10: "",
    capituloId: "21",
    capituloNome: "Transtornos do Movimento Induzidos por Medicamentos e Outros Efeitos Adversos",
    categoria: "SHORT",
    estrutura: "etiologico_externo",
    route: "/consulta/sindrome_descontinuacao_antidepressivos",
    folder: "21-movimento-medicamentos",
  },
];

export const FULL_DISEASES = RENDERABLE_DISEASES.filter(d => d.categoria === 'FULL');
export const SHORT_DISEASES = RENDERABLE_DISEASES.filter(d => d.categoria === 'SHORT');

export const TOTAL_RENDERABLE = RENDERABLE_DISEASES.length; // 160
export const TOTAL_FULL = FULL_DISEASES.length; // 79
export const TOTAL_SHORT = SHORT_DISEASES.length; // 81

export function findDiseaseById(id: string): DiseaseItem | undefined {
  return RENDERABLE_DISEASES.find(d => d.id === id);
}

export function searchDiseases(query: string): DiseaseItem[] {
  const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return RENDERABLE_DISEASES.filter(d => {
    const nome = d.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const idNorm = d.id.toLowerCase().replace(/_/g, " ");
    return nome.includes(q) || idNorm.includes(q) || (d.sigla?.toLowerCase().includes(q) ?? false);
  });
}

export interface TreeNode {
  type: 'chapter' | 'disease';
  key: string;
  label: string;
  meta?: { n: string; count: number; hue: string; };
  children?: TreeNode[];
}

export function getSidebarTree(): TreeNode[] {
  return CHAPTERS.map((ch, idx) => {
    const n = String(idx + 1).padStart(2, "0");
    return {
      type: 'chapter' as const,
      key: ch.key,
      label: `${n}. ${ch.title}`,
      meta: { n, count: ch.count, hue: ch.hue },
      children: RENDERABLE_DISEASES
        .filter(d => d.capituloId === n)
        .map(d => ({
          type: 'disease' as const,
          key: d.id,
          label: d.sigla ? `${d.sigla} — ${d.nome}` : d.nome,
        })),
    };
  });
}

export function getChapterKeyByDiseaseId(diseaseId: string): string | undefined {
  const disease = RENDERABLE_DISEASES.find(d => d.id === diseaseId);
  if (!disease) return undefined;
  
  const idx = parseInt(disease.capituloId, 10) - 1;
  const chapter = CHAPTERS[idx];
  return chapter ? chapter.key : undefined;
}
---

## src/lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

---

## src/lib/apiClient.ts
export const apiClient = {
  post: async (_url: string, _data: any) => ({ data: {} }),
  get: async (_url: string) => ({ data: {} }),
  sendContactMessage: async (_data: any) => ({ data: {} }),
};

---

## src/features/auth/auth-query.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCurrentUser,
  login,
  logout,
  register,
  type AuthSessionResponse,
  type LoginPayload,
  type RegisterPayload,
} from "@/api/auth";
import { setAccessToken } from "@/api/http";

export const authQueryKeys = {
  all: ["auth"] as const,
  me: () => [...authQueryKeys.all, "me"] as const,
};

export function useCurrentUserQuery() {
  return useQuery({
    queryKey: authQueryKeys.me(),
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LoginPayload) => login(payload),
    onSuccess: async (session: AuthSessionResponse) => {
      setAccessToken(session.token || null);
      queryClient.setQueryData(authQueryKeys.me(), session);
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.me() });
    },
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: (payload: RegisterPayload) => register(payload),
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      setAccessToken(null);
      queryClient.removeQueries({ queryKey: authQueryKeys.me() });
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.me() });
    },
    onError: async () => {
      setAccessToken(null);
      queryClient.removeQueries({ queryKey: authQueryKeys.me() });
      await queryClient.invalidateQueries({ queryKey: authQueryKeys.me() });
    },
  });
}

---

## src/features/auth/use-auth.ts
import {
  useCurrentUserQuery,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
} from "./auth-query";

export function useAuth() {
  const me = useCurrentUserQuery();
  const login = useLoginMutation();
  const register = useRegisterMutation();
  const logout = useLogoutMutation();

  return {
    user: me.data?.user ?? null,
    session: me.data ?? null,
    token: me.data?.token ?? null,
    isAuthenticated: !!me.data?.user,
    isLoading: me.isLoading,
    isFetching: me.isFetching,
    me,
    login,
    register,
    logout,
  };
}

---

## src/features/mapa-diagnostico/MapaDiagnostico.tsx
import { useMemo, useRef, useCallback, useEffect, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { useNavigate } from "@tanstack/react-router";
import { CHAPTERS } from "@/lib/dsm";
import { DISEASE_CATALOG } from "@/lib/disease-catalog";

interface GraphNode {
  id: string;
  name: string;
  group: "root" | "chapter" | "disease";
  val: number;
  color?: string;
  // properties added by force-graph
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export function MapaDiagnostico() {
  const navigate = useNavigate();
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Resize observer to keep the graph responsive
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const graphData = useMemo<GraphData>(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // Root node
    nodes.push({
      id: "root",
      name: "DSM-5-TR",
      group: "root",
      val: 20,
      color: "hsl(var(--foreground))",
    });

    CHAPTERS.forEach((chapter) => {
      // Chapter node
      nodes.push({
        id: chapter.key,
        name: chapter.title,
        group: "chapter",
        val: 10,
        color: chapter.hue,
      });

      // Link Root to Chapter
      links.push({
        source: "root",
        target: chapter.key,
      });

      // Disease nodes
      const diseases = DISEASE_CATALOG[chapter.key] || [];
      diseases.forEach((disease) => {
        nodes.push({
          id: disease.id,
          name: disease.sigla || disease.nome,
          group: "disease",
          val: 4,
          color: chapter.hue, // same color as chapter
        });

        // Link Chapter to Disease
        links.push({
          source: chapter.key,
          target: disease.id,
        });
      });
    });

    return { nodes, links };
  }, []);

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      if (!fgRef.current) return;
      
      if (node.group === "disease") {
        // Navigate to the disease assessment
        navigate({ to: `/app/assess/$assessmentId`, params: { assessmentId: node.id } });
      } else {
        // Zoom and center on the node
        fgRef.current.centerAt(node.x, node.y, 1000);
        fgRef.current.zoom(8, 2000);
      }
    },
    [navigate]
  );

  return (
    <div className="w-full h-full flex flex-col">
      <div className="px-6 py-4 border-b border-border bg-surface shrink-0">
        <h1 className="text-xl font-semibold">Mapa de Diagnósticos</h1>
        <p className="text-sm text-text-3 mt-1">Explore as categorias e transtornos do DSM-5 através de conexões visuais.</p>
      </div>
      
      <div className="flex-1 relative bg-bg overflow-hidden" ref={containerRef}>
        {dimensions.width > 0 && dimensions.height > 0 && (
          <ForceGraph2D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeLabel="name"
            nodeColor="color"
            nodeRelSize={2}
            nodeVal="val"
            linkColor={() => "rgba(150, 150, 150, 0.2)"}
            onNodeClick={handleNodeClick}
            // Increase friction slightly for stability
            d3AlphaDecay={0.05}
            d3VelocityDecay={0.4}
            // Auto-pause physics after settling to save CPU
            cooldownTicks={150}
            onEngineStop={() => {
              fgRef.current?.zoomToFit(400);
            }}
            onEngineTick={() => {
              // Ajusta a física durante o carregamento inicial
              if (fgRef.current) {
                fgRef.current.d3Force("link")?.distance(20);
                fgRef.current.d3Force("charge")?.strength(-150);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

---

## src/routes/login.tsx
import { createFileRoute } from "@tanstack/react-router";
import Login from "@/components/workspace/config/Login";
import { AuthProvider } from "@/context/AuthContext";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  // Wrap with AuthProvider since the context is now required by the new Login component.
  // Ideally AuthProvider should be at the root of the app, but this serves to isolate it for now.
  return (
    <AuthProvider>
      <Login />
    </AuthProvider>
  );
}

---

## src/routes/politica-de-privacidade.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/politica-de-privacidade')({
  component: () => <div>politica-de-privacidade route (Stub)</div>,
});

---

## src/routes/Dashboard.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/Dashboard')({
  component: () => <div>Dashboard route (Stub)</div>,
});

---

## src/routes/app.assess.$assessmentId.tsx
// src/routes/app.assess.$assessmentId.tsx
// Route page that loads the structured clinical evaluation form
// dynamically based on the disorder ID using the centralized disease registry.

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { lazy, Suspense, useMemo } from "react";
import { diseaseImports } from "@/infra/disease-registry.generated";

const Params = z.object({ assessmentId: z.string() });

export const Route = createFileRoute("/app/assess/$assessmentId")({
  parseParams: (raw) => Params.parse(raw),
  component: AssessmentRoute,
});

function AssessmentRoute() {
  const { assessmentId } = Route.useParams();

  // Resolve the clinical evaluation component from the official registry
  // supporting compatibility aliases for legacy catalog and knowledge-graph IDs.
  const DiseaseComponent = useMemo(() => {
    // Dicionário de aliases de compatibilidade de IDs (Mapeia catálogo/gráfico -> físico)
    const idAliases: Record<string, string> = {
      // Capítulo 1
      "transtorno_da_linguagem": "transtorno_linguagem",
      "transtorno_da_fala": "transtorno_fala",
      "deficit_de_atencao_hiperatividade": "transtorno_deficit_atencao_hiperatividade",
      "espectro_autista": "transtorno_do_espectro_autista",
      "transtorno_especifico_da_aprendizagem": "transtorno_especifico_aprendizagem",
      "desenvolvimento_da_coordenacao": "transtorno_desenvolvimento_coordenacao",
      "transtorno_da_comunicacao_social": "transtorno_comunicacao_social",
      "tourette": "transtorno_tourette",
      "tique_transitorio": "transtorno_tique_transitorio",
      "tique_motor_ou_vocal_persistente": "transtorno_tique_persistente",
      "transtorno_da_fluencia_com_inicio_na_infancia": "transtorno_da_fluencia_com_inicio_na_infancia",

      // Capítulo 2
      "catatonia_transtorno_catatônico": "especificador_catatonia",
      "transtorno_psicótico_breve": "transtorno_psicotico_breve",
      "transtorno_psicótico_induzido_por_substância_medicamento": "psicotico_induzido_substancia",
      "transtorno_psicótico_devido_a_outra_condição_médica": "psicotico_devido_condicao_medica",
      "transtorno_esquizoafe_tivo": "transtorno_esquizoafetivo",

      // Capítulo 3
      "transtorno_bipolar_tipo_i": "transtorno_bipolar_tipo_1",
      "transtorno_bipolar_tipo_ii": "transtorno_bipolar_tipo_2",
      "transtorno_bipolar_e_relacionado_induzido_por_substancia_medicamento": "transtorno_bipolar_induzido_substancia_medicamento",
      "transtorno_bipolar_e_relacionado_devido_a_outra_condicao_medica": "transtorno_bipolar_devido_outra_condicao_medica",

      // Capítulo 4
      "transtorno_disruptivo_da_desregulação_do_humor_tddc": "transtorno_disruptivo_desregulacao_humor",
      "transtorno_depressivo_maior_tdm": "transtorno_depressivo_maior",
      "transtorno_depressivo_persistente_distimia": "transtorno_depressivo_persistente",
      "transtorno_disfórico_pré_menstrual_tdpm": "transtorno_disforico_pre_menstrual",
      "transtorno_depressivo_induzido_por_substância_medicamento": "transtorno_depressivo_induzido_substancia_medicamento",
      "transtorno_depressivo_devido_a_outra_condição_médica": "transtorno_depressivo_devido_outra_condicao_medica",

      // Capítulo 5
      "ansiedade_generalizada_tag": "transtorno_ansiedade_generalizada",
      "panico": "transtorno_panico",
      "ansiedade_social_fobia_social": "transtorno_ansiedade_social",
      "ansiedade_de_separacao": "transtorno_ansiedade_separacao",
      "ansiedade_induzido_por_substancia_medicamento": "transtorno_ansiedade_induzido_substancia",
      "ansiedade_devido_a_outra_condicao_medica": "transtorno_ansiedade_devido_outra_condicao_medica",

      // Capítulo 6
      "transtorno_obsessivo_compulsivo_toc": "transtorno_obsessivo_compulsivo",
      "transtorno_dismorfico_corporal_bdd": "transtorno_dismorfico_corporal",
      "acumulacao_hoarding": "transtorno_acumulacao",
      "tricotilomania_arrancar_o_cabelo": "tricotilomania",
      "escoriacao_skin_picking": "transtorno_escoriacao",

      // Capítulo 7
      "estresse_pos_traumatico_tept_30981_f4310": "tept",
      "estresse_agudo_3083_f430": "transtorno_estresse_agudo",
      "ajustamento_varios_codigos_f432x": "transtornos_adaptacao",
      "apego_reativo_31389_f941": "transtorno_apego_reativo",
      "interacao_social_desinibida_31389_f942": "transtorno_interacao_social_desinibida",

      // Outros Capítulos
      "transtorno_conversivo": "transtorno_conversao",
      "transtorno_de_rumincao": "transtorno_ruminacao",
      "disfuncao_eretil": "transtorno_eretil",
      "ejaculacao_precoce": "ejaculacao_prematura",
      "transtorno_desejo_sexual_hipoativo_masculino": "transtorno_desejo_sexual_masculino_hipoativo",
      "transtorno_personalidade_borderline": "tp_borderline",
      "transtorno_personalidade_dependente": "tp_dependente",
      "transtorno_personalidade_esquizoide": "tp_esquizoide",
      "transtorno_personalidade_esquizotipica": "tp_esquizotipico",
      "transtorno_personalidade_evitativa": "tp_evitativo",
      "transtorno_personalidade_narcisista": "tp_narcisista",
      "transtorno_personalidade_paranoide": "tp_paran_oide",
      "transtorno_personalidade_antissocial": "tp_antissocial",
      "transtorno_personalidade_histrionica": "tp_histrionico",
      "transtorno_personalidade_obsessivo_compulsiva": "tp_obsessivo_compulsivo",
    };

    const targetId = idAliases[assessmentId] || assessmentId;
    const importer = diseaseImports[targetId];

    if (!importer) {
      return () => (
        <div className="flex h-full items-center justify-center text-muted-foreground p-8">
          Doença ({assessmentId}) não encontrada ou módulo ainda não gerado.
        </div>
      );
    }

    // Dynamic lazy loading of the generated react component with strict typing
    return lazy(importer as unknown as () => Promise<{ default: React.ComponentType }>);
  }, [assessmentId]);

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center p-8 text-muted-foreground">
          Carregando formulário de avaliação...
        </div>
      }
    >
      <DiseaseComponent />
    </Suspense>
  );
}

---

## src/routes/app.tsx
// src/routes/app.tsx
// Workspace layout: anything under /app sits inside the WorkspaceShell.
// Per-route can override `activeNav` etc. via useMatches() or local state.

import { Outlet, createFileRoute } from "@tanstack/react-router";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { useCommandStore } from "@/stores/command-store";
// import { authQueryKeys } from "@/features/auth/auth-query";
// import type { AuthSessionResponse } from "@/api/auth";

function AppLayout() {
  const openPalette = useCommandStore((s) => s.setOpen);
  return (
    <WorkspaceShell
      activeNav="home"
      onCommandOpen={() => openPalette(true)}
    >
      <Outlet />
    </WorkspaceShell>
  );
}

export const Route = createFileRoute("/app")({
  /* 
  // [AUTH] Descomente o bloco abaixo quando o backend estiver pronto para bloquear rotas nao logadas.
  beforeLoad: async ({ context, location }) => {
    try {
      const session = await context.queryClient.ensureQueryData<AuthSessionResponse>({
        queryKey: authQueryKeys.me(),
        queryFn: context.auth.getCurrentUser,
      });

      if (!session?.user) {
        throw redirect({
          to: "/login",
          search: { redirect: location.href },
        });
      }
    } catch {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  */
  component: AppLayout,
});

---

## src/routes/app.index.tsx
// src/routes/app.index.tsx — workspace dashboard (Home)

import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/workspace/Dashboard";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

---

## src/routes/criar-conta.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/criar-conta')({
  component: () => <div>criar-conta route (Stub)</div>,
});

---

## src/routes/finalizar-cadastro.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/finalizar-cadastro')({
  component: () => <div>finalizar-cadastro route (Stub)</div>,
});

---

## src/routes/index.tsx
// src/routes/index.tsx — public landing page

import { createFileRoute } from "@tanstack/react-router";
import { Landing } from "@/components/landing/Landing";

export const Route = createFileRoute("/")({
  component: Landing,
});

---

## src/routes/confirmar-vinculo.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/confirmar-vinculo')({
  component: () => <div>confirmar-vinculo route (Stub)</div>,
});

---

## src/routes/app.mapa.tsx
import { createFileRoute } from '@tanstack/react-router';
import { MapaDiagnostico } from '@/features/mapa-diagnostico/MapaDiagnostico';

export const Route = createFileRoute('/app/mapa')({
  component: MapaDiagnostico,
});

---

## src/routes/solicitar-acesso.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/solicitar-acesso')({
  component: () => <div>solicitar-acesso route (Stub)</div>,
});

---

## src/routes/__root.tsx
// src/routes/__root.tsx
// Root layout. Hosts the QueryClientProvider, the theme sync hook, the
// global ⌘K palette + hotkey, and the <Outlet /> for child routes.

import { useEffect } from "react";
import { Outlet, createRootRouteWithContext, useRouterState } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getCurrentUser } from "@/api/auth";

export interface RouterContext {
  queryClient: QueryClient;
  auth: {
    getCurrentUser: typeof getCurrentUser;
  };
}
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { useThemeSync } from "@/stores/theme-store";
import { useCommandStore } from "@/stores/command-store";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { GTMedicsLoadingModal } from "@/components/workspace/GTMedicsLoadingModal";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

function RootLayout() {
  useThemeSync();
  const { open, setOpen, toggle } = useCommandStore();
  const isLoading = useRouterState({ select: (s) => s.isLoading });

  // Global ⌘K / Ctrl+K hotkey
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <GTMedicsLoadingModal open={isLoading} message="Carregando..." />
      <CommandPalette open={open} onOpenChange={setOpen} />
      {import.meta.env.DEV && (
        <>
          <ReactQueryDevtools buttonPosition="bottom-left" />
          <TanStackRouterDevtools position="bottom-right" />
        </>
      )}
    </QueryClientProvider>
  );
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

---

## src/routes/esqueci-senha.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/esqueci-senha')({
  component: () => <div>esqueci-senha route (Stub)</div>,
});

---

## src/routes/termos-de-uso.tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/termos-de-uso')({
  component: () => <div>termos-de-uso route (Stub)</div>,
});

---

## src/components/landing/LandingCTA.tsx
import {
  CheckCircle2,
  LockIcon,
  Shield,
  Sparkles,
  Stethoscope,
  Waypoints,
  Workflow,
} from "lucide-react";
import { useEffect, useState } from "react";
import { LandingHero } from "./LandingHero";

const valueProps = [
  {
    icon: Stethoscope,
    title: "Identifique o transtorno",
    description:
      "Busque por nome, sigla, CID-10 ou DSM-5; ou navegue pelos 21 capítulos clínicos.",
  },
  {
    icon: Shield,
    title: "Conduza a entrevista",
    description:
      "Marque os critérios enquanto entrevista. Anote especificadores, gravidade, curso."
  },
  {
    icon: Workflow,
    title: "Exporte para prontuário",
    description:
      "Relatório markdown pré-formatado. Compatível com Obsidian, copie direto.",
  },
];

const carouselImages = [
  "https://pb.gtmedics.com/api/files/pbc_1777022727/olqlu64j86y8tr2/api_transcription4_4p6uccs47w.png?token=",
  "https://pb.gtmedics.com/api/files/pbc_1777022727/vt71e94zdwlfw5g/api_transcription3_9f0fty81tk.png?token=",
  "https://pb.gtmedics.com/api/files/pbc_1777022727/i9kxl75t7nkptk4/api_transcription1_sdpzkjhyk1.png?token=",
  "https://pb.gtmedics.com/api/files/pbc_1777022727/sde2ihmnwdka9ii/api_transcription2_8ekotzyh99.png?token=",
];

const AUDIENCES = [
  { t: "Psiquiatra", b: "Padronize avaliações, registre com rigor, defenda decisões em laudo." },
  { t: "Psicólogos", b: "Focados em avaliação diagnóstica e laudo psicológico." },
  { t: "Residentes", b: "Estruture entrevistas iniciais. Aprenda o DSM-5 enquanto avalia." },
  { t: "Médicos de Família", b: "Identifique e formalize demanda de saúde mental na atenção primária." },
  { t: "Equipes multiprofissionais", b: "CAPS, ambulatórios. Avaliação estruturada." },
];

/* ═══════════════════════ HOME PAGE ═══════════════════════ */
export default function LandingCTA() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveSlide((i) => (i + 1) % carouselImages.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col">
      <HeroSection activeSlide={activeSlide} onSlideChange={setActiveSlide} />
      <LandingHero />
      <FeaturesSection />
      <TrustSection />
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━ 1. HERO SECTION ━━━━━━━━━━━━━━━━━━ */
function HeroSection({
  activeSlide,
  onSlideChange,
}: {
  activeSlide: number;
  onSlideChange: (index: number) => void;
}) {
  return (
    <section
      className="w-full px-4 md:px-20"
      style={{
        background:
          "radial-gradient(circle at 50% 0%, #d4e3ff33 0%, transparent 40%)",
        backgroundColor: "#f9f9ff",
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(16_55_185/0.12),transparent_32%)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:px-8 lg:py-16">
        <div className="space-y-5">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <Sparkles className="size-4" />
            Avaliação clínica DSM-5
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="size-14 min-w-14 min-h-14 flex items-center justify-center rounded-full bg-blue-50 p-2 shadow-xl">
                <Waypoints className="h-7 w-7 mt-1 text-sky-900" />
              </div>
              <div>
                <p className="p-2 text-justify max-w-xl font-semibold tracking-tight text-orange-900 md:text-xl">
                  Avaliação estruturada para os 21 grandes grupos do dsm-5.
                </p>
               </div>
            </div>


            <div className="flex items-center gap-4">
              <div className="size-14 min-w-14 min-h-14 flex items-center justify-center rounded-full bg-blue-50 p-2 shadow-xl">
                <Waypoints className="h-7 w-7 mt-1 text-sky-900" />
              </div>
              <div>
                <span className="m-2 p-2 text-justify max-w-xl font-semibold tracking-tight text-orange-900 md:text-xl">
                  O sistema computa limiares, infere subtipos e aplica a hierarquia diagnóstica em tempo real.
                </span>
               </div>
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <div className="size-14 min-w-14 min-h-14 flex items-center justify-center rounded-full bg-blue-50 p-2 shadow-xl">
                <LockIcon className="h-7 w-7 mt-1 text-sky-900" />
              </div>
              <p className="m-2 p-2 text-justify max-w-xl font-semibold tracking-tight text-orange-900 md:text-xl">
                Conduza entrevistas com a estrutura de cada transtorno.
              </p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-slate-50 shadow-xl shadow-slate-900/10">
            {carouselImages.map((src, i) => (
              <img
                key={src}
                src={src}
                alt={`GT-Medics interface ${i + 1}`}
                loading={i === 0 ? "eager" : "lazy"}
                className={
                  "absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-in-out " +
                  (i === activeSlide ? "opacity-80" : "opacity-0")
                }
              />
            ))}
            <div className="pointer-events-none absolute inset-0 bg-linear-to-tr from-emerald-500/10 via-transparent to-sky-400/10" />
          </div>
          <div className="mt-3 flex items-center justify-center shadow-lg gap-1.5">
            {carouselImages.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => onSlideChange(i)}
                className={
                  "h-2.5 rounded-full p-1 transition-all " +
                  (i === activeSlide
                    ? "w-7 bg-slate-950"
                    : "w-2.5 bg-slate-300 hover:bg-slate-400")
                }
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━ 2. FEATURES BENTO GRID ━━━━━━━━━━━━━━━━━━ */
function FeaturesSection() {
  return (
    <section className="border-y border-slate-200/70 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {valueProps.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl shadow-lg border border-slate-100 bg-white p-5 transition hover:border-slate-300 hover:shadow-lg"
            >
              <div className="mt-3 flex items-center gap-3">
                <div className="mb-3 flex size-9 items-center justify-center rounded-full shadow-xl bg-blue-50">
                  <item.icon className="size-4 text-sky-900" />
                </div>
                <h2 className="m-0 text-sm font-semibold tracking-tight text-slate-950">
                  {item.title}
                </h2>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-slate-600">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━ 3. TRUST SECTION ━━━━━━━━━━━━━━━━━━ */
function TrustSection() {
  return (
    <section className="bg-slate-950 text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
        <div className="space-y-3">
          <p className="text-[14px] font-semibold uppercase tracking-[0.28em] text-emerald-300">
            Para quem é?
          </p>
          <h2 className="m-0 text-2xl font-semibold tracking-tight md:text-2xl">
            Profissionais que se levam a sério.
          </h2>
          <p className="text-xs leading-5 text-slate-400">
            Esta não é uma ferramenta para leigos, nem para usuários casuais. É feita para quem precisa registrar com precisão o que faz.
          </p>
        </div>

         
          {AUDIENCES.map((a) => (
            <article key={a.t} className="gap-2 rounded-xl bg-white/5 px-3.5 py-2.5">
              <div className="flex items-center gap-2 px-3.5 py-2.5">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-300" />
                <span className="text-xl font-medium text-slate-100 text-shadow-sm text-shadow-slate-900">
                  {a.t}
                </span>
              </div>
              <p className="text-gray-100 text-sm leading-[1.55] m-0">{a.b}</p>
            </article>
          ))}

      </div>
    </section>
  );
}

---

## src/components/landing/LandingFooter.tsx
import { Link } from '@tanstack/react-router'

export const EmailLink = () => {
  const email = 'gtmedics@gtmedics.com'

  return (
    <a
      href={`mailto:${email}`}
      className="p-2 rounded-xl shadow-lg hover:bg-green-200/80 text-body-sm text-gray-100/80 text-shadow-xs text-on-surface-variant underline decoration-primary underline-offset-4 transition-colors duration-200 hover:text-primary"
    >
      Contato
    </a>
  )
}

export function LandingFooter() {
  return (
    <footer className="w-full !p-0 border-none bg-gradient-to-r from-blue-800 via-sky-600 to-blue-900 shadow-sm">
      <div className="mx-4 px-4 md:mx-12 md:px-12 flex max-w-content flex-col md:flex-row items-center md:items-center justify-between gap-[24px] py-2">
        {/* Logo + Copyright */}
        <div className="flex flex-col items-center md:items-start gap-[8px]">
          <Link
            to="/"
            className="font-manrope text-gray-100/80 text-xl font-bold text-shadow-xs tracking-tight"
          >
            GT-Medics
          </Link>
          <p className="text-body-sm text-gray-100/80 text-shadow-xs text-on-surface-variant">
            &copy; 2026 GT-Medics Escalas ®. Todos os direitos reservados.
          </p>
        </div>

        {/* Nav links */}
        <div className="flex flex-wrap items-center justify-center gap-[24px]">
          <a
            href="/termos-de-uso"
            className="p-2 rounded-xl shadow-lg hover:bg-green-200/80 text-body-sm text-gray-100/80 text-shadow-xs text-on-surface-variant underline decoration-primary underline-offset-4 transition-colors duration-200 hover:text-primary"
          >
            Termos de Uso
          </a>
          <a
            href="/politica-de-privacidade"
            className="p-2 rounded-xl shadow-lg hover:bg-green-200/80 text-body-sm text-gray-100/80 text-shadow-xs text-on-surface-variant underline decoration-primary underline-offset-4 transition-colors duration-200 hover:text-primary"
          >
            Privacidade
          </a>

          <EmailLink />

          <a
            href="/sobre"
            className="p-2 rounded-xl shadow-lg hover:bg-green-200/80 text-body-sm text-gray-100/80 text-shadow-xs text-on-surface-variant underline decoration-primary underline-offset-4 transition-colors duration-200 hover:text-primary"
          >
            Sobre
          </a>
        </div>
      </div>
    </footer>
  )
}

---

## src/components/landing/Landing.tsx
// src/components/landing/Landing.tsx
import { LandingNav } from "./LandingNav";
import { LandingFooter } from "./LandingFooter";
import LandingCTA from "./LandingCTA";


export function Landing() {
  return (
    <div className="bg-bg text-text font-sans min-h-screen">
      <LandingNav />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}

---

## src/components/landing/LandingHero.tsx
// src/components/landing/LandingHero.tsx
// Hero with a "product window" — an inline preview of one patient-page (TDAH).
// The preview is intentionally a static facsimile; for marketing screenshots
// from the real workspace, replace <HeroProductPreview /> with an <img>.

import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function LandingHero() {
  return (
    <div className="w-full hidden md:block md:max-w-6xl p-8 mx-auto rounded-lg overflow-hidden border border-border bg-surface shadow-s3">
      {/* macOS chrome */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-surface-2">
        <span className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-2.5 h-2.5 rounded-full bg-border-hi" />
          ))}
        </span>
        <div className="flex-1 text-center text-xs text-text-3">
          gtmedic-dsm · TDAH · paciente:{" "}
          <span className="text-text-2">Marina S., 32a</span>
        </div>
      </div>
      <div className="grid grid-cols-[220px_1fr_280px] min-h-[540px]">
        {/* mini aside */}
        <aside className="border-r border-border p-3 bg-surface text-xs">
          <div className="text-[10px] font-semibold tracking-wider text-text-4 mb-3 px-1.5">
            CAPÍTULO 01
          </div>
          {["TDAH", "TEA", "Deficiência Intelectual", "Tourette", "Tique Persistente", "Comunicação Social", "Aprendizagem Específico"].map((d, i) => (
            <div
              key={d}
              className={`px-2.5 py-1.5 rounded-sm mb-px flex items-center gap-2 ${i === 0 ? "bg-accent-tint text-accent font-semibold" : "text-text-2"}`}
            >
              {i === 0 && <span className="w-1 h-1 rounded-sm bg-accent" />}
              {d}
            </div>
          ))}
        </aside>
        {/* main */}
        <main className="px-8 py-7 overflow-hidden">
          <div className="flex items-baseline gap-3 mb-2">
            <Badge >F90.0 · DSM-5</Badge>
            <Badge>Polythetic · limiar 5/9</Badge>
          </div>
          <h2 className="font-serif text-3xl font-medium tracking-[-0.6px] text-text mt-2 mb-1.5">
            Transtorno do Déficit de Atenção / Hiperatividade
          </h2>
          <p className="text-xs text-text-3 mb-6">
            Critério A.1 — Sintomas de desatenção (≥ 6 em crianças · ≥ 5 em adultos)
          </p>
          <CriterionPreview />
        </main>
        {/* right panel */}
        <aside className="border-l border-border px-5 py-6 bg-surface-2 text-xs">
          <div className="text-[10px] font-semibold tracking-wider text-text-4 mb-3.5">
            CÔMPUTO EM TEMPO REAL
          </div>
          <ThresholdMini label="Desatenção · adulto ≥ 5"     value={6} max={9} met />
          <ThresholdMini label="Hiperatividade · adulto ≥ 5" value={3} max={9} />
          <div className="h-px bg-border my-4 -mx-5" />
          <div className="text-[10px] font-semibold tracking-wider text-text-4 mb-2.5">
            SUBTIPO INFERIDO
          </div>
          <p className="font-serif text-lg text-text mb-1 m-0">
            Apresentação predominantemente desatenta
          </p>
          <p className="text-xs text-text-3 leading-snug m-0">
            F90.0 · baseada em desatenção atingida sem hiperatividade no limiar.
          </p>
        </aside>
      </div>
    </div>
  );
}

function CriterionPreview() {
  const items = [
    { text: "Não presta atenção em detalhes",   checked: true },
    { text: "Dificuldade para manter atenção",  checked: true },
    { text: "Parece não escutar",                checked: false },
    { text: "Não termina tarefas",               checked: true },
    { text: "Dificuldade para organizar",        checked: true },
    { text: "Evita esforço mental prolongado",   checked: true },
    { text: "Perde objetos",                     checked: false },
    { text: "Distrai-se facilmente",             checked: true },
    { text: "Esquece atividades cotidianas",     checked: false },
  ];
  return (
    <ul className="list-none p-0 m-0">
      {items.map((it, i) => (
        <li
          key={i}
          className={`flex items-start gap-2.5 py-2.5 ${i > 0 ? "border-t border-border" : ""}`}
        >
          <span
            className={`shrink-0 mt-0.5 w-4 h-4 rounded-[3px] border-[1.5px] flex items-center justify-center text-accent-fg ${it.checked ? "bg-accent border-accent" : "border-border-hi"}`}
          >
            {it.checked && <Check size={11} strokeWidth={2.4} />}
          </span>
          <span className={`text-sm leading-snug ${it.checked ? "text-text" : "text-text-2"}`}>
            <span className="text-[11px] text-text-3 mr-1.5 tabular-nums">A.1.{i + 1}</span>
            {it.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ThresholdMini({ label, value, max, met }: { label: string; value: number; max: number; met?: boolean }) {
  return (
    <div className="mb-4">
      <p className="text-xs text-text-3 mb-1.5 m-0">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className="font-serif text-3xl font-medium text-text leading-none">{value}</span>
        <span className="text-text-3 text-sm">/ {max}</span>
        <Badge  className="ml-auto">
          {met ? "Atingido" : "Abaixo"}
        </Badge>
      </div>
      <div className="h-1 mt-2 bg-surface-3 rounded-sm overflow-hidden">
        <div
          className={`h-full ${met ? "bg-accent" : "bg-border-hi"}`}
          style={{ width: `${(value / max) * 100}%` }}
        />
      </div>
    </div>
  );
}

---

## src/components/landing/SectionHeader.tsx
// src/components/landing/SectionHeader.tsx
// Kicker + serif title + lede — shared by every landing section below the hero.

import { cn } from "@/lib/cn";

interface SectionHeaderProps {
  kicker: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ kicker, title, lede, className }: SectionHeaderProps) {
  return (
    <div className={cn("max-w-[760px] mb-16", className)}>
      <div className="text-xs tracking-[1.5px] uppercase text-accent mb-3 font-semibold">
        {kicker}
      </div>
      <h2 className="font-serif text-5xl font-normal tracking-[-0.8px] leading-[1.08] text-text m-0 text-balance">
        {title}
      </h2>
      {lede && (
        <p className="text-lg text-text-2 mt-4 leading-[1.55] max-w-[640px] text-pretty">
          {lede}
        </p>
      )}
    </div>
  );
}

---

## src/components/landing/LandingNav.tsx
// src/components/landing/LandingNav.tsx
import { Link, useNavigate } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { SquircleButton } from "@/components/ui/SquircleButton";
import { useState } from "react";

export function LandingNav() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <header className="shadow-xl shadow-slate-400 flex items-center justify-between px-24 py-7 border-none bg-linear-to-b from-blue-950 to-orange-950 sticky top-0 z-50">

      <nav className="hidden md:flex gap-8 text-sm text-text-2">
        {/* Logo */}
        <div className="ml-24 px-8 flex flex-row items-center gap-2 md:gap-3">
          <img
            src="/src/icon/logo.svg"
            alt="Ícone"
            className="w-10 h-10 md:w-20 md:h-20 bg-gray-100/80 p-1 md:p-2 rounded-full shadow-xl"
          />
          <Link
            to="/"
            className="font-manrope text-lg md:text-4xl font-bold text-shadow-sm text-shadow-blue-700  text-amber-100/80 tracking-tight"
          >
            GT-Medics - Consultas Estruturadas
          </Link>
        </div>

      </nav>
      <div className="flex items-center gap-2">
        {/* Desktop buttons */}
        <div className="hidden lg:flex items-center gap-3">
          <SquircleButton
            variant="blue"
            size="mini"
            fontWeight={600}
            label="Login"
            onClick={() => navigate({ to: '/login' })}
          />
          <SquircleButton
            variant="teal"
            size="mini"
            fontWeight={600}
            label="Criar conta"
            onClick={() => navigate({ to: '/criar-conta' })}
          />
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="lg:hidden p-2 rounded-md text-amber-100/80 hover:bg-white/10 transition-colors"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute inset-y-0 right-0 w-80 bg-white p-6 shadow-2xl">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-md text-slate-900 hover:bg-slate-100"
                aria-label="Fechar menu"
              >
                <X className="w-6 h-6" />
              </button>
              <nav className="flex flex-col gap-4 mt-4">
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block py-2 px-3 rounded-md text-slate-900 hover:bg-blue-50"
                >
                  Entrar
                </Link>
                <Link
                  to="/criar-conta"
                  onClick={() => setMobileOpen(false)}
                  className="block py-2 px-3 rounded-md text-slate-900 hover:bg-teal-50"
                >
                  Criar conta
                </Link>
              </nav>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

---

## src/components/patient-page/IdentificationSection.tsx
// src/components/patient-page/IdentificationSection.tsx
// Block 1: patient identification.
// Wires to TanStack Form in the real app; here it reads from the loaded patient
// and renders read-only display cells. Replace with <form.Field>… when wiring.

import { SectionShell } from "./SectionShell";
import type { Patient } from "@/lib/schemas";

interface IdentificationSectionProps {
  patient: Patient;
  chiefComplaint?: string;
}

export function IdentificationSection({ patient, chiefComplaint }: IdentificationSectionProps) {
  const age = computeAge(patient.birthDate);

  return (
    <SectionShell kicker="Bloco 1" title="Identificação do paciente">
      <div className="flex gap-4 flex-wrap mb-4">
        <Field label="Nome / ID" value={patient.fullName} half />
        <Field label="Data de nascimento" value={`${formatBR(patient.birthDate)} · ${age}a`} half />
      </div>
      <div className="flex gap-4 flex-wrap mb-4">
        <Field label="Sexo" value={sexLabel(patient.sex)} third />
        <Field label="Escolaridade" value={patient.education ?? "—"} third />
        <Field label="Ocupação atual" value={patient.occupation ?? "—"} third />
      </div>
      <div>
        <FieldLabel>Queixa principal / motivo da consulta</FieldLabel>
        <div className="p-3.5 border border-border rounded-[var(--radius-card)] bg-surface text-sm text-text-2 leading-relaxed min-h-[80px]">
          {chiefComplaint ?? "—"}
        </div>
      </div>
    </SectionShell>
  );
}

// ─── helpers / shared bits ──────────────────────────────────
function Field({ label, value, half, third }: {
  label: string; value: string; half?: boolean; third?: boolean;
}) {
  return (
    <div
      className="min-w-0"
      style={{ flex: half ? "0 0 calc(50% - 8px)" : third ? "0 0 calc(33.33% - 11px)" : "1 1 0" }}
    >
      <FieldLabel>{label}</FieldLabel>
      <div className="h-9 px-3 border border-border rounded-[var(--radius-card)] bg-surface text-sm text-text flex items-center">
        {value}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] text-text-3 mb-1.5 tracking-wide font-medium">
      {children}
    </label>
  );
}

function computeAge(isoDate: string): number {
  const d = new Date(isoDate);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}
function formatBR(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}
function sexLabel(s: Patient["sex"]): string {
  return s === "F" ? "Feminino" : s === "M" ? "Masculino" : s === "outro" ? "Outro" : "Não informado";
}

---

## src/components/patient-page/CriterionA1Section.tsx
// src/components/patient-page/CriterionA1Section.tsx
// Block 3: A1 inattention symptoms (9 items, polythetic threshold 5/9 for adults).
// Generic enough to host any polythetic domain — pass the criterion list as a prop
// when wiring multiple domains (A2 hyperactivity uses the same component).

import { Check, Edit3 } from "lucide-react";
import { SectionShell } from "./SectionShell";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import type { Assessment } from "@/lib/schemas";

interface CriterionItem {
  id: string;         // "A1.1"
  i: number;
  title: string;
  fullText: string;
}

// Canonical TDAH A1 — desatenção. Move to a per-disorder data module
// when more domains come online.
const A1_ITEMS: CriterionItem[] = [
  { id: "A1.1", i: 1, title: "Erros por descuido em detalhes",
    fullText: "Frequentemente deixa de prestar atenção a detalhes ou comete erros por descuido em atividades escolares, trabalho ou outras atividades." },
  { id: "A1.2", i: 2, title: "Dificuldade em manter atenção",
    fullText: "Frequentemente tem dificuldade para manter a atenção em tarefas ou atividades lúdicas." },
  { id: "A1.3", i: 3, title: "Parece não escutar",
    fullText: "Frequentemente parece não escutar quando alguém lhe dirige a palavra diretamente." },
  { id: "A1.4", i: 4, title: "Não termina tarefas",
    fullText: "Frequentemente não segue instruções até o fim e não consegue terminar trabalhos escolares, tarefas domésticas ou atribuições no local de trabalho." },
  { id: "A1.5", i: 5, title: "Dificuldade em organização",
    fullText: "Frequentemente tem dificuldade para organizar tarefas e atividades." },
  { id: "A1.6", i: 6, title: "Evita esforço mental",
    fullText: "Frequentemente evita, não gosta ou reluta em se envolver em tarefas que exigem esforço mental prolongado." },
  { id: "A1.7", i: 7, title: "Perde objetos",
    fullText: "Frequentemente perde coisas necessárias para tarefas ou atividades." },
  { id: "A1.8", i: 8, title: "Distrai-se facilmente",
    fullText: "Frequentemente é facilmente distraído por estímulos externos." },
  { id: "A1.9", i: 9, title: "Esquecimento de atividades",
    fullText: "Frequentemente é esquecido em relação a atividades cotidianas." },
];

const THRESHOLD_ADULT = 5;

interface CriterionA1SectionProps {
  assessment: Assessment;
  onToggle?: (id: string) => void;
  onAddNote?: (id: string, note: string) => void;
}

export function CriterionA1Section({ assessment, onToggle }: CriterionA1SectionProps) {
  const byId = new Map(assessment.responses.map((r) => [r.criterionId, r]));
  const total = A1_ITEMS.filter((it) => byId.get(it.id)?.checked).length;
  const met = total >= THRESHOLD_ADULT;

  return (
    <SectionShell
      kicker="Bloco 3 · Critério A.1"
      title="Sintomas de desatenção"
      action={
        <div className="flex items-baseline gap-1.5">
          <span className="font-serif text-[28px] font-medium text-text tracking-[-0.5px]">
            {total}
          </span>
          <span className="text-xs text-text-3">/ 9</span>
          <Badge  className="ml-2">
            {met ? `≥ ${THRESHOLD_ADULT} atingido` : `${total}/${THRESHOLD_ADULT} abaixo`}
          </Badge>
        </div>
      }
    >
      <p className="text-xs text-text-3 mb-3.5 leading-relaxed">
        Em adultos (≥ 17a), no mínimo{" "}
        <strong className="text-text-2">{THRESHOLD_ADULT} de 9 sintomas</strong>{" "}
        presentes por ≥ 6 meses, em grau inconsistente com o nível de desenvolvimento.
      </p>
      <ul className="flex flex-col border border-border rounded-[var(--radius-card)] overflow-hidden bg-surface list-none p-0 m-0">
        {A1_ITEMS.map((it, i) => {
          const resp = byId.get(it.id);
          const checked = resp?.checked ?? false;
          return (
            <li
              key={it.id}
              className={cn(
                "flex items-start gap-3.5 px-4 py-3.5",
                i > 0 && "border-t border-border"
              )}
            >
              <button
                type="button"
                onClick={() => onToggle?.(it.id)}
                aria-label={`${checked ? "Desmarcar" : "Marcar"} ${it.title}`}
                aria-pressed={checked}
                className={cn(
                  "shrink-0 mt-0.5 w-[18px] h-[18px] rounded-[3px] border-[1.5px] cursor-pointer",
                  "flex items-center justify-center transition-colors text-accent-fg",
                  checked ? "bg-accent border-accent" : "border-border-hi hover:border-text-3 bg-transparent"
                )}
              >
                {checked && <Check size={12} strokeWidth={2.4} />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-[11px] font-semibold text-text-3 font-mono">{it.id}</span>
                  <span className="text-sm text-text font-medium">{it.title}</span>
                </div>
                <p className="text-xs text-text-2 leading-relaxed m-0">{it.fullText}</p>
                {resp?.note && (
                  <div className="mt-2 px-2.5 py-1.5 bg-accent-tint text-accent border-l-2 border-accent text-xs leading-snug italic flex gap-1.5 items-start">
                    <Edit3 size={11} className="mt-px shrink-0" />
                    <span>{resp.note}</span>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}

---

## src/components/patient-page/ABCDESection.tsx
// src/components/patient-page/ABCDESection.tsx
// Block 2: B-E criteria (required for diagnosis). Toggleable checkbox grid.

import { Check } from "lucide-react";
import { SectionShell } from "./SectionShell";
import { cn } from "@/lib/cn";
import type { Assessment } from "@/lib/schemas";

interface ABCDESectionProps {
  assessment: Assessment;
  onToggle?: (id: string) => void;
}

// Per-disorder definition. For TDAH these are the canonical B-E criteria.
const BE_CRITERIA = [
  { id: "B", label: "Início antes dos 12 anos" },
  { id: "C", label: "Presentes em dois ou mais contextos" },
  { id: "D", label: "Prejuízo clinicamente significativo" },
  { id: "E", label: "Não explicado por outro transtorno mental" },
];

export function ABCDESection({ assessment, onToggle }: ABCDESectionProps) {
  const isChecked = (id: string) =>
    assessment.responses.find((r) => r.criterionId === id)?.checked ?? false;

  return (
    <SectionShell kicker="Bloco 2" title="Histórico evolutivo · critérios B–E">
      <p className="text-xs text-text-3 mb-4 leading-relaxed">
        Critérios obrigatórios. Todos precisam ser confirmados para fechar
        diagnóstico, independentemente do limiar de sintomas em A1 ou A2.
      </p>
      <div className="grid grid-cols-2 gap-2.5 mb-6">
        {BE_CRITERIA.map((c) => {
          const checked = isChecked(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onToggle?.(c.id)}
              className={cn(
                "flex items-start gap-3 p-3.5 rounded-[var(--radius-card)] text-left transition-colors",
                "border cursor-pointer",
                checked
                  ? "border-accent bg-accent-tint"
                  : "border-border bg-surface hover:border-border-hi"
              )}
            >
              <span
                className={cn(
                  "shrink-0 mt-0.5 w-[18px] h-[18px] rounded-[3px] border-[1.5px] flex items-center justify-center text-accent-fg",
                  checked ? "bg-accent border-accent" : "border-border-hi"
                )}
              >
                {checked && <Check size={12} strokeWidth={2.4} />}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-text-3 mb-0.5 font-semibold tracking-wide">
                  CRITÉRIO {c.id}
                </div>
                <div className="text-sm text-text leading-snug">{c.label}</div>
              </div>
            </button>
          );
        })}
      </div>
      <div>
        <label className="block text-[11px] text-text-3 mb-1.5 tracking-wide font-medium">
          Desenvolvimento e curso dos sintomas
        </label>
        <div className="p-3.5 border border-border rounded-[var(--radius-card)] bg-surface text-sm text-text-2 leading-relaxed min-h-[84px] whitespace-pre-wrap">
          {assessment.freeText?.courseAndDevelopment ?? "—"}
        </div>
      </div>
    </SectionShell>
  );
}

---

## src/components/patient-page/ReportPreview.tsx
// src/components/patient-page/ReportPreview.tsx
// Faded preview of the auto-generated markdown report.

import { ExternalLink } from "lucide-react";
import { PanelBlock } from "./PanelBlock";
import { Button } from "@/components/ui/button";

interface ReportPreviewProps {
  markdown?: string;
  onOpen?: () => void;
}

export function ReportPreview({ markdown, onOpen }: ReportPreviewProps) {
  return (
    <PanelBlock kicker="Pré-visualização do relatório">
      <div className="relative bg-surface-2 border border-border rounded-[var(--radius-card)] p-3.5 max-h-60 overflow-hidden">
        <pre className="font-mono text-xs leading-relaxed text-text-2 whitespace-pre-wrap m-0">
          {markdown ?? "—"}
        </pre>
        <div
          className="absolute left-0 right-0 bottom-0 h-15 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(transparent, var(--color-surface-2))",
            height: 60,
          }}
        />
      </div>
      <Button
        size="sm"
        onClick={onOpen}
        className="mt-2.5 w-full justify-between"
      >
        Ver relatório completo
      </Button>
    </PanelBlock>
  );
}

---

## src/components/patient-page/PatientPage.tsx
// src/components/patient-page/PatientPage.tsx
// Full patient-page (assessment in progress). Two-column layout:
// left = identification + B-E + criterion sections; right = computation panel.
// All data comes from a parent route via TanStack Query; this component
// composes the sections and the persistent header.

import { Copy, Download, FileText, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Assessment, Patient, Disorder } from "@/lib/schemas";
import { IdentificationSection } from "./IdentificationSection";
import { ABCDESection } from "./ABCDESection";
import { CriterionA1Section } from "./CriterionA1Section";
import { ComputationPanel } from "./ComputationPanel";
import { BECriteriaStatus } from "./BECriteriaStatus";
import { FunctionalImpact } from "./FunctionalImpact";
import { ReportPreview } from "./ReportPreview";

interface PatientPageProps {
  assessment: Assessment;
  patient: Patient;
  disorder: Disorder;
}

export function PatientPage({ assessment, patient, disorder }: PatientPageProps) {
  return (
    <div className="flex flex-col min-h-full">
      <PatientPageHeader assessment={assessment} patient={patient} disorder={disorder} />
      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] flex-1">
        <main className="px-8 py-6 pb-20 border-r border-border min-w-0">
          <IdentificationSection patient={patient} chiefComplaint={assessment.freeText?.chiefComplaint} />
          <ABCDESection assessment={assessment} />
          <CriterionA1Section assessment={assessment} />
        </main>
        <aside className="px-7 py-6 pb-15 bg-surface min-w-0">
          <ComputationPanel assessment={assessment} disorder={disorder} />
          <BECriteriaStatus assessment={assessment} />
          <FunctionalImpact impact={assessment.functionalImpact} />
          <ReportPreview markdown={assessment.reportMarkdown} />
        </aside>
      </div>
    </div>
  );
}

// ─── Header ─────────────────────────────────────────────────
function PatientPageHeader({ assessment, patient, disorder }: PatientPageProps) {
  // Compute progress from responses (rough: % of criteria touched).
  // Real implementation should weight by required vs. optional.
  const progressPct = Math.round((assessment.responses.filter(r => r.checked).length / Math.max(1, assessment.responses.length)) * 100);

  return (
    <header className="flex items-center gap-4 px-8 pt-6 pb-5.5 border-b border-border bg-bg sticky top-0 z-10">
      <div className="flex-1 min-w-0">
        <nav className="flex items-center gap-1.5 text-xs text-text-3 mb-2" aria-label="breadcrumb">
          <span>01 — Neurodesenvolvimento</span>
          <ChevronRight size={11} className="text-text-4" />
          <span>{disorder.shortName ?? disorder.name}</span>
          <ChevronRight size={11} className="text-text-4" />
          <span className="text-text-2">{patient.fullName.split(" ")[0]} {patient.fullName.split(" ").at(-1)?.[0]}.</span>
        </nav>
        <div className="flex items-baseline gap-3.5 mb-1.5">
          <Badge >{disorder.code} · DSM-5 {disorder.dsm5Code}</Badge>
          <Badge>Polythetic com limiar · adultos ≥ 17a</Badge>
          <Badge >Em andamento · {progressPct}%</Badge>
        </div>
        <h1 className="font-serif text-3xl font-medium tracking-[-0.5px] m-0 mb-1 text-text">
          {disorder.name}
        </h1>
        <p className="text-xs text-text-3 m-0">
          Avaliação clínica estruturada em adultos · paciente:{" "}
          <strong className="text-text-2 font-semibold">{patient.fullName}</strong>
          {" · última edição há 2h"}
          {assessment.sessionNumber && ` · sessão #${assessment.sessionNumber}`}
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" >Copiar</Button>
        <Button size="sm" >Exportar</Button>
        <Button size="sm" variant="default" >
          Salvar e gerar relatório
        </Button>
      </div>
    </header>
  );
}

---

## src/components/patient-page/FunctionalImpact.tsx
// src/components/patient-page/FunctionalImpact.tsx
// 0–4 impact rating across functional domains.

import { PanelBlock } from "./PanelBlock";
import { cn } from "@/lib/cn";

interface FunctionalImpactProps {
  /** Domain key → score (0–4). undefined value = N/A. */
  impact?: Record<string, number>;
}

const DOMAINS: { key: string; label: string }[] = [
  { key: "academic",     label: "Desempenho acadêmico" },
  { key: "professional", label: "Desempenho profissional" },
  { key: "social",       label: "Funcionamento social" },
  { key: "autonomy",     label: "Autonomia e funcional" },
];

export function FunctionalImpact({ impact = {} }: FunctionalImpactProps) {
  return (
    <PanelBlock kicker="Impacto funcional · escala 0–4">
      <div className="flex flex-col gap-2.5">
        {DOMAINS.map((d) => {
          const v = impact[d.key];
          const na = v == null;
          return (
            <div key={d.key}>
              <div className="flex justify-between text-xs text-text-2 mb-1">
                <span className="truncate">{d.label}</span>
                <span
                  className={cn(
                    "font-semibold tabular-nums",
                    na ? "text-text-4" : "text-text"
                  )}
                >
                  {na ? "N/A" : v}
                </span>
              </div>
              <div className="flex gap-[3px]">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex-1 h-1.5 rounded-[1px]",
                      !na && i <= (v ?? -1) ? "bg-accent" : "bg-surface-3"
                    )}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </PanelBlock>
  );
}

---

## src/components/patient-page/ComputationPanel.tsx
// src/components/patient-page/ComputationPanel.tsx
// Real-time computation: A1 / A2 threshold cards + inferred subtype.

import { Sparkles, Check } from "lucide-react";
import { PanelBlock } from "./PanelBlock";
import { cn } from "@/lib/cn";
import type { Assessment, Disorder } from "@/lib/schemas";

interface ComputationPanelProps {
  assessment: Assessment;
  disorder: Disorder;
}

export function ComputationPanel({ assessment }: ComputationPanelProps) {
  // Count responses per A1 / A2 domain. Real version: drive these from the
  // disorder schema's domain definitions instead of hardcoded prefixes.
  const count = (prefix: string) =>
    assessment.responses.filter((r) => r.criterionId.startsWith(prefix) && r.checked).length;

  const a1 = count("A1");
  const a2 = count("A2");

  return (
    <PanelBlock kicker="Painel de critérios · em tempo real">
      <div className="grid grid-cols-2 gap-2.5 mb-3.5">
        <ThresholdCard domain="A1" label="Desatenção"     current={a1} need={5} max={9} met={a1 >= 5} />
        <ThresholdCard domain="A2" label="Hiper/Impuls." current={a2} need={5} max={9} met={a2 >= 5} />
      </div>

      {assessment.inferredSubtype && (
        <div className="p-3.5 rounded-[var(--radius-card)] bg-accent-tint border border-accent/30">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles size={14} className="text-accent" />
            <span className="text-[11px] font-bold tracking-wider text-accent uppercase">
              Apresentação inferida
            </span>
          </div>
          <div className="font-serif text-lg font-medium tracking-tight text-text mb-1">
            {assessment.inferredSubtype}
          </div>
          <p className="text-xs text-text-2 leading-snug m-0">
            A1 ≥ 5 atingido sem A2 no limiar nos últimos 6 meses ·{" "}
            {assessment.inferredCode ?? "código a inferir"}
          </p>
        </div>
      )}
    </PanelBlock>
  );
}

// ─── ThresholdCard ──────────────────────────────────────────
interface ThresholdCardProps {
  domain: string;
  label: string;
  current: number;
  need: number;
  max: number;
  met: boolean;
}

function ThresholdCard({ domain, label, current, need, max, met }: ThresholdCardProps) {
  const pct = (current / max) * 100;
  return (
    <div
      className={cn(
        "p-3.5 rounded-[var(--radius-card)] bg-surface border border-border",
        "border-t-2",
        met ? "border-t-accent" : "border-t-border-hi"
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-text-3 font-semibold">
          {domain} · {label}
        </span>
        {met && <Check size={12} strokeWidth={2.4} className="text-accent" />}
      </div>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="font-serif text-3xl font-medium tracking-[-0.5px] text-text leading-none">
          {current}
        </span>
        <span className="text-xs text-text-3">/ {max}</span>
      </div>
      <div className="text-[11px] text-text-3 mb-1.5">≥ {need} necessários</div>
      <div className="h-[3px] bg-surface-3 rounded-sm overflow-hidden">
        <div
          className={cn("h-full rounded-sm", met ? "bg-accent" : "bg-border-hi")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

---

## src/components/patient-page/BECriteriaStatus.tsx
// src/components/patient-page/BECriteriaStatus.tsx
// Compact mirror of the B–E checklist on the right panel.

import { Check, AlertTriangle } from "lucide-react";
import { PanelBlock } from "./PanelBlock";
import { cn } from "@/lib/cn";
import type { Assessment } from "@/lib/schemas";

const BE = [
  { id: "B", label: "Início antes dos 12 anos" },
  { id: "C", label: "Presentes em dois ou mais contextos" },
  { id: "D", label: "Prejuízo clinicamente significativo" },
  { id: "E", label: "Não explicado por outro transtorno mental" },
];

export function BECriteriaStatus({ assessment }: { assessment: Assessment }) {
  const byId = new Map(assessment.responses.map((r) => [r.criterionId, r]));
  const done = BE.filter((c) => byId.get(c.id)?.checked).length;
  const missing = BE.filter((c) => !byId.get(c.id)?.checked).map((c) => c.id);

  return (
    <PanelBlock kicker={`Critérios B–E · ${done}/4`}>
      <ul className="flex flex-col gap-1.5 list-none p-0 m-0">
        {BE.map((c) => {
          const checked = byId.get(c.id)?.checked ?? false;
          return (
            <li
              key={c.id}
              className={cn(
                "flex items-center gap-2.5 text-[12.5px]",
                checked ? "text-text" : "text-text-3"
              )}
            >
              <span
                className={cn(
                  "w-3.5 h-3.5 rounded-full border-[1.5px] flex items-center justify-center shrink-0 text-accent-fg",
                  checked ? "bg-accent border-accent" : "border-border-hi"
                )}
              >
                {checked && <Check size={9} strokeWidth={3} />}
              </span>
              <span className="font-mono text-[11px] text-text-3 font-semibold shrink-0">{c.id}</span>
              <span className="flex-1">{c.label}</span>
            </li>
          );
        })}
      </ul>
      {done < 4 && (
        <div className="mt-3 px-2.5 py-2 bg-warn-bg text-warn rounded-[var(--radius-card)] text-xs flex gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>
            Diagnóstico não fechável: faltam critérios obrigatórios{" "}
            {missing.join(" e ")}.
          </span>
        </div>
      )}
    </PanelBlock>
  );
}

---

## src/components/patient-page/PanelBlock.tsx
// src/components/patient-page/PanelBlock.tsx
// Shared shell for the right-side computation panel blocks.

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PanelBlockProps {
  kicker: string;
  children: ReactNode;
  className?: string;
}

export function PanelBlock({ kicker, children, className }: PanelBlockProps) {
  return (
    <div className={cn("mb-7", className)}>
      <div className="text-[10px] font-bold tracking-[1.5px] text-text-4 mb-3 uppercase">
        {kicker}
      </div>
      {children}
    </div>
  );
}

---

## src/components/patient-page/SectionShell.tsx
// src/components/patient-page/SectionShell.tsx
// Visual chrome shared by every patient-page section. Title bar with a small
// kicker; thin underline; optional action slot on the right.

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface SectionShellProps {
  kicker: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function SectionShell({ kicker, title, action, children, className }: SectionShellProps) {
  return (
    <section className={cn("mb-9", className)}>
      <header className="flex items-end justify-between mb-4 pb-2 border-b border-border">
        <div>
          <div className="text-[10px] font-bold tracking-[1.5px] text-accent mb-1 uppercase">
            {kicker}
          </div>
          <h2 className="font-serif text-[22px] font-medium tracking-[-0.3px] m-0 text-text">
            {title}
          </h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

---

## src/components/workspace/Dashboard.tsx
// src/components/workspace/Dashboard.tsx
// Dashboard home screen — uses TanStack Query hooks for the four data blocks.
// Hooks are placeholders here; wire them to your PocketBase service layer.

import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight, Edit3, Sparkles, Check, Plus, Download,
  Calendar, ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/cn";

// ─── Top-level ──────────────────────────────────────────────
export function Dashboard() {
  return (
    <div className="px-10 py-8 max-w-[1280px]">
      <DashboardGreeting />
      <ContinueAssessmentBlock />
      <div className="grid grid-cols-[1.4fr_1fr] gap-6 mt-7">
        <ActivePatientsBlock />
        <QuickShortcutsBlock />
      </div>
      <RecentActivityBlock />
    </div>
  );
}

// ─── Greeting ───────────────────────────────────────────────
function DashboardGreeting() {
  // TODO: replace with current-user context
  const clinicianFirstName = "Guilherme";
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <header className="mb-8">
      <div className="text-xs text-text-3 mb-1.5 tracking-wide">
        Quinta-feira, 22 de maio · semana clínica
      </div>
      <h1 className="font-serif text-[38px] font-normal tracking-[-0.8px] text-text leading-[1.1] m-0 mb-2">
        {greet}, <em className="italic">Dr. {clinicianFirstName}</em>.
      </h1>
      <p className="text-[15px] text-text-2 m-0">
        Você tem <strong className="text-text font-semibold">3 avaliações em andamento</strong>,
        2 consultas agendadas hoje, e{" "}
        <strong className="text-text font-semibold">1 relatório aguardando revisão</strong>.
      </p>
    </header>
  );
}

// ─── Section header ─────────────────────────────────────────
function BlockTitle({
  title,
  action,
  extra,
}: {
  title: string;
  action?: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between mb-3.5">
      <h2 className="font-serif text-xl font-medium tracking-tight text-text m-0">
        {title}
      </h2>
      {extra}
      {action && (
        <span className="text-xs text-accent font-medium cursor-pointer">{action}</span>
      )}
    </div>
  );
}

// ─── Continue assessment ────────────────────────────────────
interface OngoingAssessment {
  id: string;
  patientName: string;
  age: number;
  disorder: string;
  code: string;
  progress: number;
  lastEditLabel: string;
  criteriaDone: number;
  criteriaTotal: number;
}

function useOngoingAssessments() {
  return useQuery({
    queryKey: ["assessments", "ongoing"],
    // TODO: replace with PocketBase fetch — pb.collection('assessments').getList(1, 3, { filter: 'state="em-andamento"' })
    queryFn: async (): Promise<OngoingAssessment[]> => [
      { id: "1", patientName: "Marina S.",  age: 32, disorder: "TDAH",                              code: "F90",   progress: 0.66, lastEditLabel: "há 2h",     criteriaDone: 6, criteriaTotal: 9 },
      { id: "2", patientName: "Roberto A.", age: 47, disorder: "Transtorno Depressivo Maior",       code: "F32",   progress: 0.85, lastEditLabel: "ontem",     criteriaDone: 7, criteriaTotal: 9 },
      { id: "3", patientName: "Helena T.",  age: 19, disorder: "Anorexia Nervosa",                  code: "F50.0", progress: 0.40, lastEditLabel: "há 3 dias", criteriaDone: 3, criteriaTotal: 5 },
    ],
  });
}

function ContinueAssessmentBlock() {
  const { data: items = [] } = useOngoingAssessments();
  return (
    <section>
      <BlockTitle title="Continuar avaliação" action="Ver todas →" />
      <div className="grid grid-cols-3 gap-4">
        {items.map((it) => (
          <article
            key={it.id}
            className="px-5 py-4 bg-surface border border-border rounded-[var(--radius-card)] cursor-pointer flex flex-col gap-3 hover:border-border-hi transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[11px] text-text-3 mb-1">
                  {it.code} · {it.disorder}
                </div>
                <div className="font-serif text-lg font-medium text-text tracking-tight">
                  {it.patientName}
                </div>
                <div className="text-xs text-text-3 mt-0.5">
                  {it.age} anos · {it.lastEditLabel}
                </div>
              </div>
              <ArrowUpRight size={14} className="text-text-3" />
            </div>
            <div>
              <div className="flex justify-between text-[11px] text-text-3 mb-1.5 tabular-nums">
                <span>{Math.round(it.progress * 100)}% completo</span>
                <span>{it.criteriaDone}/{it.criteriaTotal} critérios</span>
              </div>
              <ProgressBar value={it.progress} height={3} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

// ─── Active patients ────────────────────────────────────────
interface ActivePatient {
  id: string;
  name: string;
  lastLabel: string;
  nextLabel: string;
  status: "acompanhamento" | "em-avaliacao";
}

function useActivePatients() {
  return useQuery({
    queryKey: ["patients", "active"],
    queryFn: async (): Promise<ActivePatient[]> => [
      { id: "1", name: "Marina Schmidt",  lastLabel: "TDAH · há 2h",                 nextLabel: "amanhã, 14h",      status: "acompanhamento" },
      { id: "2", name: "Roberto Amaral",  lastLabel: "TDM · ontem",                  nextLabel: "sex, 09h",         status: "acompanhamento" },
      { id: "3", name: "Helena Tavares",  lastLabel: "Anorexia · há 3d",             nextLabel: "qua, 16h",         status: "em-avaliacao" },
      { id: "4", name: "Joaquim P. Lima", lastLabel: "Transtorno Bipolar I · há 1w", nextLabel: "segunda, 11h",     status: "acompanhamento" },
      { id: "5", name: "Cecília Ribeiro", lastLabel: "TEA · há 2w",                  nextLabel: "qui (29/5), 10h",  status: "em-avaliacao" },
    ],
  });
}

function ActivePatientsBlock() {
  const { data: rows = [] } = useActivePatients();
  return (
    <section>
      <BlockTitle title="Pacientes ativos" action="Todos os 24 →" />
      <div className="bg-surface border border-border rounded-[var(--radius-card)]">
        {rows.map((r, i) => (
          <div
            key={r.id}
            className={cn(
              "grid grid-cols-[1.5fr_1fr_1fr_auto] px-4 py-3 items-center gap-3 text-xs",
              i > 0 && "border-t border-border"
            )}
          >
            <div>
              <div className="text-text font-medium mb-0.5">{r.name}</div>
              <div className="text-[11px] text-text-3">última: {r.lastLabel}</div>
            </div>
            <div className="text-text-2 inline-flex items-center gap-1">
              <Calendar size={11} className="text-text-4" />
              {r.nextLabel}
            </div>
            <div>
              <Badge >
                {r.status === "acompanhamento" ? "em acompanhamento" : "em avaliação"}
              </Badge>
            </div>
            <ChevronRight size={14} className="text-text-4" />
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Quick shortcuts ────────────────────────────────────────
interface Shortcut { code: string; name: string; sub: string; }

function useFavoriteDisorders() {
  return useQuery({
    queryKey: ["disorders", "favorites"],
    queryFn: async (): Promise<Shortcut[]> => [
      { code: "F90",   name: "TDAH",                        sub: "Polythetic · 5/9" },
      { code: "F32",   name: "Transtorno Depressivo Maior", sub: "Polythetic · 5/9" },
      { code: "F33",   name: "Bipolar I",                   sub: "Conjunção temporal" },
      { code: "F41.1", name: "Ansiedade Generalizada",      sub: "Polythetic · 3/6" },
    ],
  });
}

function QuickShortcutsBlock() {
  const { data: shortcuts = [] } = useFavoriteDisorders();
  return (
    <section>
      <BlockTitle
        title="Atalhos rápidos"
        extra={
          <span className="text-[11px] text-text-3">
            os transtornos que você mais usa
          </span>
        }
      />
      <div className="grid grid-cols-2 gap-2">
        {shortcuts.map((s) => (
          <button
            key={s.code}
            type="button"
            className="px-3.5 py-3 bg-surface border border-border rounded-[var(--radius-card)] cursor-pointer flex flex-col gap-1 text-left hover:border-border-hi transition-colors"
          >
            <span className="text-[11px] text-text-3 font-mono">{s.code}</span>
            <span className="text-xs text-text font-medium truncate">{s.name}</span>
            <span className="text-[11px] text-text-4">{s.sub}</span>
          </button>
        ))}
      </div>
      <Button size="sm" className="mt-3 w-full">
        Nova avaliação
      </Button>
    </section>
  );
}

// ─── Recent activity ────────────────────────────────────────
interface Activity {
  id: string;
  time: string;
  patient: string;
  action: string;
  icon: "edit" | "sparkle" | "check" | "download" | "plus";
}

const activityIcons = {
  edit:     <Edit3 size={13} />,
  sparkle:  <Sparkles size={13} />,
  check:    <Check size={13} />,
  download: <Download size={13} />,
  plus:     <Plus size={13} />,
} as const;

function useRecentActivity() {
  return useQuery({
    queryKey: ["activity", "recent"],
    queryFn: async (): Promise<Activity[]> => [
      { id: "1", time: "há 2h",  patient: "Marina S.",  action: "Atualizou critérios A.1 de TDAH",                  icon: "edit" },
      { id: "2", time: "há 4h",  patient: "Marina S.",  action: "Subtipo inferido: predominantemente desatento",   icon: "sparkle" },
      { id: "3", time: "ontem",  patient: "Roberto A.", action: "Finalizou avaliação · TDM, episódio único, grave",icon: "check" },
      { id: "4", time: "ontem",  patient: "Roberto A.", action: "Exportou relatório markdown",                      icon: "download" },
      { id: "5", time: "há 2d",  patient: "Helena T.",  action: "Iniciou avaliação · Anorexia Nervosa",             icon: "plus" },
    ],
  });
}

function RecentActivityBlock() {
  const { data: items = [] } = useRecentActivity();
  return (
    <section className="mt-8">
      <BlockTitle title="Atividade recente" action="Diário completo →" />
      <div className="flex flex-col bg-surface border border-border rounded-[var(--radius-card)]">
        {items.map((it, i) => (
          <div
            key={it.id}
            className={cn(
              "flex items-center gap-3.5 px-4.5 py-3.5",
              i > 0 && "border-t border-border"
            )}
            style={{ padding: "14px 18px" }}
          >
            <div className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center text-text-2 shrink-0">
              {activityIcons[it.icon]}
            </div>
            <div className="flex-1 text-xs text-text-2">
              <strong className="text-text font-semibold">{it.patient}</strong>
              <span className="text-text-3"> · </span>
              {it.action}
            </div>
            <div className="text-xs text-text-4 tabular-nums">{it.time}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

---

## src/components/workspace/config/EsqueciSenha.tsx
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Mail, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SquircleButton } from '@/components/ui/SquircleButton'
import { GTMedicsLoadingModal } from '@/components/workspace/GTMedicsLoadingModal'

function emailValidator(value: string) {
  if (!value || value.trim() === '') return 'E-mail é obrigatório'
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(value)) return 'Informe um e-mail válido'
  return undefined
}

export default function EsqueciSenha() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const validationError = emailValidator(email)
    if (validationError) {
      setError(validationError)
      return
    }

    setIsSubmitting(true)
    // TODO: Integrar com API de recuperação de senha
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setEnviado(true)
    setIsSubmitting(false)
  }

  return (
    <div
      className="flex flex-1 items-center justify-center py-12 px-4"
      style={{
        background:
          'radial-gradient(circle at 0% 0%, #d4e3ff 0%, transparent 40%), radial-gradient(circle at 100% 100%, #e8f5e9 0%, transparent 40%), #f9f9ff',
      }}
    >
      <div className="w-full max-w-[440px] bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-[32px]">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-[32px]">
          <div className="w-[64px] h-[64px] rounded-full bg-primary-fixed flex items-center justify-center mb-[16px]">
            <KeyRound className="text-primary" size={32} />
          </div>
          <h1 className="font-manrope text-headline-md text-on-surface mb-[4px]">
            Recuperar senha
          </h1>
          <p className="text-body-sm text-on-surface-variant">
            Informe seu e-mail para receber o link de redefinição
          </p>
        </div>

        {enviado ? (
          /* Success state */
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="font-manrope text-headline-sm font-semibold text-on-surface">
              E-mail enviado!
            </h2>
            <p className="text-body-sm text-on-surface-variant max-w-xs">
              Se houver uma conta associada a{' '}
              <strong className="text-on-surface">{email}</strong>, você receberá
              um link para redefinir sua senha em poucos minutos.
            </p>
            <div className="mt-2 w-full">
              <SquircleButton
                variant="blue"
                size="full"
                label="Voltar para o login"
                onClick={() => (window.location.href = '/login')}
              />
            </div>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="flex flex-col gap-[24px]">
            <div className="flex flex-col gap-[6px]">
              <Label className="text-label-md text-on-surface-variant ml-1">
                E-mail
              </Label>
              <div className="relative group">
                <Mail
                  className="absolute left-[16px] top-1/2 -translate-y-1/2 text-outline transition-colors duration-200 group-focus-within:text-outline"
                  size={20}
                />
                <Input
                  type="email"
                  placeholder="nome@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-container-low border-outline-variant rounded-lg pl-[48px] pr-[16px] py-[12px] placeholder:text-outline/60 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
                />
              </div>
              {error && (
                <p className="text-body-sm text-error ml-1">{error}</p>
              )}
            </div>

            <SquircleButton
              type="submit"
              variant="blue"
              size="full"
              label={isSubmitting ? 'Enviando...' : 'Enviar link de recuperação'}
              icon={Mail}
              disabled={isSubmitting}
            />

            {/* Back to login */}
            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-body-sm text-primary font-semibold hover:underline transition-all duration-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para o login
              </Link>
            </div>
          </form>
        )}
      </div>
      <GTMedicsLoadingModal isOpen={isSubmitting} onClose={() => {}} />
    </div>
  )
}

---

## src/components/workspace/config/Sobre.tsx
import {
  Activity,
  Award,
  BarChart3,
  BookOpen,
  Brain,
  ClipboardCheck,
  HeartPulse,
  Lock,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { LazyBackground } from '@/components/ui/LazyBackground'

/* ──────────────────── DATA ──────────────────── */

const ESCALAS_POR_CATEGORIA = [
  {
    titulo: 'Ansiedade',
    icone: Activity,
    cor: 'bg-rose-50 text-rose-600 border-rose-200',
    escalas: [
      'GAD-7 (Generalized Anxiety Disorder)',
      'Hamilton Anxiety Scale (HAMA)',
      'LSAS (Liebowitz Social Anxiety Scale)',
      'ASRS (ADHD Self-Report Scale)',
      'SCARED (Screen for Child Anxiety)',
      'RAADS-R (Ritvo Autism Asperger)',
    ],
  },
  {
    titulo: 'Depressão & Humor',
    icone: HeartPulse,
    cor: 'bg-blue-50 text-blue-600 border-blue-200',
    escalas: [
      'PHQ-9 (Patient Health Questionnaire)',
      'Beck Depression Inventory (BDI)',
      'BDRS (Bipolar Depression Rating Scale)',
      'EPDS (Edinburgh Postnatal Depression)',
      'MFQ (Mood and Feelings Questionnaire)',
      'McLean Screening Instrument (MSI-BPD)',
      'YMRS (Young Mania Rating Scale)',
    ],
  },
  {
    titulo: 'Sono',
    icone: Zap,
    cor: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    escalas: [
      'ISI (Insomnia Severity Index)',
      'Epworth Sleepiness Scale (ESS)',
      'STOP-BANG (Apneia do Sono)',
    ],
  },
  {
    titulo: 'Dependência & Comportamento',
    icone: ShieldCheck,
    cor: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    escalas: [
      'AUDIT (Alcohol Use Disorders)',
      'DAST-10 (Drug Abuse Screening)',
      'ASSIST (Alcohol, Smoking, Substance)',
      'Fagerström (Dependência de Nicotina)',
      'YBOCS (Obsessive-Compulsive)',
      'OBQ-44 (Obsessive Beliefs)',
      'OCIR (Obsessive-Compulsive Inventory)',
    ],
  },
  {
    titulo: 'Trauma & Estresse',
    icone: Users,
    cor: 'bg-amber-50 text-amber-600 border-amber-200',
    escalas: [
      'PCL-5 (PTSD Checklist)',
      'CAPS-5 (Clinician-Administered PTSD)',
      'DES-II (Dissociative Experiences)',
      'DAS (Differential Appraisal Scale)',
      'PSS-10 (Perceived Stress Scale)',
      'PSWQ (Penn State Worry Questionnaire)',
    ],
  },
  {
    titulo: 'Saúde Mental Geral',
    icone: Brain,
    cor: 'bg-purple-50 text-purple-600 border-purple-200',
    escalas: [
      'WHO-5 (Well-Being Index)',
      'WHODAS 2.0 (Disability Assessment)',
      'GAF (Global Assessment of Functioning)',
      'GAF-PS (Glossário Anexo para Funcionamento)',
      'CGI-S / CGI-I (Clinical Global Impressions)',
      'UKU (Side Effect Rating Scale)',
    ],
  },
  {
    titulo: 'Infantojuvenil',
    icone: BookOpen,
    cor: 'bg-sky-50 text-sky-600 border-sky-200',
    escalas: [
      'SDQ (Strengths and Difficulties)',
      'M-CHAT-R (Autism Toddler)',
      'CBI (Childhood Bipolarity)',
      'CARS (Childhood Autism Rating)',
    ],
  },
  {
    titulo: 'Cognição & Outros',
    icone: BarChart3,
    cor: 'bg-slate-50 text-slate-600 border-slate-200',
    escalas: [
      'MMSE (Mini Mental State Examination)',
      'IQCODE (Informant Questionnaire)',
      'BPRS (Brief Psychiatric Rating Scale)',
      'BSL-23 (Borderline Symptom List)',
      'PID-5 (Personality Inventory DSM-5)',
      'Big Five (Personalidade)',
      'IQ Test (Raven & Wechsler)',
      'TypeIQ (Tipologia Intelectual)',
    ],
  },
]

const DIFERENCIAIS = [
  {
    icone: ClipboardCheck,
    titulo: '70+ Escalas Validadas',
    descricao:
      'Biblioteca completa com as principais escalas psicométricas nacionais e internacionais, todas revisadas e validadas para uso clínico.',
  },
  {
    icone: Lock,
    titulo: 'Conformidade LGPD & HIPAA',
    descricao:
      'Criptografia ponta-a-ponta, dados hospedados em datacenters certificados e total conformidade com a Lei Geral de Proteção de Dados.',
  },
  {
    icone: TrendingUp,
    titulo: 'Monitoramento em Tempo Real',
    descricao:
      'Acompanhamento da evolução do paciente com gráficos interativos, histórico completo e alertas automáticos de sinais de risco.',
  },
  {
    icone: Users,
    titulo: 'Multiusuário & Colaboração',
    descricao:
      'Gestão de múltiplos profissionais, supervisão de equipes e compartilhamento seguro de prontuários entre membros da equipe.',
  },
  {
    icone: Award,
    titulo: 'Relatórios Automatizados',
    descricao:
      'Geração de relatórios clínicos completos em PDF com interpretação baseada em evidências, prontos para anexar ao prontuário.',
  },
  {
    icone: Zap,
    titulo: 'Aplicação Remota',
    descricao:
      'Envie links personalizados para seus pacientes aplicarem as escalas no próprio celular ou computador, sem necessidade de instalação.',
  },
]

/* ═══════════════════════ SOBRE PAGE ═══════════════════════ */

export default function Sobre() {
  return (
    <LazyBackground
      src="https://firebasestorage.googleapis.com/v0/b/gt-medic-98c72.firebasestorage.app/o/bird2.jpg?alt=media&token=abe94d40-ce47-4ab0-bede-faffe9e393e4"
      overlayClassName="opacity-40"
      className="flex flex-col text-on-surface"
    >

      {/* HERO CARD */}
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <Card className="border-none bg-white/40 backdrop-blur-xs shadow-xl">
          <CardContent className="flex flex-col items-center text-center pt-10 pb-10">
            <img
              src="/icons/mental3.svg"
              alt="Mental Health"
              className="w-32 h-32 md:w-40 md:h-40 mb-4"
            />
            <CardTitle className="font-manrope text-3xl md:text-4xl font-bold text-on-surface max-w-2xl">
              A ciência por trás de cada avaliação
            </CardTitle>
            <CardDescription className="mt-4 text-lg text-on-surface-variant max-w-xl">
              A GT-Medics Escalas reúne mais de 70 instrumentos psicométricos validados em
              uma única plataforma, projetada para profissionais de saúde mental.
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* ESTATÍSTICAS CARDS */}
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-10 md:pb-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { valor: '70+', label: 'Escalas disponíveis' },
            { valor: '15+', label: 'Categorias clínicas' },
            { valor: '100%', label: 'Conformidade LGPD' },
            { valor: '24/7', label: 'Acesso remoto' },
          ].map((stat) => (
            <Card
              key={stat.label}
              className="border-none bg-white/40 backdrop-blur-xs shadow-xl"
            >
              <CardContent className="text-center pt-6 pb-6">
                <p className="font-manrope text-headline-lg font-bold text-primary">
                  {stat.valor}
                </p>
                <p className="mt-1 text-body-sm text-on-surface-variant">
                  {stat.label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* DIFERENCIAIS CARDS */}
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <Card className="mb-10 border-none bg-white/40 backdrop-blur-xs shadow-xl">
          <CardContent className="text-center pt-8 pb-8">
            <CardTitle className="font-manrope text-headline-lg-mobile md:text-headline-lg font-semibold text-on-surface">
              Por que escolher a GT-Medics?
            </CardTitle>
            <CardDescription className="mt-3 text-body-md text-on-surface-variant max-w-2xl mx-auto">
              Ferramentas desenvolvidas por e para profissionais de saúde mental,
              combinando rigor científico com experiência digital intuitiva.
            </CardDescription>
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {DIFERENCIAIS.map((item) => (
            <Card
              key={item.titulo}
              className="border-none bg-white/40 backdrop-blur-xs shadow-xl transition-shadow hover:shadow-md"
            >
              <CardContent className="pt-6 pb-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-fixed mb-4">
                  <item.icone className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-manrope text-headline-sm font-semibold text-on-surface mb-2">
                  {item.titulo}
                </h3>
                <p className="text-body-sm text-on-surface-variant leading-relaxed">
                  {item.descricao}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ESCALAS POR CATEGORIA CARDS */}
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-14">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ESCALAS_POR_CATEGORIA.map((cat) => (
            <Card
              key={cat.titulo}
              className="border-none bg-white/40 backdrop-blur-xs shadow-xl"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg border ${cat.cor}`}
                  >
                    <cat.icone className="h-5 w-5" />
                  </div>
                  <CardTitle className="font-manrope text-headline-sm font-semibold text-on-surface">
                    {cat.titulo}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-shadow-xs font-medium">
                  {cat.escalas.map((escala) => (
                    <li
                      key={escala}
                      className="flex items-start gap-2 text-body-sm text-on-surface-variant"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                      {escala}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* COMO FUNCIONA CARDS */}
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              passo: '',
              titulo: 'Profissionais',
              descricao:
                'Todos os profissionais de saúde são bem-vindos.',
            },
            {
              passo: '',
              titulo: 'Cadastre seus pacientes',
              descricao:
                'Envie para seus pacientes, dados mínimos, sigilo e segurança.',
            },
            {
              passo: '',
              titulo: 'Aplicação e acompanhamento',
              descricao:
                'Escolha a escala, aplique e acompanhe a evolução do seu paciente.',
            },
          ].map((etapa) => (
            <Card
              key={etapa.passo}
              className="border-none bg-white/40 backdrop-blur-xs shadow-xl text-center"
            >
              <CardContent className="pt-8 pb-8">
                <span className="font-manrope text-display-lg font-bold text-primary/20">
                  {etapa.passo}
                </span>
                <h3 className="font-manrope text-headline-sm font-semibold text-on-surface mt-2">
                  {etapa.titulo}
                </h3>
                <p className="mt-2 text-body-sm text-on-surface-variant leading-relaxed">
                  {etapa.descricao}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </LazyBackground>
  )
}

---

## src/components/workspace/config/CriarConta.tsx
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { User, Mail, Lock, ShieldCheck, Info, Shield, UserPlus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SquircleButton } from '@/components/ui/SquircleButton'
import { LazyBackground } from '@/components/ui/LazyBackground'
import { useAuth } from '@/context/AuthContext'
import { getPostAuthPath } from '@/lib/authClient'
import { requestGoogleIdToken, renderGoogleButton } from '@/lib/googleIdentity'
import { GTMedicsLoadingModal } from '@/components/workspace/GTMedicsLoadingModal'

/* ── Google G icon SVG ── */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

/* ── Validation helpers ── */
function nomeValidator(value: string) {
  if (!value || value.trim() === '') return 'Nome completo é obrigatório'
  if (value.trim().length < 2) return 'Nome deve ter no mínimo 2 caracteres'
  return undefined
}

function emailValidator(value: string) {
  if (!value || value.trim() === '') return 'E-mail é obrigatório'
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(value)) return 'Informe um e-mail válido'
  return undefined
}

function passwordValidator(value: string) {
  if (!value || value === '') return 'Senha é obrigatória'
  if (value.length < 8) return 'Senha deve ter no mínimo 8 caracteres'
  if (!/\d/.test(value)) return 'Senha deve conter pelo menos um número'
  return undefined
}

function confirmPasswordValidator(value: string, passwordValue: string) {
  if (!value || value === '') return 'Confirmação de senha é obrigatória'
  if (value !== passwordValue) return 'As senhas não coincidem'
  return undefined
}

export default function CriarConta() {
  const navigate = useNavigate()
  const { register, loginWithGoogleToken } = useAuth()
  const [passwordValue, setPasswordValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showGoogleBtn, setShowGoogleBtn] = useState(false)
  const googleBtnRef = useRef<HTMLDivElement>(null)

  const form = useForm({
    defaultValues: {
      nomeCompleto: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    onSubmit: async ({ value }) => {
      setErrorMessage('')
      setIsSubmitting(true)
      try {
        const session = await register({
          nomeCompleto: value.nomeCompleto,
          email: value.email,
          password: value.password,
          telefone: '',
        })
        await navigate({ to: getPostAuthPath(session.user) })
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Falha ao criar conta.')
      } finally {
        setIsSubmitting(false)
      }
    },
  })

  const handleGoogleLogin = async () => {
    setErrorMessage('')
    setIsSubmitting(true)
    try {
      const googleToken = await requestGoogleIdToken()
      const session = await loginWithGoogleToken(googleToken)
      await navigate({ to: getPostAuthPath(session.user) })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Falha ao continuar com Google.'
      if (msg.includes('GOOGLE_ONE_TAP_BLOCKED')) {
        setIsSubmitting(false)
        setShowGoogleBtn(true)
        return
      }
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (!showGoogleBtn || !googleBtnRef.current) return
    let cancelled = false
    renderGoogleButton(googleBtnRef.current, { width: '300' })
      .then(async (token) => {
        if (cancelled) return
        setIsSubmitting(true)
        try {
          const session = await loginWithGoogleToken(token)
          await navigate({ to: getPostAuthPath(session.user) })
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : 'Falha ao continuar com Google.')
        } finally {
          setIsSubmitting(false)
        }
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [showGoogleBtn])

  return (
    <LazyBackground
      src="https://firebasestorage.googleapis.com/v0/b/gt-medic-98c72.firebasestorage.app/o/bonzai.jpg?alt=media&token=f26fcb5c-d60c-4d22-a74a-feb7d3855d3c"
      overlayClassName="opacity-50"
      className="flex flex-1 items-center justify-center py-12 px-4"
    >
      {/* ── Sign-up Card ── */}
      <div className="w-full max-w-[480px] bg-linear-to-b from-sky-100/70 via-slate-100/70 to-indigo-100/70 rounded-xl shadow-sm border border-outline-variant/30 p-5 md:p-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-[32px]">
          <div className="flex flex-row items-center gap-3">
            <img
              src="/icons/mental2.svg"
              alt="Ícone"
              className="w-14 h-14 md:w-20 md:h-20 bg-gray-100/80 p-2 rounded-full shadow-xl shadow-slate-00"
            />
          </div>
          <h1 className="font-manrope text-headline-md text-slate-900/80 text-shadow-sm mb-[4px]">
            GT-Medics Escalas
          </h1>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex flex-col items-center justify-center gap-[24px]"
        >
          <div className="w-full flex flex-col text-slate-900/80 gap-y-6">
            {/* Nome completo */}
            <form.Field
              name="nomeCompleto"
              validators={{
                onChange: ({ value }) => nomeValidator(value),
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-[6px]">
                  <Label className="text-label-md text-slate-900/80 text-shadow-sm ml-1">
                    Nome completo
                  </Label>
                  <div className="relative group">
                    <User
                      className="absolute left-[16px] top-1/2 -translate-y-1/2 text-outline transition-colors duration-200 group-focus-within:text-primary"
                      size={20}
                    />
                    <Input
                      type="text"
                      placeholder="Como deseja ser chamado?"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="w-full bg-surface-container-low border-outline-variant rounded-lg pl-[48px] pr-[16px] py-[12px] placeholder:text-outline/60 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
                    />
                  </div>
                  {field.state.meta.errors?.[0] && (
                    <p className="text-body-sm text-error ml-1">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            {/* E-mail */}
            <form.Field
              name="email"
              validators={{
                onChange: ({ value }) => emailValidator(value),
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-6">
                  <Label className="text-label-md text-slate-900/80 text-shadow-sm ml-1">
                    E-mail
                  </Label>
                  <div className="relative group">
                    <Mail
                      className="absolute left-[16px] top-1/2 -translate-y-1/2 text-outline transition-colors duration-200 group-focus-within:text-primary"
                      size={20}
                    />
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="w-full bg-surface-container-low border-outline-variant rounded-lg pl-[48px] pr-[16px] py-[12px] placeholder:text-outline/60 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
                    />
                  </div>
                  {field.state.meta.errors?.[0] && (
                    <p className="text-body-sm text-error ml-1">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            {/* Senha */}
            <form.Field
              name="password"
              validators={{
                onChange: ({ value }) => passwordValidator(value),
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-[6px]">
                  <Label className="text-label-md text-slate-900/80 text-shadow-sm ml-1">
                    Senha
                  </Label>
                  <div className="relative group">
                    <Lock
                      className="absolute left-[16px] top-1/2 -translate-y-1/2 text-outline transition-colors duration-200 group-focus-within:text-primary"
                      size={20}
                    />
                    <Input
                      type="password"
                      placeholder="Crie uma senha forte"
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value)
                        setPasswordValue(e.target.value)
                      }}
                      onBlur={field.handleBlur}
                      className="w-full bg-surface-container-low border-outline-variant rounded-lg pl-[48px] pr-[16px] py-[12px] placeholder:text-outline/60 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
                    />
                  </div>
                  {field.state.meta.errors?.[0] && (
                    <p className="text-body-sm text-error ml-1">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                  {/* Password hint */}
                  <div className="flex items-center gap-[4px] mt-[4px]">
                    <Info className="text-tertiary shrink-0" size={16} />
                    <span className="text-label-sm text-tertiary">
                      Mínimo de 8 caracteres, incluindo números e símbolos.
                    </span>
                  </div>
                </div>
              )}
            </form.Field>

            {/* Confirmar senha */}
            <form.Field
              name="confirmPassword"
              validators={{
                onChange: ({ value }) =>
                  confirmPasswordValidator(value, passwordValue),
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-[6px]">
                  <Label className="text-label-md text-slate-900/80 text-shadow-sm ml-1">
                    Confirmar senha
                  </Label>
                  <div className="relative group">
                    <ShieldCheck
                      className="absolute left-[16px] top-1/2 -translate-y-1/2 text-outline transition-colors duration-200 group-focus-within:text-primary"
                      size={20}
                    />
                    <Input
                      type="password"
                      placeholder="Repita sua senha"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="w-full bg-surface-container-low border-outline-variant rounded-lg pl-[48px] pr-[16px] py-[12px] placeholder:text-outline/60 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
                    />
                  </div>
                  {field.state.meta.errors?.[0] && (
                    <p className="text-body-sm text-error ml-1">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          {/* Submit Button */}
          <SquircleButton
            type="submit"
            variant="blue"
            size="mini"
            fontWeight={700}
            label={isSubmitting ? 'Criando conta...' : 'Criar conta gratuita'}
            icon={UserPlus}
            disabled={isSubmitting}
            className="mt-2 items-center justify-center"
          />
        </form>

        {errorMessage && (
          <div className="mt-[16px] rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        {/* Divider */}
        <div className="relative flex items-center my-6 md:my-8">
          <div className="flex-grow border-t border-outline-variant" />
          <span className="mx-[16px] text-label-sm text-on-surface-variant uppercase tracking-widest">
            ou
          </span>
          <div className="flex-grow border-t border-outline-variant" />
        </div>

        <div className="flex flex-col items-center justify-center w-full">
          {!showGoogleBtn && (
            <SquircleButton
              type="button"
              variant="white"
              size="mini"
              fontWeight={700}
              label="Continuar com Google"
              icon={GoogleIcon}
              disabled={isSubmitting}
              onClick={handleGoogleLogin}
            />
          )}
          {showGoogleBtn && (
            <div className="flex flex-col items-center gap-2">
              <div ref={googleBtnRef} />
              <button
                type="button"
                onClick={() => { setShowGoogleBtn(false) }}
                className="text-xs text-muted-foreground hover:underline"
              >
                Voltar
              </button>
            </div>
          )}
        </div>

        {/* Privacy & Security Card */}
        <div className="mt-[24px] bg-surface-container-low rounded-lg p-[16px] flex items-start gap-[16px]">
          <div className="flex gap-4">

            <div className="p-2 bg-gray-50 rounded-full shadow-xl">
              <Shield className="text-slate-800/80 shrink-0 mt-0.5" size={20} />
            </div>

            <div>
              <p className="text-label-md font-semibold text-slate-800/80">
                Criptografia de ponta a ponta
              </p>
            </div>

          </div>
        </div>

        {/* Footer Link */}
        <div className="mt-[24px] pt-[16px] border-t border-outline-variant/30 text-center">
          <span className="text-body-sm text-on-surface-variant">
            Já tem uma conta?{' '}
          </span>
            <Link
              to="/login"
              className="text-body-sm text-primary font-semibold hover:underline transition-all duration-200 ml-[4px]"
            >
              Fazer login
            </Link>
          </div>
        </div>
      <GTMedicsLoadingModal isOpen={isSubmitting} onClose={() => {}} />
    </LazyBackground>
  )
}

---

## src/components/workspace/config/PoliticaDePrivacidade.tsx
import { Link } from '@tanstack/react-router'
import { Shield, FileText, Eye, Lock, Server, Mail, UserX } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import { LazyBackground } from '@/components/ui/LazyBackground'

export default function PoliticaDePrivacidade() {
  return (
    <LazyBackground
      src="https://firebasestorage.googleapis.com/v0/b/gt-medic-98c72.firebasestorage.app/o/bird.jpg?alt=media&token=0869c5a4-badf-49f7-85cf-2673243a04f0"
      overlayClassName="opacity-50"
      className="flex flex-col text-on-surface"
    >

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <Card className="border-outline-variant/60 bg-surface/80 backdrop-blur-sm mb-8">
          <CardContent className="pt-10 pb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-wider text-primary">
                Documento legal
              </span>
            </div>
            <CardTitle className="text-3xl md:text-4xl font-bold font-manrope text-on-surface">
              Política de Privacidade
            </CardTitle>
            <CardDescription className="mt-4 text-lg text-on-surface-variant max-w-2xl">
              Compromisso da GT-Medics com a proteção dos seus dados pessoais e dos dados dos
              pacientes, em total conformidade com a Lei Geral de Proteção de Dados (LGPD).
            </CardDescription>
            <p className="mt-2 text-sm text-on-surface-variant/70">
              Última atualização: 10 de maio de 2026
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-6">
            {[{
              num: '1',
              titulo: 'Introdução',
              texto: 'A GT-Medics valoriza a privacidade e a segurança dos dados de seus usuários e dos pacientes atendidos por meio da plataforma. Esta Política de Privacidade descreve como coletamos, utilizamos, armazenamos, compartilhamos e protegemos as informações, em estrita observância à LGPD e demais normas aplicáveis.',
            }, {
              num: '2',
              titulo: 'Dados Coletados',
              texto: 'Coletamos diferentes categorias de dados, dependendo do tipo de usuário e do uso da plataforma:',
              cards: [
                { titulo: 'Dados do profissional', texto: 'Nome completo, e-mail, CPF, número de registro profissional (CRM, CRP, etc.), especialidade e dados de contato.' },
                { titulo: 'Dados dos pacientes', texto: 'Nome, data de nascimento, contato de emergência, histórico de aplicação de escalas, respostas e resultados de avaliações psicométricas.' },
                { titulo: 'Dados de uso', texto: 'Endereço IP, logs de acesso, tipo de navegador, páginas visitadas, interações com a plataforma e preferências de configuração.' },
              ],
            }, {
              num: '3',
              titulo: 'Base Legal e Finalidades',
              texto: 'O tratamento de dados pessoais é realizado com base nas hipóteses legais previstas no art. 7º da LGPD, principalmente:',
              lista: [
                'Execução de contrato — para prestação dos serviços da plataforma e funcionalidades contratadas.',
                'Consentimento — quando necessário para finalidades específicas, como envio de comunicações de marketing.',
                'Obrigação legal — para cumprimento de normas regulatórias da saúde e ordens judiciais.',
                'Legítimo interesse — para melhorias na plataforma, prevenção de fraudes e garantia da segurança dos dados.',
              ],
            }, {
              num: '4',
              titulo: 'Compartilhamento de Dados',
              texto: 'Os dados pessoais dos usuários e pacientes não são vendidos a terceiros. O compartilhamento ocorre apenas nas seguintes hipóteses:',
              lista: [
                'Prestadores de serviço — empresas de hospedagem em nuvem, processamento de pagamentos e suporte técnico, sob contrato de confidencialidade.',
                'Obrigação legal — quando exigido por lei, regulamentação ou ordem judicial competente.',
                'Consentimento expresso — quando o titular autorizar previamente o compartilhamento.',
              ],
            }, {
              num: '5',
              titulo: 'Segurança da Informação',
              texto: 'Adotamos medidas técnicas e administrativas aptas a proteger os dados pessoais de acessos não autorizados, situações destrutivas, acidentais ou ilícitas:',
              lista: [
                'Criptografia ponta-a-ponta (TLS 1.3) para transmissão de dados.',
                'Armazenamento criptografado em repouso (AES-256).',
                'Controle de acesso baseado em papéis (RBAC).',
                'Autenticação multifator (MFA) disponível para contas profissionais.',
                'Backups regulares e plano de recuperação de desastres.',
                'Monitoramento contínuo de segurança e detecção de anomalias.',
              ],
            }, {
              num: '6',
              titulo: 'Direitos do Titular',
              texto: 'Conforme a LGPD, o titular dos dados possui os seguintes direitos:',
              lista: [
                'Confirmação da existência de tratamento de dados.',
                'Acesso aos dados pessoais tratados.',
                'Correção de dados incompletos, inexatos ou desatualizados.',
                'Anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos.',
                'Portabilidade dos dados para outro fornecedor de serviço.',
                'Revogação do consentimento, quando aplicável.',
                'Informação sobre compartilhamento de dados com terceiros.',
              ],
              extra: 'Para exercer seus direitos, entre em contato pelo e-mail privacidade@gtmedics.com.br. Responderemos em até 15 dias úteis.',
            }, {
              num: '7',
              titulo: 'Retenção e Exclusão',
              texto: 'Os dados pessoais são mantidos pelo período necessário para cumprir as finalidades descritas nesta política ou para atender a obrigações legais (ex.: prazos prescricionais na área da saúde). Após o término do contrato ou desativação da conta, os dados podem ser anonimizados ou excluídos, salvo quando houver obrigação legal de retenção.',
            }, {
              num: '8',
              titulo: 'Encarregado de Dados (DPO)',
              texto: 'A GT-Medics nomeou um Encarregado de Dados Pessoais (Data Protection Officer), responsável por atuar como canal de comunicação entre a empresa, os titulares de dados e a Autoridade Nacional de Proteção de Dados (ANPD).',
              extra: 'E-mail do DPO: privacidade@gtmedics.com.br',
            }].map((artigo) => (
              <Card
                key={artigo.num}
                className="border-outline-variant/60 bg-surface/80 backdrop-blur-sm"
              >
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                      {artigo.num}
                    </span>
                    <h2 className="text-xl font-bold font-manrope text-on-surface">
                      {artigo.titulo}
                    </h2>
                  </div>
                  <p className="text-on-surface-variant leading-relaxed">
                    {artigo.texto}
                  </p>
                  {artigo.cards && (
                    <div className="space-y-3 mt-4">
                      {artigo.cards.map((c) => (
                        <Card key={c.titulo} className="border-outline-variant/40 bg-surface-container-low/60">
                          <CardContent className="pt-4 pb-4">
                            <h4 className="font-semibold text-sm mb-1">{c.titulo}</h4>
                            <p className="text-sm text-on-surface-variant">{c.texto}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                  {artigo.lista && (
                    <ul className="list-disc list-inside space-y-2 text-on-surface-variant mt-3 ml-1">
                      {artigo.lista.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {artigo.extra && (
                    <p className="text-on-surface-variant mt-3">
                      {artigo.extra}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-6">
            <Card className="border-outline-variant/60 bg-surface/80 backdrop-blur-sm">
              <CardContent className="pt-6 pb-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  <h3 className="font-bold font-manrope">Transparência</h3>
                </div>
                <p className="text-sm text-on-surface-variant">
                  Todas as operações de tratamento de dados são registradas em nosso livro de
                  registros, disponível para consulta da ANPD quando necessário.
                </p>
              </CardContent>
            </Card>

            <Card className="border-outline-variant/60 bg-surface/80 backdrop-blur-sm">
              <CardContent className="pt-6 pb-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  <h3 className="font-bold font-manrope">Criptografia</h3>
                </div>
                <p className="text-sm text-on-surface-variant">
                  Seus dados e os dos seus pacientes são protegidos com criptografia AES-256 em
                  repouso e TLS 1.3 em trânsito.
                </p>
              </CardContent>
            </Card>

            <Card className="border-outline-variant/60 bg-surface/80 backdrop-blur-sm">
              <CardContent className="pt-6 pb-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" />
                  <h3 className="font-bold font-manrope">Hospedagem</h3>
                </div>
                <p className="text-sm text-on-surface-variant">
                  Nossa infraestrutura é hospedada em datacenters certificados (ISO 27001 e
                  SOC 2), com redundância geográfica e backups automatizados.
                </p>
              </CardContent>
            </Card>

            <Card className="border-outline-variant/60 bg-surface/80 backdrop-blur-sm">
              <CardContent className="pt-6 pb-6 space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="font-bold font-manrope">Documentos relacionados</h3>
                </div>
                <Link
                  to="/termos-de-uso"
                  className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors underline decoration-primary/30 underline-offset-4"
                >
                  <FileText className="h-4 w-4" />
                  Termos de Uso
                </Link>
              </CardContent>
            </Card>

            <Card className="border-outline-variant/60 bg-surface/80 backdrop-blur-sm">
              <CardContent className="pt-6 pb-6 space-y-4">
                <div className="flex items-center gap-2">
                  <UserX className="h-5 w-5 text-tertiary" />
                  <h3 className="font-bold font-manrope">Excluir conta</h3>
                </div>
                <p className="text-sm text-on-surface-variant">
                  Deseja encerrar sua conta e solicitar a exclusão dos seus dados? Envie um
                  e-mail para nosso DPO.
                </p>
                <a
                  href="mailto:privacidade@gtmedics.com.br"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline underline-offset-4"
                >
                  <Mail className="h-4 w-4" />
                  privacidade@gtmedics.com.br
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </LazyBackground>
  )
}

---

## src/components/workspace/config/Login.tsx
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SquircleButton } from '@/components/ui/SquircleButton'
import { useAuth } from '@/context/AuthContext'
import { getPostAuthPath } from '@/lib/authClient'
import { requestGoogleIdToken, renderGoogleButton } from '@/lib/googleIdentity'
import { useForm } from '@tanstack/react-form'
import { Link, useNavigate } from '@tanstack/react-router'
import { Lock, LogIn, Mail } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { LazyBackground } from '@/components/ui/LazyBackground'
import { GTMedicsLoadingModal } from '@/components/workspace/GTMedicsLoadingModal'

/* ── Google G icon SVG ── */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

/* ── Validation helpers ── */
function emailValidator(value: string) {
  if (!value || value.trim() === '') return 'E-mail é obrigatório'
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(value)) return 'Informe um e-mail válido'
  return undefined
}

function passwordValidator(value: string) {
  if (!value || value.trim() === '') return 'Senha é obrigatória'
  if (value.length < 8) return 'Senha deve ter no mínimo 8 caracteres'
  return undefined
}

export default function Login() {
  const navigate = useNavigate()
  const { login, loginWithGoogleToken } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [showGoogleBtn, setShowGoogleBtn] = useState(false)
  const googleBtnRef = useRef<HTMLDivElement>(null)

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      setErrorMessage('')
      setIsSubmitting(true)
      try {
        const session = await login(value)
        await navigate({ to: getPostAuthPath(session.user) })
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Falha ao fazer login.')
      } finally {
        setIsSubmitting(false)
      }
    },
  })

  const handleGoogleLogin = async () => {
    setErrorMessage('')
    setIsSubmitting(true)
    try {
      const googleToken = await requestGoogleIdToken()
      const session = await loginWithGoogleToken(googleToken)
      await navigate({ to: getPostAuthPath(session.user) })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Falha ao entrar com Google.'
      // Se One Tap foi bloqueado, mostra botao nativo do Google
      if (msg.includes('GOOGLE_ONE_TAP_BLOCKED')) {
        setIsSubmitting(false)
        setShowGoogleBtn(true)
        return
      }
      setErrorMessage(msg.replace('GOOGLE_ONE_TAP_BLOCKED:', ''))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Renderiza botao nativo do Google quando One Tap falha
  useEffect(() => {
    if (!showGoogleBtn || !googleBtnRef.current) return

    let cancelled = false
    renderGoogleButton(googleBtnRef.current, { width: '300' })
      .then(async (token) => {
        if (cancelled) return
        setIsSubmitting(true)
        try {
          const session = await loginWithGoogleToken(token)
          await navigate({ to: getPostAuthPath(session.user) })
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : 'Falha ao entrar com Google.')
        } finally {
          setIsSubmitting(false)
        }
      })
      .catch(() => {})

    return () => { cancelled = true }
  }, [showGoogleBtn])

  return (
    <LazyBackground
      src="https://firebasestorage.googleapis.com/v0/b/gt-medic-98c72.firebasestorage.app/o/bonzai.jpg?alt=media&token=***"
      overlayClassName="opacity-50"
      className="flex flex-1 items-center justify-center py-12 px-4"
    >
      {/* ── Login Card ── */}
      <div className="w-full max-w-[440px] bg-linear-to-b from-sky-100/70 via-slate-100/70 to-indigo-100/70 rounded-xl shadow-sm border border-outline-variant/30 p-5 md:p-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-[32px]">

          <div className="flex flex-row items-center gap-3">

            <img
              src="/icons/mental2.svg"
              alt="Ícone"
              className="w-14 h-14 md:w-20 md:h-20 bg-gray-100/80 p-2 rounded-full shadow-xl shadow-slate-00"
            />

          </div>
          <h1 className="font-manrope text-headline-md text-on-surface mb-[4px] text-slate-900/80 text-shadow-sm">
            GT-Medics Escalas
          </h1>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            form.handleSubmit()
          }}
          className="flex flex-col items-center justify-center gap-[24px]"
        >
          <div className="w-full text-slate-900/80">
            {/* Email Field */}
            <form.Field
              name="email"
              validators={{
                onChange: ({ value }) => emailValidator(value),
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-[6px]">
                  <Label className="text-label-md text-on-surface-variant ml-1 text-slate-900/80 text-shadow-sm">
                    E-mail
                  </Label>
                  <div className="relative group">
                    <Mail
                      className="absolute left-[16px] top-1/2 -translate-y-1/2 text-outline transition-colors duration-200 group-focus-within:text-outline"
                      size={20}
                    />
                    <Input
                      type="email"
                      placeholder="nome@exemplo.com"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="w-full bg-surface-container-low border-outline-variant rounded-lg pl-[48px] pr-[16px] py-[12px] placeholder:text-outline/60 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
                    />
                  </div>
                  {field.state.meta.errors?.[0] && (
                    <p className="text-body-sm text-error ml-1">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>

            {/* Password Field */}
            <form.Field
              name="password"
              validators={{
                onChange: ({ value }) => passwordValidator(value),
              }}
            >
              {(field) => (
                <div className="flex flex-col gap-[6px]">
                  <div className="flex justify-between items-center px-1">
                    <Label className="text-label-md text-on-surface-variant text-slate-900/80 text-shadow-sm">
                      Senha
                    </Label>
                    <Link
                      to="/esqueci-senha"
                      className="text-label-md text-primary hover:underline transition-all duration-200"
                    >
                      Esqueci minha senha
                    </Link>
                  </div>
                  <div className="relative group">
                    <Lock
                      className="absolute left-[16px] top-1/2 -translate-y-1/2 text-outline transition-colors duration-200 group-focus-within:text-outline"
                      size={20}
                    />
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      className="w-full bg-surface-container-low border-outline-variant rounded-lg pl-[48px] pr-[16px] py-[12px] placeholder:text-outline/60 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
                    />
                  </div>
                  {field.state.meta.errors?.[0] && (
                    <p className="text-body-sm text-error ml-1">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            </form.Field>
          </div>

          {/* Submit Button */}
          <SquircleButton
            type="submit"
            variant="blue"
            size="mini"
            fontWeight={700}
            label={isSubmitting ? 'Entrando...' : 'Entrar'}
            icon={LogIn}
            disabled={isSubmitting}
            className="mt-2 items-center justify-center"
          />

          <GTMedicsLoadingModal
            isOpen={isSubmitting}
            onClose={() => { }}
          />

        </form>

        {errorMessage && (
          <div className="mt-[16px] rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}



        {/* Divider */}
        <div className="relative flex items-center my-6 md:my-8">
          <div className="flex-grow border-t border-outline-variant" />
          <span className="mx-[16px] text-label-sm text-on-surface-variant uppercase tracking-widest">
            ou
          </span>
          <div className="flex-grow border-t border-outline-variant" />
        </div>

        <div className="flex flex-col items-center justify-center w-full gap-3">
          {/* Google Button — tenta One Tap primeiro */}
          {!showGoogleBtn && (
            <SquircleButton
              type="button"
              variant="white"
              size="mini"
              fontWeight={700}
              label="Entrar com Google"
              icon={GoogleIcon}
              disabled={isSubmitting}
              onClick={handleGoogleLogin}
            />
          )}

          {/* Fallback: botao nativo do Google (quando One Tap e bloqueado pelo navegador) */}
          {showGoogleBtn && (
            <div className="flex flex-col items-center gap-2">
              <div ref={googleBtnRef} />
              <button
                type="button"
                onClick={() => { setShowGoogleBtn(false) }}
                className="text-xs text-muted-foreground hover:underline"
              >
                Voltar
              </button>
            </div>
          )}
        </div>

        {/* Footer Link */}
        <p className="mt-6 md:mt-8 text-center text-body-sm text-on-surface-variant">
          Não tem uma conta?{' '}
          <Link
            to="/criar-conta"
            className="text-primary font-semibold hover:underline transition-all duration-200"
          >
            Criar nova conta
          </Link>
        </p>
      </div>
    </LazyBackground>
  )
}

---

## src/components/workspace/config/OnboardingPage.tsx
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod/v4";

import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  Stethoscope,
  HeartPulse,
  ArrowRight,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { ROLES } from "@/domain/schemas";

const crmSchema = z.string().regex(/^CRM-[A-Z]{2}\s?\d+$/, "CRM inválido");

const ROLE_OPTIONS = [
  {
    role: ROLES.COMMON,
    title: "Quero fazer escalas para mim mesmo",
    description: "Acompanho minha saúde mental sozinho",
    icon: User,
  },
  {
    role: ROLES.PATIENT,
    title: "Tenho um profissional que me acompanha",
    description: "Já recebi convite ou tenho profissional",
    icon: HeartPulse,
  },
  {
    role: ROLES.PROFESSIONAL,
    title: "Sou profissional de saúde",
    description: "Atendo pacientes e aplico escalas",
    icon: Stethoscope,
  },
];

function parseCrm(crm: string) {
  const match = crm.match(/^CRM-([A-Z]{2})\s?(\d+)$/);
  if (!match) return null;
  return { conselho: "CRM", ufConselho: match[1], registro: match[2] };
}

export default function OnboardingPage() {
  const { user, completeCommonProfile, requestPatientLink, requestProfessionalAccess } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [professionalEmail, setProfessionalEmail] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [cpf, setCpf] = useState("");
  const [crm, setCrm] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [crmError, setCrmError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleContinue = () => {
    if (selectedRole === null) return;
    if (selectedRole === ROLES.COMMON) {
      handleFinish();
      return;
    }
    setStep(2);
  };

  const handleFinish = async () => {
    if (selectedRole === null) return;

    if (selectedRole === ROLES.PROFESSIONAL) {
      const result = crmSchema.safeParse(crm);
      if (!result.success) {
        setCrmError("CRM inválido. Formato esperado: CRM-XX 12345");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (selectedRole === ROLES.COMMON) {
        await completeCommonProfile({ nomeCompleto: user?.nomeCompleto ?? "" });
      } else if (selectedRole === ROLES.PATIENT) {
        await requestPatientLink({
          nomeCompleto: user?.nomeCompleto ?? "",
          dataNascimento: dataNascimento || new Date().toISOString().split("T")[0],
          cpf: cpf || "00000000000",
          email: professionalEmail.trim() || undefined,
        });
      } else if (selectedRole === ROLES.PROFESSIONAL) {
        const parsed = parseCrm(crm.trim());
        await requestProfessionalAccess({
          nomeCompleto: user?.nomeCompleto ?? "",
          profissao: specialty.trim() || "Profissional de Saúde",
          conselho: parsed?.conselho,
          registro: parsed?.registro,
          ufConselho: parsed?.ufConselho,
        });
      }

      toast.success("Perfil configurado com sucesso!");
      navigate({ to: "/Dashboard" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao finalizar onboarding";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate({ to: "/login" });
  };

  const handleBack = () => {
    setStep(1);
    setCrmError("");
  };

  return (
    <div className="flex items-center justify-center min-h-screen !bg-slate-50 px-4 py-8">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl font-bold text-slate-900">
            Bem-vindo. Como você usará a aplicação?
          </CardTitle>
          <CardDescription className="text-slate-500">
            Escolha o perfil que melhor descreve seu uso
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          {step === 1 && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {ROLE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedRole === option.role;
                  return (
                    <button
                      key={option.role}
                      type="button"
                      onClick={() => setSelectedRole(option.role)}
                      className={cn(
                        "relative flex flex-col items-center gap-3 rounded-xl border p-5 text-left transition-all",
                        isSelected
                          ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-full p-3",
                          isSelected ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                        )}
                      >
                        <Icon className="size-6" />
                      </div>
                      <div className="text-center">
                        <p
                          className={cn(
                            "text-sm font-semibold",
                            isSelected ? "text-blue-900" : "text-slate-900"
                          )}
                        >
                          {option.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                          {option.description}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "absolute top-3 right-3 size-4 rounded-full border",
                          isSelected
                            ? "border-blue-500 bg-blue-500"
                            : "border-slate-300 bg-white"
                        )}
                      >
                        {isSelected && (
                          <svg viewBox="0 0 14 14" className="size-3.5 text-white m-px">
                            <path
                              d="M2 7l4 4 6-6"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                >
                  <ChevronLeft className="size-4 mr-1.5" />
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleContinue}
                  disabled={selectedRole === null}
                >
                  Continuar
                  <ArrowRight className="size-4 ml-1.5" />
                </Button>
              </div>
            </>
          )}

          {step === 2 && selectedRole === ROLES.PATIENT && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="dataNascimento">Data de nascimento</Label>
                <Input
                  id="dataNascimento"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="professionalEmail">Email do profissional (opcional)</Label>
                <Input
                  id="professionalEmail"
                  type="email"
                  placeholder="profissional@exemplo.com"
                  value={professionalEmail}
                  onChange={(e) => setProfessionalEmail(e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Se preencher, enviaremos uma solicitação de vínculo para o profissional.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ChevronLeft className="size-4 mr-1.5" />
                  Voltar
                </Button>
                <Button type="button" onClick={handleFinish} disabled={isSubmitting}>
                  {isSubmitting ? "Finalizando..." : "Finalizar"}
                </Button>
              </div>
            </div>
          )}

          {step === 2 && selectedRole === ROLES.PROFESSIONAL && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="crm">CRM</Label>
                <Input
                  id="crm"
                  placeholder="CRM-SP 12345"
                  value={crm}
                  onChange={(e) => {
                    setCrm(e.target.value);
                    setCrmError("");
                  }}
                  className={cn(crmError && "border-rose-500 focus-visible:ring-rose-500")}
                />
                {crmError && (
                  <p className="text-xs text-rose-600">{crmError}</p>
                )}
                <p className="text-xs text-slate-500">
                  Formato: CRM-XX 12345 (ex: CRM-SP 12345)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="specialty">Especialidade</Label>
                <Input
                  id="specialty"
                  placeholder="Psiquiatria, Psicologia..."
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button type="button" variant="outline" onClick={handleBack}>
                  <ChevronLeft className="size-4 mr-1.5" />
                  Voltar
                </Button>
                <Button type="button" onClick={handleFinish} disabled={isSubmitting}>
                  {isSubmitting ? "Finalizando..." : "Finalizar"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

---

## src/components/workspace/config/FinalizarCadastro.tsx
import { useForm } from '@tanstack/react-form'
import {
  User,
  Phone,
  ArrowRight,
  ShieldCheck,
  Shield,
  BarChart3,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { Navigate, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { IMaskInput } from 'react-imask'
import { GTMedicsLoadingModal } from '@/components/workspace/GTMedicsLoadingModal'

/* ── Validation helpers ── */
function nomeValidator(value: string) {
  if (!value || value.trim() === '') return 'Nome completo é obrigatório'
  if (value.trim().length < 3) return 'Nome deve ter no mínimo 3 caracteres'
  return undefined
}

export default function FinalizarCadastro() {
  const navigate = useNavigate()
  const { completeCommonProfile, user, isAuthenticated, isLoading } = useAuth()
  const [errorMessage, setErrorMessage] = useState('')
  const form = useForm({
    defaultValues: {
      nomeCompleto: user?.nomeCompleto || '',
      telefone: user?.telefone || '',
    },
    onSubmit: async ({ value }) => {
      setErrorMessage('')
      try {
        await completeCommonProfile({
          nomeCompleto: value.nomeCompleto.trim(),
          telefone: value.telefone?.trim() || '',
        })
        await navigate({ to: '/Dashboard' })
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Falha ao finalizar cadastro.')
      }
    },
  })

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-8 text-on-surface-variant">
        Carregando sessão...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-start py-12 px-4 bg-background">
      {/* ── Registration Card ── */}
      <div className="w-full max-w-[520px] bg-surface-container-lowest rounded-xl p-[32px] shadow-sm border border-outline-variant/30">
        {/* Header */}
        <div className="text-center mb-[24px] space-y-[8px]">
          <h1 className="font-manrope text-headline-lg text-primary tracking-tight">
            Finalizar cadastro
          </h1>
          <p className="text-body-md text-on-surface-variant">
            Complete suas informações básicas para acessar os recursos gerais da plataforma.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
          className="flex flex-col gap-[24px]"
        >
          {/* Nome completo (required) */}
          <form.Field
            name="nomeCompleto"
            validators={{
              onChange: ({ value }) => nomeValidator(value),
            }}
          >
            {(field) => (
              <div className="flex flex-col gap-[6px]">
                <Label className="text-label-md text-on-surface-variant ml-1">
                  Nome completo
                  <span className="text-error ml-[2px]">*</span>
                </Label>
                <div className="relative group">
                  <User
                    className="absolute left-[16px] top-1/2 -translate-y-1/2 text-outline transition-colors duration-200 group-focus-within:text-primary"
                    size={20}
                  />
                  <Input
                    type="text"
                    placeholder="Digite seu nome completo"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    className="w-full bg-surface border-outline-variant rounded-lg pl-[44px] pr-[16px] py-[12px] placeholder:text-outline/60 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
                  />
                </div>
                {field.state.meta.errors?.[0] && (
                  <p className="text-body-sm text-error ml-1">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          {/* Telefone (optional) */}
          <form.Field name="telefone">
            {(field) => (
              <div className="flex flex-col gap-[6px]">
                <Label className="text-label-md text-on-surface-variant ml-1">
                  Telefone (Opcional)
                </Label>
                <div className="relative group">
                  <Phone
                    className="absolute left-[16px] top-1/2 -translate-y-1/2 text-outline transition-colors duration-200 group-focus-within:text-primary"
                    size={20}
                  />
                  <IMaskInput
                    mask="(00) 00000-0000"
                    placeholder="(00) 00000-0000"
                    value={field.state.value}
                    onAccept={(value) => field.handleChange(String(value))}
                    onBlur={field.handleBlur}
                    className="w-full bg-surface border-outline-variant rounded-lg pl-[44px] pr-[16px] py-[12px] placeholder:text-outline/60 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all duration-200"
                  />
                </div>
              </div>
            )}
          </form.Field>

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={form.state.isSubmitting}
            className="w-full bg-primary text-on-primary rounded-lg py-[12px] shadow-md text-body-lg font-semibold hover:opacity-90 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-[8px] mt-[8px]"
          >
            Finalizar cadastro
            <ArrowRight size={20} />
          </Button>
        </form>

        {/* Security Badge */}
        <div className="mt-[24px] flex items-center gap-[8px] p-[16px] rounded-lg bg-secondary-fixed/20">
          <ShieldCheck className="text-secondary shrink-0" size={20} />
          <p className="text-label-sm text-on-secondary-fixed-variant">
            Seus dados estão protegidos por criptografia de ponta a ponta.
          </p>
        </div>
      </div>

      {/* ── Info Cards Grid ── */}
      <div className="w-full max-w-[520px] mt-[24px] grid grid-cols-1 md:grid-cols-2 gap-[16px]">
        {/* Card 1: Acompanhe sua evolução */}
        <div className="bg-surface-container-low p-[24px] rounded-xl border border-outline-variant/20 flex flex-col gap-[8px]">
          <BarChart3 className="text-primary" size={24} />
          <p className="text-label-md font-semibold text-on-surface">
            Acompanhe sua evolução
          </p>
          <p className="text-body-sm text-on-surface-variant">
            Visualize gráficos de progresso baseados em suas escalas respondidas.
          </p>
        </div>

        {/* Card 2: Privacidade Total */}
        <div className="bg-surface-container-low p-[24px] rounded-xl border border-outline-variant/20 flex flex-col gap-[8px]">
          <Shield className="text-primary" size={24} />
          <p className="text-label-md font-semibold text-on-surface">
            Privacidade Total
          </p>
          <p className="text-body-sm text-on-surface-variant">
            Você decide quem pode visualizar seu histórico de resultados.
          </p>
        </div>
      </div>
      <GTMedicsLoadingModal isOpen={form.state.isSubmitting} onClose={() => {}} />
    </div>
  )
}

---

## src/components/workspace/config/ConfirmarVinculo.tsx
import { useForm } from '@tanstack/react-form'
import { Navigate, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import {
  ArrowLeft,
  ShieldCheck,
  Shield,
  Lock,
  ChevronRight,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { useState } from 'react'
import { IMaskInput } from 'react-imask'
import { GTMedicsLoadingModal } from '@/components/workspace/GTMedicsLoadingModal'

/* ── Zod schemas for field-level validation ── */
const nomeCompletoSchema = z.string().min(3, 'Nome completo é obrigatório')
const dataNascimentoSchema = z.string().min(1, 'Data de nascimento é obrigatória')
const cpfSchema = z
  .string()
  .refine((value) => onlyDigits(value).length === 11, 'CPF deve conter 11 dígitos')

function onlyDigits(value = '') {
  return String(value).replace(/\D/g, '')
}

function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11)
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

export default function ConfirmarVinculo() {
  const navigate = useNavigate()
  const { requestPatientLink, user, isAuthenticated, isLoading } = useAuth()
  const [errorMessage, setErrorMessage] = useState('')

  const form = useForm({
    defaultValues: {
      nomeCompleto: user?.nomeCompleto || '',
      dataNascimento: '',
      cpf: '',
      telefone: user?.telefone || '',
      email: user?.email || '',
    },
    onSubmit: async ({ value }) => {
      setErrorMessage('')
      try {
        await requestPatientLink({
          ...value,
          nomeCompleto: value.nomeCompleto.trim(),
          cpf: formatCpf(value.cpf),
          telefone: value.telefone?.trim() || '',
          email: value.email?.trim() || user?.email || '',
        })
        await navigate({ to: '/Dashboard' })
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Falha ao solicitar vinculo.')
      }
    },
  })

  const handleGoBack = () => {
    navigate({ to: '..' })
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-8 text-on-surface-variant">
        Carregando sessão...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-linear-to-b from-background to-surface-container-low py-[48px] px-[16px] md:px-[64px]">
      <div className="w-full max-w-[560px]">

        {/* Back Navigation */}
        <button
          type="button"
          onClick={handleGoBack}
          className="group flex items-center gap-[4px] mb-[24px] text-on-surface-variant hover:text-primary transition-colors duration-200 cursor-pointer"
        >
          <ArrowLeft size={20} />
          <span className="text-label-md">Voltar</span>
        </button>

        {/* Form Card */}
        <div className="bg-surface-container-lowest rounded-xl shadow-[0px_12px_32px_rgba(0,0,0,0.08)] border border-outline-variant/30 p-[24px] md:p-[32px]">

          {/* Card Header */}
          <div className="text-center mb-[32px]">
            <div className="inline-flex items-center justify-center w-[64px] h-[64px] bg-primary-fixed rounded-full mb-[16px]">
              <ShieldCheck size={32} className="text-primary" />
            </div>
            <h1 className="font-manrope text-headline-lg text-on-background mb-[8px]">
              Confirmar vínculo como paciente
            </h1>
            <p className="text-body-md text-on-surface-variant max-w-[360px] mx-auto">
              Informe os dados usados no seu cadastro clínico. A confirmação será feita de forma segura, sem exibir dados sensíveis.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void form.handleSubmit()
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">

              {/* Field 1: Nome completo (full width) */}
              <form.Field
                name="nomeCompleto"
                validators={{ onChange: nomeCompletoSchema }}
              >
                {(field) => (
                  <div className="md:col-span-2">
                    <Label className="text-label-md text-on-surface-variant mb-[4px] flex items-center gap-[2px]">
                      Nome completo
                      <span className="text-error">*</span>
                    </Label>
                    <Input
                      type="text"
                      placeholder="Como registrado no consultório"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="bg-surface-bright border-outline-variant rounded-lg px-[16px] py-[8px] focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-200"
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-body-sm text-error mt-[4px]">
                        {field.state.meta.errors[0]?.message}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Field 2: Data de nascimento */}
              <form.Field
                name="dataNascimento"
                validators={{ onChange: dataNascimentoSchema }}
              >
                {(field) => (
                  <div>
                    <Label className="text-label-md text-on-surface-variant mb-[4px] flex items-center gap-[2px]">
                      Data de nascimento
                      <span className="text-error">*</span>
                    </Label>
                    <Input
                      type="date"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="bg-surface-bright border-outline-variant rounded-lg px-[16px] py-[8px] focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-200"
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-body-sm text-error mt-[4px]">
                        {field.state.meta.errors[0]?.message}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Field 3: CPF */}
              <form.Field
                name="cpf"
                validators={{ onChange: cpfSchema }}
              >
                {(field) => (
                  <div>
                    <Label className="text-label-md text-on-surface-variant mb-[4px] flex items-center gap-[2px]">
                      CPF
                      <span className="text-error">*</span>
                    </Label>
                    <IMaskInput
                      mask="000.000.000-00"
                      placeholder="000.000.000-00"
                      value={field.state.value}
                      onAccept={(value) => field.handleChange(formatCpf(String(value)))}
                      onBlur={field.handleBlur}
                      className="bg-surface-bright border border-outline-variant rounded-lg px-[16px] py-[8px] focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-200"
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-body-sm text-error mt-[4px]">
                        {field.state.meta.errors[0]?.message}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Field 4: Telefone */}
              <form.Field name="telefone">
                {(field) => (
                  <div>
                    <Label className="text-label-md text-on-surface-variant mb-[4px]">
                      Telefone
                    </Label>
                    <IMaskInput
                      mask="(00) 00000-0000"
                      placeholder="(00) 00000-0000"
                      value={field.state.value}
                      onAccept={(value) => field.handleChange(String(value))}
                      onBlur={field.handleBlur}
                      className="bg-surface-bright border border-outline-variant rounded-lg px-[16px] py-[8px] focus:ring-1 focus:ring-primary focus:border-primary transition-all duration-200"
                    />
                  </div>
                )}
              </form.Field>

              {/* Field 5: E-mail (pre-filled) */}
              <form.Field name="email">
                {(field) => (
                  <div>
                    <Label className="text-label-md text-on-surface-variant mb-[4px]">
                      E-mail
                    </Label>
                    <Input
                      type="email"
                      value={field.state.value}
                      readOnly
                      disabled
                      className="bg-surface-container-high border-outline-variant rounded-lg px-[16px] py-[8px] text-on-surface-variant cursor-not-allowed"
                    />
                  </div>
                )}
              </form.Field>
            </div>

            {/* Security Badge */}
            <div className="flex items-start gap-[16px] bg-secondary-container/20 border border-secondary-container/30 p-[16px] rounded-lg mt-[24px]">
              <Shield size={20} className="text-secondary shrink-0 mt-[2px]" />
              <p className="text-body-sm text-on-secondary-container">
                Seus dados são criptografados de ponta a ponta e usados apenas para validação de identidade junto ao sistema clínico.
              </p>
            </div>

            {errorMessage && (
              <div className="mt-[16px] rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {errorMessage}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={form.state.isSubmitting}
              className="w-full mt-[24px] py-[16px] bg-primary text-on-primary rounded-xl text-body-lg font-semibold shadow-lg hover:shadow-xl hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-[8px]"
            >
              Confirmar vínculo
              <ChevronRight size={20} />
            </Button>
          </form>

          {/* Manual Review Note */}
          <p className="text-body-sm text-on-surface-variant/70 text-center mt-[16px]">
            Se não for possível confirmar automaticamente, sua solicitação poderá ser revisada manualmente.
          </p>
        </div>

        {/* Supporting Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px] mt-[32px] opacity-80">
          {/* Card 1: Privacidade Garantida */}
          <div className="flex items-center gap-[16px] p-[16px] bg-white/50 backdrop-blur-sm rounded-lg border border-white">
            <Lock size={24} className="text-primary-container shrink-0" />
            <span className="text-label-md text-on-surface">
              Privacidade Garantida
            </span>
          </div>

          {/* Card 2: Conexão Profissional */}
          <div className="flex items-center gap-[16px] p-[16px] bg-white/50 backdrop-blur-sm rounded-lg border border-white">
            <ShieldCheck size={24} className="text-secondary shrink-0" />
            <span className="text-label-md text-on-surface">
              Conexão Profissional
            </span>
          </div>
        </div>
      </div>
      <GTMedicsLoadingModal isOpen={form.state.isSubmitting} onClose={() => {}} />
    </div>
  )
}

---

## src/components/workspace/config/TermosDeUso.tsx
import { Link } from '@tanstack/react-router'
import { FileText, Scale, Shield, AlertTriangle, Mail } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import { LazyBackground } from '@/components/ui/LazyBackground'

export default function TermosDeUso() {
  return (
    <LazyBackground
      src="https://firebasestorage.googleapis.com/v0/b/gt-medic-98c72.firebasestorage.app/o/bird.jpg?alt=media&token=0869c5a4-badf-49f7-85cf-2673243a04f0"
      overlayClassName="opacity-50"
      className="flex flex-col text-on-surface"
    >

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <Card className="border-outline-variant/60 bg-surface/80 backdrop-blur-sm mb-8">
          <CardContent className="pt-10 pb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-semibold uppercase tracking-wider text-primary">
                Documento legal
              </span>
            </div>
            <CardTitle className="text-3xl md:text-4xl font-bold font-manrope text-on-surface">
              Termos de Uso
            </CardTitle>
            <CardDescription className="mt-4 text-lg text-on-surface-variant max-w-2xl">
              Condições gerais de uso da plataforma GT-Medics Escalas. Ao acessar ou utilizar
              nossos serviços, você concorda com os termos descritos abaixo.
            </CardDescription>
            <p className="mt-2 text-sm text-on-surface-variant/70">
              Última atualização: 10 de maio de 2026
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-6">
            {[{
              num: '1',
              titulo: 'Aceitação dos Termos',
              texto: 'Ao acessar e utilizar a plataforma GT-Medics Escalas, você (“Usuário”) concorda em cumprir e estar vinculado aos presentes Termos de Uso. Caso não concorde com qualquer disposição deste documento, deve abster-se de utilizar os serviços. Estes termos constituem um contrato vinculante entre você e a GT-Medics.',
            }, {
              num: '2',
              titulo: 'Objeto do Serviço',
              texto: 'A GT-Medics Escalas é uma plataforma digital destinada a profissionais de saúde mental e usuários finais, oferecendo ferramentas para aplicação, gestão e armazenamento de escalas psicométricas e instrumentos de avaliação clínica. O serviço inclui funcionalidades de cadastro de pacientes, aplicação de testes, geração de relatórios e histórico de evolução.',
            }, {
              num: '3',
              titulo: 'Cadastro e Conta',
              texto: 'Para utilizar determinadas funcionalidades, o Usuário deve criar uma conta fornecendo informações verdadeiras, precisas e completas. O Usuário é inteiramente responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta.',
              lista: [
                'O cadastro pode ser realizado via e-mail ou conta Google.',
                'O Usuário deve possuir idade mínima de 18 anos ou estar representado por um responsável legal.',
                'A GT-Medics se reserva o direito de suspender contas com dados falsos ou suspeitas de fraude.',
              ],
            }, {
              num: '4',
              titulo: 'Responsabilidades do Usuário',
              texto: 'O Usuário compromete-se a utilizar a plataforma de forma ética, legal e em conformidade com as normas do Código de Ética Profissional de sua categoria (quando aplicável). É vedado:',
              lista: [
                'Utilizar a plataforma para fins não autorizados ou ilegais.',
                'Compartilhar credenciais de acesso com terceiros.',
                'Violar direitos de propriedade intelectual da GT-Medics ou de terceiros.',
                'Inserir dados de pacientes sem o devido consentimento informado.',
                'Tentar acessar áreas restritas do sistema sem autorização.',
              ],
            }, {
              num: '5',
              titulo: 'Propriedade Intelectual',
              texto: 'Todo o conteúdo disponibilizado na plataforma — incluindo, mas não se limitando a, software, design, textos, gráficos, logotipos, ícones e imagens — é de propriedade exclusiva da GT-Medics ou de seus licenciadores, protegido pelas leis de propriedade intelectual. É concedida ao Usuário uma licença limitada, não exclusiva e intransferível para utilizar a plataforma conforme estes Termos.',
            }, {
              num: '6',
              titulo: 'Limitação de Responsabilidade',
              texto: 'A plataforma GT-Medics Escalas é uma ferramenta de apoio à prática clínica e não substitui o julgamento profissional do usuário. Os resultados das escalas psicométricas devem ser interpretados por profissionais qualificados. A GT-Medics não se responsabiliza por diagnósticos, tratamentos ou decisões clínicas baseadas exclusivamente nos resultados gerados pela plataforma.',
            }, {
              num: '7',
              titulo: 'Modificações e Disponibilidade',
              texto: 'A GT-Medics se reserva o direito de modificar, suspender ou descontinuar, temporária ou permanentemente, qualquer funcionalidade da plataforma, com ou sem aviso prévio. Alterações nos Termos de Uso serão comunicadas com antecedência mínima de 15 (quinze) dias, salvo em casos de força maior ou exigências legais.',
            }, {
              num: '8',
              titulo: 'Lei Aplicável e Foro',
              texto: 'Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Quaisquer controvérsias oriundas destes termos serão dirimidas no foro da comarca de São Paulo/SP, com exclusão de qualquer outro, por mais privilegiado que seja.',
            }].map((artigo) => (
              <Card
                key={artigo.num}
                className="border-outline-variant/60 bg-surface/80 backdrop-blur-sm"
              >
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                      {artigo.num}
                    </span>
                    <h2 className="text-xl font-bold font-manrope text-on-surface">
                      {artigo.titulo}
                    </h2>
                  </div>
                  <p className="text-on-surface-variant leading-relaxed">
                    {artigo.texto}
                  </p>
                  {artigo.lista && (
                    <ul className="list-disc list-inside space-y-2 text-on-surface-variant mt-3 ml-1">
                      {artigo.lista.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-6">
            <Card className="border-outline-variant/60 bg-surface/80 backdrop-blur-sm">
              <CardContent className="pt-6 pb-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  <h3 className="font-bold font-manrope">Documentos relacionados</h3>
                </div>
                <Link
                  to="/politica-de-privacidade"
                  className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors underline decoration-primary/30 underline-offset-4"
                >
                  <Shield className="h-4 w-4" />
                  Política de Privacidade
                </Link>
              </CardContent>
            </Card>

            <Card className="border-outline-variant/60 bg-surface/80 backdrop-blur-sm">
              <CardContent className="pt-6 pb-6 space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-tertiary" />
                  <h3 className="font-bold font-manrope">Precisa de ajuda?</h3>
                </div>
                <p className="text-sm text-on-surface-variant">
                  Se tiver dúvidas sobre estes termos ou sobre o uso da plataforma, entre em
                  contato com nosso suporte.
                </p>
                <a
                  href="mailto:suporte@gtmedics.com.br"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline underline-offset-4"
                >
                  <Mail className="h-4 w-4" />
                  suporte@gtmedics.com.br
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </LazyBackground>
  )
}

---

## src/components/workspace/config/CompletarCadastro.tsx
import { SquircleButton } from '@/components/ui/SquircleButton'
import { cn } from '@/lib/utils'
import { useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Globe, ShieldCheck, Stethoscope, UserCheck } from 'lucide-react'
import { useState } from 'react'

type SelectionValue = 'patient' | 'professional' | 'common' | null

interface CardOption {
  value: Exclude<SelectionValue, null>
  icon: typeof UserCheck
  iconBgClass: string
  iconBgHoverClass: string
  title: string
  description: string
}

const cards: CardOption[] = [
  {
    value: 'patient',
    icon: UserCheck,
    iconBgClass: 'bg-primary-container/10',
    iconBgHoverClass: 'group-hover:bg-primary-container/20',
    title: 'Sou paciente do Dr. Guilherme',
    description: 'Vincular meu acesso ao meu cadastro clínico já existente.',
  },
  {
    value: 'professional',
    icon: Stethoscope,
    iconBgClass: 'bg-secondary-container/10',
    iconBgHoverClass: 'group-hover:bg-secondary-container/20',
    title: 'Sou profissional de saúde',
    description: 'Solicitar acesso profissional à plataforma.',
  },
  {
    value: 'common',
    icon: Globe,
    iconBgClass: 'bg-tertiary-fixed-dim/20',
    iconBgHoverClass: 'group-hover:bg-tertiary-fixed-dim/30',
    title: 'Sou usuário comum',
    description: 'Usar recursos gerais sem vínculo clínico ou profissional.',
  },
]

const easeEntrance = [0.16, 1, 0.3, 1] as [number, number, number, number]

export default function CompletarCadastro() {
  const [selected, setSelected] = useState<SelectionValue>(null)
  const navigate = useNavigate()

  const handleContinue = () => {
    if (!selected) return

    switch (selected) {
      case 'patient':
        navigate({ to: '/confirmar-vinculo' })
        break
      case 'professional':
        navigate({ to: '/solicitar-acesso' })
        break
      case 'common':
        navigate({ to: '/finalizar-cadastro' })
        break
    }
  }

  const handleSkip = () => {
    navigate({ to: '/' })
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-gray-50 p-4 py-[48px] px-[16px]">
      <div className="w-full max-w-4xl flex flex-col items-center">
        <motion.div
          className="text-center mb-[32px]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: easeEntrance }}
        >
          <h1 className="font-manrope text-headline-lg-mobile md:text-headline-lg font-semibold text-on-surface mb-[8px]">
            Complete seu cadastro
          </h1>
          <p className="text-body-lg text-on-surface-variant max-w-xl mx-auto">
            Para configurar seu acesso ao GT-Medic, selecione como você pretende usar a plataforma.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[24px] w-full mb-[48px]">
          {cards.map((card, index) => {
            const Icon = card.icon
            const isSelected = selected === card.value

            return (
              <motion.button
                key={card.value}
                onClick={() => setSelected(card.value)}
                className={cn(
                  'group relative flex flex-col items-start text-left p-[32px] rounded-xl border-2 transition-all duration-300 ease-out active:scale-[0.98] cursor-pointer',
                  isSelected
                    ? 'border-primary bg-surface-container-low shadow-lg'
                    : 'border-outline-variant bg-surface-container-lowest hover:border-primary/50 hover:shadow-lg'
                )}
                initial={{ opacity: 0, y: 40, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.6,
                  ease: easeEntrance,
                  delay: 0.1 * (index + 1),
                }}
              >
                {isSelected && (
                  <div className="absolute top-[16px] right-[16px] flex items-center justify-center w-[24px] h-[24px] rounded-full bg-primary">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M2.91675 7.00004L5.83341 9.91671L11.0834 4.08337"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}

                <div
                  className={cn(
                    'flex items-center justify-center w-[48px] h-[48px] rounded-lg transition-colors duration-300 mb-[16px]',
                    card.iconBgClass,
                    card.iconBgHoverClass,
                    isSelected && card.value === 'patient' && 'bg-primary-container/20',
                    isSelected && card.value === 'professional' && 'bg-secondary-container/20',
                    isSelected && card.value === 'common' && 'bg-tertiary-fixed-dim/30',
                  )}
                >
                  <Icon className="w-[32px] h-[32px] text-black" strokeWidth={1.5} />
                </div>

                <h2 className="font-manrope text-headline-md font-semibold text-on-surface mb-[8px]">
                  {card.title}
                </h2>

                <p className="text-body-sm text-on-surface-variant">
                  {card.description}
                </p>
              </motion.button>
            )
          })}
        </div>

        <motion.div
          className="flex flex-col items-center gap-[16px] w-full max-w-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: easeEntrance, delay: 0.4 }}
        >
          <SquircleButton
            onClick={handleContinue}
            disabled={!selected}
            variant="green"
            size="palette"
            fontWeight={700}
            label="Continuar"
          />

          <button
            onClick={handleSkip}
            className="text-on-surface-variant hover:text-primary underline decoration-outline-variant underline-offset-4 transition-colors duration-200 text-label-sm font-semibold tracking-[0.05em]"
          >
            Pular por enquanto
          </button>
        </motion.div>

        <motion.div
          className="inline-flex items-center gap-[8px] px-[24px] py-[8px] mt-[48px] bg-surface-container-low rounded-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: easeEntrance, delay: 0.5 }}
        >
          <ShieldCheck className="w-[18px] h-[18px] text-black" strokeWidth={1.5} />
          <span className="text-body-sm text-on-surface-variant">
            Conexão segura e criptografada com GT-Medic
          </span>
        </motion.div>
      </div>
    </div>
  )
}

---

## src/components/workspace/config/Contato.tsx
import { useForm } from "@tanstack/react-form";
import { CheckCircle2, Loader2, Mail, MessageSquare, Send, User } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LazyBackground } from "@/components/ui/LazyBackground";
import { SquircleButton } from "@/components/ui/SquircleButton";
import { Textarea } from "@/components/ui/textarea";

import { sendContactMessage } from "@/lib/apiClient";
import { toast } from "sonner";

/* ============================================================
   Schema
============================================================ */
const ContactSchema = z.object({
  nomeCompleto: z.string().min(2, "Digite seu nome completo.").max(120, "Máximo de 120 caracteres."),
  email: z.string().min(1, "E-mail obrigatório.").email("E-mail inválido."),
  mensagem: z.string().min(5, "Mensagem muito curta.").max(2000, "Máximo de 2000 caracteres."),
});

type ContactValues = z.infer<typeof ContactSchema>;

/* ============================================================
   Component
============================================================ */
export default function Contato() {
  const [enviado, setEnviado] = useState(false);

  const form = useForm({
    defaultValues: {
      nomeCompleto: "",
      email: "",
      mensagem: "",
    } as ContactValues,
    validators: { onChange: ContactSchema },
    onSubmit: async ({ value }) => {
      try {
        await sendContactMessage(value);
        setEnviado(true);
        toast.success("Mensagem enviada com sucesso!");
      } catch (err: any) {
        toast.error(err?.message || "Erro ao enviar mensagem. Tente novamente.");
      }
    },
  });

  const isSubmitting = form.state.isSubmitting;

  return (
    <LazyBackground
      src="https://firebasestorage.googleapis.com/v0/b/gt-medic-98c72.firebasestorage.app/o/bird.jpg?alt=media&token=0869c5a4-badf-49f7-85cf-2673243a04f0"
      overlayClassName="opacity-50"
      className="flex flex-col text-on-surface"
    >
      <div className="flex items-center justify-center">
        <div className="max-w-4xl px-4 sm:px-6 gap-y-36">
          <Card className="mt-6 mb-8 md:mt-16 md:mb-20 border-outline-variant/60 bg-surface/80 backdrop-blur-sm">
            <CardContent className="pt-8 pb-8">
              <CardHeader className="flex items-center gap-3 pb-0">
                <div className="inline-flex items-center justify-center rounded-xl bg-primary/10 p-3 mb-4">
                  <MessageSquare className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-3xl md:text-4xl font-bold font-manrope text-on-surface">
                  Fale conosco
                </CardTitle>
              </CardHeader>
              <CardDescription className="mt-4 text-lg text-on-surface-variant max-w-xl mx-auto">
                Dúvidas ou sugestões? Fale conosco.
              </CardDescription>

              {enviado ? (
                <div className="flex flex-col items-center text-center gap-4 py-8">
                  <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <h2 className="font-manrope text-headline-md font-semibold text-on-surface">
                    Mensagem enviada!
                  </h2>
                  <p className="text-body-md text-on-surface-variant max-w-sm">
                    Obrigado pelo contato. Nossa equipe responderá em breve.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    form.handleSubmit();
                  }}
                  className="flex flex-col gap-6"
                >
                  {/* Nome */}
                  <form.Field name="nomeCompleto">
                    {(field) => {
                      const errs = field.state.meta.errors;
                      const hasError = field.state.meta.isTouched && errs.length > 0;
                      return (
                        <div className="flex flex-col gap-2">
                          <Label
                            htmlFor={field.name}
                            className="text-label-md text-on-surface-variant"
                          >
                            Nome
                          </Label>
                          <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-outline h-5 w-5" />
                            <Input
                              id={field.name}
                              name={field.name}
                              type="text"
                              placeholder="Seu nome"
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) => field.handleChange(e.target.value)}
                              className={`pl-12 ${hasError ? "border-red-400 focus-visible:ring-red-200" : ""}`}
                            />
                          </div>
                          {hasError && (
                            <span className="text-[12px] text-red-500">{errs[0]?.message}</span>
                          )}
                        </div>
                      );
                    }}
                  </form.Field>

                  {/* E-mail */}
                  <form.Field name="email">
                    {(field) => {
                      const errs = field.state.meta.errors;
                      const hasError = field.state.meta.isTouched && errs.length > 0;
                      return (
                        <div className="flex flex-col gap-2">
                          <Label
                            htmlFor={field.name}
                            className="text-label-md text-on-surface-variant"
                          >
                            E-mail
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-outline h-5 w-5" />
                            <Input
                              id={field.name}
                              name={field.name}
                              type="email"
                              placeholder="seu@email.com"
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) => field.handleChange(e.target.value)}
                              className={`pl-12 ${hasError ? "border-red-400 focus-visible:ring-red-200" : ""}`}
                            />
                          </div>
                          {hasError && (
                            <span className="text-[12px] text-red-500">{errs[0]?.message}</span>
                          )}
                        </div>
                      );
                    }}
                  </form.Field>

                  {/* Mensagem */}
                  <form.Field name="mensagem">
                    {(field) => {
                      const errs = field.state.meta.errors;
                      const hasError = field.state.meta.isTouched && errs.length > 0;
                      return (
                        <div className="flex flex-col gap-2">
                          <Label
                            htmlFor={field.name}
                            className="text-label-md text-on-surface-variant"
                          >
                            Mensagem
                          </Label>
                          <Textarea
                            id={field.name}
                            name={field.name}
                            placeholder="Como podemos ajudar?"
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            rows={5}
                            className={`resize-none ${hasError ? "border-red-400 focus-visible:ring-red-200" : ""}`}
                          />
                          {hasError && (
                            <span className="text-[12px] text-red-500">{errs[0]?.message}</span>
                          )}
                        </div>
                      );
                    }}
                  </form.Field>

                  <SquircleButton
                    type="submit"
                    variant="blue"
                    size="mini"
                    fontWeight={600}
                    label={isSubmitting ? "Enviando..." : "Enviar mensagem"}
                    icon={isSubmitting ? Loader2 : Send}
                    disabled={isSubmitting}
                  />
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </LazyBackground >
  );
}

---

## src/components/workspace/config/SolicitarAcesso.tsx
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import {
  FileText,
  Lock,
  Send,
  ShieldCheck,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/context/AuthContext'
import { Navigate, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { IMaskInput } from 'react-imask'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GTMedicsLoadingModal } from '@/components/workspace/GTMedicsLoadingModal'

/* ── Zod schemas for field-level validation ── */
const nomeSchema = z.string().min(3, 'Nome completo é obrigatório')
const profissaoSchema = z.string().min(1, 'Selecione sua profissão')

/* ── Brazilian states ── */
const estadosBrasileiros = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

const profissoes = ['Médico', 'Enfermeiro', 'Psicólogo', 'ACS', 'Outro']

export default function SolicitarAcesso() {
  const navigate = useNavigate()
  const { requestProfessionalAccess, user, isAuthenticated, isLoading } = useAuth()
  const [errorMessage, setErrorMessage] = useState('')

  const form = useForm({
    defaultValues: {
      nomeCompleto: user?.nomeCompleto || '',
      profissao: '',
      telefone: user?.telefone || '',
      conselho: '',
      registro: '',
      ufConselho: '',
      instituicao: '',
      mensagem: '',
    },
    onSubmit: async ({ value }) => {
      setErrorMessage('')
      try {
        await requestProfessionalAccess({
          ...value,
          nomeCompleto: value.nomeCompleto.trim(),
          telefone: value.telefone?.trim() || '',
        })
        await navigate({ to: '/Dashboard' })
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Falha ao solicitar acesso profissional.')
      }
    },
  })

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-background p-8 text-on-surface-variant">
        Carregando sessão...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-linear-to-b from-background to-surface-container-low py-[48px] px-[16px] md:px-[64px]">
      {/* Two-Column Card */}
      <div className="w-full max-w-[800px] flex flex-col lg:flex-row rounded-xl overflow-hidden shadow-xl border-none">

        {/* ── Left Sidebar ── */}
        <div className="hidden lg:flex lg:w-1/3 bg-linear-to-b from-blue-400 via-sky-400 to-blue-700 p-[32px] flex-col justify-between relative overflow-hidden rounded-l-xl">
          {/* Top content */}
          <div>
            <FileText className="text-on-primary-container mb-[16px]" size={48} strokeWidth={1.5} />
            <h2 className="font-manrope text-headline-lg text-on-primary-container mb-[16px]">
              Área do Profissional
            </h2>
            <p className="text-body-md text-on-primary-container/80">
              Junte-se à nossa rede de cuidado especializado e tenha acesso a ferramentas avançadas de triagem e acompanhamento.
            </p>
          </div>

          {/* Bottom content */}
          <div className="flex items-center gap-[8px] mt-[24px]">
            <Lock size={14} className="text-secondary-fixed" />
            <span className="text-label-sm text-on-primary-container/70 uppercase tracking-widest">
              End-to-End Encrypted
            </span>
          </div>

          {/* Decorative circle */}
          <div className="absolute -bottom-20 -right-20 w-[256px] h-[256px] rounded-full bg-white/10 blur-3xl pointer-events-none" />
        </div>

        {/* ── Right Side — Form ── */}
        <div className="flex-1 p-[24px] md:p-[32px] bg-surface-container-lowest">
          {/* Form header */}
          <div className="mb-[24px]">
            <h1 className="font-manrope text-headline-lg text-primary mb-[4px]">
              Solicitar acesso profissional
            </h1>
            <p className="text-body-md text-on-surface-variant">
              Seu cadastro será enviado para análise. O acesso profissional só será liberado após aprovação.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void form.handleSubmit()
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">

              {/* Field 1: Nome completo (full width) */}
              <form.Field
                name="nomeCompleto"
                validators={{ onChange: nomeSchema }}
              >
                {(field) => (
                  <div className="md:col-span-2">
                    <Label className="text-label-md text-on-surface mb-[4px] flex items-center gap-[2px]">
                      Nome completo
                      <span className="text-error">*</span>
                    </Label>
                    <Input
                      type="text"
                      placeholder="Ex: Dr. Roberto Silva"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="bg-surface-bright border-outline-variant rounded-lg px-[16px] py-[8px] focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                    />
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-body-sm text-error mt-[4px]">
                        {field.state.meta.errors[0]?.message}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Field 2: Profissão */}
              <form.Field
                name="profissao"
                validators={{ onChange: profissaoSchema }}
              >
                {(field) => (
                  <div>
                    <Label className="text-label-md text-on-surface mb-[4px] flex items-center gap-[2px]">
                      Profissão
                      <span className="text-error">*</span>
                    </Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value)}
                    >
                      <SelectTrigger className="bg-surface-bright border-outline-variant rounded-lg px-[16px] py-[8px] w-full focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {profissoes.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {field.state.meta.errors.length > 0 && (
                      <p className="text-body-sm text-error mt-[4px]">
                        {field.state.meta.errors[0]?.message}
                      </p>
                    )}
                  </div>
                )}
              </form.Field>

              {/* Field 3: Telefone */}
              <form.Field name="telefone">
                {(field) => (
                  <div>
                    <Label className="text-label-md text-on-surface mb-[4px]">
                      Telefone
                    </Label>
                    <IMaskInput
                      mask="(00) 00000-0000"
                      placeholder="(00) 00000-0000"
                      value={field.state.value}
                      onAccept={(value) => field.handleChange(String(value))}
                      onBlur={field.handleBlur}
                      className="bg-surface-bright border border-outline-variant rounded-lg px-[16px] py-[8px] focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                    />
                  </div>
                )}
              </form.Field>

              {/* Field 4: Conselho profissional */}
              <form.Field name="conselho">
                {(field) => (
                  <div>
                    <Label className="text-label-md text-on-surface mb-[4px]">
                      Conselho profissional
                    </Label>
                    <Input
                      type="text"
                      placeholder="CRM, CRP, etc."
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="bg-surface-bright border-outline-variant rounded-lg px-[16px] py-[8px] focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                    />
                  </div>
                )}
              </form.Field>

              {/* Field 5: Número do registro */}
              <form.Field name="registro">
                {(field) => (
                  <div>
                    <Label className="text-label-md text-on-surface mb-[4px]">
                      Número do registro
                    </Label>
                    <Input
                      type="text"
                      placeholder="000000"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="bg-surface-bright border-outline-variant rounded-lg px-[16px] py-[8px] focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                    />
                  </div>
                )}
              </form.Field>

              {/* Field 6: UF do conselho */}
              <form.Field name="ufConselho">
                {(field) => (
                  <div>
                    <Label className="text-label-md text-on-surface mb-[4px]">
                      UF do conselho
                    </Label>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value)}
                    >
                      <SelectTrigger className="bg-surface-bright border-outline-variant rounded-lg px-[16px] py-[8px] w-full focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200">
                        <SelectValue placeholder="UF" />
                      </SelectTrigger>
                      <SelectContent>
                        {estadosBrasileiros.map((uf) => (
                          <SelectItem key={uf} value={uf}>
                            {uf}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </form.Field>

              {/* Field 7: Instituição / serviço */}
              <form.Field name="instituicao">
                {(field) => (
                  <div>
                    <Label className="text-label-md text-on-surface mb-[4px]">
                      Instituição / serviço
                    </Label>
                    <Input
                      type="text"
                      placeholder="Nome do hospital ou clínica"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="bg-surface-bright border-outline-variant rounded-lg px-[16px] py-[8px] focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
                    />
                  </div>
                )}
              </form.Field>

              {/* Field 8: Mensagem opcional (full width) */}
              <form.Field name="mensagem">
                {(field) => (
                  <div className="md:col-span-2">
                    <Label className="text-label-md text-on-surface mb-[4px]">
                      Mensagem opcional
                    </Label>
                    <Textarea
                      placeholder="Fale brevemente sobre sua atuação..."
                      rows={3}
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      className="bg-surface-bright border-outline-variant rounded-lg px-[16px] py-[8px] focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 resize-none"
                    />
                  </div>
                )}
              </form.Field>

              {/* Submit button */}
              <div className="md:col-span-2">
                {errorMessage && (
                  <div className="mb-[16px] rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {errorMessage}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={form.state.isSubmitting}
                  className="w-full py-[16px] bg-primary text-on-primary rounded-lg text-body-lg font-semibold hover:brightness-110 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-[8px]"
                >
                  <Send size={20} />
                  Enviar solicitação
                </Button>
              </div>
            </div>
          </form>

          {/* LGPD Security Notice */}
          <div className="flex items-start gap-[8px] bg-secondary-container/20 p-[16px] rounded-lg mt-[16px]">
            <ShieldCheck size={20} className="text-secondary shrink-0 mt-[2px]" />
            <p className="text-body-sm text-on-secondary-container">
              Suas informações são tratadas com sigilo absoluto de acordo com as normas da LGPD e regulamentações de saúde.
            </p>
          </div>
        </div>
      </div>
      <GTMedicsLoadingModal isOpen={form.state.isSubmitting} onClose={() => {}} />
    </div>
  )
}

---

## src/components/workspace/config/Home.tsx
import {
  CheckCircle2,
  LockIcon,
  Shield,
  Sparkles,
  Stethoscope,
  Waypoints,
  Workflow,
} from "lucide-react";
import { useEffect, useState } from "react";

const valueProps = [
  {
    icon: Stethoscope,
    title: "Aplicação inteligente de escalas",
    description:
      "Acompanhe seu paciente com mais de 60 escalas validadas.",
  },
  {
    icon: Shield,
    title: "Relatórios automatizados",
    description:
      "Resultados padronizados de protocolos validados",
  },
  {
    icon: Workflow,
    title: "Acompanhamento longitudinal",
    description:
      "Visualize a evolução do paciente através de gráficos comparativos.",
  },
];

const securityFeatures = [
  "Segurança de dados",
  "Criptografia de ponta a ponta",
  "Conformidade total com a LGPD",
  "Experiência fluida para o paciente em qualquer dispositivo",
];

const carouselImages = [
  "https://pb.gtmedics.com/api/files/pbc_1777022727/olqlu64j86y8tr2/api_transcription4_4p6uccs47w.png?token=",
  "https://pb.gtmedics.com/api/files/pbc_1777022727/vt71e94zdwlfw5g/api_transcription3_9f0fty81tk.png?token=",
  "https://pb.gtmedics.com/api/files/pbc_1777022727/i9kxl75t7nkptk4/api_transcription1_sdpzkjhyk1.png?token=",
  "https://pb.gtmedics.com/api/files/pbc_1777022727/sde2ihmnwdka9ii/api_transcription2_8ekotzyh99.png?token=",
];

/* ═══════════════════════ HOME PAGE ═══════════════════════ */
export default function Home() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveSlide((i) => (i + 1) % carouselImages.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col">
      <HeroSection activeSlide={activeSlide} onSlideChange={setActiveSlide} />
      <FeaturesSection />
      <TrustSection />
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━ 1. HERO SECTION ━━━━━━━━━━━━━━━━━━ */
function HeroSection({
  activeSlide,
  onSlideChange,
}: {
  activeSlide: number;
  onSlideChange: (index: number) => void;
}) {
  return (
    <section
      className="w-full px-4 md:px-20"
      style={{
        background:
          "radial-gradient(circle at 50% 0%, #d4e3ff33 0%, transparent 40%)",
        backgroundColor: "#f9f9ff",
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(16_55_185/0.12),transparent_32%)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:px-8 lg:py-16">
        <div className="space-y-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <Sparkles className="size-4" />
            Documentação clínica assistida por IA
          </span>
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="size-14 min-w-14 min-h-14 flex items-center justify-center rounded-full bg-blue-50 p-2 shadow-xl">
                <Waypoints className="h-7 w-7 mt-1 text-sky-900" />
              </div>
              <div>
                <h1 className="m-0 max-w-xl text-balance text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">
                  Saúde mental baseada em evidências
                </h1>
                <h2 className="hidden md:block m-0 max-w-xl text-balance text-xl font-semibold tracking-tight text-slate-950 md:text-xl">
                  Saúde mental baseada em evidências
                </h2>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4">
              <div className="size-14 min-w-14 min-h-14 flex items-center justify-center rounded-full bg-blue-50 p-2 shadow-xl">
                <LockIcon className="h-7 w-7 mt-1 text-sky-900" />
              </div>
              <p className="max-w-lg text-md text-justify mt-6 leading-6 text-slate-600">
                A plataforma definitiva para aplicação e monitoramento de
                escalas psicométricas como PHQ-9, GAD-7 e BDI. Transforme dados
                subjetivos em decisões clínicas precisas.
              </p>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-slate-50 shadow-xl shadow-slate-900/10">
            {carouselImages.map((src, i) => (
              <img
                key={src}
                src={src}
                alt={`GT-Medics interface ${i + 1}`}
                loading={i === 0 ? "eager" : "lazy"}
                className={
                  "absolute inset-0 h-full w-full object-cover transition-opacity duration-[1200ms] ease-in-out " +
                  (i === activeSlide ? "opacity-80" : "opacity-0")
                }
              />
            ))}
            <div className="pointer-events-none absolute inset-0 bg-linear-to-tr from-emerald-500/10 via-transparent to-sky-400/10" />
          </div>
          <div className="mt-3 flex items-center justify-center shadow-lg gap-1.5">
            {carouselImages.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => onSlideChange(i)}
                className={
                  "h-2.5 rounded-full p-1 transition-all " +
                  (i === activeSlide
                    ? "w-7 bg-slate-950"
                    : "w-2.5 bg-slate-300 hover:bg-slate-400")
                }
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━ 2. FEATURES BENTO GRID ━━━━━━━━━━━━━━━━━━ */
function FeaturesSection() {
  return (
    <section className="border-y border-slate-200/70 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {valueProps.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl shadow-lg border border-slate-100 bg-white p-5 transition hover:border-slate-300 hover:shadow-lg"
            >
              <div className="mt-3 flex items-center gap-3">
                <div className="mb-3 flex size-9 items-center justify-center rounded-full shadow-xl bg-blue-50">
                  <item.icon className="size-4 text-sky-900" />
                </div>
                <h2 className="m-0 text-sm font-semibold tracking-tight text-slate-950">
                  {item.title}
                </h2>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-slate-600">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━ 3. TRUST SECTION ━━━━━━━━━━━━━━━━━━ */
function TrustSection() {
  return (
    <section className="bg-slate-950 text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-emerald-300">
            Feito para atender as necessidades reais do consultório.
          </p>
          <h2 className="m-0 text-xl font-semibold tracking-tight md:text-2xl">
            Escalas de alto padrão para o profissional de saúde
          </h2>
          {/* <p className="text-xs leading-5 text-slate-400">
            Criptografia bancária para garantir que o sigilo profissional nunca
            seja comprometido. Tranquilidade para você e cuidado para o seu
            paciente.
          </p> */}
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {securityFeatures.map((feature) => (
            <div
              key={feature}
              className="flex items-center gap-2 rounded-xl bg-white/5 px-3.5 py-2.5"
            >
              <CheckCircle2 className="size-3.5 shrink-0 text-emerald-300" />
              <span className="text-xs font-medium text-slate-100">
                {feature}
              </span>
            </div>
          ))}
         {/* <div className="rounded-xl bg-emerald-400/10 p-3.5 sm:col-span-2">
            <div className="mb-1 flex items-center gap-2 text-emerald-200">
              <Lock className="size-3.5" />
              <span className="text-xs font-semibold">
                Ferramentas validadas e utilizadas por milhares de profissionais
                de saúde mental.
              </span>
            </div>
          </div> */}
        </div>
      </div>
    </section>
  );
}

---

## src/components/workspace/GTMedicsLoadingModal.tsx
import { Brain } from 'lucide-react'
import type { ReactNode } from 'react'

export type GTMedicsLoadingModalProps = {
  /** Controla visibilidade (alias: isOpen ou open) */
  open?: boolean;
  isOpen?: boolean;
  /** Texto customizado ou array de letras animadas */
  message?: string;
  /** Callback quando solicitado fechar */
  onClose?: () => void;
  /** Ícone central — JSX element */
  icon?: ReactNode;
};

const letters = [
  { char: "G", delay: 0,   className: "text-slate-600" },
  { char: "T", delay: 90,  className: "text-slate-600" },
  { char: "-", delay: 180, className: "text-slate-400" },
  { char: "M", delay: 270, className: "text-slate-600" },
  { char: "E", delay: 360, className: "text-slate-600" },
  { char: "D", delay: 450, className: "text-slate-600" },
  { char: "I", delay: 540, className: "text-slate-600" },
  { char: "C", delay: 630, className: "text-slate-600" },
  {
    char: "S",
    delay: 720,
    className: "text-transparent bg-linear-to-r from-sky-600 to-emerald-500 bg-clip-text",
  },
];

export function GTMedicsLoadingModal({
  open,
  isOpen,
  message,
  onClose,
  icon = <Brain className="text-[22px] text-emerald-700" />,
}: GTMedicsLoadingModalProps) {
  const visible = open ?? isOpen ?? false;

  if (!visible) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-9999 flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
        role="dialog"
        aria-modal="true"
        aria-label="Carregando GT-MEDICS"
        onClick={onClose}
      >
        <div className="flex h-[280px] w-[280px] items-center justify-center rounded-xl bg-radial from-emerald-100 via-blue-100 to-sky-100">
          <div className="relative flex h-[220px] w-[220px] items-center justify-center">
            <div className="absolute h-36 w-36 rounded-full" />

            <div className="relative flex h-24 w-24 items-center justify-center rounded-full shadow-xl">
              <div className="absolute inset-0 animate-spin rounded-full border-[2.5px] border-transparent border-t-sky-500/70 border-l-emerald-400/70 shadow-xl shadow-amber-50" />

              <div className="flex h-16 w-16 items-center justify-center">
                {icon}
              </div>
            </div>

            <div className="gtmedics-loading-text absolute top-[188px] left-1/2 -translate-x-1/2 whitespace-nowrap text-[13px] font-semibold tracking-[0.26em] text-slate-600">
              {message
                ? message.split("").map((char, i) => (
                    <span
                      key={`msg-${i}`}
                      className="gtmedics-loading-char inline-block opacity-0 text-slate-600"
                      style={{ "--gt-d": `${i * 50}ms` } as React.CSSProperties}
                    >
                      {char === " " ? "\u00A0" : char}
                    </span>
                  ))
                : letters.map((item, index) => (
                    <span
                      key={`lt-${item.char}-${index}`}
                      className={`gtmedics-loading-char inline-block opacity-0 ${item.className}`}
                      style={{ "--gt-d": `${item.delay}ms` } as React.CSSProperties}
                    >
                      {item.char}
                    </span>
                  ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .gtmedics-loading-char {
          animation: gtCharLoop 1.3s cubic-bezier(.22,1,.36,1) infinite;
          animation-delay: var(--gt-d);
        }

        @keyframes gtCharLoop {
          0% {
            opacity: 0;
            transform: translateY(10px);
            filter: blur(5px);
          }
          18% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
          70% {
            opacity: 1;
            transform: translateY(0);
            filter: blur(0);
          }
          100% {
            opacity: 0;
            transform: translateY(10px);
            filter: blur(5px);
          }
        }
      `}</style>
    </>
  );
}

---

## src/components/workspace/Header.tsx
import { Bell, ChevronDown } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/cn";

interface HeaderProps {
  onSearchClick?: () => void;
  className?: string;
}

export function Header({ onSearchClick, className }: HeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center gap-4 h-[52px] px-4 shrink-0",
        "border-b border-border bg-surface",
        className
      )}
    >
      <SidebarTrigger className="-ml-2" />
      <Logo />
      <div className="w-px h-5 bg-border mx-1" aria-hidden />


      <div className="flex-1" />

      <button
        type="button"
        aria-label="Notificações"
        className="w-8 h-8 rounded-[var(--radius-card)] inline-flex items-center justify-center text-text-2 hover:bg-surface-2 relative"
      >
        <Bell size={16} />
        <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-accent" aria-hidden />
      </button>

      <button
        type="button"
        className="flex items-center gap-2 pl-2 border-l border-border cursor-pointer"
        aria-label="Menu do usuário"
      >
        <span
          className="w-7 h-7 rounded-full border border-border inline-flex items-center justify-center text-accent-fg text-xs font-semibold"
          style={{
            backgroundImage:
              "linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-tint) 100%)",
          }}
        >
          GA
        </span>
        <ChevronDown size={12} className="text-text-3" />
      </button>
    </header>
  );
}

---

## src/components/workspace/Sidebar.tsx
// src/components/workspace/Sidebar.tsx
import { useMemo, useState } from "react";
import {
  ChevronRight, Search, Zap, Home, Users, ClipboardList, Network, BookOpen, 
  File as FileIcon
} from "lucide-react";
import { useNavigate, useRouterState, Link } from "@tanstack/react-router";

import {
  getSidebarTree,
  searchDiseases,
  getChapterKeyByDiseaseId,
} from "@/lib/disease-catalog";

import type { TreeNode } from "@/lib/disease-catalog";

import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ChapterNode = TreeNode & { type: "chapter"; children: TreeNode[] };

export function Sidebar() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const [query, setQuery] = useState("");

  // Tries to extract disease key from URL if we are on /app/assess/id or /consulta/id
  const currentDiseaseId = useMemo(() => {
    const parts = routerState.location.pathname.split("/");
    return parts[parts.length - 1]; // very basic extraction
  }, [routerState.location.pathname]);

  const activeChapterKey = useMemo(
    () =>
      currentDiseaseId
        ? getChapterKeyByDiseaseId(currentDiseaseId)
        : undefined,
    [currentDiseaseId]
  );

  const tree = useMemo(() => getSidebarTree() as ChapterNode[], []);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return searchDiseases(q);
  }, [query]);

  const visibleTree = useMemo(() => {
    if (!query.trim()) return tree;

    const matchingIds = new Set(results.map((item: any) => item.id));

    return tree
      .map((chapter) => ({
        ...chapter,
        children: chapter.children.filter((disease: any) =>
          matchingIds.has(disease.key)
        ),
      }))
      .filter((chapter) => chapter.children.length > 0);
  }, [tree, results, query]);

  return (
    <ShadcnSidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="border-b px-4 py-3">
        <div className="relative group-data-[collapsible=icon]:hidden">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar transtorno ou CID..."
            className="pl-9 h-8 bg-background shadow-none"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/"><Home className="w-4 h-4" /> Início</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <a href="#"><Users className="w-4 h-4" /> Meus Pacientes</a>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <a href="#"><ClipboardList className="w-4 h-4" /> Avaliações</a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <div className="text-[10px] font-bold tracking-[1.2px] text-muted-foreground px-2 pt-2 pb-1.5 uppercase group-data-[collapsible=icon]:hidden">
            Capítulos DSM-5
          </div>
          <SidebarMenu>
            {visibleTree.map((chapter) => {
              const isActiveChapter = chapter.key === activeChapterKey;
              const defaultOpen = Boolean(query.trim()) || isActiveChapter;

              return (
                <Collapsible
                  key={chapter.key}
                  defaultOpen={defaultOpen}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className={cn("w-full transition-colors", isActiveChapter && "bg-muted")}>
                        <ChevronRight className="h-2 w-2 shrink-0 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        {chapter.icon && (
                          <chapter.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className="min-w-0 flex-1 truncate font-medium text-xs">
                          {chapter.label}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {chapter.meta?.count}
                        </span>
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <SidebarMenuSub className="pr-0 mr-0 text-xs border-l border-border ml-5 pl-2 mt-1 mb-2">
                        {chapter.children.map((disease: any) => {
                          const href = `/app/assess/${disease.key}`; // using current app's route structure
                          const isActiveDisease = routerState.location.pathname === href;

                          return (
                            <SidebarMenuSubItem className="text-xs" key={disease.key}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isActiveDisease}
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigate({ to: href });
                                }}
                              >
                                <a href={href} className="flex items-start gap-2 text-muted-foreground hover:text-foreground h-auto py-1">
                                  <FileIcon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                  <span className="text-xs line-clamp-2 leading-snug break-words whitespace-normal">
                                    {disease.label}
                                  </span>
                                </a>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link to="/app/mapa"><Network className="w-4 h-4" /> Mapa de Diagnósticos</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <a href="#"><BookOpen className="w-4 h-4" /> Referências DSM-5</a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-3 mx-2 mb-2 bg-muted rounded-md border border-border">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1.5">
            <Zap size={11} />
            <span className="font-semibold tracking-wider">BETA CLÍNICO</span>
          </div>
          <p className="text-xs text-muted-foreground leading-snug m-0">
            Reporte bugs e sugestões direto pelo painel.
          </p>
        </div>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}

---

## src/components/workspace/WorkspaceShell.tsx
// src/components/workspace/WorkspaceShell.tsx
// Outer chrome: Header (sticky) + Sidebar + scrollable main area.
// Pass children for screen-specific content. Receive overlay slot for
// modal-like surfaces (command palette, dialogs).

import { useState, type ReactNode } from "react";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import type { ChapterKey } from "@/lib/dsm";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

interface WorkspaceShellProps {
  collapsed?: boolean;
  activeNav?: string | null;
  activeChapter?: ChapterKey | null;
  activeDisorder?: string | null;
  disordersByChapter?: Partial<Record<ChapterKey, string[]>>;
  children: ReactNode;
  /** Modal overlay (palette, dialog) rendered above the main area. */
  overlay?: ReactNode;
  /** Called when ⌘K is requested via header search button. */
  onCommandOpen?: () => void;
}

export function WorkspaceShell({
  children,
  overlay,
  onCommandOpen,
}: WorkspaceShellProps) {
  return (
    <SidebarProvider>
      <div className="w-full h-dvh bg-bg text-text font-sans flex overflow-hidden">
        <Sidebar />
        <SidebarInset className="flex-1 flex flex-col min-w-0 bg-bg">
          <Header onSearchClick={onCommandOpen} />
          <main className="flex-1 overflow-auto relative">
            {children}
          </main>
        </SidebarInset>
        {overlay}
      </div>
    </SidebarProvider>
  );
}

---

## src/components/command-palette/CommandPalette.tsx
// src/components/command-palette/CommandPalette.tsx
// ⌘K palette. Use zustand for open/close state OR lift it; here it accepts
// open + onOpenChange. Hook to a global hotkey at the app root.
//
// Real-world wiring sketch:
//   const { data } = useQuery({ queryKey: ['palette', q], queryFn: () => searchAll(q) })
// where searchAll() fans out across PocketBase collections.

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Search, ClipboardList, Users, Plus, Network, MessageSquare,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/cn";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Focus input on open; clear query on close.
  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setQ("");
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      onClick={() => onOpenChange(false)}
      className="fixed inset-0 z-50 flex justify-center pt-30 bg-text/25 dark:bg-black/45"
      style={{ paddingTop: 120 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[640px] bg-surface border border-border rounded-lg overflow-hidden flex flex-col shadow-s3"
      >
        <div className="flex items-center gap-2.5 px-4.5 py-3.5 border-b border-border">
          <Search size={16} className="text-text-3 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar transtorno, paciente, ação…"
            className="flex-1 bg-transparent border-none outline-none text-[15px] text-text placeholder:text-text-4"
          />
          <Kbd>ESC</Kbd>
        </div>

        <div className="px-1.5 py-2 max-h-[460px] overflow-y-auto">
          <PaletteGroup label="Transtornos · 4 resultados">
            <PaletteRow icon={<ClipboardList size={14} />} primary
              left="TDAH" meta="F90 · Polythetic · adultos ≥ 17a"
              right="01 — Neurodesenvolvimento" />
            <PaletteRow icon={<ClipboardList size={14} />}
              left="Transtorno de Aprendizagem Específico" meta="F81 · Tripartite"
              right="01 — Neurodesenvolvimento" />
            <PaletteRow icon={<ClipboardList size={14} />}
              left="Transtorno Depressivo Maior" meta="F32 · Polythetic"
              right="04 — Depressivos" />
            <PaletteRow icon={<ClipboardList size={14} />}
              left="Transtorno Neurocognitivo Maior" meta="F03 · Categórico por etiologia"
              right="17 — Neurocognitivos" />
          </PaletteGroup>

          <PaletteGroup label="Pacientes · 2 resultados">
            <PaletteRow icon={<Users size={14} />}
              left="Marina Schmidt" meta="32a F · em avaliação TDAH" right="paciente" />
            <PaletteRow icon={<Users size={14} />}
              left="Roberto Amaral" meta="47a M · TDM finalizado" right="paciente" />
          </PaletteGroup>

          <PaletteGroup label="Ações">
            <PaletteRow icon={<Plus size={14} />} left="Nova avaliação"
              right={<><Kbd>⌘</Kbd> <Kbd>N</Kbd></>} />
            <PaletteRow icon={<Users size={14} />} left="Novo paciente"
              right={<><Kbd>⌘</Kbd> <Kbd>P</Kbd></>} />
            <PaletteRow icon={<Network size={14} />} left="Abrir Mapa de Diagnósticos"
              right={<><Kbd>⌘</Kbd> <Kbd>G</Kbd></>} 
              onSelect={() => {
                navigate({ to: '/app/mapa' });
                onOpenChange(false);
              }}
            />
            <PaletteRow icon={<MessageSquare size={14} />} left="Perguntar ao Assistente Clínico…" />
          </PaletteGroup>
        </div>

        <div className="flex items-center gap-4 px-4.5 py-2.5 border-t border-border bg-surface-2 text-[11px] text-text-3">
          <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> navegar</span>
          <span className="flex items-center gap-1.5"><Kbd>↵</Kbd> abrir</span>
          <span className="flex items-center gap-1.5"><Kbd>⌘</Kbd><Kbd>↵</Kbd> nova avaliação</span>
        </div>
      </div>
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────
function PaletteGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-1">
      <div className="text-[10px] font-bold tracking-[1.2px] text-text-4 uppercase px-3.5 pt-2.5 pb-1.5">
        {label}
      </div>
      {children}
    </div>
  );
}

interface PaletteRowProps {
  icon: ReactNode;
  left: string;
  meta?: string;
  right?: ReactNode;
  primary?: boolean;
  onSelect?: () => void;
}

function PaletteRow({ icon, left, meta, right, primary, onSelect }: PaletteRowProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 px-3.5 py-2.5 rounded-[var(--radius-card)] w-full text-left",
        "cursor-pointer mx-1.5 transition-colors",
        primary ? "bg-accent-tint text-accent" : "text-text hover:bg-surface-2"
      )}
    >
      <span className={primary ? "text-accent" : "text-text-3"}>{icon}</span>
      <div className="flex-1 min-w-0">
        <div className={cn("text-sm overflow-hidden text-ellipsis whitespace-nowrap",
          primary ? "font-semibold" : "font-medium")}>{left}</div>
        {meta && (
          <div className={cn("text-[11px] mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap",
            primary ? "text-accent/80" : "text-text-3")}>{meta}</div>
        )}
      </div>
      {right && (
        <div className={cn("flex items-center gap-1.5 text-[11px] shrink-0",
          primary ? "text-accent/80" : "text-text-3")}>{right}</div>
      )}
    </button>
  );
}

---

## src/context/AuthContext.tsx
import React, { createContext, useContext, useState } from "react";

export interface AuthContextType {
  user: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (userData: any) => Promise<{ user: any }>;
  logout: () => void;
  requestPatientLink: (data: any) => Promise<any>;
  completeCommonProfile: (data: any) => Promise<any>;
  register: (data: any) => Promise<{ user: any }>;
  loginWithGoogleToken: (token: string) => Promise<{ user: any }>;
  requestProfessionalAccess: (data: any) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = async (userData: any) => {
    setIsLoading(true);
    return new Promise<{ user: any }>((resolve) => {
      setTimeout(() => {
        setUser(userData);
        setIsLoading(false);
        resolve({ user: userData });
      }, 1000);
    });
  };

  const logout = () => {
    setUser(null);
  };

  const stubAction = async (_data?: any) => {
    return Promise.resolve({ user: { id: "stub", name: "Stub User" } });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      isAuthenticated: !!user,
      login, 
      logout,
      requestPatientLink: stubAction,
      completeCommonProfile: stubAction,
      register: stubAction,
      loginWithGoogleToken: stubAction as any,
      requestProfessionalAccess: stubAction,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

---

## src/hooks/use-mobile.ts
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}

---

## src/api/http.ts
import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8000";

if (!baseURL) {
  throw new Error("VITE_API_URL não definida");
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

export function extractApiError(error: unknown, fallback: string) {
  if (typeof error === "object" && error && "response" in error) {
    const axiosError = error as {
      response?: {
        data?: {
          detail?: string | { message?: string; error_code?: string };
          message?: string;
        };
      };
    };

    const detail = axiosError.response?.data?.detail;

    if (typeof detail === "string") return detail;
    if (typeof detail === "object" && detail?.message) return detail.message;
    if (axiosError.response?.data?.message) return axiosError.response.data.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

---

## src/api/auth.ts
import { apiClient, extractApiError } from "./http";

export class AuthApiError extends Error {
  status?: number;
  errorCode?: string;

  constructor(message: string, options?: { status?: number; errorCode?: string }) {
    super(message);
    this.name = "AuthApiError";
    this.status = options?.status;
    this.errorCode = options?.errorCode;
  }
}

export type AuthUser = {
  id: string;
  name?: string | null;
  email: string;
  avatar?: string | null;
  email_visibility: boolean;
  verified: boolean;
  coins?: number;
  is_admin?: boolean;
  role?: string;
  is_blocked?: boolean;
  blocked_reason?: string | null;
  created?: string | null;
  updated?: string | null;
};

export type AuthSessionResponse = {
  provider: string;
  token: string;
  user: AuthUser;
  expires_in?: number | null;
  expires_at?: string | null;
};

export type AuthRegisterResponse = {
  provider: string;
  user: AuthUser;
  verification_requested: boolean;
  message: string;
};

export type AuthMessageResponse = {
  success: boolean;
  message: string;
};

export type DeleteAccountPayload = {
  notes?: string;
};

export type OAuthStartResponse = {
  provider: string;
  auth_url: string;
  state: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name?: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  emailVisibility?: boolean;
  turnstileToken?: string;
};

export async function login(payload: LoginPayload) {
  try {
    const { data } = await apiClient.post<AuthSessionResponse>("/auth/login", payload);
    return data;
  } catch (error) {
    throw new Error(extractApiError(error, "Nao foi possivel entrar na sua conta."));
  }
}

export async function register(payload: RegisterPayload) {
  try {
    const { data } = await apiClient.post<AuthRegisterResponse>("/auth/register", payload);
    return data;
  } catch (error) {
    const err = new AuthApiError(
      extractApiError(error, "Nao foi possivel criar sua conta.")
    );

    if (typeof error === "object" && error && "response" in error) {
      const axiosError = error as {
        response?: { status?: number; data?: { detail?: { error_code?: string; message?: string } } };
      };
      err.status = axiosError.response?.status;
      err.errorCode = axiosError.response?.data?.detail?.error_code;
    }

    throw err;
  }
}

export async function forgotPassword(email: string) {
  try {
    const { data } = await apiClient.post<AuthMessageResponse>("/auth/forgot-password", { email });
    return data;
  } catch (error) {
    throw new Error(extractApiError(error, "Nao foi possivel enviar o email de recuperacao."));
  }
}

export async function confirmVerification(token: string) {
  try {
    const { data } = await apiClient.get<AuthMessageResponse>("/auth/confirm-verification", {
      params: { token },
    });
    return data;
  } catch (error) {
    throw new Error(extractApiError(error, "Nao foi possivel confirmar seu email."));
  }
}

export async function getCurrentUser() {
  try {
    const { data } = await apiClient.get<AuthSessionResponse>("/auth/me");
    return data;
  } catch (error) {
    const err = new Error(extractApiError(error, "Nao foi possivel validar sua sessao.")) as Error & {
      status?: number;
      errorCode?: string;
    };

    if (typeof error === "object" && error && "response" in error) {
      const axiosError = error as {
        response?: { status?: number; data?: { detail?: { error_code?: string } } };
      };
      err.status = axiosError.response?.status;
      err.errorCode = axiosError.response?.data?.detail?.error_code;
    }

    throw err;
  }
}

export async function logout() {
  try {
    const { data } = await apiClient.post<AuthMessageResponse>("/auth/logout");
    return data;
  } catch (error) {
    throw new Error(extractApiError(error, "Nao foi possivel encerrar a sessao."));
  }
}

export async function deleteAccount(payload: DeleteAccountPayload = {}) {
  try {
    const { data } = await apiClient.post<AuthMessageResponse>("/auth/delete-account", payload);
    return data;
  } catch (error) {
    throw new Error(extractApiError(error, "Nao foi possivel encerrar sua conta."));
  }
}

export async function startGoogleAuth() {
  try {
    const { data } = await apiClient.get<OAuthStartResponse>("/auth/google/start");
    return data;
  } catch (error) {
    throw new Error(extractApiError(error, "Nao foi possivel iniciar o login com Google."));
  }
}

export async function completeGoogleAuth(code: string, state: string) {
  try {
    const { data } = await apiClient.get<AuthSessionResponse>("/auth/google/callback", {
      params: { code, state },
    });
    return data;
  } catch (error) {
    throw new Error(extractApiError(error, "Nao foi possivel concluir o login com Google."));
  }
}

---

## src/domain/schemas.ts
export const placeholderSchema = {};
export const ROLES = { PATIENT: 'PATIENT', PROFESSIONAL: 'PROFESSIONAL', COMMON: 'COMMON' };

---

