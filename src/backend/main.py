import datetime
import time
import requests
import json
from bs4 import BeautifulSoup

from flask import Flask, jsonify, request, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

from flask_limiter import Limiter

from flask_jwt_extended import create_access_token
from flask_jwt_extended import get_jwt_identity
from flask_jwt_extended import jwt_required
from flask_jwt_extended import JWTManager

from flask_socketio import SocketIO, emit

from pywebpush import webpush, WebPushException

from werkzeug.security import generate_password_hash

app = Flask(__name__)
ALLOWED_ORIGINS = ['http://localhost:8080', 'http://m170rd.ru', "http://81.94.150.221:8080", "https://bcfe-193-46-217-15.ngrok-free.app"]
ALLOWED_IPS =  ['127.0.0.1', '81.94.150.221']



VAPID_PRIVATE_KEY = "MiU7eQka-qKoDmZKP9efuWASrWRMcNlRkCexLwuDMSk"
        

VAPID_PUBLIC_KEY = "BGYV6tsROe7o6Wk797JQ5gxqphVcDgwuaMV4DfuCGMgDytuO35iZY6exuFO7tUK0ULUGEhSqBAF7cVO9u6cnw1A"





app.config["JWT_SECRET_KEY"] = "hsdasdjasbdbjb123__@1jnmnA~"  # Change this!
jwt = JWTManager(app)
app.config['SECRET_KEY'] = 'oh_so_secret'
app.config['SESSION_COOKIE_HTTPONLY'] = True  # Это сделает cookie доступной только серверу (для безопасности)
app.config['SESSION_COOKIE_SECURE'] = True  # Убедитесь, что cookie передаются через HTTPS
app.config['SESSION_PERMANENT'] = True  # Сделать сессии постоянными
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'  # Укажи путь к базе данных
db = SQLAlchemy(app)
limiter = Limiter(app)

CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGINS}, r"/socket.io/*": {"origins": "*"}}, supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*")  # Указываем CORS для socketio


# @app.before_request
# def check_origin():
#     origin = request.environ.get('access-control-allow-origin', 'default value')
#     print(request.headers.get('Origin'), request.headers.get('access-control-allow-origin', 'default value'), request.headers)
#     if origin and origin not in ALLOWED_ORIGINS:
#         return jsonify({"error": "Unauthorized origin"}), 403

# @app.before_request
# def check_ip():
#     # Получаем IP-адрес клиента
#     client_ip = request.remote_addr
#     print("CLIENT IP: ", client_ip)
#     if client_ip not in ALLOWED_IPS:
#         return jsonify({'error': 'Forbidden access from this IP'}), 403  # 403 Forbidden

# @app.before_request
# def check_request_origin():
#     # Получаем IP-адрес, который отправил запрос
#     origin_ip = request.headers.get('X-Real-IP') or request.headers.get('X-Forwarded-For')
#     print(f"Request came from IP: {request.headers.get('X-Real-IP')} {request.headers.get('X-Forwarded-For')}")

#     # Если IP не совпадает с разрешённым, отклоняем запрос
#     if request.headers.get('X-Real-IP') not in ALLOWED_IPS or request.headers.get('X-Forwarded-For') not in ALLOWED_IPS:
#         return jsonify({"error": "Unauthorized origin"}), 403

# Модели
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    login = db.Column(db.String, unique=True, nullable=False)
    password = db.Column(db.String, nullable=False)
    dormNumber = db.Column(db.Integer)
    floor = db.Column(db.Integer)
    block = db.Column(db.String)
    room = db.Column(db.Integer)
    contractNumber = db.Column(db.BigInteger)
    roles = db.Column(db.String)  # Список ролей
    FIO = db.Column(db.String)
    admin_right = db.Column(db.Integer, default=0)
    profile_image = db.Column(db.String)

class CPDHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date = db.Column(db.Date)
    count = db.Column(db.Integer)
    reason = db.Column(db.String)
    who_id = db.Column(db.Integer)

class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String)
    description = db.Column(db.String)
    cpd_count = db.Column(db.Integer)
    people_need = db.Column(db.Integer)
    people_responded = db.Column(db.Integer)
    responded_logins = db.Column(db.PickleType)
    
