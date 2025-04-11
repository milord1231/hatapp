from cryptography.hazmat.primitives.asymmetric import ec
import base64

# Генерация пары ключей
private_key = ec.generate_private_key(ec.SECP256R1())
public_key = private_key.public_key()
numbers = public_key.public_numbers()

# Формируем uncompressed формат: 0x04 || x || y
x = numbers.x.to_bytes(32, 'big')
y = numbers.y.to_bytes(32, 'big')
uncompressed_point = b'\x04' + x + y

# Преобразование в base64url без padding
def to_base64url(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode('utf-8')

# Приватный ключ — 32 байта
private_bytes = private_key.private_numbers().private_value.to_bytes(32, 'big')

# Результат
vapid_public_key = to_base64url(uncompressed_point)
vapid_private_key = to_base64url(private_bytes)

print(f"🔑 VAPID PUBLIC KEY:\n{vapid_public_key}\n")
print(f"🔐 VAPID PRIVATE KEY:\n{vapid_private_key}")
