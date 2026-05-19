# Analytics Reference

Complete reference for the analytics system in `ReportsView.vue`.

---

## Architecture

All analytics are **computed client-side** from the `filteredLeads` array, which is already date-range filtered. No additional backend calls are made when the date range changes.

```
props.leads (all leads)
  └─ filteredLeads (date-range filtered)
       └─ all 10 section computeds
```

**Key files:**

| File | Purpose |
|------|---------|
| `src/components/ReportsView.vue` | Main analytics component (~1200 lines) |
| `src/composables/useAnalyticsUtils.ts` | Shared utilities (groupByField, safePercent, formatINR, weekStartISO) |
| `src/composables/useFollowUpTracking.ts` | Follow-up overdue detection |
| `src/components/charts/SimpleBarChart.vue` | SVG bar chart for lead velocity |
| `src/components/charts/ConversionFunnelChart.vue` | Existing chart |
| `src/components/charts/PipelineValueChart.vue` | Existing chart |
| `src/components/charts/LeadSourceChart.vue` | Existing chart |

---

## useAnalyticsUtils

```ts
import { useAnalyticsUtils } from '@/composables/useAnalyticsUtils'
const { safePercent, groupByField, weekStartISO, formatINR } = useAnalyticsUtils()
```

### `safePercent(won, total)`
Returns `Math.round((won / total) * 100)` or `0` if total is 0. Avoids division-by-zero everywhere.

```ts
safePercent(3, 10) // → 30
safePercent(0, 0)  // → 0
```

### `groupByField(leads, getter)`
Groups a lead array by any string value and returns a sorted-ready array of `GroupedRow`.

```ts
interface GroupedRow {
  key: string        // the grouped value (e.g. "Instagram")
  total: number      // total leads in this group
  won: number        // leads with status === 'Won'
  convRate: number   // safePercent(won, total)
  totalValue: number // sum of value for Won leads only
  avgDealValue: number // totalValue / won, or 0
}

// Example
const sourceStats = groupByField(leads, l => l.source || 'Unknown')
// → [{ key: 'Instagram', total: 12, won: 4, convRate: 33, totalValue: 200000, avgDealValue: 50000 }, ...]
```

The `getter` is a function so you can handle missing/undefined fields and apply any transformation before grouping.

### `weekStartISO(date)`
Returns the ISO date string (`YYYY-MM-DD`) of the Monday that starts the week containing `date`. Used by the lead velocity bucketing.

```ts
weekStartISO(new Date('2026-04-23')) // → '2026-04-21' (Monday)
```

### `formatINR(value)`
Compact Indian number formatting for table cells.

```ts
formatINR(150000) // → '₹1.5L'
formatINR(8500)   // → '₹8.5K'
formatINR(750)    // → '₹750'
```

---

## Sections Reference

### Collapsible section keys

All keys live in the `sections` ref and are persisted to `localStorage` under `analytics_sections`.

```ts
sections.value = {
  pipeline,       // existing — Pipeline Breakdown
  agents,         // existing — Agent Performance
  charts,         // existing — Charts & Visualizations
  sourceRoi,      // #1
  lostReasons,    // #2
  followUps,      // #3 + #10
  demographics,   // #4 + #5
  courseLocation, // #6 + #7
  velocity,       // #8 + #9
}
```

---

### Overdue Alert (always visible)

Not a collapsible section — renders as a red banner above Pipeline whenever `overdueLeads.length > 0`.

**Computed:** `overdueLeads`
```ts
// Active leads where follow-up date has passed
filteredLeads.filter(l => !['Won','Lost'].includes(l.status) && isFollowUpOverdue(l))
```

Uses `isFollowUpOverdue()` from `useFollowUpTracking`, which checks `followUpDate`, fall-through to `activities[type=follow_up]`, then earliest pending task due date.

---

### #1 — Source ROI (`sourceRoi`)

