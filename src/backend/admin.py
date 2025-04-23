
import requests

user_id = 1
adm = 0

API_URL = f"https://m170rd.ru/api/magicpage/{user_id}/{adm}"
ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc0NTQwNTkyOCwianRpIjoiYmU2ZGI4YTItNGNlZC00MWY4LThkNWItMDk1NGFkY2I3OTM3IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IlBhZGVuZXZNSyIsIm5iZiI6MTc0NTQwNTkyOCwiY3NyZiI6IjhhY2U0ZTNiLTQxMmEtNDcyZi1hZGQ2LWY3ZDMxOWZiMWFkNyIsImV4cCI6MTc0NTQ5MjMyOH0.3AMF8LDZHWI0p4WcQoRW1ymI3FYb1wzReltRi23esNM"

headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "Content-Type": "application/json"
}

payload = {
    "user_id": user_id,
    "adm": adm,
}

response = requests.get(API_URL, headers=headers)

print("Status:", response.status_code, response.text)
print("Response:")
