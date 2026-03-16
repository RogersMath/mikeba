# Adding a New Language to Deftere Golle

The project is designed so that adding a language requires **two edits only** — no JavaScript changes, no HTML restructuring.

## Step 1 — Create the language file

Copy `lang/en.json` to `lang/xx.json` where `xx` is the [BCP 47 language tag](https://r12a.github.io/app-subtags/) (e.g. `ar`, `ha`, `sw`, `pt`, `bm`).

Translate every string value. **Do not change any keys.**

Key rules:
- `lang_attr` → the HTML `lang` attribute value (e.g. `"ar"`, `"ha"`)
- `dir` → `"ltr"` or `"rtl"` (Arabic, Urdu, etc. use `"rtl"`)
- `lang_label` → the button label displayed to users (e.g. `"العربية"`, `"Hausa"`)
- Array values (e.g. `ch1_needs`, `hc1_list`) must stay as arrays with the same number of items
- `hc5_colors` items contain `<strong>` HTML — preserve the tags, translate only the text inside

## Step 2 — Add the button in index.html

In the `<nav id="lang-bar">` section, add:

```html
<button class="lang-btn" data-lang="xx" aria-pressed="false">Label</button>
```

Where `xx` matches the JSON filename and `Label` is the native name of the language.

**That's it.** The JSON is fetched automatically on first click and cached for the session.

---

## File size targets

Each language JSON should stay under ~15 KB uncompressed. The current files are ~8–10 KB each.

## RTL languages

Set `"dir": "rtl"` in the JSON. The app will set `document.documentElement.dir` automatically. You may need to add RTL-specific CSS overrides in `style.css` for layout elements (step numbers, border-left accents, etc.) — add them under a `[dir="rtl"]` selector.

## Testing

Serve the directory locally (e.g. `python3 -m http.server 8080`) and click the new language button. Check:
- All `data-k` elements are populated (no blank content)
- Arrays have the right number of items (no missing list entries)
- The page `lang` and `dir` attributes update correctly

## Current languages

| File       | Language | Script  | Dir |
|------------|----------|---------|-----|
| `en.json`  | English  | Latin   | ltr |
| `pu.json`  | Pulaar (Fuutanke) | Latin | ltr |
| `wo.json`  | Wolof    | Latin   | ltr |
| `fr.json`  | Français | Latin   | ltr |

## Priority candidates for expansion

Based on the project's West African focus, high-value additions would include:
`bm` (Bambara), `dyu` (Dyula), `ff` (Fulfulde/Adamawa), `ha` (Hausa), `ar` (Arabic), `pt` (Portuguese — Guinea-Bissau), `snk` (Soninke), `mnk` (Mandinka)
