# Agent Spec: Generate the Jae Travel Tour Flyer (PDF)

**Goal:** For any tour in our system, produce a one-page A4 PDF flyer that matches the approved reference design exactly: same layout, colours, fonts, spacing and wording structure. Only the data and images change per tour.

**Reference files (ground truth):**
- `Jae_Travel_Tour_Flier.pdf`: the approved flyer. Render it and compare your output to it.
- `flier_reference.py`: the ReportLab script that produced it. Reuse its coordinates and drawing order. Do not redesign.

## 0. Working rules

1. **Reuse the existing flow.** Use our current tour/booking data access, image storage and PDF export flow. Do not build a parallel pipeline.
2. **Introspect before changing anything.** Inspect the real database schema first. Map each required field in section 3 to an existing column. Only for fields that do not exist, write migration SQL (section 5). Never drop or alter existing columns. Show the migration for review before running it.
3. **No invented content.** Never make up prices, dates, phone numbers, destinations or claims. If a required field is empty, stop and report which fields are missing. Do not insert placeholder text into a final PDF. (The reference PDF has bracketed contact placeholders only because that data was not yet available.)
4. **Use our real logo** (`public/logo.jpg`, section 4). Do not use the text wordmark when a logo exists.
5. **Library:** `@react-pdf/renderer` (already installed), A4 portrait (595.28 x 841.89 pt), every element absolutely positioned. The coordinates in section 2 come from the reference script and use a **bottom-left origin** (`W, H = A4`). In react-pdf convert them: a rectangle's `top = H - (y + height)`; for text, `top = H - baseline - 0.8*fontSize` as a starting point, then adjust by comparing renders until each baseline matches the reference within 1.5 pt.
6. **Fonts:** Helvetica, Helvetica-Bold, Helvetica-Oblique only. Do not use Unicode sub/superscript characters.

## 1. Design tokens

| Token | Hex | Use |
|---|---|---|
| GREEN | `#1F3D2B` | section title, card titles, banner background, contact text |
| GOLD | `#E8A33D` | headline line 2, accents, card left bars, underline, banner title, divider |
| SAND | `#F6EBD7` | page background |
| ORANGE | `#D9622B` | Book Now button |
| DARK | `#16241B` | silhouettes (fallback hero only) |
| BODY | `#4A5A4F` | card descriptions, footer line |
| Sky gradient | `#2B1B3D` to `#D9622B` to `#F2B45A` | fallback hero only |

## 2. Layout, top to bottom (all values in points)

Page background: fill the full page with SAND.

**2.1 Hero (top 44% of page)**
- Rect: x=0, y=`H - 0.44*H`, width=W, height=`0.44*H` (about 370.5). Call its bottom edge `hero_bottom`.
- **Image mode (default):** draw the tour's cover image scaled to *cover* the hero rect (preserve aspect ratio, centre-crop, no distortion). Clip to the hero rect.
- Overlay for legibility, on top of the image: a vertical gradient of `#2B1B3D` from alpha 0.55 at the top to alpha 0.0 at 60% height, then `#16241B` from alpha 0.0 up to alpha 0.35 at the bottom edge. Build it from 60 thin horizontal strips like the reference. Do not use blurs.
- **Fallback mode** (no cover image): draw the vector scene exactly as in `flier_reference.py` (gradient sky, sun with 3 translucent halos, hills, ground, two acacias, two giraffes).

**2.2 Header bar**
- Full-width rect, height 62, at top (y=`H-62`), black at 28% alpha.
- **Logo (left):** `public/logo.jpg` shown as a circle: 46 x 46 pt, `borderRadius: 23`, `overflow: hidden`, image fills it (`objectFit: cover`), x=36, vertically centred in the bar (top offset 8 from the page top). The logo is a square JPEG with a white background, so the circular clip removes the white corners. No extra plate. Never stretch, recolour or add a border.
- **Wordmark (next to logo):** `JAE TRAVEL` (white) + ` EXPEDITIONS` (GOLD), Helvetica-Bold 16, x=92 (36 + 46 + 10), baseline `H-37`. Use `BRAND.companyName` split at the first space.
- **Tagline (right):** `BRAND.tagline`, Helvetica-Oblique 10, colour `#FBE7C0`, right-aligned at x=`W-36`, baseline `H-37`. If it would come within 16 pt of the wordmark, reduce the font size down to 8. If it still collides, omit it here (the footer still shows it).
- If `public/logo.jpg` cannot be read, draw the wordmark alone at x=36, and report a warning.

**2.3 Headline block**
- Line 1: Helvetica-Bold 46, white, x=36, baseline `H-135`.
- Line 2: Helvetica-Bold 46, GOLD, x=36, baseline `H-183`.
- Subtitle: Helvetica 13, white, x=38, baseline `H-210`.
- Fit rule: if a line is wider than `W-72`, reduce its font size in steps of 1 down to a minimum of 34. If it still does not fit, report an error.

