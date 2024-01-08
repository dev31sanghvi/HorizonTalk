import React ,{useCallback, useEffect} from "react";
import { useSocket } from "../context/SocketProvider";


const RoomPage=()=>{

    const socket=useSocket();
const  handleUserJoined =useCallback(({email,id})=>{

    console.log(`Email ${email} joined the room`);

},[])
    useEffect(()=>{
        socket.on("user:joined",handleUserJoined);
    },[]);
    return (
        <div>
            <h1>Room</h1>
        </div>
    )
};
export default RoomPage;