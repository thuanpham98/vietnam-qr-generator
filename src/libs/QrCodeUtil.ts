export class QrCodeUtil{
// Appends the given number of low-order bits of the given value
// to the given buffer. Requires 0 <= len <= 31 and 0 <= val < 2^len.
    public static appendBits(val: number, len: number, bb: Array<number>): void {
        if (len < 0 || len > 31 || val >>> len != 0)
            throw new RangeError("Value out of range");
        for (let i = len - 1; i >= 0; i--)  // Append bit by bit
            bb.push((val >>> i) & 1);
    }


    // Returns true iff the i'th bit of x is set to 1.
    public static getBit(x: number, i: number): boolean {
        return ((x >>> i) & 1) != 0;
    }


    // Throws an exception if the given condition is false.
    public static assert(cond: boolean): void {
        if (!cond)
            throw new Error("Assertion error");
    }
}

