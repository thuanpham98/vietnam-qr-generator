export class QrEcc {

    /*-- Constants --*/

    public static readonly LOW = new QrEcc(0, 1);  // The QR Code can tolerate about  7% erroneous codewords
    public static readonly MEDIUM = new QrEcc(1, 0);  // The QR Code can tolerate about 15% erroneous codewords
    public static readonly QUARTILE = new QrEcc(2, 3);  // The QR Code can tolerate about 25% erroneous codewords
    public static readonly HIGH = new QrEcc(3, 2);  // The QR Code can tolerate about 30% erroneous codewords


    /*-- Constructor and fields --*/

    private constructor(
        // In the range 0 to 3 (unsigned 2-bit integer).
        public readonly ordinal: number,
        // (Package-private) In the range 0 to 3 (unsigned 2-bit integer).
        public readonly formatBits: number) { }

}