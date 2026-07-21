# Integración de Velion (Calendario Social Media) en Dashboard

## Contexto

Tenemos un proyecto Next.js 16 existente (dashboard) con Supabase que maneja perfiles de clientes. Queremos integrar toda la funcionalidad de Velion (calendario de contenido, briefs mensuales, pillar ideas, piezas gráficas, comentarios) **dentro de cada perfil de cliente**.

Cada cliente tendrá su propio calendario, sus briefs, sus ideas, sus piezas. Todo filtra por `client_id`.

---

## 1. Schema de Supabase

Ejecutar en Supabase SQL Editor. Las tablas originales de Velion usaban `user_id`. Ahora necesitamos `client_id` para que cada cliente tenga sus propios datos.

### 1.1 Agregar campo client_id a tablas existentes

```sql
-- Agregar client_id a calendar_pieces
ALTER TABLE calendar_pieces ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_calendar_pieces_client ON calendar_pieces(client_id, scheduled_date);

-- Agregar client_id a monthly_briefs
ALTER TABLE monthly_briefs ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_briefs_client ON monthly_briefs(client_id, year, month);

-- Agregar client_id a pillar_ideas
ALTER TABLE pillar_ideas ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_pillar_ideas_client ON pillar_ideas(client_id);

-- Agregar client_id a idea_comments
ALTER TABLE idea_comments ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_idea_comments_client ON idea_comments(client_id);

-- Agregar client_id a brief_comments
ALTER TABLE brief_comments ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_brief_comments_client ON brief_comments(client_id);

-- Agregar client_id a piece_comments (comentarios de piezas gráficas)
ALTER TABLE piece_comments ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_piece_comments_client ON piece_comments(client_id);
```

### 1.2 Actualizar RLS Policies

```sql
-- Calendar pieces: usuario autenticado + cliente que le pertenece
DROP POLICY IF EXISTS "Users can manage own calendar pieces" ON calendar_pieces;
CREATE POLICY "Users can manage own calendar pieces"
  ON calendar_pieces FOR ALL
  USING (auth.uid() = user_id AND client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- Monthly briefs
DROP POLICY IF EXISTS "Users can manage own monthly briefs" ON monthly_briefs;
CREATE POLICY "Users can manage own monthly briefs"
  ON monthly_briefs FOR ALL
  USING (auth.uid() = user_id AND client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- Pillar ideas
DROP POLICY IF EXISTS "Users can manage own pillar ideas" ON pillar_ideas;
CREATE POLICY "Users can manage own pillar ideas"
  ON pillar_ideas FOR ALL
  USING (auth.uid() = user_id AND client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- Idea comments
DROP POLICY IF EXISTS "Users can manage comments on their ideas" ON idea_comments;
CREATE POLICY "Users can manage comments on their ideas"
  ON idea_comments FOR ALL
  USING (auth.uid() = user_id AND client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- Brief comments
DROP POLICY IF EXISTS "Users can manage brief comments" ON brief_comments;
CREATE POLICY "Users can manage brief comments"
  ON brief_comments FOR ALL
  USING (auth.uid() = user_id AND client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- Piece comments
DROP POLICY IF EXISTS "Users can manage piece comments" ON piece_comments;
CREATE POLICY "Users can manage piece comments"
  ON piece_comments FOR ALL
  USING (auth.uid() = user_id AND client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));
```

---

## 2. Estructura de archivos a crear

Dentro del proyecto dashboard existente, crear estas rutas y archivos:

```
src/
├── app/
│   └── (dashboard)/
│       └── clients/
│           └── [id]/
│               ├── page.tsx              ← Ya existe (resumen del cliente)
│               ├── layout.tsx            ← Layout con tabs de navegación
│               ├── calendar/
│               │   └── page.tsx          ← Calendario de contenido
│               ├── pillars/
│               │   └── page.tsx          ← Pillares & Themes
│               └── settings/
│                   └── page.tsx          ← Configuración del cliente
│
├── components/
│   ├── velion/                            ← Componentes de Velion adaptados
│   │   ├── CalendarView.tsx              ← Vista del calendario mensual
│   │   ├── BriefEditor.tsx               ← Editor de brief mensual
│   │   ├── PillarIdeasGrid.tsx           ← Grid de ideas del cliente
│   │   ├── IdeaDetailModal.tsx           ← Modal detalle de idea
│   │   ├── IdeaFormModal.tsx             ← Modal crear/editar idea
│   │   ├── PieceViewerModal.tsx          ← Visor de piezas gráficas con anotaciones
│   │   ├── ClientNavTabs.tsx             ← Tabs de navegación del cliente
│   │   └── BriefDetailModal.tsx          ← Modal detalle del brief
│   └── ui/
│       ├── Button.tsx
│       ├── GlassCard.tsx
│       └── ModalPortal.tsx
│
├── lib/
│   └── velion-types.ts                   ← Tipos de Velion (copiar de packages/shared)
```

