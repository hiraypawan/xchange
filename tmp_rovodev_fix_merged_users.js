// Script to fix merged user accounts in MongoDB
// Run this script in MongoDB Compass or mongo shell

// The problematic record has:
// username: "w3b_gen_✪" 
// displayName: "Pawan Hiray "

// This suggests two users got merged:
// 1. W3b_gen (username: w3b_gen_✪)
// 2. Pawan Hiray (displayName: Pawan Hiray)

// To fix this, we need to:
// 1. Keep the original record for one user
// 2. Create a separate record for the other user
// 3. Ensure each has unique twitterId

// First, let's examine the merged record:
db.users.findOne({
  username: "w3b_gen_✪",
  displayName: "Pawan Hiray "
});

// If this user should be split into two:
// Option 1: Keep as W3b_gen user, create new Pawan Hiray user
/*
// Update the existing record to be just W3b_gen
db.users.updateOne(
  { _id: ObjectId("6919bbf5befbe0ca35ad3fb7") },
  {
    $set: {
      displayName: "W3b_gen",
      username: "w3b_gen_✪",
      // Keep other fields as is
    }
  }
);

// Create new user for Pawan Hiray (you'll need to provide a unique twitterId)
db.users.insertOne({
  twitterId: "UNIQUE_TWITTER_ID_FOR_PAWAN", // Replace with actual twitterId
  username: "pawan_hiray",
  displayName: "Pawan Hiray",
  avatar: "https://pbs.twimg.com/profile_images/1945767646315634688/MFg53Sf2_norm…",
  email: null,
  credits: 2,
  totalEarned: 0,
  totalSpent: 0,
  joinedAt: new Date(),
  lastActive: new Date(),
  isActive: true,
  settings: {
    autoEngage: false,
    maxEngagementsPerDay: 50,
    emailNotifications: true,
    pushNotifications: true,
    privacy: "public"
  },
  stats: {
    totalEngagements: 0,
    successRate: 0,
    averageEarningsPerDay: 0,
    streakDays: 0,
    rank: 0
  }
});
*/

console.log("Manual intervention required - please update with correct Twitter IDs");