class Subscription(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    endpoint = db.Column(db.String, nullable=False)
    p256dh = db.Column(db.String, nullable=False)
    auth = db.Column(db.String, nullable=False)


class ChangeRequest(db.Model):
    __tablename__ = 'change_requests'

    id = db.Column(db.Integer, primary_key=True)
    
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user = db.relationship("User", backref=db.backref("change_requests", lazy=True))

    build = db.Column(db.Integer, nullable=False)
    floor = db.Column(db.Integer, nullable=False)
    block = db.Column(db.Integer, nullable=False)
    room = db.Column(db.Integer, nullable=False)

    status = db.Column(db.String(20), default='in_progress')  # 'in_progress' или 'closed'
    created_at = db.Column(db.DateTime, default=datetime.datetime.now())
    closed_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "full_name": self.user.full_name if self.user else None,
            "build": self.build,
            "floor": self.floor,
            "block": self.block,
            "room": self.room,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "closed_at": self.closed_at.isoformat() if self.closed_at else None
        }

#Приводит к единому виду все логины
def normalize_login(login: str) -> str:
    return login[0].upper() + login[1:-2].lower() + login[-2:].upper()
# Создание базы данных (если еще не создана)

def register_user(
    login: str,
    password: str,
    dormNumber: int,
    floor: int,
    block: str,
    room: int,
    contractNumber: int,
    fName: str,
    lName: str,
    mName: str,
    roles: str,
    admin_right: int,
    profile_image: str,
    
) -> dict:
    # Проверка на существование пользователя с таким логином
    login = normalize_login(login)
    existing_user = User.query.filter_by(login=login).first()
    if existing_user:
        return {'status': 'error', 'message': 'Пользователь с таким логином уже существует'}
    
    hashed_password = generate_password_hash(password) #Хэширует

    # Создание нового пользователя
    new_user = User(
        login=login,
        password=hashed_password,
        dormNumber=dormNumber,
        floor=floor,
        block=block,
        room=room,
        contractNumber=contractNumber,
        roles=roles or 'Проживающий',
        FIO=f"{lName} {fName} {mName}",
        admin_right=0,
        profile_image=profile_image,
    )

    # Сохраняем в БД
    db.session.add(new_user)
    db.session.commit()

    return {'status': 'success', 'user_id': new_user.id}

def get_user_info_by_login(login: str) -> dict:
    login = normalize_login(login)
    user = User.query.filter_by(login=login).first()
    if not user:
        return {'status': 'error', 'message': 'Пользователь не найден'}

    return {
        'status': 'success',
        'user': {
            'id': user.id,
            'login': user.login,
            'FIO': user.FIO,
            'dormNumber': user.dormNumber,
            'floor': user.floor,
            'block': user.block,
            'room': user.room,
            'contractNumber': user.contractNumber,
            'roles': user.roles,
            'admin_right': user.admin_right,
            'profile_image': user.profile_image,

            # Подписи для фронта
            'residence_fields': {
                'dormNumber': {'label': 'Общежитие', 'value': user.dormNumber},
                'floor': {'label': 'Этаж', 'value': user.floor},
                'block': {'label': 'Блок', 'value': user.block},
                'room': {'label': 'Комната', 'value': user.room},
},
        }
    }

def get_user_info_by_id(user_id: int) -> dict:
    user = User.query.filter_by(id=user_id).first()
    if not user:
        return {'status': 'error', 'message': 'Пользователь не найден'}

    return {
        'status': 'success',
        'user': {
            'id': user.id,
            'login': user.login,
            'FIO': user.FIO,
            'dormNumber': user.dormNumber,
            'floor': user.floor,
            'block': user.block,
            'room': user.room,
            'contractNumber': user.contractNumber,
            'roles': user.roles,
            'admin_right': user.admin_right,
            'profile_image': user.profile_image,

            # Подписи для фронта
            'residence_fields': {
                    'dormNumber': {'label': 'Общежитие', 'value': user.dormNumber},
                    'floor': {'label': 'Этаж', 'value': user.floor},
                    'block': {'label': 'Блок', 'value': user.block},
                    'room': {'label': 'Комната', 'value': user.room},
        }
    }}


def get_cpd_history_and_balance_by_user_id(user_id: int) -> dict:
    user = User.query.get(user_id)
    if not user:
        return {'status': 'error', 'message': 'Пользователь не найден'}

    # Получаем историю КПД
    history = CPDHistory.query.filter_by(user_id=user_id).order_by(CPDHistory.date.desc()).all()

    # Считаем общий баланс
    total_cpd = sum(entry.count for entry in history)

    # Формируем историю в читаемый формат
    history_list = [
        {
            'count': entry.count,
            'reason': entry.reason,
            "id": entry.id,
            "user_id": entry.user_id,
            "date": entry.date.strftime('%Y-%m-%d'),
            "count": entry.count,
            "reason": entry.reason,
            "who_id": entry.who_id,

        }
        for entry in history
    ]

    return {
        'status': 'success',
        'user': {
            'id': user.id,
            'FIO': user.FIO,
            'login': user.login
        },
        'total_cpd': total_cpd,
        'history': history_list
    }

