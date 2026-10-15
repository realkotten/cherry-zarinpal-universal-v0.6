# Apple iPhone 18 Deep Black Cherry Theme Transformation

Comprehensive plan to transition the platform from light pink/rose tones to Apple's luxury **iPhone 18 Deep Black Cherry & Bordeaux Wine** aesthetic, utilizing deep burgundy wine undertones, crisp ivory/titanium slate surfaces, and high-contrast dark cherry accents.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following requirements have been confirmed by the user:

- **Confirmed Palette Direction**: Deep Black Cherry with rich burgundy wine undertones.
- **Confirmed Primary Accent**: Luxury Deep Bordeaux Wine (`#721c24`, hover `#5c131a`, active `#460910`).
- **Surface & Background Architecture**: Clean ivory (`#ffffff`, `#fafaf9`) and warm slate (`#f8fafc`, `#f1f5f9`) with structured dark cherry borders (`#d9c5cb`, `rgba(114, 28, 36, 0.2)`). **Completely remove all pastel pink, baby rose, and magenta tones** (`#fff1f2`, `#ffe4e6`, `#fecdd3`, `#d61f4d`).
- **Confirmed Rollout Structure**:
  1. **Phase 1: Foundation & Global Theme Tokens** (`src/index.css`, `index.html`, `public/icon.svg`).
  2. **Phase 2: Customer Journey & Booking Experience** (`AtelierShell`, `BottomNavBar`, `WelcomeScreen`, `OnboardingStep1-3`, `AtelierHomeView`, `BookDateTimeView`, `BookCheckoutView`, `BookConfirmedView`, `MyBookingsView`).
  3. **Phase 3: Management Portal & Calendars** (`ManagementShell`, `TodayTimeline`, `VisualDayCalendarView`, `ScheduleView`, `AnalyticsView`).

---

## 1. Overview & Core Concept

- **What It Does**: Shifts the visual styling from a light pink/rose palette to a brooding, executive **iPhone 18 Pro Dark Cherry / Bordeaux** look. All primary actions, interactive rings, active dock tabs, and focus outlines become deep bordeaux wine (`#721c24`), while backgrounds return to clean architectural ivory and titanium slate.
- **Target Aesthetic**: Resembles Apple's Pro titanium dark cherry hardware—understated, luxurious, high-contrast, and masculine-refined without candy-colored pinks.
- **Key Value**: Delivers pristine contrast ratios (exceeding WCAG AAA on white/ivory), authentic tactile depth, and elimination of unwanted pink/neon hues.

---

## 2. Design Tokens & Palette Specifications

### Color Token Mapping
| Token Role | Previous Value (Pink/Ruby) | New Value (iPhone 18 Dark Cherry) | Description |
| :--- | :--- | :--- | :--- |
| **Primary Accent (`--color-brand`)** | `#d61f4d` (Vivid Ruby) | `#721c24` | Luxury Deep Bordeaux Wine |
| **Hover State (`--color-brand-hover`)** | `#be123c` | `#5c131a` | Deep Black Cherry |
| **Active State (`--color-brand-active`)** | `#9f1239` | `#460910` | Dark Obsidian Cherry |
| **Soft Surface (`--color-brand-soft`)** | `#fff1f2` (Light Pink) | `#f6f2f4` | Crisp Ivory Mist with subtle burgundy warmth |
| **Border / Muted (`--color-brand-muted`)**| `#fecdd3` (Baby Rose) | `#d9c5cb` | Metallic Slate-Cherry hairline border |
| **Text on Soft Badges** | `#d61f4d` | `#721c24` | High-contrast bordeaux typography |
| **Selection Highlight** | `bg-[#fecdd3] text-[#881337]` | `bg-[#d9c5cb] text-[#460910]` | Neutral bordeaux highlight |
| **Atmospheric Glow** | Pink ambient blooms | Titanium slate with deep cherry dissipation (`rgba(114, 28, 36, 0.05)`) |

---

## 3. Implementation Steps

