import requests

url = "http://m170rd.ru/api/kpd"  # Замени на реальный адрес, если не локально

payload = {
  "user_id": 3,
  "count": 1,
  "reason": "тест",
  "action": "subtract",
  "who_id": 1,
  "hours": 100,
}

headers = {
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

print(f"Status code: {response.status_code}")
print("Ответ сервера:")
print(response.text)