def get_cpd_history_and_balance_by_login(login: str) -> dict:
    # Используем filter_by для поиска пользователя по логину
    user = User.query.filter_by(login=login).first()

    if not user:
        return {
            'status': 'error',
            'message': 'User not found'
        }
    # Получаем историю КПД
    history = CPDHistory.query.filter_by(user_id=user.id).order_by(CPDHistory.date.desc()).all()

    # Если история пуста, устанавливаем total_cpd = 0 и пустой список для истории
    if not history:
        return {
            'status': 'success',
            'user': {
                'id': user.id,
                'FIO': user.FIO,
                'login': user.login
            },
            'total_cpd': 0,
            'history': []
        }

    # Считаем общий баланс
    total_cpd = sum(entry.count for entry in history)

    # Формируем историю в читаемый формат
    history_list = [
        {
            'count': entry.count,
            'reason': entry.reason,
            "id": entry.id,
            "user_id": entry.user_id,
            "date": entry.date.strftime('%Y-%m-%d'),
            "count": entry.count,
            "reason": entry.reason,
            "who_id": entry.who_id,

        }
        for entry in history
    ]
    
    return {
        'status': 'success',
        'user': {
            'id': user.id,
            'FIO': user.FIO,
            'login': user.login
        },
        'total_cpd': total_cpd,
        'history': history_list
    }


def login_to_kai(username: str, password: str) -> bool:
    login_url = "https://kai.ru/main?p_p_id=58&p_p_lifecycle=1&p_p_state=normal&p_p_mode=view&_58_struts_action=%2Flogin%2Flogin"
    referer_url = "https://kai.ru/main"

    # Сессия для сохранения куки и токенов
    cookie_session = requests.Session()

    # Шаг 1 — получить страницу логина, чтобы вытащить CSRF-токен (nonce)
    login_page = cookie_session.get(referer_url)
    soup = BeautifulSoup(login_page.text, "html.parser")

    # Ищем токен (name совпадает)
    nonce_input = soup.find("input", {"name": "blackboard.platform.security.NonceUtil.nonce.ajax"})
    nonce = nonce_input["value"] if nonce_input else ""

    # Шаг 2 — подготавливаем данные для логина
    payload = {
        "_58_formDate": time.time(),
        "_58_saveLastPath": False,
        "_58_redirect": "",
        "_58_doActionAfterLogin": False,
        "_58_login": username,
        "_58_password": password,
    }

    # Шаг 3 — заголовки
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Referer": referer_url,
        "Content-Type": "application/x-www-form-urlencoded"
    }

    # Шаг 4 — логинимся
    response = cookie_session.post(login_url, data=payload, headers=headers)

    # Проверяем, вошли ли мы
    print("Status:", response.status_code)
    print("Final URL:", response.url)
    finalURL = response.url


    if  "main?p_p_id=58&p_p_lifecycle=0&p_p_state=maximized&saveLastPath=false" in finalURL:return False
    else:
        response = cookie_session.get("https://kai.ru/group/guest/common/about-me", headers=headers)
        soup = BeautifulSoup(response.text, "html.parser")

        first_name_input = soup.find("input", {"id": "_aboutMe_WAR_aboutMe10_firstName"})
        if first_name_input:
            first_name = first_name_input.get("value")

        last_name_input = soup.find("input", {"id": "_aboutMe_WAR_aboutMe10_lastName"})
        if last_name_input:
            last_name = last_name_input.get("value")

        father_name_input = soup.find("input", {"id": "_aboutMe_WAR_aboutMe10_middleName"})
        if father_name_input:
            middle_name = father_name_input.get("value")

        profileImg_input = soup.find("img", {"id": "igva_column2_0_avatar"})
        if profileImg_input:
            profileImg = "https://kai.ru/"+profileImg_input.get("src")
        
        normalized_login=normalize_login(username) #Единый вид логина
        response, status_code = check_user_login(normalized_login)

        # Теперь ты можешь безопасно извлечь JSON-данные из response
        response_data = response.get_json()


        if response_data["exists"]:
            user_id = response_data["user_id"]

        else:
            resp = register_user(normalized_login, password, 8, 0, 0, 0, 0, first_name, last_name, middle_name, "Студент КАИ", 0, profileImg)
            user_id = resp["user_id"]
        update_user(user_id, {'password': password, 'profile_image': profileImg})
        return user_id, username, password, profileImg




