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
API_URL = "https://m170rd.ru/api/send_notification/2"  # укажи нужный user_id
ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc0NTA5NzU5MiwianRpIjoiZjkyNDViMDQtMmJmMC00MDhkLTg2MzEtNGU5MTcxNDgyMzk5IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IlBhZGVuZXZNSyIsIm5iZiI6MTc0NTA5NzU5MiwiY3NyZiI6IjBiMWQzOGIzLTA0NDEtNDIxMS04NmU3LWFlZGU5NGRkNDdkZSIsImV4cCI6MTc0NTE4Mzk5Mn0.4TAkpKVmOFaUayyF-bkWjEgE0oH89-PCnLauavKIb4Q"

headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Content-Type": "application/json"
}

payload = {
    "title": "☦️",
    "message": "Христос Воскресе!"
}

response = requests.post(API_URL, json=payload, headers=headers)

print("Status:", response.status_code)
print("Response:", response.json())
