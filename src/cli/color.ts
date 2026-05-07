const isColorSupported = process.stdout.isTTY && !process.env.NO_COLOR;

function apply(code: number): (s: string) => string {
  return (s: string) =>
    isColorSupported ? `\x1b[${code}m${s}\x1b[0m` : s;
}

export const reset = apply(0);
export const bold = apply(1);
export const dim = apply(2);

export const red = apply(31);
export const green = apply(32);
export const yellow = apply(33);
export const blue = apply(34);
export const magenta = apply(35);
export const cyan = apply(36);
export const gray = apply(90);

// bright
export const brightRed = apply(91);
export const brightGreen = apply(92);
export const brightYellow = apply(93);
export const brightBlue = apply(94);
export const brightMagenta = apply(95);
export const brightCyan = apply(96);

// bg
export const bgRed = apply(41);
export const bgGreen = apply(42);
export const bgYellow = apply(43);
export const bgBlue = apply(44);
export const bgMagenta = apply(45);
export const bgCyan = apply(46);

// helpers
export function success(msg: string): string {
  return green(`✔ ${msg}`);
}

export function error(msg: string): string {
  return red(`✖ ${msg}`);
}

export function warn(msg: string): string {
  return yellow(`⚠ ${msg}`);
}

export function info(msg: string): string {
  return blue(`ℹ ${msg}`);
}

export function label(text: string): string {
  return dim(text);
}

export function highlight(text: string): string {
  return cyan(text);
}

export function table(items: { label: string; value: string }[]): string {
  const maxLen = Math.max(...items.map((i) => i.label.length));
  return items
    .map(
      (i) => `  ${bold(i.label.padEnd(maxLen))}  ${i.value}`
    )
    .join('\n');
}
