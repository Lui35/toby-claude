# Icons

The extension needs icon files in the following sizes:
- icon16.png (16x16)
- icon32.png (32x32)
- icon48.png (48x48)
- icon128.png (128x128)

## How to create icons:

You can use the provided `icon.svg` file and convert it to PNG at different sizes using:

### Option 1: Online converter
1. Go to https://cloudconvert.com/svg-to-png
2. Upload `icon.svg`
3. Convert to each required size
4. Save as icon16.png, icon32.png, icon48.png, icon128.png

### Option 2: Using ImageMagick (command line)
```bash
convert icon.svg -resize 16x16 icon16.png
convert icon.svg -resize 32x32 icon32.png
convert icon.svg -resize 48x48 icon48.png
convert icon.svg -resize 128x128 icon128.png
```

### Option 3: Use any graphic editor
Open `icon.svg` in GIMP, Photoshop, Figma, or similar tool and export at each size.

## Temporary placeholder
For testing, you can create simple placeholder images with any solid color at the required sizes.
