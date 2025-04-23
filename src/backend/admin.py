
import requests

user_id = 1
adm = 1

API_URL = f"https://m170rd.ru/api/magicpage/{user_id}/{adm}"
ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc0NTQwNjQ2MywianRpIjoiMDFiZmM5MzAtNDJkZC00NTMyLWJlYWYtNzE2MzRjYzdjY2Q3IiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IlBhZGVuZXZNSyIsIm5iZiI6MTc0NTQwNjQ2MywiY3NyZiI6IjgzZDcxNzI0LTM0YWUtNDU0Zi1hODAxLTg1ODIyODI0OGI4OSIsImV4cCI6MTc0NTQ5Mjg2M30.G52QnB8TlZoHh9e766z8j6txK2vcq3Qpx_hiH_7AW1Q"

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
