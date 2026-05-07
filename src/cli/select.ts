import * as readline from 'node:readline';
import { green, cyan, bold, dim } from './color.js';

export interface SelectChoice<T> {
  name: string;
  value: T;
  disabled?: boolean;
}

/**
 * Interactive arrow-key select menu.
 * Up/Down to navigate, Enter to confirm.
 */
export async function select<T>(prompt: string, choices: SelectChoice<T>[]): Promise<T> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    readline.emitKeypressEvents(process.stdin, rl);

    const wasRaw = process.stdin.isRaw;
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    // Hide cursor
    process.stdout.write('\x1b[?25l');

    const N = choices.length;
    let selected = choices.findIndex((c) => !c.disabled);
    if (selected === -1) selected = 0;
    let prevSelected = selected;
    let rendered = false;

    function render() {
      if (rendered) {
        // After previous render, cursor was placed at line (2 + prevSelected)
        // from the top of the rendered block. Move it back to prompt (line 1).
        process.stdout.write(`\x1b[${1 + prevSelected}A`);
      }
      rendered = true;
      prevSelected = selected;

      // Draw prompt
      process.stdout.write(`\r\x1b[K  ${prompt}\n`);

      // Draw choices
      for (let i = 0; i < N; i++) {
        process.stdout.write('\r\x1b[K');
        if (choices[i].disabled) {
          process.stdout.write(`  ${dim(choices[i].name)}\n`);
        } else {
          const pointer = i === selected ? green(bold('❯')) : ' ';
          const label = i === selected ? cyan(bold(choices[i].name)) : choices[i].name;
          process.stdout.write(` ${pointer} ${label}\n`);
        }
      }

      // Position cursor at the selected line
      const up = N - selected;
      if (up > 0) {
        process.stdout.write(`\x1b[${up}A`);
      }
    }

    render();

    function cleanup() {
      process.stdin.removeListener('keypress', onKeypress);
      if (process.stdin.isTTY && !wasRaw) {
        process.stdin.setRawMode(false);
      }
      process.stdout.write('\x1b[?25h');
      rl.close();
    }

    function onKeypress(_str: string, key: { name?: string; ctrl?: boolean }) {
      if (key.name === 'up') {
        let next = selected;
        do { next--; } while (next > 0 && choices[next].disabled);
        if (next >= 0 && !choices[next].disabled && next !== selected) {
          selected = next;
          render();
        }
      } else if (key.name === 'down') {
        let next = selected;
        do { next++; } while (next < N - 1 && choices[next].disabled);
        if (next < N && !choices[next].disabled && next !== selected) {
          selected = next;
          render();
        }
      } else if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        // Move past the rendered lines so output doesn't overlap
        process.stdout.write(`\x1b[${N + 1}B\r\n`);
        resolve(choices[selected].value);
      }
    }

    process.stdin.on('keypress', onKeypress);
  });
}
