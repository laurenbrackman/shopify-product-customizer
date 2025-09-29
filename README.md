# Shopify Hat Customizer

Custom Shopify integration that allows customers to design hats with drag-and-drop patches, rotation, scaling, and layer ordering. Built as a **Shopify app** with a **Theme App Extension**, **Cart Transform Function**, and a rendering service to produce production-ready files.

---

## Features

- **Hat configurator UI** (React + Konva.js)
  - Choose a base hat style.
  - Drag, drop, rotate, scale, flip patches.
  - Layer/reorder patches.
  - Real-time price updates.
  - Mobile/touch gesture support.

- **Shopify integration**
  - Theme App Extension block injected on hat product pages.
  - Cart Transform Function splits a “custom hat” into:
    - Parent: hat variant.
    - Children: patch SKUs with proper pricing and inventory.
  - Line item properties store design JSON, preview URL, and production asset links.

- **Rendering service**
  - Server receives design JSON.
  - Generates 300 DPI PNG/SVG files sized in millimeters.
  - Uploads files to Shopify **Files API**.
  - Attaches URLs to orders via webhooks.

- **Data model**
  - **Hat products**: base variants + metafields for customization zones.
  - **Patch products**: hidden SKUs with SVG/PNG assets and pricing.
  - **Design JSON**: deterministic record of patch placement, size, rotation, and order.

---

## Tech Stack

- **Frontend**: React + Konva.js (Theme App Extension)
- **State management**: Zustand
- **Shopify APIs**: Admin API, Storefront API, Functions (Cart Transform)
- **Rendering**: Sharp / ResVG
- **Server**: Node.js or Cloudflare Workers
- **Storage**: Shopify Files API (or optional S3/R2 for lifecycle control)

4. Deploy function

```shopify app deploy

