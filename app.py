from flask import Flask, request, jsonify
import requests

app = Flask(__name__)

API_KEY = "AIzaSyDcknBVVktak6AlVJWWfaIX9uRT3GfcwjM"

url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    prompt = data.get("prompt", "")

    response = requests.post(
        url,
        headers={"Content-Type": "application/json"},
        params={"key": API_KEY},
        json={
            "contents": [{"parts": [{"text": prompt}]}]
        }
    )

    result = response.json()

    try:
        message = result["candidates"][0]["content"]["parts"][0]["text"]
        return jsonify({"response": message})
    except Exception as e:
        return jsonify({"error": str(e), "raw": result})

if __name__ == "__main__":
    app.run(debug=True)


