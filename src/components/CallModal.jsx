import { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketContext";
import UserAvatar from "./UserAvatar";

export default function CallModal({ call, setCall }) {
  const { sendCallSignal, socket } = useSocket();

  const [accepted, setAccepted] = useState(false);
  const [status, setStatus] = useState("connecting"); // connecting | ringing | connected

  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const peer = useRef(null);
  const localStream = useRef(null);
  const pendingCandidates = useRef([]);
  const connectedAt = useRef(null);

  const otherUser = call?.incoming ? call?.from : call?.receiver;

  useEffect(() => {
    setAccepted(!call?.incoming);
    setStatus(call?.incoming ? "ringing" : "connecting");
    pendingCandidates.current = [];
    connectedAt.current = null;
  }, [call]);

  useEffect(() => {
    if (!call || !accepted) return;
    let cancelled = false;

    const start = async () => {
      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video: call.video ? { width: 640, height: 480 } : false,
          });
        } catch (err) {
          console.log("MEDIA ERROR", err);
          stream = new MediaStream();
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStream.current = stream;
        if (localVideo.current) localVideo.current.srcObject = stream;

        peer.current = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });

        stream.getTracks().forEach((track) => peer.current.addTrack(track, stream));

        peer.current.ontrack = (event) => {
          if (remoteVideo.current) remoteVideo.current.srcObject = event.streams[0];
          setStatus("connected");
          if (!connectedAt.current) connectedAt.current = Date.now();
        };

        peer.current.onconnectionstatechange = () => {
          if (peer.current?.connectionState === "connected") {
            setStatus("connected");
            if (!connectedAt.current) connectedAt.current = Date.now();
          }
        };

        peer.current.onicecandidate = (event) => {
          if (event.candidate) {
            sendCallSignal("ice_candidate", { to: otherUser, candidate: event.candidate });
          }
        };

        if (call.incoming) {
          await peer.current.setRemoteDescription(call.offer);
          for (const c of pendingCandidates.current) {
            try {
              await peer.current.addIceCandidate(c);
            } catch {
              /* ignore */
            }
          }
          pendingCandidates.current = [];

          const answer = await peer.current.createAnswer();
          await peer.current.setLocalDescription(answer);
          sendCallSignal("call_answer", { to: call.from, answer });
        } else {
          const offer = await peer.current.createOffer();
          await peer.current.setLocalDescription(offer);
          sendCallSignal("call_offer", { to: call.receiver, offer, video: call.video });
        }
      } catch (error) {
        console.log("CALL ERROR", error);
      }
    };

    start();

    return () => {
      cancelled = true;
      localStream.current?.getTracks()?.forEach((track) => track.stop());
      peer.current?.close();
      peer.current = null;
      localStream.current = null;
    };
  }, [call, accepted]);

  useEffect(() => {
    if (!socket || !call || !accepted) return;

    const handleAnswer = async ({ answer }) => {
      if (!peer.current || peer.current.currentRemoteDescription) return;
      try {
        await peer.current.setRemoteDescription(answer);
        for (const c of pendingCandidates.current) {
          try {
            await peer.current.addIceCandidate(c);
          } catch {
            /* ignore */
          }
        }
        pendingCandidates.current = [];
        setStatus("connected");
        if (!connectedAt.current) connectedAt.current = Date.now();
      } catch (err) {
        console.log("SET REMOTE DESC ERROR", err);
      }
    };

    const handleIce = async ({ candidate }) => {
      if (!candidate) return;
      if (peer.current?.remoteDescription?.type) {
        try {
          await peer.current.addIceCandidate(candidate);
        } catch {
          /* ignore */
        }
      } else {
        pendingCandidates.current.push(candidate);
      }
    };

    const handleEndCall = () => {
      setCall(null);
    };

    socket.on("call_answer", handleAnswer);
    socket.on("ice_candidate", handleIce);
    socket.on("end_call", handleEndCall);

    return () => {
      socket.off("call_answer", handleAnswer);
      socket.off("ice_candidate", handleIce);
      socket.off("end_call", handleEndCall);
    };
  }, [socket, call, accepted]);

  if (!call) return null;

  const handleHangup = () => {
    sendCallSignal("end_call", { to: otherUser });
    setCall(null);
  };

  const handleDecline = () => {
    sendCallSignal("call_declined", { to: call.from });
    setCall(null);
  };

  if (call.incoming && !accepted) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-4">
        <div className="bg-gray-900 rounded-2xl p-8 w-[340px] text-center shadow-xl">
          <UserAvatar username={call.from} size="xl" className="mx-auto mb-4" />
          <p className="text-gray-400 text-sm mb-1">
            {call.video ? "Incoming video call" : "Incoming voice call"}
          </p>
          <h2 className="text-white text-xl font-semibold mb-8">{call.from}</h2>
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={handleDecline}
              className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center text-2xl transition-colors"
              title="Decline"
            >
              ✕
            </button>
            <button
              onClick={() => setAccepted(true)}
              className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center text-2xl transition-colors"
              title="Accept"
            >
              ✓
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center px-4">
      <div className="bg-gray-900 rounded-2xl p-6 w-[360px] text-center shadow-xl">
        <h2 className="text-white text-xl mb-1">
          {call.video ? "📹" : "📞"} {otherUser}
        </h2>
        <p className="text-gray-400 text-xs mb-5">
          {status === "connected" ? "Connected" : call.incoming ? "Connecting..." : "Calling..."}
        </p>

        {call.video && (
          <video
            ref={localVideo}
            autoPlay
            muted
            playsInline
            className="w-full rounded-lg mb-3 bg-black"
          />
        )}
        <video ref={remoteVideo} autoPlay playsInline className="w-full rounded-lg bg-black" />

        <button
          onClick={handleHangup}
          className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-full mt-5"
        >
          End Call
        </button>
      </div>
    </div>
  );
}