def check_user_login(login):
    user = User.query.filter_by(login=login).first()
    if user:
        return jsonify({"exists": True, "user_id": user.id}), 200
    else:
        return jsonify({"exists": False}), 404



def check_user_id(user_id):
    print('USER ID = ', user_id)
    user = User.query.filter_by(id=user_id).first()
    if user:
        return jsonify({"exists": True, "login": user.login}), 200
    else:
        return jsonify({"exists": False}), 404

def add_user(data):
    new_user = User(
        login=data['login'],
        password=data['password'],
        dormNumber=data['dormNumber'],
        floor=data['floor'],
        block=data['block'],
        room=data['room'],
        contractNumber=data['contractNumber'],
        roles=data['roles'],
        FIO=data["lastName"]+" "+data["firstName"]+" "+data["middleName"]
    )
    db.session.add(new_user)
    db.session.commit()
    return 

def update_user(user_id, data):
    user = User.query.get(user_id)
    if not user:
        return 

    # Обновляем только те поля, которые переданы в data
    if 'login' in data:
        user.login = data['login']
    if 'password' in data:
        user.password = generate_password_hash(data['password']) #Сохраняется хэшированный пароль
    if 'dormNumber' in data:
        user.dormNumber = data['dormNumber']
    if 'floor' in data:
        user.floor = data['floor']
    if 'block' in data:
        user.block = data['block']
    if 'room' in data:
        user.room = data['room']
    if 'contractNumber' in data:
        user.contractNumber = data['contractNumber']
    if 'roles' in data:
        user.roles = data['roles']
    if 'profile_image' in data:
        user.profile_image = data['profile_image']
    if 'admin_right' in data:
        user.admin_right = data['admin_right']
    db.session.commit()


def delete_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return

    db.session.delete(user)
    db.session.commit()

def add_cpd_history(data):
    print(data)
    new_cpd = CPDHistory(
        user_id=data['user_id'],
        date= datetime.datetime.now().date(),
        count=data['count'],
        reason=data['reason'],
        who_id=data['who_id']
    )
    db.session.add(new_cpd)
    db.session.commit()


def update_cpd_history(cpd_id, data):
    cpd_entry = CPDHistory.query.get(cpd_id)
    if not cpd_entry: return

    cpd_entry.date = datetime.strptime(data.get('date', str(cpd_entry.date)), '%Y-%m-%d').date()
    cpd_entry.count = data.get('count', cpd_entry.count)
    cpd_entry.reason = data.get('reason', cpd_entry.reason)

    db.session.commit()

def delete_cpd_history(cpd_id):
    cpd_entry = CPDHistory.query.get(cpd_id)
    if not cpd_entry:
        return jsonify({"message": "CPDHistory entry not found"}), 404

    db.session.delete(cpd_entry)
    db.session.commit()


def add_task(data):
    new_task = Task(
        title=data['title'],
        description=data['description'],
        cpd_count=data['cpd_count'],
        people_need=data['people_need'],
        people_responded=data['people_responded'],
        responded_logins=data['responded_logins']
    )
    db.session.add(new_task)
    db.session.commit()

def update_task(task_id, data):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({"message": "Task not found"}), 404

    task.title = data.get('title', task.title)
    task.description = data.get('description', task.description)
    task.cpd_count = data.get('cpd_count', task.cpd_count)
    task.people_need = data.get('people_need', task.people_need)
    task.people_responded = data.get('people_responded', task.people_responded)
    task.responded_logins = data.get('responded_logins', task.responded_logins)

    db.session.commit()


def delete_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return
    db.session.delete(task)
    db.session.commit()



def get_admin_by_login(login):
    if check_user_login(login):
        user = get_user_info_by_login(login)
        return user['user']['admin_right']
    
def get_admin_by_id(id):
    if check_user_id(id):
        user = get_user_info_by_id(id)
        return user['user']['admin_right']


def checkAdmin_elsePass(user_id):
    if check_user_id(user_id):
        user = get_user_info_by_id(user_id)
        if user['user']['admin_right'] >= 1 or user['user']['login'] == "PadenevMK": return True
    return False

def checkSuperAdmin_elsePass(user_id):
    if check_user_id(user_id):
        user = get_user_info_by_id(user_id)
        if user['user']['admin_right'] >= 2 or user['user']['login'] == "PadenevMK": return True
    return False


# @app.route("/api/get-profile-data")
# def get_profile_data():
#     login = request.args.get('login')  
#     print(login)
#     info = get_user_info_by_login(login)
#     password = info['user']['password']

#     cpd_data = get_cpd_history_and_balance_by_login(login)
#     print(cpd_data)

