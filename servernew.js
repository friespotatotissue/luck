const WebSocket = require('ws');
const crypto = require('crypto');

class Participant {
  constructor(id, name, color) {
    this.id = id;
    this._id = crypto.randomBytes(10).toString('hex');
    this.name = name || 'Anonymous';
    this.color = color || `#${Math.floor(Math.random()*16777215).toString(16)}`;
    this.room = null;
  }

  generateJSON() {
    return {
      _id: this._id,
      name: this.name,
      color: this.color
    };
  }

  updateUser(name) {
    this.name = name || 'Anonymous';
  }
}

class Room {
  constructor(name, count = 0, settings = {}) {
    this._id = name;
    this.count = count;
    this.settings = {
      chat: settings.chat !== undefined ? settings.chat : true,
      color: settings.color || '#3b5054',
      crownsolo: settings.crownsolo !== undefined ? settings.crownsolo : false,
      visible: settings.visible !== undefined ? settings.visible : true,
      lobby: name.toLowerCase().includes('lobby')
    };
    this.ppl = [];
    this.chat = { messages: [] };
    this.crown = null;
  }

  newParticipant(participant) {
    this.count++;
    const participantRoom = {
      id: crypto.randomBytes(10).toString('hex'),
      name: participant.name,
      color: participant.color,
      _id: participant._id
    };
    this.ppl.push(participantRoom);
    return participantRoom;
  }

  findParticipant(_id) {
    return this.ppl.find(p => p._id === _id);
  }

  removeParticipant(_id) {
    const index = this.ppl.findIndex(p => p._id === _id);
    if (index !== -1) {
      this.ppl.splice(index, 1);
      this.count--;
    }
  }

  generateJSON() {
    return {
      _id: this._id,
      settings: this.settings,
      count: this.count
    };
  }
}

class Server {
  constructor(port = 8080) {
    this.wss = new WebSocket.Server({ port });
    this.participants = new Map();
    this.rooms = new Map();

    console.log(`Server launched on port ${port}`);

    this.wss.on('connection', (ws) => {
      const socketId = crypto.randomBytes(10).toString('hex');
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(socketId, ws, data);
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(socketId);
      });
    });
  }

  handleMessage(socketId, ws, data) {
    switch(data.m) {
      case 'hi':
        this.handleHi(socketId, ws);
        break;
      case 'ch':
        this.handleChannelJoin(socketId, ws, data);
        break;
      case 'a':
        this.handleChat(socketId, data);
        break;
      case 't':
        this.handleTime(ws, data);
        break;
    }
  }

  handleHi(socketId, ws) {
    const participant = new Participant(socketId);
    this.participants.set(socketId, participant);
    
    ws.send(JSON.stringify({
      m: 'hi',
      u: participant.generateJSON(),
      t: Date.now()
    }));
  }

  handleChannelJoin(socketId, ws, data) {
    const participant = this.participants.get(socketId);
    if (!participant) return;

    // Leave previous room
    if (participant.room) {
      const oldRoom = this.rooms.get(participant.room);
      if (oldRoom) oldRoom.removeParticipant(participant._id);
    }

    // Join or create new room
    let room = this.rooms.get(data._id);
    if (!room) {
      room = new Room(data._id, 0, data.set);
      this.rooms.set(data._id, room);
    }

    const participantRoom = room.newParticipant(participant);
    participant.room = data._id;

    ws.send(JSON.stringify({
      m: 'ch',
      ch: room.generateJSON(),
      p: participantRoom.id,
      ppl: room.ppl
    }));
  }

  handleChat(socketId, data) {
    const participant = this.participants.get(socketId);
    const room = this.rooms.get(participant.room);
    
    if (!room) return;

    const chatMessage = {
      m: 'a',
      p: room.findParticipant(participant._id),
      a: data.message
    };

    room.chat.messages.push(chatMessage);
    // Broadcast to room participants
  }

  handleTime(ws, data) {
    ws.send(JSON.stringify({
      m: 't',
      t: Date.now(),
      echo: data.e - Date.now()
    }));
  }

  handleDisconnect(socketId) {
    const participant = this.participants.get(socketId);
    if (!participant || !participant.room) return;

    const room = this.rooms.get(participant.room);
    if (room) room.removeParticipant(participant._id);

    this.participants.delete(socketId);
  }
}

module.exports = Server;

// Uncomment to run directly
// new Server(); 