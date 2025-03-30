import os, json, base64, openai, requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.config['CACHE_TYPE'] = 'simple'

# Load OpenAI API Key from file
OPENAI_KEY_FILE = 'openai-key.txt'
if not os.path.exists(OPENAI_KEY_FILE):
    raise Exception(f"Missing OpenAI key file: {OPENAI_KEY_FILE}")

try:
    with open(OPENAI_KEY_FILE, 'r') as f:
        OPENAI_KEY = f.read().strip()
except Exception as e:
    raise Exception(f"Error reading the OpenAI key file: {e}")

# Initialize OpenAI client

client = OpenAI(
    api_key=OPENAI_KEY,
)

# Endpoint to analyze a single text section (GET request)
@app.route('/analyze-text-section', methods=['POST'])
def analyze_text_section():
    """
    Query Parameters:
      - text: The text to analyze
      - exclusionList: The list of exclusions (comma-separated)
    Returns: JSON response with 'true' or 'false'.
    """
    data = request.get_json()
    text = data['text']
    exclusion_list = data['exclusionList']

    if not text or not exclusion_list:
        return jsonify({"error": "Missing required parameters"}), 400

    try:
        response = client.responses.create(
            model="gpt-4o-mini",
            instructions=f"""
            Analyze this text carefully for any mention, description, or reference to the specific fears or exclusions stated by the user.
            
            User statement: {exclusion_list}
            
            Instructions:
            1. Extract key terms/concepts the user wants to avoid (e.g., "snakes", "heights", "spiders")
            2. Scan the text for ANY mention of these terms or closely related concepts
            3. Return "true" if you detect ANY match, including:
               - Direct mentions (e.g., "snake")
               - Related terms (e.g., "serpent", "python", "cobra")
               - Metaphorical references (e.g., "slithered like a snake")
               - Implicit descriptions that clearly evoke the feared object/concept
            4. Return "false" ONLY if you are confident the text contains none of the specified elements
            
            Examples:
            - If user states "I'm scared of snakes" and text mentions reptiles, serpents, or snake-like behaviors → return "true"
            - If user states "I don't like heights" and text describes tall buildings, falling, or looking down from elevations → return "true"
            - If user states "I'm afraid of spiders" and text mentions webs, arachnids, or eight-legged creatures → return "true"
            
            Err on the side of caution - if there's any doubt about whether the text contains excluded content, return "true".
            
            IMPORTANT: Return ONLY the word "true" or "false" with no additional text or explanation.
            """,
            input=f"User Prompt: {exclusion_list}, Text: {text}"
        )
        result_text = response.output_text
        return jsonify({"result": 'true' in result_text.lower()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Endpoint to analyze larger blocks of text and return JSON sections (GET request)
@app.route('/analyze-text', methods=['POST'])
def analyze_text():
    """
    Query Parameters:
      - promptText: The HTML/text to analyze
      - exclusionList: The exclusion criteria list (comma-separated)
    Returns: JSON object with extracted text sections.
    """
    data = request.get_json()
    prompt_text = data['promptText']
    exclusion_list = data['exclusionList']

    if not prompt_text or not exclusion_list:
        return jsonify({"error": "Missing required parameters"}), 400

    try:
        response = client.responses.create(
            model="gpt-4o-mini",
            instructions="""Extract user-visible text from the provided HTML and split it into logical sections. 
                    Each section should preserve the original text and structure without modifications. 
                    return sectionsthat could trigger any of the fears or exclusions mentioned in the user prompt with a list named 'sections', each containing a 'text' field.""",
            input=f"User Prompt: {exclusion_list}, Text: {prompt_text}"
        )
        result_text = response.output_text
        try:
            result_json = json.loads(result_text)
        except json.JSONDecodeError:
            result_json = {"error": "Invalid JSON response from OpenAI", "raw_response": result_text}
        return jsonify(result_json)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Helper function: Convert an image URL to a Base64 data URL
def url_to_base64(image_url):
    try:
        headers_sample = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",

            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-User": "?1",
            "Cache-Control": "max-age=0"
        }
        response = requests.get(image_url, headers=headers_sample)
        if response.status_code != 200:
            raise Exception(f"Failed to fetch image. Status code: {response.status_code}")
        encoded = base64.b64encode(response.content).decode('utf-8')
        return f"data:image/jpeg;base64,{encoded}"
    except Exception as e:
        raise Exception(f"Failed to convert image URL to Base64: {e}")

# Endpoint to analyze an image based on exclusion list (GET request)
# NOTE: images should be downsized to <500 px to minimize runtime
@app.route('/analyze-image', methods=['POST'])
def analyze_image():
    """
    Query Parameters:
      - imageURLsnippet: The relative URL or snippet of the image URL
      - exclusionList: The exclusion list to check against (comma-separated)
      - baseURL: (optional) a base URL to prepend to imageURLsnippet
    Returns: JSON with 'true' or 'false' from image analysis.
    """
    data = request.get_json()
    image_snippet = data['text']
    exclusion_list = data['exclusionList']

    if not image_snippet or not exclusion_list:
        return jsonify({"error": "Missing required parameters"}), 400

    image_url = image_snippet

    try:
        base64_image = url_to_base64(image_url)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    try:
        response = client.responses.create(
            model = "gpt-4o-mini",
            input = [{
                "role": "user",
                "content": [
                    {"type": "input_text", "text": f"""
                        Analyze this image carefully for any objects, elements, or scenes that match the specific fears or exclusions mentioned by the user.
                        
                        User prompt: {exclusion_list}
                        
                        Instructions:
                        1. Extract key objects/elements the user wants to avoid (e.g., "snakes", "heights", "spiders")
                        2. Thoroughly examine the image for ANY visual representation of these objects/elements
                        3. Return "true" if you detect ANY match, even partial or subtle representations
                        4. Return "false" ONLY if you are confident the image contains none of the specified elements
                        
                        Examples:
                        - If user states "I'm scared of snakes" and image shows any snake or snake-like object → return "true"
                        - If user states "I don't like heights" and image shows cliff edges, tall buildings, or aerial views → return "true"
                        - If user states "I'm afraid of spiders" and image shows any arachnid or web structure → return "true"
                        
                        Err on the side of caution - if there's any doubt about whether the image contains excluded content, return "true".

                        If you can't view the image or analyze the images directly, return "true".

                        The only words you can return are 'true' and 'false'
                         """},
                    {'type': 'input_image', 'image_url': base64_image, 'detail': 'low'}
                ]
            }])
        result_text = response.output_text
        print(result_text)
        return jsonify({"result": 'true' in result_text.lower()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)