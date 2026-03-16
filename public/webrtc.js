// WebRTC Video Streaming Module
// Enables peer-to-peer video streaming between users

const WebRTCManager = (function() {
  let localStream = null;
  let peerConnections = new Map();
  let roomId = null;
  let isStreaming = false;
  
  const config = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  async function startCamera(constraints = { video: true, audio: true }) {
    try {
      localStream = await navigator.mediaDevices.getUserMedia(constraints);
      isStreaming = true;
      console.log('Camera started successfully');
      return localStream;
    } catch (error) {
      console.error('Camera access error:', error);
      throw error;
    }
  }

  function stopCamera() {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }
    isStreaming = false;
  }

  async function createPeerConnection(peerId) {
    const pc = new RTCPeerConnection(config);
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(peerId, {
          type: 'ice-candidate',
          candidate: event.candidate
        });
      }
    };
    
    pc.ontrack = (event) => {
      console.log('Received remote stream');
      if (window.onRemoteStream) {
        window.onRemoteStream(peerId, event.streams[0]);
      }
    };
    
    pc.onconnectionstatechange = () => {
      console.log('Connection state:', pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        removePeerConnection(peerId);
      }
    };
    
    // Add local stream tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }
    
    peerConnections.set(peerId, pc);
    return pc;
  }

  async function callPeer(peerId) {
    const pc = peerConnections.get(peerId) || await createPeerConnection(peerId);
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    sendSignal(peerId, {
      type: 'offer',
      sdp: pc.localDescription
    });
  }

  async function handleSignal(peerId, signal) {
    let pc = peerConnections.get(peerId);
    
    if (!pc && signal.type === 'offer') {
      pc = await createPeerConnection(peerId);
    }
    
    if (!pc) return;
    
    switch (signal.type) {
      case 'offer':
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal(peerId, {
          type: 'answer',
          sdp: pc.localDescription
        });
        break;
        
      case 'answer':
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        break;
        
      case 'ice-candidate':
        if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
        break;
    }
  }

  function sendSignal(peerId, signal) {
    if (window.WebRTC_SIGNAL_CALLBACK) {
      window.WebRTC_SIGNAL_CALLBACK(peerId, signal);
    }
  }

  function removePeerConnection(peerId) {
    const pc = peerConnections.get(peerId);
    if (pc) {
      pc.close();
      peerConnections.delete(peerId);
    }
  }

  function getLocalStream() {
    return localStream;
  }

  function getPeerConnections() {
    return peerConnections;
  }

  async function joinRoom(id) {
    roomId = id;
    
    // Notify server
    try {
      await fetch('/api/webrtc/room/' + id, { method: 'GET' });
    } catch (e) {
      console.error('Room join error:', e);
    }
  }

  async function leaveRoom() {
    if (roomId) {
      try {
        await fetch('/api/webrtc/room/' + roomId, { 
          method: 'POST',
          body: JSON.stringify({ action: 'leave' })
        });
      } catch (e) {}
    }
    
    peerConnections.forEach((pc, peerId) => removePeerConnection(peerId));
    roomId = null;
  }

  function isActive() {
    return isStreaming;
  }

  // Screen sharing
  async function startScreenShare() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });
      
      // Replace video track in all peer connections
      const videoTrack = screenStream.getVideoTracks()[0];
      
      peerConnections.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });
      
      videoTrack.onended = () => {
        stopScreenShare();
      };
      
      return screenStream;
    } catch (error) {
      console.error('Screen share error:', error);
      throw error;
    }
  }

  async function stopScreenShare() {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        peerConnections.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });
      }
    }
  }

  return {
    startCamera,
    stopCamera,
    createPeerConnection,
    callPeer,
    handleSignal,
    removePeerConnection,
    getLocalStream,
    getPeerConnections,
    joinRoom,
    leaveRoom,
    isActive,
    startScreenShare,
    stopScreenShare
  };
})();

// Export to global scope
window.WebRTCManager = WebRTCManager;
