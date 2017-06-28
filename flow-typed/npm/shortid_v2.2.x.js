// flow-typed signature: b156a2435634461a06e78c26c06b3e55
// flow-typed version: 4037d522d2/shortid_v2.2.x/flow_>=v0.27.x

type ShortIdModule = {
  (): string,
  generate(): string,
  seed(seed: number): ShortIdModule,
  worker(workerId: number): ShortIdModule,
  characters(characters: string): string,
  decode(id: string): { version: number, worker: number },
  isValid(id: mixed): boolean,
};

declare module 'shortid' {
  declare module.exports: ShortIdModule;
};