**Computed:** `sourceRoiStats`
```ts
groupByField(filteredLeads, l => l.source || 'Unknown')
  .sort((a, b) => b.convRate - a.convRate)  // sorted: best converter first
```

**Columns:** Source · Leads · Won · Conv% (bar) · Avg Deal (hidden on mobile)

**To add a column** (e.g. total pipeline value including non-won): extend the `GroupedRow` shape in `useAnalyticsUtils` or compute separately and merge by key.

---

### #2 — Lost Reasons (`lostReasons`)

**Computed:** `lostLeads`, `lostReasonStats`, `lostReasonTypeStats`

**Tab state:** `lostView: ref<'reason' | 'type'>('reason')`

```ts
// lostReasonStats — groups by lead.lostReason (free text)
{ reason: string, count: number, pct: number }[]

// lostReasonTypeStats — groups by lead.lostReasonType (enum → display label)
{ type: string, count: number, pct: number }[]
```

**Enum label map:**
```ts
const LOST_TYPE_LABELS = {
  price: 'Price',
  not_interested: 'Not Interested',
  competitor: 'Competitor',
  invalid_number: 'Invalid Number',
  duplicate: 'Duplicate',
  other: 'Other'
}
```

Horizontal bar width = `pct%` of the container. Blue bars for reasons, orange for categories.

---

### #3 — Follow-up Effectiveness (`followUps`)

**Computed:** `followUpEffectiveness`

```ts
{
  with:    { total, won, winRate }  // leads where getFollowUpDate(l) is truthy
  without: { total, won, winRate }  // leads where getFollowUpDate(l) is null
}
```

Uses `getFollowUpDate()` from `useFollowUpTracking` (checks activities → explicit field → task due date).

**Reading the output:** If `with.winRate` is significantly higher than `without.winRate`, follow-ups are working. If they're similar, the team may be over-scheduling unnecessary follow-ups.

---

### #4 — Age Distribution (`demographics`)

**Computed:** `ageDistribution`, `hasAgeData`

**Buckets:** `<18 · 18–24 · 25–30 · 31–35 · 36–40 · 40+`

Buckets with zero leads are filtered out. If no lead has an `age` value, the section shows an empty state instead of empty bars.

```ts
// Each bucket entry
{ label: string, min: number, max: number, total: number, won: number, winRate: number }
```

**Visual:** Dual-layer bar — indigo background = total leads, emerald overlay = won leads. Width is relative to the bucket with the highest total.

**To add/change buckets:** Edit `AGE_BUCKETS` array in `ReportsView.vue`.

```ts
const AGE_BUCKETS = [
  { label: '<18', min: 0, max: 17 },
  { label: '18–24', min: 18, max: 24 },
  // ...
]
```

---

### #5 — Prior Experience (`demographics`)

**Computed:** `priorExperienceStats`

```ts
groupByField(filteredLeads, l => l.priorExperience || 'Not specified')
  .sort((a, b) => b.total - a.total)
```

The experience options are configured in Settings → Experience tab (stored in `app_settings` table as `prior_experience_list`). Free-text entries from import also appear here.

**Conv% badge colours:** ≥50% emerald · ≥25% amber · <25% slate

---

### #6 — Interest / Course (`courseLocation`)

**Computed:** `allInterestStats`, `interestByVolume`, `interestByConversion`

```ts
interestByVolume    // top 8 by total leads
interestByConversion // top 8 by convRate, minimum 2 leads (filters noise)
```

Two-panel layout: volume on left (indigo bars), conversion on right (emerald bars). Bar width is relative to the top entry in each panel, not a percentage of 100.

---

### #7 — Location Breakdown (`courseLocation`)

**Computed:** `locationStats`

```ts
groupByField(filteredLeads, l => l.location || 'Unknown')
  .sort((a, b) => b.total - a.total)  // sorted: most leads first
```

**Columns:** City · Leads · Won · Conv% · Pipeline (sum of `totalValue`, hidden on mobile)

---

### #8 — Lead Velocity (`velocity`)

