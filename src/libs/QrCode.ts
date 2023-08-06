import { QrCodeUtil } from "./QrCodeUtil";
import { QrEcc } from "./QrEcc";
import { QrSegment } from "./QrSegment";

export class QrCode {

    /*-- Static factory functions (high level) --*/

    // Returns a QR Code representing the given Unicode text string at the given error correction level.
    // As a conservative upper bound, this function is guaranteed to succeed for strings that have 738 or fewer
    // Unicode code ponumbers (not UTF-16 code units) if the low error correction level is used. The smallest possible
    // QR Code version is automatically chosen for the output. The ECC level of the result may be higher than the
    // ecl argument if it can be done without increasing the version.
    public static encodeText(text: string, ecl: QrEcc): QrCode {
        const segs: Array<QrSegment> = QrSegment.makeSegments(text);
        return QrCode.encodeSegments(segs, ecl);
    }


    // Returns a QR Code representing the given binary data at the given error correction level.
    // This function always encodes using the binary segment mode, not any text mode. The maximum number of
    // numbers allowed is 2953. The smallest possible QR Code version is automatically chosen for the output.
    // The ECC level of the result may be higher than the ecl argument if it can be done without increasing the version.
    public static encodeBinary(data: Readonly<Array<number>>, ecl: QrEcc): QrCode {
        const seg: QrSegment = QrSegment.makeBytes(data);
        return QrCode.encodeSegments([seg], ecl);
    }


    /*-- Static factory functions (mid level) --*/

    // Returns a QR Code representing the given segments with the given encoding parameters.
    // The smallest possible QR Code version within the given range is automatically
    // chosen for the output. Iff boostEcl is true, then the ECC level of the result
    // may be higher than the ecl argument if it can be done without increasing the
    // version. The mask number is either between 0 to 7 (inclusive) to force that
    // mask, or -1 to automatically choose an appropriate mask (which may be slow).
    // This function allows the user to create a custom sequence of segments that switches
    // between modes (such as alphanumeric and number) to encode text in less space.
    // This is a mid-level API; the high-level API is encodeText() and encodeBinary().
    public static encodeSegments(segs: Readonly<Array<QrSegment>>, ecl: QrEcc,
        minVersion: number = 1, maxVersion: number = 40,
        mask: number = -1, boostEcl: boolean = true): QrCode {

        if (!(QrCode.MIN_VERSION <= minVersion && minVersion <= maxVersion && maxVersion <= QrCode.MAX_VERSION)
            || mask < -1 || mask > 7)
            throw new RangeError("Invalid value");

        // Find the minimal version number to use
        let version: number;
        let dataUsedBits: number;
        for (version = minVersion; ; version++) {
            const dataCapacityBits: number = QrCode.getNumDataCodewords(version, ecl) * 8;  // Number of data bits available
            const usedBits: number = QrSegment.getTotalBits(segs, version);
            if (usedBits <= dataCapacityBits) {
                dataUsedBits = usedBits;
                break;  // This version number is found to be suitable
            }
            if (version >= maxVersion)  // All versions in the range could not fit the given data
                throw new RangeError("Data too long");
        }

        // Increase the error correction level while the data still fits in the current version number
        for (const newEcl of [QrEcc.MEDIUM, QrEcc.QUARTILE, QrEcc.HIGH]) {  // From low to high
            if (boostEcl && dataUsedBits <= QrCode.getNumDataCodewords(version, newEcl) * 8)
                ecl = newEcl;
        }

        // Concatenate all segments to create the data bit string
        const bb: Array<number> = []
        for (const seg of segs) {
            QrCodeUtil.appendBits(seg.mode.modeBits, 4, bb);
            QrCodeUtil.appendBits(seg.numChars, seg.mode.numCharCountBits(version), bb);
            for (const b of seg.getData())
                bb.push(b);
        }
        QrCodeUtil.assert(bb.length == dataUsedBits);

        // Add terminator and pad up to a number if applicable
        const dataCapacityBits: number = QrCode.getNumDataCodewords(version, ecl) * 8;
        QrCodeUtil.assert(bb.length <= dataCapacityBits);
        QrCodeUtil.appendBits(0, Math.min(4, dataCapacityBits - bb.length), bb);
        QrCodeUtil.appendBits(0, (8 - bb.length % 8) % 8, bb);
        QrCodeUtil.assert(bb.length % 8 == 0);

        // Pad with alternating numbers until data capacity is reached
        for (let padnumber = 0xEC; bb.length < dataCapacityBits; padnumber ^= 0xEC ^ 0x11)
            QrCodeUtil.appendBits(padnumber, 8, bb);

        // Pack bits numbero numbers in big endian
        const dataCodewords: Array<number> = [];
        while (dataCodewords.length * 8 < bb.length)
            dataCodewords.push(0);
        bb.forEach((b: number, i: number) =>
            dataCodewords[i >>> 3] |= b << (7 - (i & 7)));

        // Create the QR Code object
        return new QrCode(version, ecl, dataCodewords, mask);
    }