**2.4 Section title**
- `y0 = hero_bottom - 40`.
- Text `What's included`: Helvetica-Bold 20, GREEN, x=36, baseline `y0`.
- Underline: GOLD rect, x=36, y=`y0-9`, 54 wide, 3.5 tall.

**2.5 Highlight cards (exactly 6, 2 columns x 3 rows)**
- `cw = (W - 72 - 20) / 2`, `ch = 56`. Column gap 20, row gap 10.
- Card i: `col = i % 2`, `row = i // 2`; `x = 36 + col*(cw+20)`; `y = y0 - 30 - ch - row*(ch+10)`.
- Card body: white rounded rect, radius 8.
- Left accent: GOLD rounded rect, x, y, width 6, height `ch`, radius 3.
- Title: Helvetica-Bold 12.5, GREEN, x=`x+18`, baseline `y+ch-20`.
- Description: Helvetica 9.5, BODY colour, x=`x+18`, first baseline `y+ch-34`, line height 12, wrap at width `cw-30`. Maximum 2 lines.
- Limits: title up to 24 characters; description up to 95 characters. If longer, report an error rather than truncating silently.

**2.6 Booking banner**
- `by = 112`. GREEN rounded rect: x=36, y=`by`, width `W-72`, height 74, radius 10.
- Title `Secure your adventure`: Helvetica-Bold 16, GOLD, x=54, baseline `by+48`.
- Line 1: `A {BRAND.depositPercent}% non-refundable deposit confirms your booking.` Helvetica 11, white, x=54, baseline `by+28`.
- Line 2: `Contact us for dates, group rates and custom quotes.` Helvetica 11, white, x=54, baseline `by+12`.
- If `BRAND.depositRefundable` is true, change the wording to `A {BRAND.depositPercent}% deposit confirms your booking.`
- Button: ORANGE rounded rect, x=`W-36-118`, y=`by+20`, 100 x 34, radius 17. Text `BOOK NOW`, Helvetica-Bold 12, white, centred at x=`W-36-68`, baseline `by+31`.

**2.7 Footer**
- Contact lines: Helvetica-Bold 10.5, GREEN. Values come from `BRAND` (section 3).
  - Left column x=36: `Phone:  {phone}` baseline 78; `Email:   {email}` baseline 62.
  - Right column x=`W/2+10`: `Web:  {website}` baseline 78; `Social:  {social}` baseline 62. If `BRAND.social` is empty, **leave that slot blank**. Never print a placeholder.
- Divider: GOLD line, width 1.2, from x=36 to `W-36` at y=46.
- Footer text: `{companyName}  •  {tagline}`, Helvetica-Oblique 9, BODY, centred at x=`W/2`, baseline 30. If wider than `W-72`, drop the font size down to 7.5.

## 3. Field mapping (our real schema)

Source of truth: Prisma models in `prisma/schema.prisma`. Tour data is `TourPackage` (id is a TEXT cuid).

| Flyer element | Source | Rule |
|---|---|---|
| Headline line 1 (white) | `TourPackage.flyerHeadline1` | required |
| Headline line 2 (gold) | `TourPackage.flyerHeadline2` | required |
| Subtitle | `TourPackage.flyerSubtitle` | required, 70 characters max |
| Six highlight cards | `TourPackage.flyerHighlights` (JSON text: array of exactly 6 `{title, description}`) | title 24 chars max, description 95 max |
| Cover image | `tour_images` row where `isCover = true` for the tour (`data` is base64, `mimeType`) | none: use the fallback vector scene |
| Logo | `public/logo.jpg` | section 4 |
| Company name, tagline, phone, email, website, social, deposit % | `lib/brand.ts` constants (new) | see below |

Do **not** pull the headline from `title`, the subtitle from `description`, or highlights from the existing `highlights` field (titles only, no descriptions). The admin may prefill suggestions in the form, but the flyer renders only the saved flyer fields. If any required flyer field is empty, the route returns HTTP 422 with a JSON list of the missing fields.

`lib/brand.ts` (single source of truth for the flyer; do not edit other files that hard-code these values):
```ts
export const BRAND = {
  companyName: 'Jae Travel Expeditions',
  tagline: '<<OWNER TO CONFIRM>>',
  phone: '+254 726 485228',
  email: 'info@jaetravel.co.ke',
  website: 'www.jaetravel.co.ke',
  social: '',               // owner to supply; blank = slot left empty
  depositPercent: 30,
  depositRefundable: false,
} as const;
```

## 4. Images and logo handling

