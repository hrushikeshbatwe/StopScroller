# Glyph Matrix SDK (Nothing Phone 3)

The Glyph Toy that shows your reel count on the back of the Nothing Phone (3)
needs Nothing's **Glyph Matrix SDK**, which ships as a binary `.aar`.

## Add the SDK

1. Download `glyph-matrix-sdk-2.0.aar` from the official kit:
   https://github.com/Nothing-Developer-Programme/GlyphMatrix-Developer-Kit
   (it's under the demo app's `app/libs/`).
2. Drop the file into **this folder** (`modules/scroll-tracker/android/libs/`).
   Any `*.aar` here is picked up by `build.gradle`.
3. Rebuild (EAS or local).

## Heads up

Until the `.aar` is present, the module will **fail to compile** — because
`GlyphCountService.kt` imports `com.nothing.ketchum.*`. So add the file before
running an EAS build from this branch, and only merge to `main` once a build
with the SDK succeeds (otherwise you'd break the main build).

The toy only appears on a Nothing Phone (3). On any other device the service is
simply never invoked.