---

## 3. Tipos de TypeScript

Crear `src/lib/velion-types.ts` con estos tipos:

```typescript
export type PieceType = "carousel" | "story" | "reel" | "post";

export interface CalendarPiece {
  id: string;
  user_id: string;
  client_id: string;
  title: string;
  type: PieceType;
  scheduled_date: string;
  scheduled_time: string;
  media_url: string | null;
  media_additional: string[];
  pillar_idea_id: string | null;
  caption: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlyBrief {
  id: string;
  user_id: string;
  client_id: string;
  month: string;
  year: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export type IdeaStatus = "approved" | "needs_revision" | "standby" | "draft";

export interface PillarIdea {
  id: string;
  user_id: string;
  client_id: string;
  brief_id: string | null;
  title: string;
  description: string | null;
  pillar: string;
  theme: string;
  type: PieceType;
  status: IdeaStatus;
  feedback: string | null;
  scheduled_date: string | null;
  image_url: string | null;
  copy: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}

export interface IdeaComment {
  id: string;
  idea_id: string;
  user_id: string;
  client_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface BriefComment {
  id: string;
  brief_id: string;
  user_id: string;
  client_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface PieceComment {
  id: string;
  piece_id: string;
  user_id: string;
  client_id: string;
  content: string;
  x_pos: number;
  y_pos: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommentWithProfile extends IdeaComment {
  profile: Pick<Profile, "first_name" | "last_name" | "avatar_url">;
}

export interface BriefCommentWithProfile extends BriefComment {
  profile: Pick<Profile, "first_name" | "last_name" | "avatar_url">;
}

export interface PieceCommentWithProfile extends PieceComment {
  profile: Pick<Profile, "first_name" | "last_name" | "avatar_url">;
}
```

---

## 4. Layout con tabs de navegación

Crear `src/app/(dashboard)/clients/[id]/layout.tsx`:

```tsx
import { ClientNavTabs } from "@/components/velion/ClientNavTabs";
import { ReactNode } from "react";

export default function ClientLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { id: string };
}) {
  return (
    <div className="space-y-6">
      <ClientNavTabs clientId={params.id} />
      {children}
    </div>
  );
}
```

---

## 5. Componente ClientNavTabs

Crear `src/components/velion/ClientNavTabs.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HiViewGrid, HiDocumentText, HiCog, HiChartBar } from "react-icons/hi";

export function ClientNavTabs({ clientId }: { clientId: string }) {
  const pathname = usePathname();
  const base = `/clients/${clientId}`;

  const tabs = [
    { href: base, label: "Resumen", icon: HiChartBar },
    { href: `${base}/calendar`, label: "Calendario", icon: HiViewGrid },
    { href: `${base}/pillars`, label: "Pilares & Ideas", icon: HiDocumentText },
    { href: `${base}/settings`, label: "Configuración", icon: HiCog },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              isActive
                ? "bg-velion-cyan/20 text-velion-cyan shadow-lg shadow-velion-cyan/10"
                : "text-[var(--text-secondary)] hover:text-velion-cyan hover:bg-white/5"
            }`}
          >
            <Icon size={18} />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
```

---

## 6. Página de Calendario

Crear `src/app/(dashboard)/clients/[id]/calendar/page.tsx`:

```tsx
"use client";

import dynamic from "next/dynamic";

export default dynamic(() => import("./CalendarPage"), { ssr: false });
```

Crear `src/app/(dashboard)/clients/[id]/calendar/CalendarPage.tsx`:

Este componente es la vista completa del calendario de contenido. Debe:

1. Recibir `client_id` de los params de la URL
2. Filtrar todas las queries por `client_id` en vez de `user_id`
3. Mostrar el calendario mensual con ideas programadas
4. Permitir crear/editar ideas con `client_id`
5. Vincular piezas gráficas a ideas
6. Mostrar brief mensual del cliente

### Lógica principal del CalendarPage:

```tsx
// En todas las queries de Supabase, cambiar:
// .eq("user_id", user.id)
// Por:
// .eq("client_id", clientId)