- **Storage pattern:** match the existing code: base64 in a `data TEXT` column. Mimic the upload code behind `/api/itinerary-images` (same storage format).
- **Resize on upload (new, because nothing resizes today):** with `jimp`, scale the cover so its width is at most 1800 px (never enlarge), re-encode as JPEG quality 80, and store that. Reject files over 10 MB and non-image types. Target stored size under about 600 KB.
- **Cover rendering:** react-pdf `Image` with `objectFit: 'cover'` and `objectPosition: '50% 40%'` inside a hero container with `overflow: hidden`. If `objectPosition` does not render correctly in the installed version, pre-crop with jimp instead. Never distort.
- **Image data to react-pdf:** data URI (`data:image/jpeg;base64,...`), the same way `lib/itinerary-pdf.tsx` does it. Reuse its `buildImageSrc` and `processImageForPDF` helpers (export them if needed; do not copy them).
- **Hero overlay:** two stacked SVG rects (`Svg`, `Defs`, `LinearGradient`, `Stop`): `#2B1B3D` from opacity 0.55 at the top to 0 at 60% height, then `#16241B` from 0 to 0.35 at the bottom edge.
- **Logo:** read `public/logo.jpg` once, downscale to 256 x 256 with jimp, and cache the data URI in module memory (the current file is 1600 x 1600, 337 KB; do not embed it as is). Render it as in section 2.2.
- **Cover choice:** the admin marks one `tour_images` row as the cover. If none is marked, use the most recently uploaded image for that tour. If the tour has no images, use the fallback scene.
- Do not use people-identifying photos unless the user says they are cleared for marketing.

## 5. SQL (run manually in the Supabase SQL editor; same method as earlier migrations)

Save exactly this as `prisma/migrations/add_tour_flyer_fields.sql`. Also add the matching fields and model to `prisma/schema.prisma`, then run `pnpm exec prisma generate`. **Do not run `prisma db push`.**

```sql
-- prisma/migrations/add_tour_flyer_fields.sql
-- Adds flyer fields to "TourPackage" and a tour_images table (cover image for the flyer).
-- Idempotent: safe to re-run.

-- 1. Flyer text fields on TourPackage
ALTER TABLE "TourPackage" ADD COLUMN IF NOT EXISTS "flyerHeadline1"  TEXT;
ALTER TABLE "TourPackage" ADD COLUMN IF NOT EXISTS "flyerHeadline2"  TEXT;
ALTER TABLE "TourPackage" ADD COLUMN IF NOT EXISTS "flyerSubtitle"   TEXT;
-- JSON array string of exactly 6 objects: [{"title":"...","description":"..."}]
ALTER TABLE "TourPackage" ADD COLUMN IF NOT EXISTS "flyerHighlights" TEXT;

-- 2. tour_images (same style as itinerary_images; base64 in "data")
CREATE TABLE IF NOT EXISTS "tour_images" (
    "id" TEXT NOT NULL,
    "tourPackageId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "caption" TEXT,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tour_images_pkey" PRIMARY KEY ("id")
);

-- 3. FK to TourPackage (cascade)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tour_images_tourPackageId_fkey'
      AND conrelid = 'tour_images'::regclass
  ) THEN
    ALTER TABLE "tour_images"
      ADD CONSTRAINT "tour_images_tourPackageId_fkey"
      FOREIGN KEY ("tourPackageId") REFERENCES "TourPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- 4. Indexes (lookup by tour; at most one cover per tour)
CREATE INDEX IF NOT EXISTS "tour_images_tourPackageId_idx" ON "tour_images"("tourPackageId");
CREATE UNIQUE INDEX IF NOT EXISTS "tour_images_one_cover_idx" ON "tour_images"("tourPackageId") WHERE "isCover" = true;
```

Matching Prisma changes:
```prisma
// inside model TourPackage
flyerHeadline1  String?
flyerHeadline2  String?
flyerSubtitle   String?
flyerHighlights String?
images          TourImage[]

model TourImage {
  id            String      @id @default(cuid())
  tourPackageId String
  filename      String
  mimeType      String
  data          String
  caption       String?
  isCover       Boolean     @default(false)
  createdAt     DateTime    @default(now())
  tourPackage   TourPackage @relation(fields: [tourPackageId], references: [id], onDelete: Cascade)

  @@index([tourPackageId])
  @@map("tour_images")
}
```
(The partial unique index "one cover per tour" lives only in the SQL file. Prisma cannot express it. Do not let Prisma drop it.)

## 6. Procedure (build order)

1. **Schema step:** write the SQL file and update `schema.prisma`, run `prisma generate`, and create `lib/brand.ts`. Stop. The owner runs the SQL in Supabase.
2. **Backend:** image routes, flyer-details route, and the PDF component plus route (section 8). Write a small script that renders a sample flyer from hard-coded data to a file (no database needed) so layout can be checked before data exists.
3. **Admin UI:** the Flyer page and the button on the tour detail page.
4. **Verify** against section 7 using a real tour.

