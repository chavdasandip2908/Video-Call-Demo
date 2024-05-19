// VideoCall.js
import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';
import SimplePeer from 'simple-peer';

const socket = io.connect('https://video-call-demo.onrender.com');

const VideoCall = () => {
  const [stream, setStream] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState('');
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [idToCall, setIdToCall] = useState('');
  const [myId, setMyId] = useState('');
  const [callEnded, setCallEnded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      setStream(stream);
      myVideo.current.srcObject = stream;
    });

    socket.on('yourID', (id) => {
      setMyId(id);
    });

    socket.on('offer', (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    });

    socket.on('answer', (data) => {
      connectionRef.current.signal(data.signal);
    });

    socket.on('candidate', (data) => {
      connectionRef.current.signal(data.candidate);
    });
  }, []);

  const callUser = (id) => {
    const peer = new SimplePeer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    peer.on('signal', (data) => {
      socket.emit('offer', { to: id, from: myId, signal: data });
    });

    peer.on('stream', (stream) => {
      userVideo.current.srcObject = stream;
    });

    connectionRef.current = peer;
  };

  const acceptCall = () => {
    setCallAccepted(true);
    const peer = new SimplePeer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    peer.on('signal', (data) => {
      socket.emit('answer', { to: caller, from: myId, signal: data });
    });

    peer.on('stream', (stream) => {
      userVideo.current.srcObject = stream;
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const endCall = () => {
    setCallEnded(true);
    connectionRef.current.destroy();
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks()[0].enabled = !stream.getAudioTracks()[0].enabled;
      setIsMuted(!isMuted);
    }
  };

  const switchCamera = async () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length > 1) {
        const currentCameraIndex = videoDevices.findIndex(device => device.deviceId === videoTrack.getSettings().deviceId);
        const nextCameraIndex = (currentCameraIndex + 1) % videoDevices.length;
        const nextCameraDeviceId = videoDevices[nextCameraIndex].deviceId;
        
        const newStream = await navigator.mediaDevices.getUserMedia({ 
          video: { deviceId: { exact: nextCameraDeviceId } }, 
          audio: true 
        });

        const newVideoTrack = newStream.getVideoTracks()[0];
        const sender = connectionRef.current.getSenders().find(s => s.track.kind === 'video');
        sender.replaceTrack(newVideoTrack);

        stream.removeTrack(videoTrack);
        stream.addTrack(newVideoTrack);
        myVideo.current.srcObject = stream;
        setIsVideoOn(true);
      }
    }
  };

  return (
    <div>
        <div>your user id : {myId}</div>
      <div>
        <video playsInline muted ref={myVideo} autoPlay style={{ width: '300px' }} />
      </div>
      <div>
        <video playsInline ref={userVideo} autoPlay style={{ width: '300px' }} />
      </div>
      <div>
        {receivingCall && !callAccepted && (
          <div>
            <h1>{caller} is calling...</h1>
            <button onClick={acceptCall}>Accept Call</button>
          </div>
        )}
      </div>
      <div>
        <input
          type="text"
          value={idToCall}
          onChange={(e) => setIdToCall(e.target.value)}
          placeholder="Enter ID to call"
        />
        <button onClick={() => callUser(idToCall)}>Call User</button>
      </div>
      <div>
        {callAccepted && !callEnded && (
          <div>
            <button onClick={endCall}>End Call</button>
            <button onClick={toggleMute}>{isMuted ? 'Unmute' : 'Mute'}</button>
            <button onClick={switchCamera}>Switch Camera</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoCall;
