# Hunt Asset Configuration Guide

This folder contains spot definitions for each year's treasure hunt. No coding required!

## Folder Structure

```
hunts/
  2026/
    hunt.json           ← Edit this file to add/change spots and hunt branding
    images/             ← Put spot images here
      s1-garden.jpg
      s2-tower.jpg
      hunt-banner.jpg
```

## Editing Hunt (2026 Example)

Open `2026/hunt.json` in any text editor. The file has two parts:

### 1. Year Header (Hunt Branding)

```json
{
  "year": 2026,
  "title": "The Dragon's Quest",
  "description": "Help the dragons find their lost treasures across the city!",
  "image": "images/hunt-banner.jpg",
  "imageAlt": "Dragons flying over the city",
  "spots": { ... }
}
```

The header is shown at the top of the hunt page and branding the whole experience.

### 2. Spots List

Each spot in the collection:

```json
"s1": {
  "name": "The Dragon's Garden",
  "hint": "Look for the red door with a golden knocker.",
  "collectedText": "You found the magical garden! 🎭",
  "image": "images/s1-garden.jpg",
  "imageAlt": "Lush green garden with stone statues",
  "location": "Central Park, North Gate"
}
```

## How to Add a New Spot

1. **Create a new image file** in `2026/images/` (e.g., `s4-castle.jpg`)
2. **Add a new spot object** in `hunt.json`:
   ```json
   "s4": {
     "name": "The Magic Castle",
     "hint": "Look for the tallest tower.",
     "collectedText": "The castle towers over the city! 🏰",
     "image": "images/s4-castle.jpg",
     "imageAlt": "Description of the castle",
     "location": "North District"
   }
   ```
3. **Save the file** and rebuild: `npm run build` (or ask your developer)

## Field Descriptions

| Field           | Section     | What It Does                                                |
| --------------- | ----------- | ----------------------------------------------------------- |
| `title`         | Year Header | The hunt's name (shown at the top)                          |
| `description`   | Year Header | A brief explanation of the hunt theme                       |
| `image`         | Year Header | Path to a banner image for the hunt (landscape recommended) |
| `imageAlt`      | Year Header | Text description of the banner (for accessibility)          |
| `name`          | Spot        | The spot title                                              |
| `hint`          | Spot        | The clue kids see **before** collecting the spot            |
| `collectedText` | Spot        | The message shown **after** collecting the spot             |
| `image`         | Spot        | Path to the spot's image                                    |
| `imageAlt`      | Spot        | Text description of the spot image                          |
| `location`      | Spot        | Optional: Where the spot is in the city                     |

## Tips

✅ **Valid spot ID format**: Use `s1`, `s2`, `s3`, etc. (or `garden`, `tower`, etc. — must be unique)

✅ **Text tips**:

- Keep titles and hints short and fun
- Emojis work great in collected text! 🎭✨🌊

✅ **Image tips**:

- **Banner image**: Use a landscape image (~800x600px or wider). This is the main visual for the hunt!
- **Spot images**: Use ~400x300px (square or landscape). Keep them consistent sizes.
- Use `.jpg` or `.png` files
- Compress images to keep file sizes small

❌ **Don't do this**:

- Don't change `year` unless it's a new year
- Don't use duplicate spot IDs (e.g., two spots named "s1")
- Don't use quotes in names/hints without escaping them
- Don't forget to add images to the `images/` folder and reference them correctly

## For a New Year

When starting a new hunt year:

1. Create a new folder: `2027/`
2. Create `2027/images/` folder inside
3. Copy `2026/hunt.json` to `2027/hunt.json`
4. Change `"year": 2026` to `"year": 2027`
5. Update the hunt branding:
   - Change `title` to the new year's theme title
   - Update `description` with a new story
   - Replace `image` with a new banner image file
   - Update `imageAlt` description
6. Replace all spot details (names, hints, images, etc.)

## Validating Your JSON

If you're unsure about your JSON structure, paste it into [jsonlint.com](https://www.jsonlint.com) to check for errors before rebuilding.
