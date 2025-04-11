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
ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc0NDM5NDMwNCwianRpIjoiMGEzYzkxMWItZWMwOC00YWRhLWEyNDctMzY2ZGMzODk3M2ZhIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IlBhZGVuZXZNSyIsIm5iZiI6MTc0NDM5NDMwNCwiY3NyZiI6IjUxMzEwNzViLTQxNzktNDdlZi05ODdjLTI0NWY0NjY4ZGYwNyIsImV4cCI6MTc0NDQ4MDcwNH0.XpmD5R2bcV9vOSrQ5K3jDFHoexw5ptSdCu4Eb9aeOKI"

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
