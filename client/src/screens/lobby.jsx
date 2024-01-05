import React, { useCallback } from 'react'
import { useState } from 'react';
import { useSocket } from '../context/SocketProvider';
const LobbyScreen = () => {
    const [email, setEmail] = useState("");
    const [room, setRoom] = useState("");
    const socket = useSocket();

    console.log(socket);
    const handleSubmitForm = useCallback(
        (e) => {
          e.preventDefault();
          socket.emit("room:join", { email, room });
        },
        [email, room, socket]
      );

    return (
        <div>
            <h1>lobby</h1>
            <form onSubmit={handleSubmitForm}>
                <label htmlFor='email' >Email Id</label>
                <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} />
                <br />
                <label htmlFor='room' >Room Number</label>
                <input type="text" id="room" value={room} onChange={e => setRoom(e.target.value)} />
                <br />
                <button>
                    join
                </button>
            </form>
        </div>
    )
}

export default LobbyScreen;