**Computed:** `leadVelocity`

Auto-selects bucketing based on date range length:
- **≤14 days** → daily buckets
- **>14 days** → weekly buckets (week starts Monday)

```ts
// Returns
{ label: string, value: number }[]
// e.g. [{ label: 'W04-21', value: 7 }, { label: 'W04-28', value: 12 }]
```

Rendered by `SimpleBarChart.vue`.

**Gap behaviour:** Days/weeks with zero leads are not shown (no zero-height bars). If you want gaps visible, fill empty keys with 0 between `start` and `end`.

---

### #9 — Time to Convert (`velocity`)

**Computed:** `timeToConvert`

```ts
{
  avgOverall: number | null  // null if no Won leads in period
  byAgent: { agent, avgDays, count }[]   // sorted fastest → slowest
  bySource: { source, avgDays, count }[] // sorted fastest → slowest
  totalWon: number
  maxDays: number  // used to scale the bar widths
}
```

**Days calculation logic:**
1. Look for a `status_change` activity whose note contains `'won'` (case-insensitive) — use its `timestamp`
2. Fall back to `lead.updatedAt` if no such activity exists
3. `days = max(0, round((wonDate - createdAt) / 86400000))`

**Bar colour logic (inverted — shorter = better):**
- Bar width = `((maxDays - avgDays) / maxDays) * 100%` — longest bar = fastest agent
- Colour: ≤7d green · ≤21d amber · >21d red

---

### #10 — Overdue by Agent (`followUps`)

Rendered inside the Follow-up Analysis section below the effectiveness comparison.

**Computed:** `overdueByAgent`
```ts
// Groups overdueLeads by assignedTo
{ agent: string, count: number }[]  // sorted: most overdue first
```

`overdueLeads` uses the same date-range filter as everything else, so it shows overdue leads created within the selected period only.

---

## SimpleBarChart

```vue
<SimpleBarChart :items="leadVelocity" color="#6366f1" />
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | `{ label: string; value: number }[]` | required | Bar data |
| `color` | `string` | `'#6366f1'` | Fill colour (any CSS colour) |

Renders as an inline SVG with `viewBox` so it scales to any container width. Labels rotate −35° to avoid overlap. Minimum bar width is 8px. Zero-value bars render as invisible (height 0).

---

## Adding a New Section

1. **Add a key to `sections` ref** in `ReportsView.vue`:
   ```ts
   const sections = ref({
     // ...existing
     myNewSection: !isMobile.value
   })
   ```

2. **Write the computed property:**
   ```ts
   const myStats = computed(() =>
     groupByField(filteredLeads.value, l => l.someField || 'Unknown')
       .sort((a, b) => b.total - a.total)
   )
   ```

3. **Add the template block** — copy any existing collapsible section and swap the content. The section wrapper pattern is always:
   ```html
   <div class="border-b border-slate-200 bg-white rounded-xl shadow-sm">
     <button @click="toggleSection('myNewSection')" ...>
     <Transition name="expand" @enter="onEnter" ...>
       <div v-if="sections.myNewSection" class="overflow-hidden">
         <!-- content -->
       </div>
     </Transition>
   </div>
   ```

4. **Add CSV rows** to `exportToCSV()` if the data is worth exporting.

`toggleSection` and the localStorage persistence work automatically for any key added to the `sections` ref — no other wiring needed.

---

## Data Gaps & Edge Cases

| Situation | Behaviour |
|-----------|-----------|
| Lead has no `source` | Groups under `'Unknown'` |
| Lead has no `age` | Excluded from age histogram; `hasAgeData` = false shows empty state |
| Lead has no `priorExperience` | Groups under `'Not specified'` |
| No Won leads in period | Time to Convert shows empty state, not 0 |
| `lostReason` is empty on a Lost lead | Groups under `'Not specified'` |
| Date range < 2 days | Velocity uses daily buckets |
| Follow-up date set but lead is Won/Lost | Excluded from overdue count |
