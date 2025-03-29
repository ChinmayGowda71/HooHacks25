const axios = require("axios");
const { parse } = require("node-html-parser");
const fs = require('fs');

// insert openai key into a file named openai-key.txt
var openai_key = "";

try {
    openai_key = fs.readFileSync('openai-key.txt', 'utf8').trim(); // trim() removes extra spaces/newlines
} catch (error) {
    console.error('Error reading the OpenAI key file:', error);
}

async function urlToBase64(imageUrl) {
    try {
        const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
        const base64 = Buffer.from(response.data, "binary").toString("base64");
        return `data:image/jpeg;base64,${base64}`; // Adjust MIME type if needed
    } catch (error) {
        console.error("Error fetching image:", error);
        throw new Error("Failed to convert image URL to Base64");
    }
}

async function analyzeTest(promptText, exclusionList) {
    /* resulting JSON formatted as such:
        {'sections': [
            {'text': 'abc'},
            {'text': 'dcfe'},
            {'text': 'what'}           
        ]}
    */
    try {
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o",
                response_format: { type: "json_object" },
                messages: [{ role: "system", content: `For the following website HTML, return a JSON object of user-visible text objects. 
                    The text should be separated into individual sections based upon related topics, returning the original text split into sections. 
                    If these 'sections' are split over multiple <p> or <header> tags return each of the tags with text included as a separate section. 
                    Only include the sections related to the exclusion list attached. DO NOT SUMMARIZE OR OTHERWISE MODIFY THE PROVIDED TEXT. 
                    Return the split objects in a JSON Object list format with list titled 'sections' and each section containing a variable called 'text' without any others.`}, // edit based how input text is separated
                    { role: "user", content: "Exclusion List: " + exclusionList},
                    { role: "user", content: "Text:" + promptText }]
            },
            {
                headers: {
                    "Authorization": `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        // Extracts only the text response from OpenAI's completion
        const resultText = response.data.choices[0]?.message?.content || "No response";
        return resultText;
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
        return "Error processing the request.";
    }
}

async function analyzeImage(imageURLsnippet, exclusionList, baseURL = "") {
    try {
        var imageURL = baseURL + imageURLsnippet
        const base64Image = await urlToBase64(imageUrl);
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Does this image have to do with anything with any of the items on the following exclusion list? Return the exact text 'true' or 'false'." + exclusionList},
                            { type: "image_url", image_url: { url: base64Image, detail: "low" }}
                        ],
                    },
                ],
            },
            {
                headers: {
                    "Authorization": `Bearer ${OPENAI_API_KEY}`,
                    "Content-Type": "application/json"
                }
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error("Error processing image:", error.response?.data || error.message);
        return 'error';
    }
}