import logo from "./logo.svg";
import "./App.css";
import React, { useState, useEffect, useCallback, useRef } from "react";
import WebSocketClient from "reconnecting-websocket";

const host = "192.168.18.148:3000";
const id = "_" + Math.random().toString(36).substr(2, 9);
let remoteId = null;
let connection = null;
navigator.getUserMedia =
  navigator.getUserMedia ||
  navigator.webkitGetUserMedia ||
  navigator.mozGetUserMedia;
const App = () => {
  const room = "121212";
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const userVideo = useRef(null);
  const partnerVideo = useRef(null);
  // useLayoutEffect(() => {
  //   navigation.setOptions({headerTitle: `Room ${room}`});
  // });

  useEffect(() => {
    const ws = new WebSocketClient(`ws://${host}`);

    ws.onopen = () => {
      console.log("Connected");
    };

    ws.onerror = (err) => {
      console.log("Got error:", err);
    };

    ws.onmessage = async (message) => {
      console.log("Got message:", message);
      const data = JSON.parse(message.data);
      switch (data.type) {
        case "enter":
          await onEnter(data.success, data.full, data.wait);
          break;
        case "offer":
          await onOffer(data.offer, data.remoteId);
          break;
        case "answer":
          await onAnswer(data.answer);
          break;
        case "candidate":
          await onCandidate(data.candidate);
          break;
        case "leave":
          await onLeave();
          break;
        default:
          break;
      }
    };

    const send = (message) => {
      message.room = room;
      if (remoteId) {
        message.remoteId = remoteId;
      }
      message.id = id;
      ws.send(JSON.stringify(message));
    };

    const onEnter = async (success, full, wait) => {
      if (success) {
        if (wait) {
          startConnection();
        } else {
          startConnection(true);
        }
      } else {
        startConnection();
        if (full) {
          //TODO: full
        } else {
          //TODO:
        }
      }
    };

    const startConnection = async (startPC = false) => {
      console.log("STRA");
      if (navigator.getUserMedia) {
        const isFront = true;

        const facingMode = isFront ? "user" : "environment";
        const constraints = {
          audio: true,
          video: {
            mandatory: {
              minWidth: 500, // Provide your own width, height and frame rate here
              minHeight: 300,
              minFrameRate: 30,
            },
            facingMode,
          },
        };
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
            video: true,
            facingMode,
          },
          async (stream) => {
            console.log(stream, "STREAM");
            setLocalStream(stream);
            userVideo.current.srcObject = stream;
            await setupPeerConnection(stream, startPC);
          },
          (err) => {
            console.log(err);
          }
        );
      }
    };
    const setupPeerConnection = async (stream, startPC = false) => {
      console.log("WORK");
      const configuration = {
        iceServers: [
          {
            urls: "stun:stun.l.google.com:19302",
          },
        ],
      };
      const conn = new window.RTCPeerConnection(configuration);
      connection = conn;
      console.log(conn, "CONN");
      conn.addStream(stream);
      conn.onaddstream = (event) => {
        if (event.stream) {
          partnerVideo.current.srcObject = event.stream;
          setRemoteStream(event.stream);
        }
      };

      conn.onicecandidate = (event) => {
        if (event.candidate) {
          send({
            type: "candidate",
            candidate: event.candidate,
          });
        }
      };

      if (startPC) {
        await startPeerConnection();
      }
    };

    const startPeerConnection = async () => {
      try {
        const offer = await connection.createOffer();
        send({
          type: "offer",
          offer,
        });
        await connection.setLocalDescription(offer);
      } catch (err) {
        console.error(err);
      }
    };

    const onOffer = async (offer, remote) => {
      remoteId = remote;
      await connection.setRemoteDescription(
        new window.RTCSessionDescription(offer)
      );

      try {
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        send({
          type: "answer",
          answer,
        });
      } catch (err) {
        console.error(err);
      }
    };

    const onAnswer = async (answer) =>
      await connection.setRemoteDescription(
        new window.RTCSessionDescription(answer)
      );

    const onCandidate = async (candidate) =>
      await connection.addIceCandidate(new window.RTCIceCandidate(candidate));

    const onLeave = async () => {
      remoteId = null;
      setRemoteStream(null);
      partnerVideo.current = "";
      connection.close();
      connection.onaddstream = null;
      connection.onicecandidate = null;
      startConnection();
    };

    if (room.length > 0) {
      send({
        type: "enter",
        id,
      });
    } else {
      // Error
    }

    const unsubscribe = () => {
      connection.close();
      connection.onaddstream = null;
      connection.onicecandidate = null;
      send({
        type: "leave",
      });
    };
    // return unsubscribe;
  }, [room]);

  return (
    <div className="app">
      <header className="App-header">
        <video
          ref={userVideo}
          autoPlay
          muted="muted"
          style={{
            background: "lightgray",
            // width: "100%",
            // borderRadius: 25,
            transform: "rotateY(180deg)",
            // -webkitTransform: 'rotateY(180deg)'
            // -moz-transform: 'rotateY(180deg)'
          }}
        />
        <video
          style={{
            background: "lightgray",
            // width: "100%",
            // borderRadius: 25,
            transform: "rotateY(180deg)",
            // -webkitTransform: 'rotateY(180deg)'
            // -moz-transform: 'rotateY(180deg)'
          }}
          ref={partnerVideo}
          autoPlay
          className="videoElement"
        />
      </header>
    </div>
  );
};
// function App() {
//   return (
//     <div className="App">
//       <header className="App-header">
//         <img src={logo} className="App-logo" alt="logo" />
//         <p>
//           Edit <code>src/App.js</code> and save to reload.
//         </p>
//         <a
//           className="App-link"
//           href="https://reactjs.org"
//           target="_blank"
//           rel="noopener noreferrer"
//         >
//           Learn React
//         </a>
//       </header>
//     </div>
//   );
// }

export default App;
