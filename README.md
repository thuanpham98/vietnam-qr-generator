Xin chào,  đây là thư viện hỗ trợ tạo QR code từ Việt Nam.
Thư viện xây dựng dựa trên repository của tác giả Nayuki: https://github.com/nayuki/QR-Code-generator.

#### Ví dụ
```typescript
// qr from text //
/** create instance */
const myQr= new MyQrCode();
/** encode data */
myQr.encodeText("Ahihi do ngok");
/** matrix bitmap for qrcode */
const matrixQr boolean[][] = myQr.getMatrix();
/** or get point in matrix for drawer*/
for (let y = 0; y < myQr.getSize(); y++) {
    for (let x = 0; x < myQr.getSize(); x++) {
        console.log(myQr.getPoint(x,y));
    }
}

// qr from binary //
/** create instance */
const myQr= new MyQrCode();
/** encode data */
myQr.encodeBinary([12,2,5,6,65]);
/** matrix bitmap for qrcode */
const matrixQr boolean[][] = myQr.getMatrix();
/** or get point in matrix for drawer*/
for (let y = 0; y < myQr.getSize(); y++) {
    for (let x = 0; x < myQr.getSize(); x++) {
        console.log(myQr.getPoint(x,y));
    }
}
```