#     json_content = {
#         "fullName": info["user"]["FIO"],
#         "status": info["user"]["roles"], # Член Студенческого Совета Общежития, Ответственный за комп. класс, Ответственный за прачечную, Староста, Проживающий
#         "build": info['user']['dormNumber'],
#         "floor": info['user']['floor'],
#         "block": info['user']['block'],
#         "room": info['user']['room'], 
#         "kpdScore": cpd_data['total_cpd'],
#         'profileImage': info['user']['profile_image'],

#     }
#     return jsonify(json_content)

@app.route("/api/get-profile-data")
@jwt_required()
def get_profile_data():
    # Получаем userId из параметров запроса
    user_id = request.args.get('userId')  
    print(user_id)
    if not user_id:
        return jsonify({"message": "userID is empty"}), 404
    
    # Получаем информацию о пользователе по userId
    info = get_user_info_by_id(user_id)
    if not info:
        return jsonify({"message": "User not found"}), 404
    
    # Получаем историю КПД и баланс
    cpd_data = get_cpd_history_and_balance_by_user_id(user_id)
    print(cpd_data)
    current_user = get_jwt_identity()

    # Формируем ответ
    json_content = {
        "fullName": info["user"]["FIO"],
        "status": info["user"]["roles"],  # Член Студенческого Совета Общежития, Ответственный за комп. класс и т.д.
        "build": info['user']['dormNumber'],
        "floor": info['user']['floor'],
        "block": info['user']['block'],
        "room": info['user']['room'], 
        "kpdScore": cpd_data['total_cpd'],
        'profileImage': info['user']['profile_image'],
        "logged_in_as": current_user
    }
    return jsonify(json_content), 200



@limiter.limit("10 per minute")
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get("login")
    password = data.get("password")

    if not username or not password:
        return jsonify({"message": "Missing credentials"}), 400

    success = login_to_kai(username, password)

    if success:
        access_token = create_access_token(identity=username, expires_delta=datetime.timedelta(days=1))
        
        session['user_id'] = success[0]
        session['username'] = success[1]
        session['password'] = success[2]
        session['profileImg'] = success[3]
        adminRights = get_admin_by_login(success[1])
        
        
        
        return jsonify(access_token=access_token, kwargs={"message": "Login successful!", 'user_id': success[0], 'username': success[1], 'password': success[2], 'profileImg': success[3], 'admin': adminRights, "access_token": access_token}), 200
    else:
        return jsonify({"message": "Invalid credentials"}), 401



@app.route("/api/magicpage/<int:user_id>/<int:adm>")
@jwt_required()
def magicpage(user_id, adm):
    # Получаем userId из параметров запроса
    print(user_id)
    if not user_id:
        return jsonify({"message": "userID is empty"}), 404
    
    # Получаем информацию о пользователе по userId
    info = get_user_info_by_id(user_id)
    if not info:
        return jsonify({"message": "User not found"}), 404
    
    username = get_jwt_identity()  
    
    user = get_user_info_by_login(username)
    who_id = user['user']['id']
    
    if not checkAdmin_elsePass(who_id):
        return jsonify({"error": "You are not authorized to perform this action."}), 403
    
    update_user(user_id, {"admin_right": adm})
    return jsonify({"message": "Success"}), 200




@app.route("/api/users", methods=["GET"])
@jwt_required()
def get_users():
    # Извлекаем всех пользователей из базы данных
    users = User.query.all()

    # Формируем список пользователей в нужном формате
    users_list = [
        {
            "id": user.id,
            "name": user.FIO,
            "username": user.login,
            "location": f"{user.floor}.{user.block}.{user.room}",  # Формируем местоположение
            "role": user.roles
        }
        for user in users
    ]
    return jsonify(users_list), 200

@app.route("/api/history", methods=["GET"])
@jwt_required()
def get_history():
    kpds = CPDHistory.query.all()

    # Формируем список пользователей в нужном формате
    kpd_list = [
        {
            "id": info.id,
            "user_id": info.user_id,
            "user": get_user_info_by_id(info.user_id)['user']['FIO'],
            "date": info.date,
            "count": info.count,
            "reason": info.reason,
            "who_id": info.who_id,
            "who_name": get_user_info_by_id(info.who_id)['user']['FIO'],
            "action":  "add" if  info.count >= 0 else "substract",
        }
        for info in kpds
    ]
    return jsonify(kpd_list), 200

