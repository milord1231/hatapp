import requests

url = "http://localhost:5000/api/notificate"  # Замени на реальный адрес, если не локально

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
  "user_to": "1",
  "message": "Ты лох ебаный"
}


headers = {
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

print(f"Status code: {response.status_code}")
print("Ответ сервера:")
print(response.text)
