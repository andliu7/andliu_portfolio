# Andrew Liu — Personal Portfolio

A responsive portfolio with native scrolling and restrained, layered parallax. Built with React, TypeScript, Vinext, and Tailwind CSS. The production build exports static HTML, CSS, and JavaScript to `dist/client`.

## Development

Requires Node.js 22.13 or later.

```sh
npm ci
npm run dev
```

```sh
npm run build
```

## Content

- `app/page.tsx`: introduction, five projects, education, experience, and contact links. Between sections sit four transparent vistas where the 3D world shows through.
- `components/world/`: the four-rooms world. `World.tsx` decides live 3D or the plan drawing (phones, reduced motion, no WebGL get the drawing). `WorldCanvas.tsx` holds the one Canvas and the Rapier physics world. `rooms/` has one file per room, built from primitives in `parts.tsx`. `Prop.tsx` is anything you can point at or knock over. `ScrollCamera.tsx` parks the camera at each vista. `sound.ts` is a synthesised sound kit, off until the visitor turns it on. `Smooth.tsx` is Lenis smooth scrolling.
- `app/globals.css`: typography, colors, layouts, and responsive styles.
- `app/motion.tsx`: scroll-linked transforms with reduced-motion support.
- `public/andrew-liu-resume.pdf`: Andrew's supplied résumé.
- `.openai/hosting.json`: Sites project identity. No credentials are stored here.

## Publishing

Pushes to `main` run `.github/workflows/deploy.yml`, build the static site, and deploy it to GitHub Pages. The Pages source must be **GitHub Actions** in repository settings. `public/CNAME` preserves the custom domain `andliu.dev` in the generated output. The domain must point to GitHub Pages through its Cloudflare DNS settings.

The `.openai/hosting.json` manifest also supports a separately published Sites preview using the same static build output.

## References and assets

Content was informed by Andrew's résumé and the six repositories linked from the site. The Blueberry game repository is described as its original home, following its status document; current development moved into Blueberry.

The mountain photograph and Blueberry interface capture were reused from Andrew's supplied local Blueberry project. The Second Brain network is an original explanatory SVG diagram, not an application screenshot. The site contains no third-party tracking or forms, and its contact link opens the visitor's email app.
