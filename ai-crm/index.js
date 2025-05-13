const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB first
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

// Import models - MUST come after mongoose connection but before using them
const User = require("./models/User");
const Campaign = require("./models/Campaign");

// Now import services that use the models
const interpretQuery = require("./aiParser");
const summarizeCampaignPerformance = require("./summarizeCampaign");

app.post("/ai-query", async (req, res) => {
  const { prompt } = req.body;

  try {
    const result = await interpretQuery(prompt);
    console.log("Processed query result:", JSON.stringify(result));

    if (result.type === "segment") {
      // Execute the query against MongoDB
      const users = await User.find(result.query);
      console.log(`Found ${users.length} matching users`);
      
      // Generate a conversational response
      let conversationalResponse = "";
      
      if (users.length === 0) {
        conversationalResponse = `I found no customers who match the criteria: "${prompt}". This could be because no customers meet both conditions or there might be an issue with the date range.`;
      } else if (users.length === 1) {
        conversationalResponse = `I found 1 customer who hasn't ordered in 6 months and spent over ₹5K: ${users[0].name} (Total spend: ₹${users[0].totalSpent}).`;
      } else {
        conversationalResponse = `I found ${users.length} customers who haven't ordered in 6 months and spent over ₹5K. Top spenders include: ${users.slice(0, 3).map(u => `${u.name} (₹${u.totalSpent})`).join(', ')}${users.length > 3 ? '...' : ''}`;
      }
      
      return res.json({ 
        type: "segment", 
        query: result.query, 
        matchedUsers: users,
        count: users.length,
        conversationalResponse
      });
    }

    if (result.type === "campaign") {
      // Find the campaign by name
      const campaign = await Campaign.findOne({ 
        name: { $regex: new RegExp(result.campaignName, "i") } 
      });
      
      if (!campaign) {
        return res.status(404).json({ 
          error: `Campaign '${result.campaignName}' not found`,
          conversationalResponse: `I couldn't find a campaign named "${result.campaignName}". Please check if the campaign name is correct.`
        });
      }

      // Get users for the campaign summary
      const users = await User.find().limit(50);  // Limit to 50 users for performance
      
      const summary = await summarizeCampaignPerformance(campaign, users);
      
      return res.json({ 
        type: "campaign", 
        campaign: campaign.name, 
        summary,
        stats: {
          audienceSize: campaign.audienceSize,
          sentCount: campaign.sentCount,
          failedCount: campaign.failedCount,
          status: campaign.status
        }
      });
    }

    res.status(400).json({ error: "Unrecognized query type" });
  } catch (err) {
    console.error("Error processing AI query:", err.message);
    res.status(500).json({ 
      error: "Failed to process AI prompt", 
      details: err.message,
      conversationalResponse: `I'm sorry, I had trouble understanding that request. Could you please rephrase it?`
    });
  }
});

// Add a simple health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));