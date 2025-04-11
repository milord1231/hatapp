from pywebpush import webpush, WebPushException

# Ваши VAPID ключи
VAPID_PRIVATE_KEY = 'your_private_key'
VAPID_PUBLIC_KEY = 'your_public_key'

# Информация о подписке пользователя (например, из базы данных)
subscription_info = {
    "endpoint": "USER_ENDPOINT",
    "keys": {
        "p256dh": "USER_PUBLIC_KEY",
        "auth": "USER_AUTH_KEY",
    }
}

# Тело уведомления
notification_body = {
    "notification": {
        "title": "New Notification",
        "body": "This is a test notification.",
        "icon": "/icon.png",
        "badge": "/badge.png",
    }
}

try:
    response = webpush(
        subscription_info=subscription_info,
        data="Test Notification Body",
        vapid_private_key=VAPID_PRIVATE_KEY,
        vapid_public_key=VAPID_PUBLIC_KEY
    )
    print("Push notification sent successfully:", response)
except WebPushException as e:
    print("Error sending push notification:", e)
