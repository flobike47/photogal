declare module 'heic-decode' {
  function decode(input: { buffer: Buffer | ArrayBufferLike }): Promise<{
    width: number;
    height: number;
    data: Uint8ClampedArray;
  }>;
  export default decode;
}
