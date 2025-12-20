# LeadFlow LMS - Design System Reference

## Color Palette

### Primary Colors
- **Indigo 600**: `#4f46e5` - Primary CTA buttons, active states
- **Indigo 700**: `#4338ca` - Hover state for primary buttons
- **Indigo 50/100**: `#eef2ff` / `#e0e7ff` - Light backgrounds

### Status Colors
| Status | Color | Hex | Usage |
|--------|-------|-----|-------|
| New | Blue | `#3b82f6` | Newly created leads |
| Contacted | Yellow | `#eab308` | First contact made |
| Proposal | Purple | `#a855f7` | Proposal sent |
| Won | Green | `#22c55e` | Closed deal |
| Lost | Red | `#ef4444` | Rejected lead |

### Neutral Colors
| Element | Color | Hex |
|---------|-------|-----|
| Background | Slate-50 | `#f8fafc` |
| Card | White | `#ffffff` |
| Border | Slate-200 | `#e2e8f0` |
| Text Primary | Slate-900 | `#0f172a` |
| Text Secondary | Slate-600 | `#475569` |
| Text Tertiary | Slate-500 | `#64748b` |
| Hover BG | Slate-100 | `#f1f5f9` |

## Typography

### Font Family
- **Primary**: System stack (Tailwind default)
- `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`

### Font Sizes & Weights

| Element | Size | Weight | Class |
|---------|------|--------|-------|
| Heading 1 | 2rem | 700 | text-3xl font-bold |
| Heading 2 | 1.5rem | 700 | text-2xl font-bold |
| Heading 3 | 1.25rem | 700 | text-xl font-bold |
| Heading 4 | 1.125rem | 600 | text-lg font-semibold |
| Body | 1rem | 400 | text-base |
| Body Small | 0.875rem | 400 | text-sm |
| Label | 0.75rem | 600 | text-xs font-semibold |
| Caption | 0.75rem | 400 | text-xs |

## Component Spacing

### Padding
- **Card Padding**: `p-6` (1.5rem)
- **Section Padding**: `p-4` (1rem)
- **Dense**: `p-3` (0.75rem)
- **Compact**: `p-2` (0.5rem)

### Gaps
- **Large Gap**: `gap-6` (1.5rem) - Between sections
- **Medium Gap**: `gap-4` (1rem) - Between cards/items
- **Small Gap**: `gap-2` (0.5rem) - Between icons and text

### Margins
- **Section Margin**: `mb-8` (2rem) - Between major sections
- **Card Margin**: `mb-6` (1.5rem) - Between cards
- **Item Margin**: `mb-2`/`mb-3` (0.5rem/0.75rem) - Within cards

## Border & Radius

### Border Styles
- **Card Border**: `border border-slate-200` (1px)
- **Divider**: `border-b border-slate-200` (bottom only)
- **Subtle**: `border border-slate-100` (lighter)

### Border Radius
- **Cards/Modals**: `rounded-xl` (0.75rem / 12px)
- **Buttons**: `rounded-lg` (0.5rem / 8px)
- **Small Elements**: `rounded` (0.25rem / 4px)
- **Circles**: `rounded-full`

## Shadows

### Shadow Styles
- **Subtle**: `shadow-sm` - Cards, normal elements
- **Hover**: `shadow-md` - Cards on hover
- **Prominent**: `shadow-lg` - Modals, floating elements
- **Floating**: `shadow-xl` - Dropdowns, overlays

### Shadow Usage
- Default cards: `shadow-sm`
- Hover cards: `shadow-md` (with transition)
- Modals: `shadow-2xl`
- Dropdowns: `shadow-lg`

## Button Styles

### Primary Button
```html
<button class="px-6 py-2.5 bg-indigo-600 text-white rounded-lg 
  hover:bg-indigo-700 transition-colors font-medium">
  Action
</button>
```

### Secondary Button
```html
<button class="px-4 py-2 border border-slate-300 text-slate-700 
  hover:bg-slate-50 rounded-lg transition-colors">
  Action
</button>
```

### Icon Button
```html
<button class="p-2 text-slate-600 hover:bg-slate-100 
  rounded-lg transition-colors">
  <i class="ph-bold ph-icon"></i>
</button>
```

### Ghost Button
```html
<button class="px-4 py-2 text-slate-700 hover:bg-slate-50 
  rounded-lg transition-colors">
  Action
</button>
```

## Card Styles

### Standard Card
```html
<div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 
  hover:shadow-md transition-shadow">
  <!-- Content -->
</div>
```

