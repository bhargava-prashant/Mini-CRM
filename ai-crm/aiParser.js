const axios = require('axios');
require("dotenv").config();

async function interpretQuery(prompt) {
  try {
    const systemMessage = `
You are a CRM AI assistant. Convert natural language into structured intent.

1. For segment queries like "People who haven't ordered in 6 months and spent over ₹5K", respond:
{ "type": "segment", "query": { "$and": [{ "lastOrdered": { "$lt": "TIME_THRESHOLD" } }, { "totalSpent": { "$gt": 5000 } }] } }

2. For campaign summaries like "Give me detail of campaign testing", respond:
{ "type": "campaign", "campaignName": "testing" }

IMPORTANT: 
- Use exact field names from the database: "lastOrdered" (not "last_order_date"), "totalSpent" (not "total_spend")
- For time expressions like "X months", calculate the exact timestamp and put it as a date string
- Use actual numbers for values (e.g., use 5000 not "5000")
- Provide only valid JSON (no JavaScript functions or constructors)

For time calculations:
- "6 months" = 180 days ago
- "3 months" = 90 days ago
- "1 month" = 30 days ago

Respond only in valid JSON.
    `.trim();

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama3-70b-8192',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let reply = response.data.choices[0].message.content;
    console.log('Raw AI response:', reply);

    // Remove any non-JSON artifacts (like markdown code blocks)
    reply = reply.replace(/```json|```|\\/g, '').trim();
    
    try {
      // Parse the JSON
      const parsedData = JSON.parse(reply);
      
      // Replace time placeholders with actual Date objects
      if (parsedData.type === "segment" && parsedData.query) {
        // Function to recursively process query object
        function processQueryObject(obj) {
          for (const key in obj) {
            if (typeof obj[key] === 'object' && obj[key] !== null) {
              processQueryObject(obj[key]);
            } else if (obj[key] === "TIME_THRESHOLD") {
              // Calculate 6 months ago as default
              const sixMonthsAgo = new Date();
              sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
              obj[key] = sixMonthsAgo.toISOString();
            }
          }
        }
        
        processQueryObject(parsedData.query);
      }
      
      console.log('Processed AI response:', JSON.stringify(parsedData));
      return parsedData;
    } catch (parseError) {
      console.error("JSON parse error:", parseError.message);
      
      // Try to extract JSON from the response if parsing fails
      const jsonMatch = reply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extractedJson = JSON.parse(jsonMatch[0]);
          return extractedJson;
        } catch (e) {
          throw new Error(`Could not extract valid JSON: ${e.message}`);
        }
      }
      
      throw new Error(`Invalid JSON format: ${parseError.message}`);
    }
    
  } catch (error) {
    console.error("Error interpreting query:", error.message);
    throw new Error("Failed to interpret AI response");
  }
}

module.exports = interpretQuery;