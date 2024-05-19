// VideoCall.js
import React, { useRef, useEffect, useState } from 'react';
import io from 'socket.io-client';
import SimplePeer from 'simple-peer';

const socket = io.connect('http://localhost:5000');

const VideoCall = () => {
    const [stream, setStream] = useState(null);
    const [receivingCall, setReceivingCall] = useState(false);
    const [caller, setCaller] = useState('');
    const [callerSignal, setCallerSignal] = useState(null);
    const [callAccepted, setCallAccepted] = useState(false);
    const [idToCall, setIdToCall] = useState('');
    const [myId, setMyId] = useState('');
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

    return (
        <div>
            <div>
                Your Id is : {myId}
            </div>
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
        </div>
    );
};

export default VideoCall;
