// Shared in-memory tracking of connected registered users.
// socketId → userId | null  (null = visitor still on join screen)
const connectedSockets = new Map();
// Unique registered userIds currently online
const connectedUserIds = new Set();

function liveGuestCount() {
  return connectedUserIds.size;
}

module.exports = { connectedSockets, connectedUserIds, liveGuestCount };
