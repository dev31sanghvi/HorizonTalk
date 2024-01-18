import React, { useCallback, useEffect, useState } from "react";
import { useSocket } from "../context/SocketProvider";
// import ReactPlayer from "react-player";
import peer from "../service/peer";
import { Navigate } from "react-router-dom";
// import { useNavigate } from 'react-router-dom';

const RoomPage = () => {
  const socket = useSocket();
  // const navigate = useNavigate();
  // const [lobby, setLobby] = useState("");
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState();
  const [remoteStream, setremoteStream] = useState();
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  //function for starting screen sharing
  const startScreenSharing = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      // this is for user's screen
      const videoTrack = screenStream.getVideoTracks()[0];
      const audioTrack = myStream.getAudioTracks()[0];
      //to remove the existing audio track
      myStream.removeTrack(myStream.getVideoTracks()[0]);
      // this will add the video tracks that we got from myStream
      myStream.addTrack(videoTrack);

      // this will send the updated stream to peer
      sendStreams();

      // to display the user screen
      setMyStream(myStream);
      setIsScreenSharing(true);
    } catch (error) {
      console.error("Sorry ! Error Occured:", error);

    }
  };

  // function for stopping live Stream
  const stopScreenSharing = () => {
    // restoring video track from myStream
    const originalVideoTrack = myStream.getVideoTracks()[0];
  const screenStreamVideoTrack = myStream.getTracks()[0];
  myStream.removeTrack(screenStreamVideoTrack);
  myStream.addTrack(originalVideoTrack);


    // this will send the updated stream to peer
    sendStreams();

    setMyStream(myStream);
    setIsScreenSharing(false);


  };

  // function to end the call
  const endCall = () => {

    alert("Meeting has ended");
    //closing the peer connnection
    peer.peer.close();
    //stopping the local stream tracks
    myStream.getTracks().forEach((track) => track.stop());
    //for stopping the remote stream tracks
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
    }
    setRemoteSocketId(null);
    setMyStream(null);
    setremoteStream(null);
    setIsScreenSharing(false);

    console.log('Redirecting to the lobby');
    // navigate('/lobby');
  };

  // user joined function
  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined the room`);
    setRemoteSocketId(id);
  }, []);

  // handlecallUser function
  const handleCallUser = useCallback(async () => {
    //taking user media(this will make my stream on)
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    //creating an offer
    const offer = await peer.getOffer();
    //sending it to different user
    socket.emit("user:call", { to: remoteSocketId, offer });
    setMyStream(stream);
  }, [remoteSocketId, socket]);

  // function to handle incoming call
  const handleIncommingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);
      console.log(`Incoming Call`, from, offer);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]

  );

  const sendStreams = useCallback(() => {
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  }, [myStream])
  // function to accept call
  const handleCallAccepted = useCallback(
    ({ from, ans }) => {
      peer.setLocalDescription(ans);
      console.log("Call Accepted!");
      sendStreams();

    },
    [sendStreams]

  );

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  // negotiation (reconnecting the user)
  useEffect(() => {
    peer.peer.addEventListener('negotiationneeded', handleNegoNeeded);
    return () => {
      //deregistering
      peer.peer.removeEventListener('negotiationneeded', handleNegoNeeded);
    }
  }, [handleNegoNeeded]);

  //handling negotiation
  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  // handling negotiation final
  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  //remote Stream
  useEffect(() => {
    peer.peer.addEventListener("track", async ev => {
      // taking our own remote stream
      const remoteStream = ev.streams;
      console.log("Got Tracks");
      //streams are basically an array
      setremoteStream(remoteStream[0]);
    });
  }, [])

  //Audio mute button :
  const toggleAudioMute = () => {
    if (myStream) {
      const audioTracks = myStream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsAudioMuted(!isAudioMuted);
    }
  }



  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);

    //cleanup(deregistering)
    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [socket, handleUserJoined, handleIncommingCall, handleCallAccepted, handleNegoNeedIncomming, handleNegoNeedFinal]);


  return (
    <div>
      <h1>Room</h1>
      <h4>{remoteSocketId ? "Connected" : "No one in room"}</h4>
      {myStream && <button onClick={sendStreams}>Send stream</button>}
      {remoteSocketId && <button onClick={handleCallUser}>CALL</button>}
      {myStream && (
        <>

          {/* <h1>My video</h1>
          <ReactPlayer
            playing
            muted
            height="200px"
            width="300px"
            url={myStream}
          /> */}
          <h1>My video</h1>
          <video autoPlay muted ref={(ref) => (ref ? (ref.srcObject = myStream) : null)} />
          <button onClick={toggleAudioMute}>{isAudioMuted ? "Unmute" : "Mute"}</button>
          {/* screen sharing part */}
          {isScreenSharing ? (
            <button onClick={stopScreenSharing}>Stop Screen Sharing</button>
          ) : (
            <button onClick={startScreenSharing}>Start Screen Sharing</button>
          )}
           {remoteSocketId && <button onClick={endCall}>End Call</button>}
        </>
      )}
      {remoteStream && (
        <>

          {/* <h1>Remote Stream</h1>
          <ReactPlayer
            playing
            muted
            height="200px"
            width="300px"
            url={remoteStream}
          /> */}
          <h1>Remote Stream</h1>
          <video autoPlay muted ref={(ref) => (ref ? (ref.srcObject = remoteStream) : null)} />
          <audio autoPlay ref={(ref) => (ref ? (ref.srcObject = remoteStream) : null)} />
        </>
      )}
    </div>
  );
};
export default RoomPage;
