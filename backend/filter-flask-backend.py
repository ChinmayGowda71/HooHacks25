import os, json, base64, openai, requests
from flask import Flask, request, jsonify

app = Flask(__name__)

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
openai.api_key = OPENAI_KEY

# Endpoint to analyze a single text section (GET request)
@app.route('/analyze-text-section', methods=['GET'])
def analyze_text_section():
    """
    Query Parameters:
      - text: The text to analyze
      - exclusionList: The list of exclusions (comma-separated)
    Returns: JSON response with 'true' or 'false'.
    """
    text = request.args.get('text')
    exclusion_list = request.args.get('exclusionList')

    if not text or not exclusion_list:
        return jsonify({"error": "Missing required parameters"}), 400

    try:
        response = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": """Return 'true' if the text relates to any exclusion list phrases, otherwise return 'false'. 
                Only return 'true' or 'false'."""},
                {"role": "user", "content": f"Exclusion List: {exclusion_list}"},
                {"role": "user", "content": f"Text: {text}"}
            ]
        )
        result_text = response["choices"][0]["message"]["content"]
        return jsonify({"result": result_text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Endpoint to analyze larger blocks of text and return JSON sections (GET request)
@app.route('/analyze-text', methods=['GET'])
def analyze_text():
    """
    Query Parameters:
      - promptText: The HTML/text to analyze
      - exclusionList: The exclusion criteria list (comma-separated)
    Returns: JSON object with extracted text sections.
    """
    prompt_text = request.args.get('promptText')
    exclusion_list = request.args.get('exclusionList')

    if not prompt_text or not exclusion_list:
        return jsonify({"error": "Missing required parameters"}), 400

    try:
        response = openai.ChatCompletion.create(
            model="gpt-4o",
            response_format="json",
            messages=[
                {"role": "system", "content": 
                    """Extract user-visible text from the provided HTML and split it into logical sections. 
                    Each section should preserve the original text and structure without modifications. 
                    "eturn sections related to the exclusion list in JSON format with a list named 'sections', each containing a 'text' field."""
                },
                {"role": "user", "content": f"Exclusion List: {exclusion_list}"},
                {"role": "user", "content": f"Text: {prompt_text}"}
            ]
        )
        result_text = response["choices"][0]["message"]["content"]
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
        response = requests.get(image_url)
        if response.status_code != 200:
            raise Exception(f"Failed to fetch image. Status code: {response.status_code}")
        encoded = base64.b64encode(response.content).decode('utf-8')
        return f"data:image/jpeg;base64,{encoded}"
    except Exception as e:
        raise Exception(f"Failed to convert image URL to Base64: {e}")

# Endpoint to analyze an image based on exclusion list (GET request)
@app.route('/analyze-image', methods=['GET'])
def analyze_image():
    """
    Query Parameters:
      - imageURLsnippet: The relative URL or snippet of the image URL
      - exclusionList: The exclusion list to check against (comma-separated)
      - baseURL: (optional) a base URL to prepend to imageURLsnippet
    Returns: JSON with 'true' or 'false' from image analysis.
    """
    image_snippet = request.args.get('imageURLsnippet')
    exclusion_list = request.args.get('exclusionList')
    base_url = request.args.get('baseURL', "")

    if not image_snippet or not exclusion_list:
        return jsonify({"error": "Missing required parameters"}), 400

    image_url = base_url + image_snippet

    try:
        base64_image = url_to_base64(image_url)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    try:
        response = openai.ChatCompletion.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": f"Does this image relate to any items on the exclusion list? Return 'true' or 'false'. {exclusion_list}"},
                        {"type": "image_url", "image_url": {"url": base64_image, "detail": "low"}}
                    ]
                }
            ]
        )
        result_text = response["choices"][0]["message"]["content"]
        return jsonify({"result": result_text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)