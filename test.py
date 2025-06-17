import requests
import json

url = "http://127.0.0.1:5000/chat"
headers = {"Content-Type": "application/json"}
data = {"prompt": "고양이에 대해 알려줘"}

response = requests.post(url, headers=headers, json=data)

# 한글 응답 보기 좋게 출력
print(json.dumps(response.json(), ensure_ascii=False, indent=2))

