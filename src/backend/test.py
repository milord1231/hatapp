# import requests

# url = "http://m170rd.ru/api/notificate"  # Замени на реальный адрес, если не локально

# # payload = {
# #   "user_id": 5,
# #   "count": 1,
# #   "reason": "взлом жопы",
# #   "action": "subtract",
# #   "who_id": 1,
# #   "hours": 5,
# # }


# payload = {
#   "user_from": "1",
#   "user_to": "3",
#   "message": "далбаеб",
#   'action': "warning",
# }


# headers = {
#     "Content-Type": "application/json",
# }

# response = requests.post(url, json=payload, headers=headers)

# print(f"Status code: {response.status_code}")
# print("Ответ сервера:")
# print(response.text)


import requests

# Замените на актуальные значения
API_URL = "http://localhost:5000/api/send_notification/1"  # укажи нужный user_id
ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc0NDM5OTA4OSwianRpIjoiOTNjODZkNDctZDNjMi00YTIzLWE2N2MtMjRkNGIxOGEwYjE5IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IlBhZGVuZXZNSyIsIm5iZiI6MTc0NDM5OTA4OSwiY3NyZiI6IjJhMjgyZDAzLTZiY2ItNDk2Mi05NDg4LTlhZmE4OWUzYzg4OCIsImV4cCI6MTc0NDQ4NTQ4OX0.DUAMa0IK1ybhdmL0KAQTIgB0xefAAdD_4VMKEY4Z6HI"

headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Content-Type": "application/json"
}

payload = {
    "title": "🔥 Новое уведомление!",
    "message": "Привет! Это тестовое пуш-уведомление 🧪"
}

response = requests.post(API_URL, json=payload, headers=headers)

print("Status:", response.status_code)
print("Response:", response.json())
