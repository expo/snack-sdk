// flow-typed signature: 0ab766674457609da24fd0e43989a1b8
// flow-typed version: 94e9f7e0a4/platform_v1.x.x/flow_>=v0.21.x

declare module 'platform' {
  declare class Platform extends Object {
    toString(): string;
    parse(userAgent: string): Platform;
    description: ?string;
    layout: ?string;
    manufacturer: ?string;
    name: ?string;
    prerelease: ?string;
    product: ?string;
    ua: ?string;
    version: ?string;
    os: {
      toString(): string,
      architecture: ?number,
      version: ?string,
      family: ?string
    }
  }
  declare var exports: Platform;
}
