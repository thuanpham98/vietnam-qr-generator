import { QrCode, QrCodeMask, QrEcc, QrSegment } from "../libs";

export class MyQrCode {
  private qrEcc: QrEcc;
  private minVersion: number;
  private maxVersion: number;
  private version: number;
  private mask: QrCodeMask;
  private boostEcl: boolean;
  private dataText: string;
  private dataBinary: number[];
  private size: number;
  private marix: Array<Array<boolean>>;

  constructor({
    qrEcc = QrEcc.HIGH,
    minVersion = 1,
    maxVersion = 40,
    mask = QrCodeMask.mask_7,
    boostEcl = true,
  }: {
    qrEcc?: QrEcc;
    minVersion?: number;
    maxVersion?: number;
    mask?: number;
    boostEcl?: boolean;
  }) {
    this.qrEcc = qrEcc;
    this.minVersion = minVersion;
    this.maxVersion = maxVersion;
    this.mask = mask;
    this.boostEcl = boostEcl;
    this.size = 0;
    this.version = minVersion;
    this.dataText = "";
    this.dataBinary = [];
    this.marix = [];
  }

  public updateParam({
    qrEcc = QrEcc.HIGH,
    minVersion = 1,
    maxVersion = 40,
    mask = -1,
    boostEcl = true,
  }: {
    qrEcc?: QrEcc;
    minVersion: number;
    maxVersion: number;
    mask: number;
    boostEcl: boolean;
  }): void {
    this.qrEcc = qrEcc ?? this.qrEcc;
    this.minVersion = minVersion ?? this.minVersion;
    this.maxVersion = maxVersion ?? this.maxVersion;
    this.mask = mask ?? this.mask;
    this.boostEcl = boostEcl ?? this.boostEcl;
  }

  public getVersion(): number {
    return this.version;
  }

  public getSize(): number {
    return this.size;
  }

  public getDataText(): string {
    return this.dataText;
  }

  public getDataBinay(): number[] {
    return this.dataBinary;
  }

  public encodeText(data: string): void {
    this.dataText = data;
    const segs = QrSegment.makeSegments(data);
    const qr = QrCode.encodeSegments(
      segs,
      this.qrEcc,
      this.minVersion,
      this.maxVersion,
      this.mask,
      this.boostEcl
    );
    this.size = qr.size;
    this.mask = qr.mask;
    this.version = qr.version;
    this.qrEcc = qr.errorCorrectionLevel;
    for (let y = 0; y < this.size; y++) {
      this.marix[y] = [];
      for (let x = 0; x < this.size; x++) {
        this.marix[y][x] = qr.getModule(x, y);
      }
    }
  }

  public encodeBinary(data: Array<number>): void {
    this.dataBinary = data;
    const qr = QrCode.encodeSegments(
      [QrSegment.makeBytes(data)],
      this.qrEcc,
      this.minVersion,
      this.maxVersion,
      this.mask,
      this.boostEcl
    );
    this.size = qr.size;
    this.mask = qr.mask;
    this.version = qr.version;
    this.qrEcc = qr.errorCorrectionLevel;
    for (let y = 0; y < this.size; y++) {
      this.marix[y] = [];
      for (let x = 0; x < this.size; x++) {
        this.marix[y][x] = qr.getModule(x, y);
      }
    }
  }

  public getMatrix(): boolean[][] {
    return this.marix;
  }

  public getPoint(x: number, y: number): boolean {
    return this.marix[y][x].valueOf();
  }
}
