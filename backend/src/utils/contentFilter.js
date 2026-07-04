// A small, illustrative keyword filter. In production this would be a
// proper moderation service/library. Kept intentionally simple for this
// exercise: it flags messages for admin review but does NOT block
// submission outright (moderation happens downstream via the admin tools).
const FLAGGED_KEYWORDS = ['spam', 'stupid', 'idiot', 'hate'];

function shouldFlag(message) {
  const lower = message.toLowerCase();
  return FLAGGED_KEYWORDS.some((word) => lower.includes(word));
}

module.exports = { shouldFlag };
