# Tree reference: EZ-Tree (Codrops, 2025-01-27)

Andrew sent this as the bar for the next tree pass:
https://tympanus.net/codrops/2025/01/27/fractals-to-forests-creating-realistic-3d-trees-with-three-js/
Library: https://github.com/dgreenheck/ez-tree (MIT), live at https://eztree.dev

## Method to borrow

- **Branches from a queue, not recursion.** Each branch has an origin, an Euler orientation, a length, a radius and a level. Per-level arrays: `children`, `angle`, `length`, `radius`, `taper`, `sections`, `segments`, `gnarliness`, `twist`, and `start` (where on the parent children sprout, 0 to 1).
- **Geometry.** Each branch is a chain of open cylinder sections. The last section's radius goes to 0.001. Vertices, normals, UVs and indices go into shared arrays, so one tree is one merged mesh.
- **Gnarliness.** `g = max(1, 1/sqrt(sectionRadius)) * gnarliness[level]`, added as a random jitter to orientation x and z per section. Thin branches curl more.
- **Growth force.** Slerp each section toward `force.direction` by `force.strength`, more for small branches (sun or gravity).
- **Children.** The origin is lerped between parent sections at a random `start`. The orientation combines the parent's (slerped), the level `angle`, and a radial spread of 2*PI/count.
- **Leaves.** Placed like child branches, drawn as two crossed alpha-textured quads per cluster, with `type`, `size`, `count` and `angle`.
- **Wind** (vertex shader): `offset = 2PI * simplex3(pos / uWindScale)`; `sway = uv.y * uWindStrength * (0.5 sin(t f + o) + 0.3 sin(2 t f + 1.3 o) + 0.2 sin(5 t f + 1.5 o))`.
- **Seeded RNG**, so each tree is reproducible.

## Fit for the island

Keep the island's chunky, toy-like look: fewer sections and segments than EZ-Tree's defaults, and leaf cards in a flat stylised shape rather than photo textures. Generate a handful of variants per species once at load, then instance them. Never use `ctx.helpers.rng()`.
