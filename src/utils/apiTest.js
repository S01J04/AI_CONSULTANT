// This is a test file to verify if the backend API can handle chat_history
// You can run this file with Node.js to test the API

async function testChatAPI() {
  const userId = "test-user-id"; // Replace with a valid user ID for testing
  const message = "Hello, how are you?";
  
  // Sample chat history
  const chatHistory = [
    {
      role: "system",
      content: "You are an AI health consultant providing guidance on health and wellness topics."
    },
    {
      role: "user",
      content: "I've been having headaches lately."
    },
    {
      role: "assistant",
      content: "I'm sorry to hear that. How long have you been experiencing these headaches?"
    },
    {
      role: "user",
      content: message
    }
  ];
  
  try {
    // Replace with your actual API endpoint
    const apiUrl = process.env.VITE_openAIKey + "/chat/text";
    
    console.log("Testing API with chat history...");
    console.log("API URL:", apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        message: message,
        chat_history: chatHistory
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Server responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log("API Response:", data);
    console.log("Test successful!");
    
    return data;
  } catch (error) {
    console.error("API Test Error:", error);
    
    // Try without chat_history if the first attempt fails
    console.log("Retrying without chat_history...");
    
    try {
      const apiUrl = process.env.VITE_openAIKey + "/chat/text";
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          message: message
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Server responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("API Response without chat_history:", data);
      console.log("Test without chat_history successful!");
      
      return data;
    } catch (secondError) {
      console.error("Second API Test Error:", secondError);
    }
  }
}

// Uncomment to run the test
// testChatAPI();

export { testChatAPI };
