# Examples

This folder holds sample graph JSON files that ship with `graphsect`.

When you run `npx graphsect` (or `npm run dev` in a local checkout) without a
`--graph` flag, the CLI lists every `.json` file in this folder and lets you
pick one to display.

## Adding your own example

Drop any `ExternalGraph`-shaped JSON file into this folder and it will appear
in the picker automatically. The filename (without `.json`) is used as its
display name.

## Bypassing the picker

To run against a graph outside this folder, point the CLI at it directly:

```bash
npx graphsect --graph ./path/to/my-graph.json
```

The file is loaded for that session only — it is not copied into this folder
permanently.
