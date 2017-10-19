// flow-typed signature: 3e86d1946499964073b6fcb813a75099
// flow-typed version: b43dff3e0e/platform_v1.x.x/flow_>=v0.16.x

declare module 'platform' {
  declare class Platform extends Object {
    toString(): string,
    parse(userAgent: string): Platform,
    description: ?string,
    layout: ?string,
    manufacturer: ?string,
    name: ?string,
    prerelease: ?string,
    product: ?string,
    ua: ?string,
    version: ?string,
    os: {
      toString(): string,
      architecture: ?number,
      version: ?string,
      family: ?string,
    },
  }
  declare var exports: Platform;
}
