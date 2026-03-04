const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

// ── State ──────────────────────────────────────────────────
let currentScenarioIndex = null;
let votes = {};        // { scenarioIndex: { category: count } }
let voterIds = {};     // { scenarioIndex: Set of socket ids that voted }
let resultsRevealed = {};  // { scenarioIndex: boolean }
let connectedStudents = 0;

// ── Socket.io ──────────────────────────────────────────────
io.on("connection", (socket) => {
  const isTeacher = socket.handshake.query.role === "teacher";

  if (!isTeacher) {
    connectedStudents++;
    io.emit("studentCount", connectedStudents);
  }

  // Send current state on connect
  socket.emit("state", {
    currentScenarioIndex,
    votes: votes[currentScenarioIndex] || {},
    hasVoted: false,
    resultsRevealed: resultsRevealed[currentScenarioIndex] || false,
    studentCount: connectedStudents,
  });

  // Teacher selects a scenario
  socket.on("teacher:selectScenario", (index) => {
    currentScenarioIndex = index;
    if (!votes[index]) {
      votes[index] = {};
      voterIds[index] = new Set();
      resultsRevealed[index] = false;
    }
    io.emit("scenarioChanged", {
      index,
      votes: votes[index],
      resultsRevealed: resultsRevealed[index],
    });
  });

  // Student votes
  socket.on("student:vote", ({ scenarioIndex, category }) => {
    if (scenarioIndex === null || scenarioIndex === undefined) return;
    if (!votes[scenarioIndex]) {
      votes[scenarioIndex] = {};
      voterIds[scenarioIndex] = new Set();
    }
    // Prevent double voting
    if (voterIds[scenarioIndex].has(socket.id)) return;
    voterIds[scenarioIndex].add(socket.id);

    votes[scenarioIndex][category] = (votes[scenarioIndex][category] || 0) + 1;

    // Tell this student they voted
    socket.emit("votedConfirm", {
      category,
      votes: resultsRevealed[scenarioIndex] ? votes[scenarioIndex] : null,
    });

    // Update teacher with live votes
    io.emit("votesUpdated", {
      scenarioIndex,
      votes: votes[scenarioIndex],
      totalVoters: voterIds[scenarioIndex].size,
    });
  });

  // Teacher reveals results
  socket.on("teacher:revealResults", (index) => {
    resultsRevealed[index] = true;
    io.emit("resultsRevealed", {
      scenarioIndex: index,
      votes: votes[index] || {},
    });
  });

  // Teacher clears votes for current scenario
  socket.on("teacher:clearVotes", (index) => {
    votes[index] = {};
    voterIds[index] = new Set();
    resultsRevealed[index] = false;
    io.emit("votesCleared", { scenarioIndex: index });
  });

  socket.on("disconnect", () => {
    if (!isTeacher) {
      connectedStudents = Math.max(0, connectedStudents - 1);
      io.emit("studentCount", connectedStudents);
    }
  });
});

// ── Start ──────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  // Get local IP for sharing
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
  console.log(`║  Teacher view:  http://localhost:${PORT}/teacher  ║`);
  console.log(`║  Student view:  http://${localIP}:${PORT}        ║`);
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("");
  console.log("Share the student URL with your class.");
  console.log("Press Ctrl+C to stop the server.");
});
