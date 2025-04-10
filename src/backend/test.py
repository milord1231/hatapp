import requests

url = "http://m170rd.ru/api/notificate"  # Замени на реальный адрес, если не локально

# payload = {
#   "user_id": 3,
#   "count": 1,
#   "reason": "тест",
#   "action": "subtract",
#   "who_id": 1,
#   "hours": 100,
# }


payload = {
  "user_from": "1",
  "user_to": "2",
  "message": "клямбдср"
}


headers = {
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

print(f"Status code: {response.status_code}")
print("Ответ сервера:")
print(response.text)
