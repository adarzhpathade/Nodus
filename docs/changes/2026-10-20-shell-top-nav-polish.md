# Polish App Shell, Top Navigation & Blueprint Design Tokens

- Date / tool / branch: 2026-10-20 / Antigravity / be/BE-tracker-update

## What changed
- `app/globals.css` - Added missing core utility classes `@utility text-display`, `@utility text-label`, `@utility cell`, `@utility divider-dashed`, and `@utility bg-blueprint`.
- `app/layout.tsx` - Moved the `<Noise />` paper texture behind all UI elements by changing `zIndex` from `60` (which previously overlaid noise grains on top of text, borders, and buttons) to `0`, wrapping the application providers in a `relative z-1` layer.
- `components/layout/GridFrame.tsx` - Added 4 corner crosshair registration marks positioned at the frame corner intersections per `ui_design.md` §5. Removed redundant opaque `bg-background` so the paper background and texture show through the frame canvas.
- `components/layout/RulerTicks.tsx` - Created architectural ruler tick strip component (`ruler-x` / `ruler-y`).
- `components/layout/Stage.tsx` - Created measured blueprint drawing stage component with corner crosshairs and perimeter rulers.
- `components/layout/TopNavBar.tsx` - Decreased nav bar height from `h-16 / lg:h-[72px]` (72px) down to a sleek architectural `h-13` (52px), adjusting internal vertical padding (`pt-2.5 pb-2`) so elements remain vertically centered. Structured nav bar as discrete bordered cells with support for subcategorized dropdown menus. Replaced generic chevrons on subcategory cells with the architectural bottom-right corner bracket notch (`⌟`), inverting cleanly to solid ink on hover. Replaced portal-based popup with an inline child dropdown menu to eliminate mouse-leave flickering. Updated trigger cell button so submenus open strictly on hover (removed `onClick` toggling), and removed description subtitles from submenu child rows. Removed both the active state top dot and the hover state orange indicator dot per user direction. Decreased submenu width to `w-full min-w-full` so it precisely matches the column width above it. Increased nav cell widths to `w-32 sm:w-36 lg:w-40` so the last option (`AI & Practice`) fits cleanly without truncation. Added `border-r border-border` on `<nav>` to cleanly close the right edge of the grid. Fixed submenu item font to Geist Mono uppercase `text-label`, removed arrow icons from submenu items, and removed font bolding on hover/active so only color change occurs.
- `components/layout/StudentTopNav.tsx` - Removed all right-side controls (Semester Switcher, Search trigger, Notification bell, and User Profile Menu) from the student top nav per user direction to keep the top nav focused on navigation. Removed description strings from `NAV_LINKS`.
- `components/layout/TopNavBar.tsx` - Made right-side controls container conditional so no empty bordered boxes appear when controls are omitted.
- `components/layout/FacultyTopNav.tsx` - Updated notification bell styling to match shell tokens.
- `components/layout/SemesterSwitcher.tsx` - Restyled switcher to `SEM 0X` mono trigger button, zero-radius dropdown, and `text-signal` current/active indicator.
- `components/layout/SubjectSectionSwitcher.tsx` - Restyled subject and section dropdowns with mono labels, zero-radius cells, and signal checkmarks.
- `components/layout/UserMenu.tsx` - Polished user menu dropdown with mono role tags, zero-radius popover, and clean typography.
- `components/layout/Breadcrumbs.tsx` - Replaced standard chevron with architectural `/` separators, uppercase mono segments, and blueprint system tag.
- `components/ui/button.tsx` - Set `rounded-none`, removed soft shadows, added `signal` button variant.
- `components/ui/dropdown-menu.tsx` - Removed `rounded-lg`, `rounded-md`, and shadows; applied `rounded-none` and hairline `border-border`.
- `components/ui/card.tsx` - Removed `rounded-xl` and shadows; applied `rounded-none` and `border-border`.
- `components/ui/badge.tsx` - Removed `rounded-4xl`; applied `rounded-none`, `text-label`, and `signal` variant.
- `components/ui/input.tsx` - Removed `rounded-lg`; applied `rounded-none` with orange focus ring.
- `components/ui/dialog.tsx` - Removed `rounded-xl`; applied `rounded-none` and hairline borders.
- `components/editor/QuickSwitcher.tsx` - Polished search item rows, badges, and footer keybinds with zero-radius and architectural styling.
- `app/(student)/notes/[noteId]/page.tsx` - Removed invalid `next/dynamic` with `ssr: false` from Server Component and directly imported `NoteEditor` (which internally lazy-loads Tiptap as a client component).

## Design decisions
- Typography: `@utility text-display` applies BT Grotesk SemiBold, uppercase, line-height 0.95, tracking -0.04em. `@utility text-label` applies Geist Mono Medium, uppercase, 12px, tracking +0.04em.
- Shape: Enforced strict zero radius (`rounded-none`) across all UI primitives per Blueprint Paper specification (only circles for avatars and status dots).
- Outer Frame: Corner crosshairs (`<Crosshair />`) placed at `-top-1.5 -left-1.5`, `-top-1.5 -right-1.5`, `-bottom-1.5 -left-1.5`, and `-bottom-1.5 -right-1.5` to align with the 10px inset frame.

## Not done / follow-ups
- Polish content pages next (Subjects list & Unit page, Notes list & Editor, or Graph View).

## Needs attention from the other role
- None.