@app.route("/api/kpd-history", methods=["GET"])
@jwt_required()
def get_kpd_history():
    user_id = request.args.get('userId')  
    kpds = get_cpd_history_and_balance_by_user_id(user_id)
    print(kpds)
    
    # Формируем список пользователей в нужном формате
    kpd_list = [
        {
            "id": info['id'],
            "user_id": info['user_id'],
            "user": get_user_info_by_id(info['user_id'])['user']['FIO'],
            "date": info['date'],
            "count": info['count'],
            "reason": info['reason'],
            "who_id": info['who_id'],
            "who_name": get_user_info_by_id(info['who_id'])['user']['FIO'],
            "action":  "add" if  info['count'] >= 0 else "substract", 
        }
        for info in kpds['history']
    ]
    return jsonify(kpd_list), 200



@limiter.limit("10 per minute")
@app.route("/api/kpd", methods=["POST"])
@jwt_required()
def issue_kpd():
    data = request.json
    user_id = data.get("user_id")
    hours = data.get("hours")
    reason = data.get("reason")
    action = data.get("action")
    who_id = data.get("who_id")
    
    # Найдем пользователя по ID
    user = get_user_info_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Проведем проверку на админа
    if not checkSuperAdmin_elsePass(who_id):
        return jsonify({"error": "You are not authorized to perform this action."}), 403
    
    
    
    # Обработка выдачи или списания
    if action == "add":
        notificate_user(who_id, user_id, f"Вам выписаны часы КПД: {hours}", action="info", title="Выдача КПД")
        add_cpd_history({'user_id': user_id, 'count': abs(int(hours)), 'reason': reason, 'who_id': who_id})
    elif action == "subtract":
        notificate_user(who_id, user_id, f"С Вас списаны часы КПД: {hours}", action="success", title="Списание КПД")
        add_cpd_history({'user_id': user_id, 'count': -abs(int(hours)), 'reason': reason, 'who_id': who_id})
    current_user = get_jwt_identity()
    return jsonify({"message": f"Успешно: {user['user']['FIO']} {action} {abs(int(hours))} [{reason}]", "logged_in_as": current_user})


connected_users = {}


def getAdminList():
    # Извлекаем пользователей с admin_right = 1 (администраторы)
    admins = db.session.query(User).filter(User.admin_right >= 1).all()
    # Преобразуем список администраторов в формат JSON
    admin_list = [
        {
            'id': admin.id,
            'name': admin.FIO,
            'username': admin.login,
            'admin_right': admin.admin_right,
        }
        for admin in admins
    ]
    print(admin_list)

    return admin_list



def send_push_notification(user_id, title, message):
    # Найдем подписку для этого пользователя
    subscription = Subscription.query.filter_by(user_id=user_id).first()

    if not subscription:
        return jsonify({"error": "No subscription found for user"}), 404

    # Получаем VAPID ключи, которые можно сгенерировать с помощью pywebpush
    try:
        # Отправка уведомления
        webpush(
            subscription_info={
                'endpoint': subscription.endpoint,
                'keys': {
                    'p256dh': subscription.p256dh,
                    'auth': subscription.auth,
                }
            },
            data=json.dumps({
                "title": title,
                "message": message
            }),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={
                "sub": "mailto:your-email@example.com"
            }
        )
        return jsonify({"status": "Notification sent"}), 200

    except WebPushException as e:
        print("Error sending push notification: ", e)
        return jsonify({"error": "Failed to send notification"}), 500

def notificate_user(user_from, user_to, message, action="info", title=None):
    
    user_to = str(user_to)
    print("Notification emmited ", user_to, connected_users, user_to in connected_users)
    if user_to in connected_users:
        socketio.emit('notification', {
            'message': f'{message}',
            'action': f'{action}',
        }, room=connected_users[user_to])
        print(f"notificate: {user_to} '{message}'")
    send_push_notification(user_to, title, message)
    return jsonify({"message": "message sent"}), 200


@app.route('/api/send_notification/<int:user_id>', methods=['POST'])
@jwt_required()
def send_notification(user_id):
    username = get_jwt_identity()  # Получаем идентификатор текущего пользователя
    
    user = get_user_info_by_login(username)
    who_id = user['user']['id']
    
    if not checkAdmin_elsePass(who_id):
        return jsonify({"error": "You are not authorized to perform this action."}), 403
    
    data = request.json
    title = data.get("title")
    message = data.get("message")

    if not title or not message:
        return jsonify({"error": "Title and message are required"}), 400

    return send_push_notification(user_id, title, message)


