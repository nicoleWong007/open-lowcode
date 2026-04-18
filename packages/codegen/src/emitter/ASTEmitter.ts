import * as t from '@babel/types';
import generate from '@babel/generator';
import type { File } from '@babel/types';

export function emitCode(ast: File): string {
  const { code } = generate(ast, {
    retainLines: false,
    compact: false,
  });
  return code;
}
