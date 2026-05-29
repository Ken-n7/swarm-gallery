// Input validation helpers shared across routes.

const USERNAME_MIN = 2;
const USERNAME_MAX = 32;

function validateUsername(value) {
  if (typeof value !== 'string') return 'Username required';
  const trimmed = value.trim();
  if (!trimmed) return 'Username required';
  if (trimmed.length < USERNAME_MIN) return `Username must be at least ${USERNAME_MIN} characters`;
  if (trimmed.length > USERNAME_MAX) return `Username must be ${USERNAME_MAX} characters or fewer`;
  return null; // valid
}

function validateEventName(value) {
  if (typeof value !== 'string') return null; // optional field — skip if missing
  const trimmed = value.trim();
  if (!trimmed) return 'Event name cannot be empty';
  if (trimmed.length > 80) return 'Event name must be 80 characters or fewer';
  return null;
}

function validateStorageWarning(value) {
  const n = Number(value);
  if (isNaN(n)) return null; // optional — skip if not provided
  if (n < 1 || n > 100) return 'Storage warning must be between 1 and 100';
  return null;
}

function validateExpectedGuests(value) {
  if (value === undefined || value === null || value === '') return null; // optional
  const n = Number(value);
  if (isNaN(n) || n < 0) return 'Expected guests must be a positive number';
  if (n > 100000) return 'Expected guests must be 100,000 or fewer';
  return null;
}

module.exports = {
  validateUsername,
  validateEventName,
  validateStorageWarning,
  validateExpectedGuests,
  USERNAME_MIN,
  USERNAME_MAX,
};