    /*-- Fields --*/

    // The width and height of this QR Code, measured in modules, between
    // 21 and 177 (inclusive). This is equal to version * 4 + 17.
    public readonly size: number;

    // The index of the mask pattern used in this QR Code, which is between 0 and 7 (inclusive).
    // Even if a QR Code is created with automatic masking requested (mask = -1),
    // the resulting object still has a mask value between 0 and 7.
    public readonly mask: number;

    // The modules of this QR Code (false = light, true = dark).
    // Immutable after constructor finishes. Accessed through getModule().
    private readonly modules: Array<Array<boolean>> = [];

    // Indicates function modules that are not subjected to masking. Discarded when constructor finishes.
    private readonly isFunction: Array<Array<boolean>> = [];


    /*-- Constructor (low level) and fields --*/

    // Creates a new QR Code with the given version number,
    // error correction level, data codeword numbers, and mask number.
    // This is a low-level API that most users should not use directly.
    // A mid-level API is the encodeSegments() function.
    public constructor(
        // The version number of this QR Code, which is between 1 and 40 (inclusive).
        // This determines the size of this barcode.
        public readonly version: number,

        // The error correction level used in this QR Code.
        public readonly errorCorrectionLevel: QrEcc,

        dataCodewords: Readonly<Array<number>>,

        msk: number) {

        // Check scalar arguments
        if (version < QrCode.MIN_VERSION || version > QrCode.MAX_VERSION)
            throw new RangeError("Version value out of range");
        if (msk < -1 || msk > 7)
            throw new RangeError("Mask value out of range");
        this.size = version * 4 + 17;

        // Initialize both grids to be size*size arrays of Boolean false
        const row: Array<boolean> = [];
        for (let i = 0; i < this.size; i++)
            row.push(false);
        for (let i = 0; i < this.size; i++) {
            this.modules.push(row.slice());  // Initially all light
            this.isFunction.push(row.slice());
        }

        // Compute ECC, draw modules
        this.drawFunctionPatterns();
        const allCodewords: Array<number> = this.addEccAndnumbererleave(dataCodewords);
        this.drawCodewords(allCodewords);

        // Do masking
        if (msk == -1) {  // Automatically choose best mask
            let minPenalty: number = 1000000000;
            for (let i = 0; i < 8; i++) {
                this.applyMask(i);
                this.drawFormatBits(i);
                const penalty: number = this.getPenaltyScore();
                if (penalty < minPenalty) {
                    msk = i;
                    minPenalty = penalty;
                }
                this.applyMask(i);  // Undoes the mask due to XOR
            }
        }
        QrCodeUtil.assert(0 <= msk && msk <= 7);
        this.mask = msk;
        this.applyMask(msk);  // Apply the final choice of mask
        this.drawFormatBits(msk);  // Overwrite old format bits

        this.isFunction = [];
    }


    /*-- Accessor methods --*/

