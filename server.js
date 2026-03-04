const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

// ── Room management ───────────────────────────────────
const rooms = {}; // { roomCode: { currentScenarioIndex, votes, voterIds, resultsRevealed, teacherSocketId, studentCount } }

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars (0/O, 1/I)
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  // Make sure it's unique
  if (rooms[code]) return generateRoomCode();
  return code;
}

// ── Socket.io ──────────────────────────────────────────
io.on("connection", (socket) => {
  let myRoom = null;
  let myRole = null;

  // Host creates a room
  socket.on("host:create", (callback) => {
    const code = generateRoomCode();
    rooms[code] = {
      currentScenarioIndex: null,
      votes: {},
      voterIds: {},
      resultsRevealed: {},
      teacherSocketId: socket.id,
      studentCount: 0,
    };
    myRoom = code;
    myRole = "teacher";
    socket.join(code);
    callback({ roomCode: code });
  });

  // Student joins a room
  socket.on("student:join", (code, callback) => {
    const upper = (code || "").toUpperCase().trim();
    if (!rooms[upper]) {
      callback({ error: "Room not found. Check the code and try again." });
      return;
    }
    myRoom = upper;
    myRole = "student";
    socket.join(upper);
    rooms[upper].studentCount++;

    // Tell teacher about new student count
    io.to(upper).emit("studentCount", rooms[upper].studentCount);

    // Send current state to this student
    const room = rooms[upper];
    if (room.currentScenarioIndex !== null) {
      socket.emit("scenarioChanged", {
        index: room.currentScenarioIndex,
        resultsRevealed: room.resultsRevealed[room.currentScenarioIndex] || false,
        votes: room.resultsRevealed[room.currentScenarioIndex] ? room.votes[room.currentScenarioIndex] : null,
      });
    }

    callback({ success: true, studentCount: rooms[upper].studentCount });
  });

  // Teacher selects a scenario
  socket.on("teacher:selectScenario", (index) => {
    if (!myRoom || !rooms[myRoom]) return;
    const room = rooms[myRoom];
    room.currentScenarioIndex = index;
    if (!room.votes[index]) {
      room.votes[index] = {};
      room.voterIds[index] = new Set();
      room.resultsRevealed[index] = false;
    }
    io.to(myRoom).emit("scenarioChanged", {
      index,
      votes: room.votes[index],
      resultsRevealed: room.resultsRevealed[index],
    });
  });

  // Student votes
  socket.on("student:vote", ({ scenarioIndex, category }) => {
    if (!myRoom || !rooms[myRoom]) return;
    const room = rooms[myRoom];
    if (scenarioIndex === null || scenarioIndex === undefined) return;
    if (!room.votes[scenarioIndex]) {
      room.votes[scenarioIndex] = {};
      room.voterIds[scenarioIndex] = new Set();
    }
    // Prevent double voting
    if (room.voterIds[scenarioIndex].has(socket.id)) return;
    room.voterIds[scenarioIndex].add(socket.id);

    room.votes[scenarioIndex][category] = (room.votes[scenarioIndex][category] || 0) + 1;

    // Confirm to this student
    socket.emit("votedConfirm", { category });

    // Update teacher with live votes
    io.to(myRoom).emit("votesUpdated", {
      scenarioIndex,
      votes: room.votes[scenarioIndex],
      totalVoters: room.voterIds[scenarioIndex].size,
    });
  });

  // Teacher reveals results
  socket.on("teacher:revealResults", (index) => {
    if (!myRoom || !rooms[myRoom]) return;
    rooms[myRoom].resultsRevealed[index] = true;
    io.to(myRoom).emit("resultsRevealed", {
      scenarioIndex: index,
      votes: rooms[myRoom].votes[index] || {},
    });
  });

  // Teacher clears votes
  socket.on("teacher:clearVotes", (index) => {
    if (!myRoom || !rooms[myRoom]) return;
    const room = rooms[myRoom];
    room.votes[index] = {};
    room.voterIds[index] = new Set();
    room.resultsRevealed[index] = false;
    io.to(myRoom).emit("votesCleared", { scenarioIndex: index });
  });

  // Disconnect
  socket.on("disconnect", () => {
    if (!myRoom || !rooms[myRoom]) return;

    if (myRole === "student") {
      rooms[myRoom].studentCount = Math.max(0, rooms[myRoom].studentCount - 1);
      io.to(myRoom).emit("studentCount", rooms[myRoom].studentCount);
    }

    if (myRole === "teacher") {
      // Notify students the host left
      io.to(myRoom).emit("hostDisconnected");
      delete rooms[myRoom];
    }
  });
});

// ── Start ──────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  const os = require("os");
  const interfaces = os.networkInterfaces();
  let localIP = "localhost";
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        localIP = iface.address;
        break;
      }
    }
  }
  console.log("");
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║     Dating Ethics Voting App is running!        ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  Open:  http://localhost:${PORT}                  ║`);
  console.log(`║  LAN:   http://${localIP}:${PORT}                 ║`);
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("");
  console.log("Press Ctrl+C to stop the server.");
});
