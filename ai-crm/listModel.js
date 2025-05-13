const axios = require('axios');

const listModels = async () => {
  try {
    const response = await axios.get('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: {
        'Authorization': `AIzaSyACuqFk9-FjuUVxu1CEqsxmdmeqNBaafaE`, 
      }
    });

    console.log(response.data);
  } catch (error) {
    console.error('Error fetching models:', error);
  }
};

listModels();