## 7. Acceptance checks (all must pass)

- Exactly 1 page, A4, no content outside the page.
- Render at 60 dpi (`pdftoppm -png -r 60`) and view it. Compare it with the reference: header, headline, cards, banner and footer sit in the same positions.
- No overlap between the 3rd card row (bottom edge at about `y0-30-3*56-2*10`) and the banner top (186). There must be at least 15 pt of clear space.
- Headline and subtitle stay readable on the hero image (spot-check contrast at the text positions).
- No text clipped or running past the right margin (`W-36`).
- No placeholder text (no `[add ...]`, no `<<...>>`) appears in the PDF. An empty `BRAND.social` leaves its slot blank.
- The logo is crisp, undistorted and fully visible.
- File size under 3 MB.
- Layout matches `Jae_Travel_Tour_Flier.pdf` within about 2 pt. If `pdftoppm` is not available, render the page to PNG with another installed tool, or ask the owner to open the PDF and compare.


## 8. Implementation for our stack (Next.js 16 App Router, Prisma, NextAuth, pnpm)

**8.1 Files to add** (add nothing else; do not touch `SavedFlyer`, `/dashboard/flyers` or `/api/saved-flyers`)
- `lib/brand.ts`: section 3.
- `lib/tour-flyer-pdf.tsx`: the `TourFlyerPDF` component. Follow the pattern of `lib/itinerary-pdf.tsx`: built-in Helvetica fonts, no `Font.register`, `StyleSheet.create`, data-URI images, absolute positioning in points. Build it from the section 2 measurements. Draw the fallback sunset scene (sky gradient, sun with 3 translucent halos, hills, ground, two acacias, two giraffes) with `Svg`, `Path`, `Circle`, `Ellipse`, `Defs`, `LinearGradient`, porting the paths from `flier_reference.py`.
- `app/api/tours/[id]/flyer/route.ts`: `GET`, signature `export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> })`, `const { id } = await params;`. Require `getServerSession(authOptions)`, as the other PDF routes do. Export `runtime = 'nodejs'`. Load the tour with `prisma.tourPackage.findUnique` plus its cover image. Validate (section 3), then `renderToBuffer(React.createElement(TourFlyerPDF, {...}) as any)` and return it with `Content-Type: application/pdf` and `Content-Disposition: attachment` (filename from the tour title, ASCII-safe). Support `?inline=1` to display in the browser.
- `app/api/tours/[id]/flyer-details/route.ts`: `GET` (session) and `PUT` (ADMIN only, using the existing `role !== 'ADMIN'` check). `PUT` validates lengths (headline lines non-empty, subtitle 70 max, exactly 6 highlights, title 24 max, description 95 max) and saves the four flyer fields on `TourPackage`.
- `app/api/tours/[id]/images/route.ts`: `GET` returns **metadata only** (id, filename, caption, isCover, createdAt; never the `data` field). `POST` (ADMIN) uploads and resizes (section 4). `PATCH` (ADMIN) sets the cover inside one `prisma.$transaction` (unset all, set one). `DELETE` (ADMIN). A separate `GET .../images/[imageId]` returns the image bytes, for thumbnails in the Flyer page.
- `app/dashboard/tours/[id]/flyer/page.tsx`: the admin page. Fields: headline line 1, headline line 2, subtitle (with character counters), six highlight rows (title and description with counters), a cover image picker (upload, choose cover, delete), a Save button, and a **Download flyer** button linking to `/api/tours/[id]/flyer`. Use the existing UI classes (`input`, `btn-primary`, `btn-secondary`). Only admins can save; other users see it read-only.
- In `app/dashboard/tours/[id]/page.tsx`, add one link next to the existing buttons: **Flyer** to `/dashboard/tours/[id]/flyer`. Do not build the missing `/edit` page.

**8.2 react-pdf notes**
- Text is limited to the Latin characters the built-in Helvetica supports. Check every string. If one cannot be drawn, return 422 naming the field.
- Measure text for fit rules and right/centre alignment with a small helper using Helvetica width tables, or use `textAlign` inside fixed-width Views positioned at the same x ranges as in section 2.
- One page only. Use `wrap={false}` and a fixed `size="A4"`, with no padding on the page.

**8.3 Security**
- Do not send the `data` field to the browser except through the dedicated image-bytes route.
- Use Prisma only; do not add the Supabase client library.

**8.4 Sample render script**
- `scripts/render-sample-flyer.tsx` renders `TourFlyerPDF` with hard-coded sample data (the seeded Masai Mara tour) to `./tmp/sample-flyer.pdf`, run with `pnpm exec tsx` if `tsx` is installed (otherwise report the available way to run it). It uses no database. Add `tmp/` to `.gitignore` if needed.