// Al crear piezas/briefs/ideas, incluir client_id:
await supabase.from("pillar_ideas").insert({
  user_id: user.id,
  client_id: clientId,  // <-- AGREGAR ESTO
  title: title.trim(),
  // ... resto de campos
});

// Las funciones de fetchData deben filtrar por client_id:
const fetchData = useCallback(async () => {
  if (!user) return;
  
  const { data: briefData } = await supabase
    .from("monthly_briefs")
    .select("*")
    .eq("user_id", user.id)
    .eq("client_id", clientId)  // <-- FILTRAR POR CLIENTE
    .eq("month", String(month).padStart(2, "0"))
    .eq("year", year)
    .single();

  const { data: ideasData } = await supabase
    .from("pillar_ideas")
    .select("*")
    .eq("user_id", user.id)
    .eq("client_id", clientId)  // <-- FILTRAR POR CLIENTE
    .order("scheduled_date", { ascending: true });

  const { data: piecesData } = await supabase
    .from("calendar_pieces")
    .select("*")
    .eq("user_id", user.id)
    .eq("client_id", clientId);  // <-- FILTRAR POR CLIENTE
}, [user, clientId, monthStr, supabase]);
```

---

## 7. Página de Pillares & Ideas

Crear `src/app/(dashboard)/clients/[id]/pillars/page.tsx` y `PillarsPage.tsx`.

Esta página muestra todas las ideas del cliente agrupadas por pilar, con filtros de tipo y estado. Es similar al calendar pero en vista de grid/lista en vez de calendario.

### Queries (las mismas que Calendar pero sin filtro de mes):

```tsx
// Obtener todas las ideas del cliente
const { data: ideasData } = await supabase
  .from("pillar_ideas")
  .select("*")
  .eq("user_id", user.id)
  .eq("client_id", clientId)
  .order("created_at", { ascending: false });
```

---

## 8. Brief Mensual (componente reutilizable)

Crear `src/components/velion/BriefEditor.tsx`:

Componente que muestra/edita el brief mensual del cliente. Reutilizar la lógica del BriefEditor original de Velion, cambiando solo el filtro a `client_id`.

---

## 9. Modales (copiar y adaptar)

Copiar estos componentes de Velion y adaptar los imports:

- `IdeaDetailModal.tsx` → Recibe `clientId` como prop, filtra comentarios por `client_id`
- `IdeaFormModal.tsx` → Al guardar, incluye `client_id` en el insert
- `PieceViewerModal.tsx` → Los comentarios de pieza filtran por `client_id`
- `BriefDetailModal.tsx` → Los comentarios del brief filtran por `client_id`

### Patrón común en todos los modales:

```tsx
// Al enviar comentarios:
await supabase.from("idea_comments").insert({
  idea_id: idea.id,
  user_id: user.id,
  client_id: clientId,  // <-- AGREGAR
  content: commentText.trim(),
});

// Al obtener comentarios:
const { data } = await supabase
  .from("idea_comments")
  .select("*")
  .eq("idea_id", idea.id)
  .eq("client_id", clientId)  // <-- FILTRAR
  .order("created_at", { ascending: true });
```

---

## 10. CSS / Estilos

Copiar las clases de Velion al `globals.css` del dashboard existente:

```css
:root {
  --velion-blue: #011f51;
  --velion-cyan: #0d9488;
  --velion-blue-light: #012a6f;
  --velion-cyan-light: #14b8a6;
  --glass-bg: rgba(255, 255, 255, 0.15);
  --glass-border: rgba(255, 255, 255, 0.25);
  --glass-shadow: 0 8px 32px 0 rgba(1, 31, 81, 0.1);
  --card-bg: rgba(255, 255, 255, 0.7);
}

.dark {
  --velion-cyan: #56efd0;
  --velion-cyan-light: #7df2db;
  --glass-bg: rgba(1, 31, 81, 0.4);
  --glass-border: rgba(86, 239, 208, 0.2);
  --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.4);
  --card-bg: rgba(1, 17, 40, 0.7);
}

