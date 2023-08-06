export class QrMode {

    /*-- Constants --*/

    public static readonly NUMERIC = new QrMode(0x1, [10, 12, 14]);
    public static readonly ALPHANUMERIC = new QrMode(0x2, [9, 11, 13]);
    public static readonly BYTE = new QrMode(0x4, [8, 16, 16]);
    public static readonly KANJI = new QrMode(0x8, [8, 10, 12]);
    public static readonly ECI = new QrMode(0x7, [0, 0, 0]);


    /*-- Constructor and fields --*/

    private constructor(
        // The mode indicator bits, which is a uint4 value (range 0 to 15).
        public readonly modeBits: number,
        // Number of character count bits for three different version ranges.
        private readonly numBitsCharCount: [number, number, number]) { }


    /*-- Method --*/

    // (Package-private) Returns the bit width of the character count field for a segment in
    // this mode in a QR Code at the given version number. The result is in the range [0, 16].
    public numCharCountBits(ver: number): number {
        return this.numBitsCharCount[Math.floor((ver + 7) / 17)];
    }

}