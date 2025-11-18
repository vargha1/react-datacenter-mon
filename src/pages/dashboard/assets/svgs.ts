// Placeholder file for shape SVGs.
// Paste full SVG markup (as plain text) into the RAW_SVGS values for each
// type, or replace the empty string with a data URL (e.g. `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`).
//
// Example usage in code:
// import { RAW_SVGS, svgToDataUrl, getDataUrl } from './assets/svgs';
// const upsDataUrl = getDataUrl('ups') ?? svgToDataUrl(RAW_SVGS['ups']);

export const RAW_SVGS: Record<string, string> = {
  // Add your SVG markup here for each custom shape type.
  // For example:
  // ups: '<svg ...>...</svg>',

  ups: `<?xml version="1.0" encoding="utf-8"?>
<svg width="83" height="143" viewBox="0 0 83 143" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M21.25 1.25V31.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M61.25 1.25V31.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M41.25 111.25V141.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M81.25 31.25H1.25V111.25H81.25V31.25Z" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M41.25 71.25H1.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M81.25 31.25L41.25 71.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M41.25 71.25L81.25 111.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M11.25 51.25C13.9167 48.5833 16.5833 48.5833 19.25 51.25C21.9167 53.9167 24.5833 53.9167 27.25 51.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M11.25 91.25C13.9167 88.5833 16.5833 88.5833 19.25 91.25C21.9167 93.9167 24.5833 93.9167 27.25 91.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M55.25 71.25H69.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M62.25 64.25V78.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,
  transformer: `
<svg width="43" height="155" viewBox="0 0 43 155" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M21.25 1.25V41.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M21.25 81.25C32.2957 81.25 41.25 72.2957 41.25 61.25C41.25 50.2043 32.2957 41.25 21.25 41.25C10.2043 41.25 1.25 50.2043 1.25 61.25C1.25 72.2957 10.2043 81.25 21.25 81.25Z" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M21.25 113.25C32.2957 113.25 41.25 104.296 41.25 93.25C41.25 82.2043 32.2957 73.25 21.25 73.25C10.2043 73.25 1.25 82.2043 1.25 93.25C1.25 104.296 10.2043 113.25 21.25 113.25Z" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M21.25 113.25V153.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`,
  surge_arrester: `
<svg width="43" height="173" viewBox="0 0 43 173" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M21.25 9.25C23.4591 9.25 25.25 7.45914 25.25 5.25C25.25 3.04086 23.4591 1.25 21.25 1.25C19.0409 1.25 17.25 3.04086 17.25 5.25C17.25 7.45914 19.0409 9.25 21.25 9.25Z" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M21.25 9.25V35.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M41.25 35.25H1.25V85.25H41.25V35.25Z" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M41.25 85.25H1.25V135.25H41.25V85.25Z" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M21.25 139.25C23.4591 139.25 25.25 137.459 25.25 135.25C25.25 133.041 23.4591 131.25 21.25 131.25C19.0409 131.25 17.25 133.041 17.25 135.25C17.25 137.459 19.0409 139.25 21.25 139.25Z" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M21.25 139.25V155.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M1.25 155.25H41.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M6.25 163.25H36.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M11.25 171.25H31.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`,
  selector_switch: `
<svg width="120" height="180" viewBox="0 0 120 180" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M60 100C82.0914 100 100 82.0914 100 60C100 37.9086 82.0914 20 60 20C37.9086 20 20 37.9086 20 60C20 82.0914 37.9086 100 60 100Z" stroke="black" stroke-width="2"/>
<path d="M60 88C75.464 88 88 75.464 88 60C88 44.536 75.464 32 60 32C44.536 32 32 44.536 32 60C32 75.464 44.536 88 60 88Z" stroke="black" stroke-width="2"/>
<path d="M60 32V88" stroke="black" stroke-width="10" stroke-linecap="round"/>
<path d="M24.314 148H22.1167V133.999C21.5877 134.503 20.8919 135.008 20.0293 135.512C19.1748 136.017 18.4058 136.395 17.7222 136.647V134.523C18.951 133.946 20.0252 133.246 20.9448 132.424C21.8644 131.602 22.5155 130.804 22.8979 130.031H24.314V148ZM35.8252 142.409V140.639H49.729V142.409H35.8252ZM57.7856 139.174C57.7856 137.058 58.0013 135.358 58.4326 134.072C58.8721 132.778 59.519 131.781 60.3735 131.081C61.2362 130.381 62.3185 130.031 63.6206 130.031C64.5809 130.031 65.4232 130.227 66.1475 130.617C66.8717 131 67.4699 131.557 67.9419 132.29C68.4139 133.014 68.7842 133.901 69.0527 134.951C69.3213 135.992 69.4556 137.4 69.4556 139.174C69.4556 141.274 69.2399 142.971 68.8086 144.265C68.3773 145.55 67.7303 146.547 66.8677 147.255C66.0132 147.955 64.9308 148.305 63.6206 148.305C61.8953 148.305 60.5404 147.687 59.5557 146.45C58.3757 144.96 57.7856 142.535 57.7856 139.174ZM60.0439 139.174C60.0439 142.112 60.3857 144.069 61.0693 145.046C61.7611 146.014 62.6115 146.499 63.6206 146.499C64.6297 146.499 65.4761 146.01 66.1597 145.034C66.8514 144.057 67.1973 142.104 67.1973 139.174C67.1973 136.228 66.8514 134.271 66.1597 133.303C65.4761 132.334 64.6216 131.85 63.5962 131.85C62.5871 131.85 61.7814 132.277 61.1792 133.132C60.4224 134.222 60.0439 136.236 60.0439 139.174ZM77.5732 142.409V140.639H91.4771V142.409H77.5732ZM111.082 145.888V148H99.2529C99.2367 147.471 99.3221 146.962 99.5093 146.474C99.8104 145.668 100.291 144.875 100.95 144.094C101.617 143.312 102.577 142.409 103.831 141.384C105.776 139.789 107.09 138.527 107.773 137.6C108.457 136.664 108.799 135.781 108.799 134.951C108.799 134.08 108.486 133.347 107.859 132.753C107.24 132.151 106.431 131.85 105.43 131.85C104.372 131.85 103.525 132.167 102.891 132.802C102.256 133.437 101.934 134.316 101.926 135.439L99.668 135.207C99.8226 133.522 100.404 132.241 101.414 131.362C102.423 130.475 103.778 130.031 105.479 130.031C107.196 130.031 108.555 130.507 109.556 131.459C110.557 132.412 111.057 133.592 111.057 135C111.057 135.716 110.911 136.42 110.618 137.111C110.325 137.803 109.836 138.531 109.153 139.296C108.477 140.061 107.35 141.111 105.771 142.446C104.453 143.553 103.607 144.305 103.232 144.704C102.858 145.095 102.549 145.489 102.305 145.888H111.082Z" fill="black"/>
</svg>
`,
  rectifier: `
<svg width="34" height="90" viewBox="0 0 34 90" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M17 1V25" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M17 57V89" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M33 25H1V57H33V25Z" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M1 57L33 25" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M7 37C9 35 11 35 13 37C15 39 17 39 19 37" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M19 49H31" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M19 53H23" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M25 53H29" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`,
  RCBO: `
<svg width="38" height="175" viewBox="0 0 38 175" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M13.25 1.25V41.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M9.25 45.25L17.25 53.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M9.25 53.25L17.25 45.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M1.25 69.25L13.25 101.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M13.25 101.25V173.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M13.25 149.25C19.8774 149.25 25.25 143.877 25.25 137.25C25.25 130.623 19.8774 125.25 13.25 125.25C6.62258 125.25 1.25 130.623 1.25 137.25C1.25 143.877 6.62258 149.25 13.25 149.25Z" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M25.25 137.25H36.25V85.25H7.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`,
};

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function getDataUrl(type: string): string | null {
  const svg = RAW_SVGS[type];
  if (!svg) return null;
  return svgToDataUrl(svg);
}

// NOTE: This file is intended as an editable placeholder. During development
// you can paste SVG markup into the RAW_SVGS entries above. If you prefer to
// keep SVG files in `public/images`, you can also set the shape's `image`
// property to the path (e.g. `/images/my-shape.svg`) or a data URL.