@theme inline {
  --color-velion-blue: var(--velion-blue);
  --color-velion-cyan: var(--velion-cyan);
}

.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
}

.glass-card {
  background: var(--card-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  border-radius: 16px;
}

.glass-card:hover {
  box-shadow: 0 8px 40px 0 rgba(13, 148, 136, 0.15);
  border-color: rgba(13, 148, 136, 0.3);
}

.dark .glass-card:hover {
  box-shadow: 0 8px 40px 0 rgba(86, 239, 208, 0.15);
  border-color: rgba(86, 239, 208, 0.3);
}

.gradient-text {
  background: linear-gradient(135deg, var(--velion-cyan), var(--velion-blue));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }

@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-slide-up { animation: slideUp 0.5s ease-out forwards; }

@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
.shimmer {
  background: linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--velion-cyan) 10%, transparent) 50%, transparent 100%);
  background-size: 200% 100%;
  animation: shimmer 3s ease-in-out infinite;
}
```

---

## 11. Dependencias a instalar

```bash
npm install date-fns react-icons react-dropzone
```

---

## 12. Resumen de cambios por archivo

| Archivo | Cambio |
|---------|--------|
| `globals.css` | Agregar variables CSS de Velion + clases glass/gradient |
| `src/lib/velion-types.ts` | **Nuevo** - Todos los tipos de Velion con `client_id` |
| `src/components/velion/ClientNavTabs.tsx` | **Nuevo** - Tabs Resumen/Calendario/Pilares/Config |
| `src/components/velion/CalendarView.tsx` | **Nuevo** - Calendario mensual (adaptar de PillarsPage) |
| `src/components/velion/BriefEditor.tsx` | **Nuevo** - Editor de brief mensual |
| `src/components/velion/IdeaDetailModal.tsx` | **Nuevo** - Modal detalle de idea |
| `src/components/velion/IdeaFormModal.tsx` | **Nuevo** - Modal crear/editar idea |
| `src/components/velion/PieceViewerModal.tsx` | **Nuevo** - Visor de piezas con anotaciones |
| `src/components/velion/BriefDetailModal.tsx` | **Nuevo** - Modal detalle del brief |
| `src/app/(dashboard)/clients/[id]/layout.tsx` | **Nuevo** - Layout con tabs |
| `src/app/(dashboard)/clients/[id]/calendar/page.tsx` | **Nuevo** - Página calendario |
| `src/app/(dashboard)/clients/[id]/calendar/CalendarPage.tsx` | **Nuevo** - Lógica del calendario |
| `src/app/(dashboard)/clients/[id]/pillars/page.tsx` | **Nuevo** - Página pilares |
| `src/app/(dashboard)/clients/[id]/pillars/PillarsPage.tsx` | **Nuevo** - Vista grid de ideas |

---

## 13. Flujo de usuario final

1. Usuario entra al dashboard → ve lista de clientes
2. Hace click en un cliente → ve Resumen (KPIs, métricas)
3. Hace click en "Calendario" → ve el calendario de contenido de **ese cliente**
4. Puede crear briefs mensuales, ideas, piezas gráficas para **ese cliente**
5. Hace click en "Pilares & Ideas" → ve todas las ideas agrupadas por pilar
6. Cada idea tiene comentarios, estado, copy, piezas vinculadas
7. Todo filtrado por `client_id` — cada cliente tiene su propio mundo

---

## 14. Checklist de implementación

- [ ] Ejecutar SQL en Supabase (agregar client_id + RLS)
- [ ] Crear `src/lib/velion-types.ts`
- [ ] Copiar estilos CSS al globals.css
- [ ] Crear `ClientNavTabs.tsx`
- [ ] Crear layout de `[id]/layout.tsx`
- [ ] Crear página calendario `calendar/page.tsx` + `CalendarPage.tsx`
- [ ] Crear página pilares `pillars/page.tsx` + `PillarsPage.tsx`
- [ ] Crear modales: IdeaDetail, IdeaForm, PieceViewer, BriefDetail, BriefEditor
- [ ] Verificar que todas las queries filtran por `client_id`
- [ ] Instalar dependencias: `date-fns`, `react-icons`, `react-dropzone`
- [ ] Testear flujo completo: crear cliente → calendario → brief → idea → pieza → comentario
