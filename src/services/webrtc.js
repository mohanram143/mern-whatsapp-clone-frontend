let peerConnection = null;
let localStream = null;

const servers = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
  ],
};

export async function createPeer() {
  peerConnection = new RTCPeerConnection(servers);

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      window.__socket.emit("ice_candidate", event.candidate);
    }
  };

  return peerConnection;
}

export async function getMedia(video = false) {
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,

    video: video,
  });

  return localStream;
}

export function getLocalStream() {
  return localStream;
}

export function getPeer() {
  return peerConnection;
}
