# Andrew Liu — Personal Portfolio

A responsive portfolio with native scrolling and restrained, layered parallax. Built with React, TypeScript, Vinext, Tailwind CSS, and the Sites Cloudflare Workers integration.

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

- `app/page.tsx`: introduction, six projects, education, experience, and contact links.
- `app/globals.css`: typography, colors, layouts, and responsive styles.
- `app/motion.tsx`: scroll-linked transforms with reduced-motion support.
- `public/andrew-liu-resume.pdf`: Andrew's supplied résumé.
- `.openai/hosting.json`: Sites project identity. No credentials are stored here.

The site is deployed with Sites to Cloudflare Workers. Source changes in this GitHub repository do not automatically deploy; build and publish a new Sites version after changes.

## References and assets

Content was informed by Andrew's résumé and the six repositories linked from the site. The Blueberry game repository is described as its original home, following its status document; current development moved into Blueberry.

The mountain photograph and Blueberry interface capture were reused from Andrew's supplied local Blueberry project. The Second Brain network is an original explanatory SVG diagram, not an application screenshot. The site contains no third-party tracking or forms, and its contact link opens the visitor's email app.
