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
API_URL = "https://m170rd.ru/api/send_notification/5"  # укажи нужный user_id
ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc0NDM5OTY2NywianRpIjoiZWUxMjJhMjYtMjYwYS00NGE5LWJmMTktNTY5M2U2NDQ1MTYzIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IlBhZGVuZXZNSyIsIm5iZiI6MTc0NDM5OTY2NywiY3NyZiI6IjUzNDM4MGZmLTMwYWYtNDI3NS05ZWFiLWRiNjVmYmY2NDdkYSIsImV4cCI6MTc0NDQ4NjA2N30.6pYWbzne8prvsh0xGhDaJkdRbveVI74otPCyvgJgqvs"

headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Content-Type": "application/json"
}

payload = {
    "title": "А ты...",
    "message": "не забыл исповедаться?"
}

response = requests.post(API_URL, json=payload, headers=headers)

print("Status:", response.status_code)
print("Response:", response.json())
