# Circuit Design System

## Philosophy

Circuit uses a **minimalist, document-focused aesthetic** inspired by professional financial tools like Carta. The interface should feel:
- Calm and professional
- Transparent and cohesive
- Intentional, not cluttered

## Color Tokens

All colors are defined as HSL values in `index.css` and used via Tailwind classes.

### Light Mode
```css
--background: 0 0% 100%;           /* White */
--foreground: 240 10% 3.9%;        /* Near black */
--primary: 240 5.9% 10%;           /* Dark grey */
--primary-foreground: 0 0% 98%;    /* Off white */
--secondary: 240 4.8% 95.9%;       /* Light grey */
--muted: 240 4.8% 95.9%;           /* Light grey */
--muted-foreground: 240 3.8% 46.1%; /* Medium grey */
--accent: 240 4.8% 95.9%;          /* Light grey */
--border: 240 5.9% 90%;            /* Light border */
```

### Dark Mode
```css
--background: 240 10% 3.9%;        /* Near black */
--foreground: 0 0% 98%;            /* Off white */
--primary: 0 0% 98%;               /* Off white */
--primary-foreground: 240 5.9% 10%; /* Dark grey */
--secondary: 240 3.7% 15.9%;       /* Dark grey */
--muted: 240 3.7% 15.9%;           /* Dark grey */
--border: 240 3.7% 15.9%;          /* Dark border */
```

### Usage Rules
- **NEVER** use direct colors like `text-white`, `bg-black`, `text-gray-500`
- **ALWAYS** use semantic tokens: `text-foreground`, `bg-background`, `text-muted-foreground`
- Borders: `border-border`
- Interactive elements: `bg-primary text-primary-foreground`

## Typography

### Font Stack
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Sizes
- Page titles: `text-lg font-semibold`
- Card titles: `text-sm font-medium`
- Body text: `text-sm`
- Captions: `text-xs text-muted-foreground`

### Headings (in memos)
- H1: `text-2xl font-bold`
- H2: `text-xl font-semibold`
- H3: `text-lg font-medium`

## Spacing

### Standard Gaps
- Between cards: `gap-4`
- Card padding: `p-4`
- Card header padding: `px-4 py-3`
- Button gaps: `gap-2`
- Icon + text: `gap-2`

### Layout
- Sidebar width: `w-80` (320px)
- Main content: Flexible, fills remaining space
- Max content width: `max-w-4xl` for readability

## Components

### Cards
Transparent background, subtle border:
```tsx
<div className="rounded-xl border border-border bg-transparent overflow-hidden">
  <div className="px-4 py-3 border-b border-border flex items-center gap-2">
    <Icon className="w-4 h-4" />
    <span className="font-medium text-sm">Title</span>
  </div>
  <div className="p-4">
    {/* Content */}
  </div>
</div>
```

### Buttons
Primary (solid):
```tsx
<Button className="bg-foreground text-background hover:bg-foreground/90">
  Action
</Button>
```

Secondary (outline):
```tsx
<Button variant="outline" size="sm">
  Secondary
</Button>
```

Icon button:
```tsx
<Button size="sm" variant="outline" className="shrink-0">
  <Copy className="w-3.5 h-3.5" />
</Button>
```

### Inputs
Transparent background:
```tsx
<Input 
  className="bg-transparent border-border" 
  placeholder="Enter value"
/>
```

### Tables
```tsx
<Table>
  <TableHeader>
    <TableRow className="border-border hover:bg-transparent">
      <TableHead className="text-muted-foreground">Column</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="border-border hover:bg-muted/50 cursor-pointer">
      <TableCell>Value</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Status Indicators
```tsx
// Idle - pulsing dot
<span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />

// Loading - spinner
<Loader2 className="w-3 h-3 animate-spin" />

// Success - checkmark
<Check className="w-3 h-3 text-green-600" />

// Error - alert
<AlertCircle className="w-3 h-3 text-destructive" />
```

## Animations

### Transitions
Standard hover transition:
```css
transition-colors duration-200
```

### Loading States
Skeleton loading:
```tsx
<Skeleton className="h-4 w-32" />
```

Spinner:
```tsx
<Loader2 className="w-4 h-4 animate-spin" />
```

### Page Transitions
Round switch splash with fading text ticker effect.

## Icons

Using Lucide React icons throughout.

### Standard Sizes
- In buttons: `w-3.5 h-3.5` or `w-4 h-4`
- In headers: `w-4 h-4`
- Standalone: `w-5 h-5`

### Common Icons
- Pipeline: `Users`
- Memo: `FileText`
- Docket: `FileSignature`
- Copy: `Copy`
- External link: `ExternalLink`
- Settings: `Settings`
- Close: `X`
- Add: `Plus`
- Check: `Check`
- Loading: `Loader2`

## Responsive Design

### Breakpoints
- Mobile: Default (< 768px)
- Tablet: `md:` (768px+)
- Desktop: `lg:` (1024px+)

### Mobile Considerations
- Sidebar collapses on mobile
- Tables become scrollable
- Touch-friendly tap targets (min 44px)

## Do's and Don'ts

### Do
- Use transparent backgrounds for cards and inputs
- Keep visual hierarchy clear with spacing
- Use consistent icon sizes
- Apply hover states to interactive elements
- Use semantic color tokens

### Don't
- Add visible focus rings (removed globally)
- Use white backgrounds on cards
- Mix different icon libraries
- Use direct color values
- Create visual clutter with too many borders

## Dark Mode Support

All components automatically support dark mode via CSS variables. The theme switches based on system preference or user toggle.

Key considerations:
- Contrast ratios maintained in both modes
- Shadows subtle in dark mode
- Borders visible but not harsh