@app.route('/api/unsubscribe_push_notify', methods=['POST'])
@jwt_required()
def unsubscribe_push_notify():
    username = get_jwt_identity()  # Получаем идентификатор текущего пользователя
    subscription_data = request.json
    
    user = get_user_info_by_login(username)
    user_id = user['user']['id']
    

    
    # Проверяем данные подписки
    if not subscription_data.get('endpoint'):
        return jsonify({"error": "Missing required subscription data"}), 400
    
    # Находим подписку пользователя в базе данных
    subscription = Subscription.query.filter_by(user_id=user_id, endpoint=subscription_data['endpoint']).first()
    if subscription:
        # Удаляем подписку из базы данных
        db.session.delete(subscription)
        db.session.commit()
        return jsonify({"status": "Unsubscribed successfully"}), 200
    else:
        return jsonify({"error": "Subscription not found"}), 404




@app.route('/api/subscribe_push_notify', methods=['POST'])
@jwt_required()
def subscribe_push_notify():
    username = get_jwt_identity()  # Получаем идентификатор текущего пользователя
    subscription_data = request.json
    
    
    user = get_user_info_by_login(username)
    user_id = user['user']['id']
    
    # Проверяем данные подписки
    if not subscription_data.get('endpoint') or not subscription_data.get('keys'):
        return jsonify({"error": "Missing required subscription data"}), 400
    
    # Проверка наличия подписки для данного пользователя
    existing_subscription = Subscription.query.filter_by(user_id=user_id).first()
    if existing_subscription:
        # Если подписка уже существует, обновляем ее
        existing_subscription.endpoint = subscription_data['endpoint']
        existing_subscription.p256dh = subscription_data['keys']['p256dh']
        existing_subscription.auth = subscription_data['keys']['auth']
        db.session.commit()
        return jsonify({"status": "Subscription updated"}), 200

    # Если подписка не существует, создаем новую
    subscription = Subscription(
        user_id=user_id,
        endpoint=subscription_data['endpoint'],
        p256dh=subscription_data['keys']['p256dh'],
        auth=subscription_data['keys']['auth']
    )
    
    db.session.add(subscription)
    db.session.commit()
    
    return jsonify({"status": "Subscription saved"}), 200








@app.route('/api/user/<int:user_id>/status', methods=['PATCH'])
@jwt_required()
def update_user_status(user_id):
    
    username = get_jwt_identity()  # Получаем идентификатор текущего пользователя
    
    user_who = get_user_info_by_login(username)
    who_id = user_who['user']['id']
    
    
    if not checkSuperAdmin_elsePass(who_id):
        return jsonify({"error": "You are not authorized to perform this action."}), 403
    
    data = request.get_json()
    user = User.query.get_or_404(user_id)

    roles = data.get("status")
    admin_right = data.get("admin_right")

    print(data, user)
    if roles is not None:
        user.roles = roles
    if admin_right is not None:
        user.admin_right = 1

    db.session.commit()
    return jsonify({"message": "Профиль обновлен"}), 200




@app.route('/api/user/<int:user_id>/residence', methods=['PATCH'])
@jwt_required()
def update_user_residence(user_id):
    
    username = get_jwt_identity()  # Получаем идентификатор текущего пользователя
    
    user_who = get_user_info_by_login(username)
    who_id = user_who['user']['id']
    
    
    if not checkAdmin_elsePass(who_id):
        return jsonify({"error": "You are not authorized to perform this action."}), 403
    
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'status': 'error', 'message': 'Пользователь не найден'}), 404

    data = request.json

    # Обновляем только переданные значения
    if 'dormNumber' in data:
        user.dormNumber = data['dormNumber']
    if 'floor' in data:
        user.floor = data['floor']
    if 'block' in data:
        user.block = data['block']
    if 'room' in data:
        user.room = data['room']

    db.session.commit()

    return jsonify({'status': 'success', 'message': 'Данные обновлены'})



@app.route('/api/notificate', methods=['POST'])
@jwt_required()
def notificate():
    user_from = request.json.get('user_from')
    user_to = request.json.get('user_to')
    message = request.json.get('message')
    action = request.json.get('action') if request.json.get('action') else 'info'

    username = get_jwt_identity()  # Получаем идентификатор текущего пользователя
    
    user_who = get_user_info_by_login(username)
    who_id = user_who['user']['id']
    
    
    if not checkSuperAdmin_elsePass(who_id):
        return jsonify({"error": "You are not authorized to perform this action."}), 403
    
    
    # После успешного выполнения действия отправим уведомление через WebSocket:
    notificate_user(user_from, user_to, message, action)

    return jsonify({"message": "Уведомление отправлено"}), 200



