// import { useEffect, useRef } from 'react'
// import './App.css'
// import { QrSegment } from './qr-code-gen/QrSegment';
// import { QrCode } from './qr-code-gen/QrCode';
// import { QrEcc } from './qr-code-gen/QrEcc';
// import logo from './assets/react.svg';
// import kienlong from "./assets/kienlong.png";

// function App() {
//   const ref = useRef<HTMLCanvasElement>(null);
//   useEffect(()=>{
//     function grayScale(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
//       const imgData = context.getImageData(0, 0, canvas.width, canvas.height);
//       const pixels = imgData.data;
//       for (let i = 0, n = pixels.length; i < n; i += 4) {
//         const g = pixels[i] * .3 + pixels[i + 1] * .59 + pixels[i + 2] * .11;
//         const newPi = new Uint8ClampedArray(3);
//         newPi[0]=0;
//         newPi[1] = 0;
//         newPi[2] = 0;

//         pixels[i] = g > 0.155 ? newPi[0] :0;        // red
//         pixels[i + 1] = g > 0.155 ? newPi[0 + 1] : 0;        // green
//         pixels[i + 2] = g > 0.155 ? newPi[0 + 2] : 0;        // blue
//         //pixels[i+3]              is alpha
//       }
//       //redraw the image in black & white
//       context.putImageData(imgData, 0, 0);
//     }

//     const cv= ref.current;
//     const ctx = cv?.getContext("2d");
//     const pi = 2 * Math.PI;
//     const scaleFacctor=5;
//     const ele = document.getElementById('test');
//     if (ctx && cv && ele){
//       // Manual operation
//       const segs = QrSegment.makeSegments("https://shopee.sg/buyer/login?next=https%3A%2F%2Fshopee.sg%2FBluetooth-Keyboard-Wireless-Keyboard-Bluetooth-Mini-Track-pad-Keyboard-RGB-Backlit-Rechargeable-For-Phone-Tablet-Touch-pad-i.399439483.18456614615%3Fsp_atk%3D00b76d2f-2ec2-4b44-9f77-c9bfc2db8f88%26xptdk%3D00b76d2f-2ec2-4b44-9f77-c9bfc2db8f88");
//       const qr1 = QrCode.encodeSegments(segs, QrEcc.HIGH, 1, 40, 7, true);
//       console.log(qr1.mask);
//       cv.width = (qr1.size+4) * scaleFacctor;
//       cv.height = (qr1.size+4) * scaleFacctor;
      
//       cv.style.background ="white"
//       ele.style.width = `${(qr1.size) * scaleFacctor + 8}px`;
//       ele.style.height = `${(qr1.size) * scaleFacctor + 8}px`;
//       // ele.style.scale = `0.5`;




//       // images
//       // const imageObj = new Image((qr1.size) * scaleFacctor, (qr1.size) * scaleFacctor,);
//       // imageObj.onload = function () {
//       //   ctx.drawImage(imageObj, 0, 0, imageObj.naturalWidth, imageObj.naturalHeight, 0, 0, (qr1.size) * scaleFacctor, (qr1.size) * scaleFacctor);
//       //   grayScale(ctx, cv);
//       // };
//       // imageObj.src = logo;



//       for (let y = 0; y < qr1.size; y++) {
//         for (let x = 0; x < qr1.size; x++) {
//           if(x>1&&x<5&&y>1&&y<5){
//             ctx.fillStyle = "#FFFFFF";
//             ctx.fillRect((x + 2) * scaleFacctor, (y + 2) * scaleFacctor, scaleFacctor, scaleFacctor);
//           } else if ((x >= 0 && x <= 6 && y === 0) || 
//             (y >= 0 && y <= 6 && x === 0) || 
//           (x >= 0 && x <= 6 && y == 6) || 
//             (y >= 0 && y <= 6 && x === 6)){
//             ctx.fillStyle = "#FFFFFF";
//             ctx.fillRect((x + 2) * scaleFacctor, (y + 2) * scaleFacctor, scaleFacctor, scaleFacctor);
//           } else{
//             if (qr1.getModule(x, y)) {
//               const grd = ctx.createRadialGradient(x + 2, y + 2, 0, (x + 2 + qr1.size / 2) * scaleFacctor, (y + 2 + qr1.size / 2) * scaleFacctor, (qr1.size / 2 + 2) * scaleFacctor);
//               grd.addColorStop(0, "red");
//               grd.addColorStop(1, "green");
//               ctx.beginPath();
//               ctx.arc((x + 2 + 0.5) * scaleFacctor, (y + 2 + 0.5) * scaleFacctor, scaleFacctor / 2, 0, 2 * pi);
//               ctx.fillStyle = grd;
//               ctx.fill();
//               ctx.lineWidth = 0;
//               ctx.strokeStyle = grd;
//               ctx.stroke();
 
//               // const grd = ctx.createRadialGradient(x+2, y+2, 0, (x + 2 + qr1.size / 2) * scaleFacctor, (y + 2 + qr1.size / 2) * scaleFacctor, (qr1.size / 2 + 2) * scaleFacctor);
//               // grd.addColorStop(0, "red");
//               // grd.addColorStop(1, "white");
//               // ctx.fillStyle = grd;
//               // ctx.fillRect((x + 2) * scaleFacctor, (y + 2) * scaleFacctor, scaleFacctor, scaleFacctor);
//             } else {
//               ctx.fillStyle = "#FFFFFF";
//               ctx.fillRect((x + 2) * scaleFacctor, (y + 2) * scaleFacctor, scaleFacctor, scaleFacctor);
//             }
//           }
          

//         }
//       }
//       ctx.beginPath();
//       ctx.arc((3.5+2) * scaleFacctor, (3.5+2) * scaleFacctor, scaleFacctor * 1.5, 0, 2 * pi);
//       ctx.fillStyle = 'green';
//       ctx.fill();
//       ctx.lineWidth = 0;
//       ctx.strokeStyle = 'green';
//       ctx.stroke();

//       ctx.beginPath();
//       ctx.arc((3.5 + 2) * scaleFacctor, (3.5 + 2) * scaleFacctor, scaleFacctor * 3, 0, 2 * pi);
//       ctx.lineWidth = 1 * scaleFacctor;
//       ctx.strokeStyle = 'green';
//       ctx.stroke();
//     }
//   },[]);
//   return (
//     <div id="test" style={{
//       // border: "1px solid red",
//       padding:"4px",
//       boxSizing:"border-box",
//       display:"flex",
//       justifyContent:"center",
//       alignItems:"center",
//       position:"relative",
//     }}>

//       <canvas ref={ref} />
//       <img src={kienlong} style={{
//         width: "453px",
//         height: "453px",
//         position: "absolute",
//         left: 0,
//         top: 0,
//         bottom: "0",
//         right: '0',
//         margin: "auto",
//         // backgroundColor: "#FFFFFF",
//         opacity: 0.5,
//         borderRadius: "100%"
//       }} />
   
//     </div>
//   )
// }

// export default App

export {}