### Compact Card
```html
<div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
  <!-- Content -->
</div>
```

## Badge & Tag Styles

### Status Badge
```html
<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full 
  text-xs font-medium bg-blue-100 text-blue-700">
  <div class="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
  New
</span>
```

### Count Badge
```html
<span class="text-xs font-bold text-slate-600 bg-white px-2 py-1 rounded-full">
  45
</span>
```

## Input Styles

### Text Input
```html
<input type="text" placeholder="Enter text..." 
  class="w-full px-4 py-2 bg-slate-50 border border-slate-200 
  rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
```

### Select Input
```html
<select class="w-full px-4 py-2 bg-white border border-slate-200 
  rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 
  appearance-none cursor-pointer">
  <!-- Options -->
</select>
```

## Icons

### Icon Library
- **Source**: Phosphor Icons (@phosphor-icons/web)
- **Weight**: Bold (`ph-bold`)
- **Sizes**: Adjusted via text-lg, text-xl, text-2xl, etc.

### Icon Usage
```html
<!-- Large Icon -->
<i class="ph-bold ph-users text-2xl text-blue-600"></i>

<!-- Small Icon in Button -->
<i class="ph-bold ph-plus text-lg"></i>

<!-- Inline Icon -->
<i class="ph-bold ph-check text-sm text-green-600"></i>
```

## Responsive Breakpoints

| Device | Breakpoint | Class Prefix |
|--------|-----------|--------------|
| Mobile | < 640px | (none) |
| Tablet | 640px+ | `sm:` |
| Desktop | 768px+ | `md:` |
| Large | 1024px+ | `lg:` |
| XL | 1280px+ | `xl:` |

### Responsive Patterns
- **Hide on Mobile**: `hidden sm:block`
- **Full on Mobile**: `w-full md:w-auto`
- **Collapse on Mobile**: `flex-col md:flex-row`
- **Grid Responsive**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`

## Animations & Transitions

### Transition Classes
- **Color Transition**: `transition-colors`
- **Shadow Transition**: `transition-shadow`
- **All Transition**: `transition-all`
- **Duration**: `duration-300` (default in Tailwind)

### Hover States
```html
<!-- Text Hover -->
<p class="text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer">
  Hover text
</p>

<!-- Button Hover -->
<button class="bg-indigo-600 hover:bg-indigo-700 transition-colors">
  Button
</button>

<!-- Card Hover -->
<div class="shadow-sm hover:shadow-md transition-shadow">
  Card
</div>
```

### Loading State
```html
<i class="ph-bold ph-spinner text-4xl text-slate-400 animate-spin"></i>
```

## Layout Patterns

### Header
```html
<header class="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 
  sticky top-0 z-20 shadow-sm">
  <!-- Content -->
</header>
```

### Main Container
```html
<main class="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
  <!-- Content -->
</main>
```

### Grid Layout
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <!-- Cards -->
</div>
```

### Flex Center
```html
<div class="flex items-center justify-center">
  <!-- Content -->
</div>
```

## Accessibility

### Focus States
```html
<button class="... focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
  Button
</button>
```

### Screen Reader Only
```html
<span class="sr-only">Hidden text for screen readers</span>
```

### Semantic HTML
- Use `<button>` not `<div>` for clickable elements
- Use `<a>` for navigation links
- Use `<form>` for forms
- Use proper heading hierarchy (`<h1>`, `<h2>`, etc.)
- Use `<label>` for form inputs

## Utility Classes Reference

### Display & Visibility
- `hidden` / `block` / `flex` / `grid`
- `sm:hidden` / `md:block` - Responsive

### Positioning
- `sticky` - Sticky positioning
- `absolute` / `relative` - Positioning
- `inset-0` - Full coverage

### Sizing
- `w-full` - 100% width
- `h-full` - 100% height
- `w-screen` / `h-screen` - Viewport
- `min-h-screen` - Minimum viewport height

### Spacing
- `px-4` - Horizontal padding
- `py-2` - Vertical padding
- `gap-4` - Grid/flex gap
- `mb-8` - Margin bottom
- `mt-2` - Margin top

### Colors
- `bg-indigo-600` - Background
- `text-slate-900` - Text color
- `border-slate-200` - Border color

### States
- `hover:` - On hover
- `focus:` - On focus
- `active:` - When pressed
- `disabled:` - Disabled state
- `dark:` - Dark mode (if enabled)

---

**Last Updated**: December 2025
**Design System Version**: 1.0
