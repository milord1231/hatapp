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
API_URL = "https://m170rd.ru/api/send_notification/1"  # укажи нужный user_id
ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc0NDUwNjM3NiwianRpIjoiODdkNDFmY2EtYWNlMS00Yzg3LThkNTMtMjAzZDQ5ZjI5ODUwIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IlBhZGVuZXZNSyIsIm5iZiI6MTc0NDUwNjM3NiwiY3NyZiI6IjRjNTNlZmYyLWU4YzAtNGVhZC04MWU3LWE4ZTUyYjdmYmU5ZiIsImV4cCI6MTc0NDU5Mjc3Nn0.evXXKUHeHjhu1zkbSK9o-FSmNpIIlA_BJJVjdQiE3so"

headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Content-Type": "application/json"
}

payload = {
    "title": "Бу, испугался?",
    "message": "не бойся я друг, подойди, получи кпд..."
}

response = requests.post(API_URL, json=payload, headers=headers)

print("Status:", response.status_code)
print("Response:", response.json())