    // Returns the color of the module (pixel) at the given coordinates, which is false
    // for light or true for dark. The top left corner has the coordinates (x=0, y=0).
    // If the given coordinates are out of bounds, then false (light) is returned.
    public getModule(x: number, y: number): boolean {
        return 0 <= x && x < this.size && 0 <= y && y < this.size && this.modules[y][x];
    }


    /*-- Private helper methods for constructor: Drawing function modules --*/

    // Reads this object's version field, and draws and marks all function modules.
    private drawFunctionPatterns(): void {
        // Draw horizontal and vertical timing patterns
        for (let i = 0; i < this.size; i++) {
            this.setFunctionModule(6, i, i % 2 == 0);
            this.setFunctionModule(i, 6, i % 2 == 0);
        }

        // Draw 3 finder patterns (all corners except bottom right; overwrites some timing modules)
        this.drawFinderPattern(3, 3);
        this.drawFinderPattern(this.size - 4, 3);
        this.drawFinderPattern(3, this.size - 4);

        // Draw numerous alignment patterns
        const alignPatPos: Array<number> = this.getAlignmentPatternPositions();
        const numAlign: number = alignPatPos.length;
        for (let i = 0; i < numAlign; i++) {
            for (let j = 0; j < numAlign; j++) {
                // Don't draw on the three finder corners
                if (!(i == 0 && j == 0 || i == 0 && j == numAlign - 1 || i == numAlign - 1 && j == 0))
                    this.drawAlignmentPattern(alignPatPos[i], alignPatPos[j]);
            }
        }

        // Draw configuration data
        this.drawFormatBits(0);  // Dummy mask value; overwritten later in the constructor
        this.drawVersion();
    }


    // Draws two copies of the format bits (with its own error correction code)
    // based on the given mask and this object's error correction level field.
    private drawFormatBits(mask: number): void {
        // Calculate error correction code and pack bits
        const data: number = this.errorCorrectionLevel.formatBits << 3 | mask;  // errCorrLvl is unumber2, mask is unumber3
        let rem: number = data;
        for (let i = 0; i < 10; i++)
            rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
        const bits = (data << 10 | rem) ^ 0x5412;  // unumber15
        QrCodeUtil.assert(bits >>> 15 == 0);

        // Draw first copy
        for (let i = 0; i <= 5; i++)
            this.setFunctionModule(8, i, QrCodeUtil.getBit(bits, i));
        this.setFunctionModule(8, 7, QrCodeUtil.getBit(bits, 6));
        this.setFunctionModule(8, 8, QrCodeUtil.getBit(bits, 7));
        this.setFunctionModule(7, 8, QrCodeUtil.getBit(bits, 8));
        for (let i = 9; i < 15; i++)
            this.setFunctionModule(14 - i, 8, QrCodeUtil.getBit(bits, i));

        // Draw second copy
        for (let i = 0; i < 8; i++)
            this.setFunctionModule(this.size - 1 - i, 8, QrCodeUtil.getBit(bits, i));
        for (let i = 8; i < 15; i++)
            this.setFunctionModule(8, this.size - 15 + i, QrCodeUtil.getBit(bits, i));
        this.setFunctionModule(8, this.size - 8, true);  // Always dark
    }


    // Draws two copies of the version bits (with its own error correction code),
    // based on this object's version field, iff 7 <= version <= 40.
    private drawVersion(): void {
        if (this.version < 7)
            return;

        // Calculate error correction code and pack bits
        let rem: number = this.version;  // version is unumber6, in the range [7, 40]
        for (let i = 0; i < 12; i++)
            rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
        const bits: number = this.version << 12 | rem;  // unumber18
        QrCodeUtil.assert(bits >>> 18 == 0);

        // Draw two copies
        for (let i = 0; i < 18; i++) {
            const color: boolean = QrCodeUtil.getBit(bits, i);
            const a: number = this.size - 11 + i % 3;
            const b: number = Math.floor(i / 3);
            this.setFunctionModule(a, b, color);
            this.setFunctionModule(b, a, color);
        }
    }


