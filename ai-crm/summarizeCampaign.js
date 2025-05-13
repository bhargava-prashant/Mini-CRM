const axios = require("axios");
require("dotenv").config();

async function summarizeCampaignPerformance(campaign, users) {
  // Format dates as readable strings
  const campaignCreated = new Date(campaign.createdAt).toLocaleDateString();
  
  const userSummaries = users.map(u => {
    const lastOrderedDate = u.lastOrdered ? new Date(u.lastOrdered).toLocaleDateString() : 'Never';
    return `Name: ${u.name}, TotalSpent: ₹${u.totalSpent || 0}, Orders: ${u.orderCount || 0}, LastOrdered: ${lastOrderedDate}`;
  }).join("\n");

  const prompt = `
Generate a human-readable summary of this campaign:

Campaign:
Name: ${campaign.name}
Audience Size: ${campaign.audienceSize || 0}
Sent: ${campaign.sentCount || 0}
Failed: ${campaign.failedCount || 0}
Status: ${campaign.status || 'unknown'}
Created: ${campaignCreated}

Users (Sample):
${userSummaries.length > 1000 ? userSummaries.substring(0, 1000) + "... (truncated)" : userSummaries}

Summarize key performance metrics and any notable patterns (e.g., delivery rates for high-spenders).
Focus on actionable insights based on the campaign data.
  `;

  const response = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama3-70b-8192',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return response.data.choices[0].message.content;
}

module.exports = summarizeCampaignPerformance;