### Phase 1: Foundation & Global Theme Tokens
- Update `@theme` and `@layer base` in `src/index.css`:
  - `--color-brand: #721c24`
  - `--color-brand-hover: #5c131a`
  - `--color-brand-active: #460910`
  - `--color-brand-soft: #f6f2f4`
  - `--color-brand-muted: #d9c5cb`
  - Alias cherry and copper variables to the new deep bordeaux tokens.
  - Update `.cherry-button-primary` and `.copper-button-primary` background to `#721c24`, border to `#5c131a`, and shadow to `rgba(114, 28, 36, 0.28)`.
  - Update `.cherry-badge` to `bg-[#f6f2f4] text-[#721c24] border-[#d9c5cb]`.
  - Update `public/icon.svg` gradient to deep bordeaux and dark cherry stops (`#d9c5cb` -> `#8c222c` -> `#721c24` -> `#460910`).
  - Update text selection styles in `index.html`.

### Phase 2: Customer Booking Flow & Shell
- **`AtelierShell.tsx`**:
  - Replace pink radial blooms (`#ffe4e6`, `#fff1f2`, `#fecdd3`) with clean ivory gradients (`from-white via-[#fafaf9] to-[#f4f0f2]`) and subtle bordeaux ambient glows (`rgba(114, 28, 36, 0.04)`).
- **`BottomNavBar.tsx`**:
  - Update active tab pill backgrounds from `#fff1f2` to `#f6f2f4`, border from `#fecdd3` to `#d9c5cb`, and active icons/text to `#721c24`.
- **`WelcomeScreen.tsx` & `OnboardingStep1-3.tsx`**:
  - Convert icon badge backgrounds to `#f6f2f4`, borders to `#d9c5cb`, and icons to `#721c24`.
- **`AtelierHomeView.tsx` & Home Widgets**:
  - Update `CountdownWidget.tsx`: replace crimson/pink gradients with obsidian and deep bordeaux (`#1e0b10`, `#360f16`, `#721c24`).
  - Update `VitalityCycleWidget.tsx`: replace rose orbs with amber-bordeaux and deep wine sun gradients.
  - Update `UpcomingAppointmentCard.tsx` & `RoutineCard.tsx`: replace pink chip styles with `#f6f2f4`, `#d9c5cb`, and `#721c24`.
- **Booking Steps (`BookServicesView.tsx`, `BookDateTimeView.tsx`, `BookCheckoutView.tsx`, `BookConfirmedView.tsx`)**:
  - Replace all remaining instances of `#d61f4d` with `#721c24`.
  - Replace all `#fff1f2` with `#f6f2f4`.
  - Replace all `#fecdd3` with `#d9c5cb`.
  - Replace `#be123c` with `#5c131a`.
- **`MyBookingsView.tsx`**:
  - Update status icons, checkmarks, and empty state graphics to deep bordeaux.

### Phase 3: Admin Management Portal
- **`VisualDayCalendarView.tsx` & `VisualMultiDayCalendarView.tsx`**:
  - Update slot time capsules and booked badges to `#f6f2f4 text-[#721c24] border-[#d9c5cb]`.
- **`ScheduleView.tsx` & `TodayTimeline.tsx`**:
  - Set active day selectors and timeline scrubbers to deep bordeaux `#721c24`.
- **`ManagementShell.tsx` & Header**:
  - Refine active portal tab indicators and quick action highlights to dark cherry.
- **`AnalyticsView.tsx`**:
  - Update KPI accent lines and chart highlights from bright ruby to deep bordeaux.

---

## 4. Verification Plan

### Automated Verification
- Run `compile_applet` to verify TypeScript compilation and Vite build output.
- Run `lint_applet` to ensure zero lint or syntax issues.
- Run `grep` verification to confirm no lingering `#d61f4d`, `#fff1f2`, or `#fecdd3` pink tokens remain.

### Visual & Interactive Verification
- **Home View**: Verify background is clean ivory with rich dark cherry accents, completely free of pink tint.
- **Bottom Bar**: Check active tab indicator on white/ivory canvas.
- **Booking Flow**: Step through Services -> DateTime -> Checkout -> Confirmed to verify dark bordeaux buttons, pills, and boarding pass header.
- **Management Portal**: Verify calendar schedule slots, timeline scrubber, and active management tabs.