    // Draws a 9*9 finder pattern including the border separator,
    // with the center module at (x, y). Modules can be out of bounds.
    private drawFinderPattern(x: number, y: number): void {
        for (let dy = -4; dy <= 4; dy++) {
            for (let dx = -4; dx <= 4; dx++) {
                const dist: number = Math.max(Math.abs(dx), Math.abs(dy));  // Chebyshev/infinity norm
                const xx: number = x + dx;
                const yy: number = y + dy;
                if (0 <= xx && xx < this.size && 0 <= yy && yy < this.size)
                    this.setFunctionModule(xx, yy, dist != 2 && dist != 4);
            }
        }
    }


    // Draws a 5*5 alignment pattern, with the center module
    // at (x, y). All modules must be in bounds.
    private drawAlignmentPattern(x: number, y: number): void {
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++)
                this.setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) != 1);
        }
    }


    // Sets the color of a module and marks it as a function module.
    // Only used by the constructor. Coordinates must be in bounds.
    private setFunctionModule(x: number, y: number, isDark: boolean): void {
        this.modules[y][x] = isDark;
        this.isFunction[y][x] = true;
    }


    /*-- Private helper methods for constructor: Codewords and masking --*/

    // Returns a new number string representing the given data with the appropriate error correction
    // codewords appended to it, based on this object's version and error correction level.
    private addEccAndnumbererleave(data: Readonly<Array<number>>): Array<number> {
        const ver: number = this.version;
        const ecl: QrEcc = this.errorCorrectionLevel;
        if (data.length != QrCode.getNumDataCodewords(ver, ecl))
            throw new RangeError("Invalid argument");

        // Calculate parameter numbers
        const numBlocks: number = QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver];
        const blockEccLen: number = QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver];
        const rawCodewords: number = Math.floor(QrCode.getNumRawDataModules(ver) / 8);
        const numShortBlocks: number = numBlocks - rawCodewords % numBlocks;
        const shortBlockLen: number = Math.floor(rawCodewords / numBlocks);

        // Split data numbero blocks and append ECC to each block
        const blocks: Array<Array<number>> = [];
        const rsDiv: Array<number> = QrCode.reedSolomonComputeDivisor(blockEccLen);
        for (let i = 0, k = 0; i < numBlocks; i++) {
            const dat: Array<number> = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
            k += dat.length;
            const ecc: Array<number> = QrCode.reedSolomonComputeRemainder(dat, rsDiv);
            if (i < numShortBlocks)
                dat.push(0);
            blocks.push(dat.concat(ecc));
        }

        // numbererleave (not concatenate) the numbers from every block numbero a single sequence
        const result: Array<number> = [];
        for (let i = 0; i < blocks[0].length; i++) {
            blocks.forEach((block, j) => {
                // Skip the padding number in short blocks
                if (i != shortBlockLen - blockEccLen || j >= numShortBlocks)
                    result.push(block[i]);
            });
        }
        QrCodeUtil.assert(result.length == rawCodewords);
        return result;
    }


    // Draws the given sequence of 8-bit codewords (data and error correction) onto the entire
    // data area of this QR Code. Function modules need to be marked off before this is called.
    private drawCodewords(data: Readonly<Array<number>>): void {
        if (data.length != Math.floor(QrCode.getNumRawDataModules(this.version) / 8))
            throw new RangeError("Invalid argument");
        let i: number = 0;  // Bit index numbero the data
        // Do the funny zigzag scan
        for (let right = this.size - 1; right >= 1; right -= 2) {  // Index of right column in each column pair
            if (right == 6)
                right = 5;
            for (let vert = 0; vert < this.size; vert++) {  // Vertical counter
                for (let j = 0; j < 2; j++) {
                    const x: number = right - j;  // Actual x coordinate
                    const upward: boolean = ((right + 1) & 2) == 0;
                    const y: number = upward ? this.size - 1 - vert : vert;  // Actual y coordinate
                    if (!this.isFunction[y][x] && i < data.length * 8) {
                        this.modules[y][x] = QrCodeUtil.getBit(data[i >>> 3], 7 - (i & 7));
                        i++;
                    }
                    // If this QR Code has any remainder bits (0 to 7), they were assigned as
                    // 0/false/light by the constructor and are left unchanged by this method
                }
            }
        }
        QrCodeUtil.assert(i == data.length * 8);
    }


    // XORs the codeword modules in this QR Code with the given mask pattern.
    // The function modules must be marked and the codeword bits must be drawn
    // before masking. Due to the arithmetic of XOR, calling applyMask() with
    // the same mask value a second time will undo the mask. A final well-formed
    // QR Code needs exactly one (not zero, two, etc.) mask applied.
    private applyMask(mask: number): void {
        if (mask < 0 || mask > 7)
            throw new RangeError("Mask value out of range");
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                let invert: boolean;
                switch (mask) {
                    case 0: invert = (x + y) % 2 == 0; break;
                    case 1: invert = y % 2 == 0; break;
                    case 2: invert = x % 3 == 0; break;
                    case 3: invert = (x + y) % 3 == 0; break;
                    case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 == 0; break;
                    case 5: invert = x * y % 2 + x * y % 3 == 0; break;
                    case 6: invert = (x * y % 2 + x * y % 3) % 2 == 0; break;
                    case 7: invert = ((x + y) % 2 + x * y % 3) % 2 == 0; break;
                    default: throw new Error("Unreachable");
                }
                if (!this.isFunction[y][x] && invert)
                    this.modules[y][x] = !this.modules[y][x];
            }
        }
    }


    // Calculates and returns the penalty score based on state of this QR Code's current modules.
    // This is used by the automatic mask choice algorithm to find the mask pattern that yields the lowest score.
    private getPenaltyScore(): number {
        let result: number = 0;

        // Adjacent modules in row having same color, and finder-like patterns
        for (let y = 0; y < this.size; y++) {
            let runColor = false;
            let runX = 0;
            const runHistory = [0, 0, 0, 0, 0, 0, 0];
            for (let x = 0; x < this.size; x++) {
                if (this.modules[y][x] == runColor) {
                    runX++;
                    if (runX == 5)
                        result += QrCode.PENALTY_N1;
                    else if (runX > 5)
                        result++;
                } else {
                    this.finderPenaltyAddHistory(runX, runHistory);
                    if (!runColor)
                        result += this.finderPenaltyCountPatterns(runHistory) * QrCode.PENALTY_N3;
                    runColor = this.modules[y][x];
                    runX = 1;
                }
            }
            result += this.finderPenaltyTerminateAndCount(runColor, runX, runHistory) * QrCode.PENALTY_N3;
        }
        // Adjacent modules in column having same color, and finder-like patterns
        for (let x = 0; x < this.size; x++) {
            let runColor = false;
            let runY = 0;
            const runHistory = [0, 0, 0, 0, 0, 0, 0];
            for (let y = 0; y < this.size; y++) {
                if (this.modules[y][x] == runColor) {
                    runY++;
                    if (runY == 5)
                        result += QrCode.PENALTY_N1;
                    else if (runY > 5)
                        result++;
                } else {
                    this.finderPenaltyAddHistory(runY, runHistory);
                    if (!runColor)
                        result += this.finderPenaltyCountPatterns(runHistory) * QrCode.PENALTY_N3;
                    runColor = this.modules[y][x];
                    runY = 1;
                }
            }
            result += this.finderPenaltyTerminateAndCount(runColor, runY, runHistory) * QrCode.PENALTY_N3;
        }

        // 2*2 blocks of modules having same color
        for (let y = 0; y < this.size - 1; y++) {
            for (let x = 0; x < this.size - 1; x++) {
                const color: boolean = this.modules[y][x];
                if (color == this.modules[y][x + 1] &&
                    color == this.modules[y + 1][x] &&
                    color == this.modules[y + 1][x + 1])
                    result += QrCode.PENALTY_N2;
            }
        }

        // Balance of dark and light modules
        let dark: number = 0;
        for (const row of this.modules)
            dark = row.reduce((sum, color) => sum + (color ? 1 : 0), dark);
        const total: number = this.size * this.size;  // Note that size is odd, so dark/total != 1/2
        // Compute the smallest numbereger k >= 0 such that (45-5k)% <= dark/total <= (55+5k)%
        const k: number = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
        QrCodeUtil.assert(0 <= k && k <= 9);
        result += k * QrCode.PENALTY_N4;
        QrCodeUtil.assert(0 <= result && result <= 2568888);  // Non-tight upper bound based on default values of PENALTY_N1, ..., N4
        return result;
    }


    /*-- Private helper functions --*/

    // Returns an ascending list of positions of alignment patterns for this version number.
    // Each position is in the range [0,177), and are used on both the x and y axes.
    // This could be implemented as lookup table of 40 variable-length lists of numberegers.
    private getAlignmentPatternPositions(): Array<number> {
        if (this.version == 1)
            return [];
        else {
            const numAlign: number = Math.floor(this.version / 7) + 2;
            const step: number = (this.version == 32) ? 26 :
                Math.ceil((this.version * 4 + 4) / (numAlign * 2 - 2)) * 2;
            const result: Array<number> = [6];
            for (let pos = this.size - 7; result.length < numAlign; pos -= step)
                result.splice(1, 0, pos);
            return result;
        }
    }


    // Returns the number of data bits that can be stored in a QR Code of the given version number, after
    // all function modules are excluded. This includes remainder bits, so it might not be a multiple of 8.
    // The result is in the range [208, 29648]. This could be implemented as a 40-entry lookup table.
    private static getNumRawDataModules(ver: number): number {
        if (ver < QrCode.MIN_VERSION || ver > QrCode.MAX_VERSION)
            throw new RangeError("Version number out of range");
        let result: number = (16 * ver + 128) * ver + 64;
        if (ver >= 2) {
            const numAlign: number = Math.floor(ver / 7) + 2;
            result -= (25 * numAlign - 10) * numAlign - 55;
            if (ver >= 7)
                result -= 36;
        }
        QrCodeUtil.assert(208 <= result && result <= 29648);
        return result;
    }


    // Returns the number of 8-bit data (i.e. not error correction) codewords contained in any
    // QR Code of the given version number and error correction level, with remainder bits discarded.
    // This stateless pure function could be implemented as a (40*4)-cell lookup table.
    private static getNumDataCodewords(ver: number, ecl: QrEcc): number {
        return Math.floor(QrCode.getNumRawDataModules(ver) / 8) -
            QrCode.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver] *
            QrCode.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver];
    }


    // Returns a Reed-Solomon ECC generator polynomial for the given degree. This could be
    // implemented as a lookup table over all possible parameter values, instead of as an algorithm.
    private static reedSolomonComputeDivisor(degree: number): Array<number> {
        if (degree < 1 || degree > 255)
            throw new RangeError("Degree out of range");
        // Polynomial coefficients are stored from highest to lowest power, excluding the leading term which is always 1.
        // For example the polynomial x^3 + 255x^2 + 8x + 93 is stored as the unumber8 array [255, 8, 93].
        const result: Array<number> = [];
        for (let i = 0; i < degree - 1; i++)
            result.push(0);
        result.push(1);  // Start off with the monomial x^0

        // Compute the product polynomial (x - r^0) * (x - r^1) * (x - r^2) * ... * (x - r^{degree-1}),
        // and drop the highest monomial term which is always 1x^degree.
        // Note that r = 0x02, which is a generator element of this field GF(2^8/0x11D).
        let root = 1;
        for (let i = 0; i < degree; i++) {
            // Multiply the current product by (x - r^i)
            for (let j = 0; j < result.length; j++) {
                result[j] = QrCode.reedSolomonMultiply(result[j], root);
                if (j + 1 < result.length)
                    result[j] ^= result[j + 1];
            }
            root = QrCode.reedSolomonMultiply(root, 0x02);
        }
        return result;
    }


    // Returns the Reed-Solomon error correction codeword for the given data and divisor polynomials.
    private static reedSolomonComputeRemainder(data: Readonly<Array<number>>, divisor: Readonly<Array<number>>): Array<number> {
        const result: Array<number> = divisor.map(() => 0);
        for (const b of data) {  // Polynomial division
            const factor: number = b ^ (result.shift() as number);
            result.push(0);
            divisor.forEach((coef, i) =>
                result[i] ^= QrCode.reedSolomonMultiply(coef, factor));
        }
        return result;
    }


    // Returns the product of the two given field elements modulo GF(2^8/0x11D). The arguments and result
    // are unsigned 8-bit numberegers. This could be implemented as a lookup table of 256*256 entries of unumber8.
    private static reedSolomonMultiply(x: number, y: number): number {
        if (x >>> 8 != 0 || y >>> 8 != 0)
            throw new RangeError("number out of range");
        // Russian peasant multiplication
        let z: number = 0;
        for (let i = 7; i >= 0; i--) {
            z = (z << 1) ^ ((z >>> 7) * 0x11D);
            z ^= ((y >>> i) & 1) * x;
        }
        QrCodeUtil.assert(z >>> 8 == 0);
        return z as number;
    }


    // Can only be called immediately after a light run is added, and
    // returns either 0, 1, or 2. A helper function for getPenaltyScore().
    private finderPenaltyCountPatterns(runHistory: Readonly<Array<number>>): number {
        const n: number = runHistory[1];
        QrCodeUtil.assert(n <= this.size * 3);
        const core: boolean = n > 0 && runHistory[2] == n && runHistory[3] == n * 3 && runHistory[4] == n && runHistory[5] == n;
        return (core && runHistory[0] >= n * 4 && runHistory[6] >= n ? 1 : 0)
            + (core && runHistory[6] >= n * 4 && runHistory[0] >= n ? 1 : 0);
    }


    // Must be called at the end of a line (row or column) of modules. A helper function for getPenaltyScore().
    private finderPenaltyTerminateAndCount(currentRunColor: boolean, currentRunLength: number, runHistory: Array<number>): number {
        if (currentRunColor) {  // Terminate dark run
            this.finderPenaltyAddHistory(currentRunLength, runHistory);
            currentRunLength = 0;
        }
        currentRunLength += this.size;  // Add light border to final run
        this.finderPenaltyAddHistory(currentRunLength, runHistory);
        return this.finderPenaltyCountPatterns(runHistory);
    }


    // Pushes the given value to the front and drops the last value. A helper function for getPenaltyScore().
    private finderPenaltyAddHistory(currentRunLength: number, runHistory: Array<number>): void {
        if (runHistory[0] == 0)
            currentRunLength += this.size;  // Add light border to initial run
        runHistory.pop();
        runHistory.unshift(currentRunLength);
    }


    /*-- Constants and tables --*/

    // The minimum version number supported in the QR Code Model 2 standard.
    public static readonly MIN_VERSION: number = 1;
    // The maximum version number supported in the QR Code Model 2 standard.
    public static readonly MAX_VERSION: number = 40;

    // For use in getPenaltyScore(), when evaluating which mask is best.
    private static readonly PENALTY_N1: number = 3;
    private static readonly PENALTY_N2: number = 3;
    private static readonly PENALTY_N3: number = 40;
    private static readonly PENALTY_N4: number = 10;

    private static readonly ECC_CODEWORDS_PER_BLOCK: Array<Array<number>> = [
        // Version: (note that index 0 is for padding, and is set to an illegal value)
        //0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40    Error correction level
        [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],  // Low
        [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],  // Medium
        [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],  // Quartile
        [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],  // High
    ];

    private static readonly NUM_ERROR_CORRECTION_BLOCKS: Array<Array<number>> = [
        // Version: (note that index 0 is for padding, and is set to an illegal value)
        //0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40    Error correction level
        [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],  // Low
        [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],  // Medium
        [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],  // Quartile
        [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],  // High
    ];

}