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
    # This is the default and can be omitted
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
            instructions="""Return 'true' if the text contains content that could trigger any of the fears or exclusions 
            mentioned in the user prompt, 
            otherwise return 'false'. Only return 'true' or 'false.""",
            input=f"User Prompt: {exclusion_list}, Text: {text}"
        )
        result_text = response.output_text
        return jsonify({"result": result_text})
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
        #print(response)
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
    image_snippet = data['imageURLsnippet']
    exclusion_list = data['exclusionList']
    base_url = data['baseURL']

    if not image_snippet or not exclusion_list:
        return jsonify({"error": "Missing required parameters"}), 400

    image_url = base_url + image_snippet

    try:
        base64_image = url_to_base64(image_url)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    try:
        response = client.responses.create(
            model="gpt-4o-mini",
            instructions="""Could this image trigger trigger any of the fears or 
            exclusions mentioned in the user prompt? Return 'true' or 'false'. User Prompt: {exclusion_list}""",
            input=f"Image url: {base64_image}, Detail: low"
        )
        result_text = response.output_text
        return jsonify({"result": result_text.lower() in ['true']})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)