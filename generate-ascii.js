import { Jimp } from 'jimp';
import { readFileSync, writeFileSync } from 'node:fs';

const ASCII_DENSE_TO_SPARSE = '@MBHENR#KWXDFPQASUIVjö*^:!~;., '.split('');

async function generateAscii() {
  try {
    const image = await Jimp.read('profile.jpg');
    const width = 84;
    const height = 42;
    image.resize({ w: width, h: height });

    // Grayscale and increase contrast
    image.greyscale();
    image.normalize();
    image.contrast(0.25);

    let asciiDark = '';
    let asciiLight = '';

    for (let y = 0; y < image.bitmap.height; y++) {
      let rowDark = '';
      let rowLight = '';
      for (let x = 0; x < image.bitmap.width; x++) {
        const color = image.getPixelColor(x, y);
        const r = (color >> 24) & 255;
        
        // Background removal: If a pixel is very bright white (like the photo background),
        // we force it to be transparent (space).
        if (r > 240) {
          rowDark += ' ';
          rowLight += ' ';
          continue;
        }

        const charIndex = Math.floor((r / 255) * (ASCII_DENSE_TO_SPARSE.length - 1));

        const char = ASCII_DENSE_TO_SPARSE[ASCII_DENSE_TO_SPARSE.length - 1 - charIndex];

        rowLight += char;
        rowDark += char;
      }

      const yPos = (28 + y * 10.5).toFixed(2);
      // Center the ASCII block at x=20
      asciiDark += `<tspan x="20" y="${yPos}">${rowDark}</tspan>\n`;
      asciiLight += `<tspan x="20" y="${yPos}">${rowLight}</tspan>\n`;
    }

    const updateSvg = (filename, ascii) => {
      let svg = readFileSync(filename, 'utf-8');

      // Update font-size to 7px to fit the higher resolution
      svg = svg.replace(/(<text[^>]*class="ascii"[^>]*)font-size="[^"]*"/, '$1font-size="7px"');

      // Replace the ASCII content
      svg = svg.replace(/(<text[^>]*class="ascii"[^>]*>)([\s\S]*?)(<\/text>)/, `$1\n${ascii}$3`);

      writeFileSync(filename, svg, 'utf-8');
      console.log(`Updated beautifully proportioned ASCII art in ${filename}`);
    };

    updateSvg('dark_mode.svg', asciiDark);
    updateSvg('light_mode.svg', asciiLight);

  } catch (error) {
    console.error('Error generating ASCII art:', error.message);
    console.log('Make sure you have saved your image as "profile.jpg" in this directory!');
  }
}

generateAscii();