# 🟢 Создать запрос
@app.route("/api/change-request", methods=["POST"])
@jwt_required()
def create_change_request():
    data = request.get_json()
    # Проверяем, что все обязательные данные есть
    # if not all(key in data for key in ("user_id", "build", "floor", "block", "room")):
    #     return jsonify({"error": "Missing required fields"}), 400

    user_id=data.get("user_id"),
    build=data.get("new_build"),
    floor=data.get("new_floor"),
    block=data.get("new_block"),
    room=data.get("new_room"),
    status="in_progress"
    
    user_id = user_id[0]
    build = build[0]
    floor = floor[0]
    block = block[0]
    room = room[0]

    
    change_request = ChangeRequest(
        user_id=user_id,
        build=build,
        floor=floor,
        block=block,
        room=room,
        status=status
    )

    db.session.add(change_request)
    db.session.commit()
    
    
    admins = getAdminList()
    for admin in admins:
        print(admin)
        notificate_user(user_id, admin['id'], f"{get_user_info_by_id(user_id)['user']['FIO']} -> № {build} {floor}.{block}.{room}", "info", "Запрос на изменение")

    
    return jsonify({"message": "Request submitted successfully"}), 201

# 🔵 Получить все запросы
@app.route('/api/change-request', methods=['GET'])
@jwt_required()
def get_change_requests():
    
    username = get_jwt_identity()  # Получаем идентификатор текущего пользователя
    
    user_who = get_user_info_by_login(username)
    who_id = user_who['user']['id']
    
    
    if not checkAdmin_elsePass(who_id):
        return jsonify({"error": "You are not authorized to perform this action."}), 403
    
    
    requests = ChangeRequest.query.order_by(ChangeRequest.created_at.desc()).all()
    result = []
    for r in requests:
        result.append({
            'id': r.id,
            'user_id': r.user_id,
            'build': r.build,
            'floor': r.floor,
            'block': r.block,
            'room': r.room,
            'status': r.status,
            'created_at': r.created_at.isoformat(),
            'username': get_user_info_by_id(r.user_id)['user']['FIO']
        })
    return jsonify(result)

# 🟡 Обновить статус (например, закрыть запрос)
@app.route('/api/change-request/<int:request_id>', methods=['PATCH'])
@jwt_required()
def update_change_request_status(request_id):
    username = get_jwt_identity()  # Получаем идентификатор текущего пользователя
    
    user_who = get_user_info_by_login(username)
    who_id = user_who['user']['id']
    
    
    if not checkAdmin_elsePass(who_id):
        return jsonify({"error": "You are not authorized to perform this action."}), 403
    
    
    data = request.json
    request_obj = ChangeRequest.query.get(request_id)
    if not request_obj:
        return jsonify({'error': 'Запрос не найден'}), 404

    request_obj.status = data.get('status', request_obj.status)
    db.session.commit()
    
    
    notificate_user(who_id, request_obj.user_id, f"Ваш запрос изменил статус: Закрыт", "info", "Запрос на изменение")
    
    return jsonify({'message': 'Статус обновлён'})


@app.route('/api/change-request/delete/<int:request_id>', methods=['DELETE'])
@jwt_required()
def delete_change_request(request_id):
    username = get_jwt_identity()  # Получаем идентификатор текущего пользователя
    
    user_who = get_user_info_by_login(username)
    who_id = user_who['user']['id']
    
    
    if not checkAdmin_elsePass(who_id):
        return jsonify({"error": "You are not authorized to perform this action."}), 403

    req = db.session.get(ChangeRequest, request_id)
    if not req:
        return jsonify({"msg": "Request not found"}), 404

    db.session.delete(req)
    db.session.commit()
    
    notificate_user(who_id, req.user_id, f"Ваш запрос изменил статус: Удалён", "info", "Запрос на изменение")
    
    return jsonify({"msg": "Request deleted"}), 200



@app.route('/api/check-admin', methods=['GET'])
@jwt_required()
def check_admin():
    username = get_jwt_identity()
    user_who = get_user_info_by_login(username)
    who_id = user_who['user']['id']
    user = db.session.get(User, who_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "is_admin": user.admin_right in [1, 2],
        "is_super_admin": user.admin_right == 2,
        "admin_right": user.admin_right
    }), 200



@socketio.on('connect')
def handle_connect():
    # Получаем user_id из query-параметра, а не из request.json
    user_id = request.args.get('user_id')  # Параметр в строке запроса
    if user_id:
        connected_users[user_id] = request.sid  # Добавляем пользователя в список подключенных
        print(f'User {user_id} connected.')

@socketio.on('disconnect')
def handle_disconnect():
    for user_id, sid in connected_users.items():
        if sid == request.sid:
            del connected_users[user_id]  # Убираем пользователя из списка подключенных
            print(f'User {user_id} disconnected.')
            break


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    # app.run(host="0.0.0.0", port=5000)
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)