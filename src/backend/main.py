import datetime
import time
import requests
import json
from bs4 import BeautifulSoup
import os
import zipfile
from flask import Flask, jsonify, request, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.exceptions import HTTPException
from flask_limiter import Limiter
from flask_jwt_extended.exceptions import NoAuthorizationError 
from flask_jwt_extended import create_access_token
from flask_jwt_extended import get_jwt_identity
from flask_jwt_extended import jwt_required
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO, emit
from flask import jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
import traceback # Для получения полного трейсбека ошибки
from pywebpush import webpush, WebPushException
from flask import current_app

from werkzeug.security import generate_password_hash
from datetime import timedelta
app = Flask(__name__)
ALLOWED_ORIGINS = ['http://localhost:8080', 'http://m170rd.ru', "http://81.94.150.221:8080", "https://bcfe-193-46-217-15.ngrok-free.app"]
ALLOWED_IPS =  ['127.0.0.1', '81.94.150.221']



VAPID_PRIVATE_KEY = "MiU7eQka-qKoDmZKP9efuWASrWRMcNlRkCexLwuDMSk"
        

VAPID_PUBLIC_KEY = "BGYV6tsROe7o6Wk797JQ5gxqphVcDgwuaMV4DfuCGMgDytuO35iZY6exuFO7tUK0ULUGEhSqBAF7cVO9u6cnw1A"

def validate_date(date_str):
    try:
        datetime.datetime.strptime(date_str, '%Y-%m-%d')
        return True
    except ValueError:
        return False





@app.errorhandler(NoAuthorizationError)
def handle_auth_error(e):
    return jsonify({"error": "Missing or invalid JWT"}), 401

@app.errorhandler(Exception)
def handle_exception(err):
    # Перехватываем все исключения
    if isinstance(err, HTTPException):
        response = err.get_response()
        # сохраняем оригинальный статус код
        status_code = err.code
    else:
        # Для всех остальных исключений
        status_code = 500
        response = {
            "error": str(err),
            "status_code": status_code,
        }

    return jsonify(response), status_code

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


class KPDMeeting(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    dates = db.Column(db.String)  # JSON список дат
    status = db.Column(db.String)  # draft/active/completed
    created_at = db.Column(db.DateTime, default=datetime.datetime.now)
    closed_at = db.Column(db.DateTime)

class KPDViolation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    meeting_id = db.Column(db.Integer, db.ForeignKey('kpd_meeting.id'))
    date = db.Column(db.String)  # Дата нарушения
    description = db.Column(db.String)
    floor = db.Column(db.Integer)
    block = db.Column(db.String)
    room = db.Column(db.String)  # Может быть null для общих нарушений блока
    file_path = db.Column(db.String)  # Путь к файлу акта

class KPDAssignment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    violation_id = db.Column(db.Integer, db.ForeignKey('kpd_violation.id'))
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    # Новое поле для хранения часов
    hours = db.Column(db.Integer) # <-- Исправление 4 (часть 1)
    # Поле для отслеживания, кто назначил (если нужно)
    assigned_by = db.Column(db.Integer, db.ForeignKey('user.id')) # Можно добавить, если нужно знать, кто распределил
    confirmed = db.Column(db.Boolean, default=False)



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
    return {'status': 'success',
            'user': {'id': user.id,
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
                     }}}
    
def get_user_info_by_id(user_id: int) -> dict:
    """Получить информацию о пользователе по его ID."""
    user = User.query.filter_by(id=user_id).first()
    print(user_id, user)
    if not user:
        return get_user_info_by_login(user_id)
    return {'status': 'success',
            'user': {'id': user.id,
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
                     }}}


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


def login_to_kai(username: str, password: str):
    login_url = "https://kai.ru/main?p_p_id=58&p_p_lifecycle=1&p_p_state=normal&p_p_mode=view&_58_struts_action=%2Flogin%2Flogin"
    referer_url = "https://kai.ru/main"

    session = requests.Session()

    # Шаг 1 — получить страницу логина
    login_page = session.get(referer_url)
    soup = BeautifulSoup(login_page.text, "html.parser")

    # CSRF-токен (если нужен)
    nonce_input = soup.find("input", {"name": "blackboard.platform.security.NonceUtil.nonce.ajax"})
    nonce = nonce_input["value"] if nonce_input else ""

    # Шаг 2 — подготовка payload
    payload = {
        "_58_formDate": time.time(),
        "_58_saveLastPath": False,
        "_58_redirect": "",
        "_58_doActionAfterLogin": False,
        "_58_login": username,
        "_58_password": password,
    }

    headers = {
        "User-Agent": "Mozilla/5.0",
        "Referer": referer_url,
        "Content-Type": "application/x-www-form-urlencoded"
    }

    # Шаг 3 — логинимся
    response = session.post(login_url, data=payload, headers=headers)

    if "main?p_p_id=58&p_p_lifecycle=0&p_p_state=maximized&saveLastPath=false" in response.url:
        return None  # Неверные данные

    # Шаг 4 — достаём информацию о пользователе
    profile_page = session.get("https://kai.ru/group/guest/common/about-me", headers=headers)
    soup = BeautifulSoup(profile_page.text, "html.parser")

    def extract_value(soup, input_id):
        el = soup.find("input", {"id": input_id})
        return el.get("value") if el else ""

    first_name = extract_value(soup, "_aboutMe_WAR_aboutMe10_firstName")
    last_name = extract_value(soup, "_aboutMe_WAR_aboutMe10_lastName")
    middle_name = extract_value(soup, "_aboutMe_WAR_aboutMe10_middleName")

    profileImg_el = soup.find("img", {"id": "igva_column2_0_avatar"})
    profileImg = "https://kai.ru/" + profileImg_el["src"] if profileImg_el else ""

    # Нормализуем логин (приводим к виду для БД)
    normalized_login = normalize_login(username)

    # Проверка существования пользователя
    response, status_code = check_user_login(normalized_login)
    response_data = response.get_json()

    if response_data["exists"]:
        user_id = response_data["user_id"]
    else:
        reg_resp = register_user(
            normalized_login, password, 8, 0, 0, 0, 0,
            first_name, last_name, middle_name,
            "Студент КАИ", 0, profileImg
        )
        user_id = reg_resp["user_id"]
    # Обновим пароль и аватар
    update_user(user_id, {'password': password, 'profile_image': profileImg})

    # Заглушка: роли (пока только студент, в будущем можно расширить)
    userBData = get_user_info_by_id(user_id)
    userAdminRight = userBData['user']['admin_right']
    userRoles = userBData['user']['roles']
    
    roles = ["student"]
    if 'Староста этажа' in userRoles:
        roles.append("block_head")

    return {
        "user_id": user_id,
        "username": normalized_login,
        "first_name": first_name,
        "last_name": last_name,
        "middle_name": middle_name,
        "profileImg": profileImg,
        "roles": roles,
    }




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


# Новый эндпоинт для получения списка жильцов
@app.route('/api/residents', methods=['GET'])
@jwt_required()
def get_residents():
    # Можно добавить фильтрацию по блоку, если нужно
    # current_user_id = get_jwt_identity()
    # current_user = User.query.get(current_user_id)
    # if not current_user:
    #     return jsonify({"error": "User not found"}), 404
    # residents = User.query.filter_by(block=current_user.block).all()
    
    # Пока возвращаем всех жильцов (или можно фильтровать по общежитию)
    residents = User.query.all()
    residents_list = [{
        'id': r.id,
        'name': r.FIO,
        'login': r.login,
        'room': f"{r.floor}.{r.block.split('.')[-1]}.{r.room}" if r.room else f"{r.floor}.{r.block.split('.')[-1]}",
        'block': r.block,
        'floor': r.floor
    } for r in residents]
    return jsonify(residents_list), 200

@app.route("/api/get-profile-data")
@jwt_required()
def get_profile_data():
    # Получаем userId из параметров запроса
    user_id_str = request.args.get('userId')  
    if not user_id_str:
        print("userID is empty")
        return jsonify({"error": "userID is required"}), 400 # 400 Bad Request более уместен

    # Преобразуем user_id в int с обработкой ошибок
    try:
        user_id = int(user_id_str)
    except ValueError:
        print(f"Invalid userID format: {user_id_str}")
        return jsonify({"error": "userID must be an integer"}), 400

    # Получаем информацию о пользователе по userId
    info = get_user_info_by_id(user_id)
    # Предполагается, что get_user_info_by_id возвращает словарь с ключом 'status'
    # и значением 'error' если пользователь не найден
    if info.get('status') == 'error': 
        print("User not found", user_id)
        return jsonify({"error": info.get('message', 'User not found')}), 404

    # Получаем историю КПД и баланс
    cpd_data = get_cpd_history_and_balance_by_user_id(user_id)
    
    current_user = get_jwt_identity()
    print(current_user, cpd_data)
    
    # Формируем ответ
    json_content = {
        "fullName": info["user"]["FIO"],
        "status": info["user"]["roles"],
        "build": info['user']['dormNumber'],
        "floor": info['user']['floor'],
        "block": info['user']['block'],
        "room": info['user']['room'], 
        "kpdScore": cpd_data['total_cpd'],
        'profileImage': info['user']['profile_image'],
        "logged_in_as": current_user
    }
    print(json_content)
    return jsonify(json_content), 200


@limiter.limit("10 per minute")
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get("login")
    password = data.get("password")

    if not username or not password:
        return jsonify({"message": "Missing credentials"}), 400

    user_data = login_to_kai(username, password)

    if not user_data:
        return jsonify({"message": "Invalid credentials"}), 401

    access_token = create_access_token(identity=str(username), expires_delta=datetime.timedelta(days=1))


    # Сохраняем в сессии только нужное
    session['user_id'] = user_data["user_id"]
    session['username'] = user_data["username"]
    session['profileImg'] = user_data["profileImg"]

    # Получаем административные права (если есть)
    adminRights = get_admin_by_login(user_data["username"])

    # Возвращаем JWT и данные
    return jsonify(
        access_token=access_token,
        kwargs={
            "message": "Login successful!",
            "user_id": user_data["user_id"],
            "username": user_data["username"],
            "profileImg": user_data["profileImg"],
            "roles": user_data.get("roles", []),
            "admin": adminRights
        }
    ), 200



@app.route("/api/magicpage/<int:user_id>/<int:adm>")
@jwt_required()
def magicpage(user_id, adm):
    # Получаем userId из параметров запроса
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
        if get_user_info_by_id(r.user_id)['status'] != 'error':
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
    
    print(username, user)

    return jsonify({
        "is_admin": user.admin_right in [1, 2],
        "is_super_admin": user.admin_right == 2,
        "admin_right": user.admin_right
    }), 200


@app.route('/api/kpd/meetings', methods=['GET'])
@jwt_required()
def get_kpd_meetings():
    meetings = KPDMeeting.query.order_by(KPDMeeting.created_at.desc()).all()
    return jsonify([
        {
            'id': m.id,
            'dates': json.loads(m.dates),
            'status': m.status,
            'createdAt': m.created_at.isoformat(),  # Преобразование в ISO-формат
            'closedAt': m.closed_at.isoformat() if m.closed_at else None
        }
        for m in meetings
    ])



@app.route('/api/kpd/meetings', methods=['POST'])
@jwt_required()
def create_kpd_meeting():
    current_app.logger.info("=== create_kpd_meeting called ===")
    try:
        identity = get_jwt_identity()
        current_app.logger.info(f"JWT Identity: {identity}")
        is_admin = checkAdmin_elsePass(identity)
        current_app.logger.info(f"Admin check result: {is_admin}")
        if not is_admin:
            current_app.logger.warning("User not authorized")
            return jsonify({"error": "Unauthorized"}), 403

        data = request.get_json()
        current_app.logger.info(f"Request data: {data}")
        if not data or 'dates' not in data:
            current_app.logger.warning("Missing 'dates' in request")
            return jsonify({"error": "Missing dates"}), 400

        dates = data['dates']
        if not isinstance(dates, list):
            current_app.logger.warning("Dates is not a list")
            return jsonify({"error": "Dates should be an array"}), 400

        # Проверяем формат дат
        for d in dates:
            current_app.logger.info(f"Validating date: {d}")
            if not validate_date(d):
                current_app.logger.warning(f"Invalid date format: {d}")
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

        # Создаем собрание
        current_app.logger.info("Creating new meeting...")
        new_meeting = KPDMeeting(dates=json.dumps(dates), status='draft')
        db.session.add(new_meeting)
        db.session.commit()
        current_app.logger.info(f"Meeting created with ID: {new_meeting.id}")
        return jsonify({
            "message": "Meeting created",
            "id": new_meeting.id,
            "dates": dates,
            "status": new_meeting.status
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating meeting: {e}", exc_info=True) # exc_info=True для полного трейсбека
        # Возвращаем более информативную ошибку
        return jsonify({"error": f"Internal error: {type(e).__name__}: {str(e)}"}), 500


@app.route('/api/kpd/meetings/<int:meeting_id>', methods=['PUT'])
@jwt_required()
def update_kpd_meeting(meeting_id):
    if not checkAdmin_elsePass(get_jwt_identity()):
        return jsonify({"error": "Unauthorized"}), 403
    
    meeting = KPDMeeting.query.get_or_404(meeting_id)
    data = request.json
    
    if 'dates' in data:
        meeting.dates = json.dumps(data['dates'])
    if 'status' in data:
        meeting.status = data['status']
        if data['status'] == 'completed':
            meeting.closed_at = datetime.datetime.now()
    
    db.session.commit()
    return jsonify({"message": "Meeting updated"}), 200

@app.route('/api/kpd/meetings/<int:meeting_id>/violations', methods=['GET'])
@jwt_required()
def get_kpd_violations(meeting_id):
    violations = KPDViolation.query.filter_by(meeting_id=meeting_id).all()
    return jsonify([{
        'id': v.id,
        'date': v.date,
        'description': v.description,
        'floor': v.floor,
        'block': v.block,
        'room': v.room,
        'file_path': v.file_path
    } for v in violations]), 200

# Новый эндпоинт для получения назначений по собранию (GET)
@app.route('/api/kpd/meetings/<int:meeting_id>/assignments', methods=['GET'])
@jwt_required()
def get_kpd_assignments(meeting_id):
    # Проверка прав доступа может быть сложнее, здесь упрощено
    # Например, админ может видеть всё, жилец - только своё блок
    current_user_login = get_jwt_identity()
    current_user = User.query.filter_by(login=current_user_login).first()
    if not current_user:
        return jsonify({"error": "User not found"}), 404

    # Получаем все назначения для этого собрания
    assignments = KPDAssignment.query.join(KPDViolation).filter(KPDViolation.meeting_id == meeting_id).all()
    
    assignments_list = []
    for a in assignments:
        violation = KPDViolation.query.get(a.violation_id)
        user = User.query.get(a.user_id)
        assignments_list.append({
            'id': a.id,
            'violationId': a.violation_id,
            'userId': a.user_id,
            'userName': user.FIO if user else "Неизвестно",
            'hours': a.hours,
            'confirmed': a.confirmed,
            'createdAt': "2023-01-01T00:00:00" # Заглушка, добавьте реальную дату создания если нужно
        })
        
    return jsonify(assignments_list), 200


# Исправленный эндпоинт для создания назначений
@app.route('/api/kpd/meetings/<int:meeting_id>/assignments', methods=['POST'])
@jwt_required()
def create_kpd_assignment(meeting_id):
    data = request.json
    current_user_login = get_jwt_identity()
    current_user = User.query.filter_by(login=current_user_login).first()
    
    if not current_user:
        return jsonify({"error": "User not found"}), 404
        
    # Проверяем, является ли пользователь старостой блока
    # Или админом, если админ тоже может распределять
    # if 'block_head' not in current_user.roles:
    #     return jsonify({"error": "Unauthorized"}), 403

    # Создаем назначения
    created_assignments = []
    for assignment_data in data.get('assignments', []):
        violation_id = assignment_data.get('violation_id')
        user_id = assignment_data.get('user_id')
        hours = assignment_data.get('hours', 2) # Значение по умолчанию
        
        # Дополнительные проверки: существуют ли violation и user?
        violation = KPDViolation.query.get(violation_id)
        user = User.query.get(user_id)
        if not violation or not user:
            # Пропускаем или возвращаем ошибку?
            continue
            
        # Проверка, что violation принадлежит этому meeting_id
        if violation.meeting_id != meeting_id:
            continue # Или ошибка
            
        new_assignment = KPDAssignment(
            violation_id=violation_id,
            user_id=user_id,
            hours=hours, # <-- Исправление 4 (часть 2)
            assigned_by=current_user.id # <-- Исправление 4 (часть 3)
        )
        db.session.add(new_assignment)
        db.session.flush() # Чтобы получить ID
        
        created_assignments.append({
            'id': new_assignment.id,
            'violation_id': new_assignment.violation_id,
            'user_id': new_assignment.user_id,
            'hours': new_assignment.hours
        })
        
    try:
        db.session.commit()
        return jsonify({"message": "Assignments created", "assignments": created_assignments}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/kpd/meetings/<int:meeting_id>/confirm', methods=['POST'])
@jwt_required()
def confirm_kpd_assignments(meeting_id):
    if not checkAdmin_elsePass(get_jwt_identity()):
        return jsonify({"error": "Unauthorized"}), 403
    
    # Подтверждаем все назначения для этого КПД
    assignments = KPDAssignment.query.join(KPDViolation).filter(
        KPDViolation.meeting_id == meeting_id
    ).all()
    
    for assignment in assignments:
        assignment.confirmed = True
        # Добавляем часы КПД в историю пользователя
        add_cpd_history({
            'user_id': assignment.user_id,
            'count': assignment.hours,
            'reason': f"КПД за нарушение",
            'who_id': assignment.assigned_by
        })
    
    db.session.commit()
    return jsonify({"message": "Assignments confirmed"}), 200

@app.route('/api/kpd/upload', methods=['POST'])
@jwt_required()
def upload_kpd_files():
    if not checkAdmin_elsePass(get_jwt_identity()):
        return jsonify({"error": "Unauthorized"}), 403
    
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    
    file = request.files['file']
    meeting_id = request.form.get('meeting_id')
    
    # Здесь должна быть логика обработки файла (zip или docx)
    # и извлечения информации о нарушениях
    
    # Пример сохранения информации о нарушении
    new_violation = KPDViolation(
        meeting_id=meeting_id,
        date="2023-11-01",  # Извлечь из файла
        description="Нарушение порядка",  # Извлечь из файла
        floor=6,
        block="5",
        room="2",
        file_path=f"uploads/{file.filename}"
    )
    db.session.add(new_violation)
    db.session.commit()
    
    return jsonify({"message": "File processed", "violation_id": new_violation.id}), 200


# Новый эндпоинт для загрузки ZIP-файлов (если фронтенд обращается к /api/kpd/upload-zip)
@app.route('/api/kpd/upload-zip', methods=['POST'])
@jwt_required()
def upload_kpd_zip():
    # Проверка прав администратора
    current_user_login = get_jwt_identity()
    if not checkAdmin_elsePass(current_user_login): # Предполагается, что checkAdmin_elsePass принимает login
        return jsonify({"error": "Unauthorized"}), 403
        
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
        
    file = request.files['file']
    meeting_id = request.form.get('meeting_id') # Получаем ID собрания из формы
    
    if not meeting_id:
        return jsonify({"error": "Meeting ID is required"}), 400
        
    try:
        meeting_id = int(meeting_id)
    except ValueError:
        return jsonify({"error": "Invalid meeting ID"}), 400
        
    meeting = KPDMeeting.query.get(meeting_id)
    if not meeting:
        return jsonify({"error": "Meeting not found"}), 404

    # Создаем директорию для загрузок, если её нет
    os.makedirs(f"uploads/kpd/{meeting_id}", exist_ok=True)
    
    # Сохраняем файл
    filename = f"acts_{int(time.time())}.zip" # Уникальное имя
    file_path = os.path.join(f"uploads/kpd/{meeting_id}", filename)
    file.save(file_path)

    # Распаковываем ZIP
    try:
        with zipfile.ZipFile(file_path, 'r') as zip_ref:
            zip_ref.extractall(f"uploads/kpd/{meeting_id}/extracted")
    except zipfile.BadZipFile:
        os.remove(file_path) # Удаляем поврежденный файл
        return jsonify({"error": "Invalid ZIP file"}), 400

    # Обрабатываем каждый DOCX файл
    extracted_dir = f"uploads/kpd/{meeting_id}/extracted"
    if os.path.exists(extracted_dir):
        for docx_file in os.listdir(extracted_dir):
            if docx_file.endswith('.docx'):
                # Парсим имя файла для получения блока/комнаты (формат: этаж_блок_комната.docx или этаж_блок.docx)
                filename_without_ext = os.path.splitext(docx_file)[0]
                parts = filename_without_ext.split('_')
                if len(parts) >= 2:
                    try:
                        floor = int(parts[0])
                        block = f"{parts[0]}.{parts[1]}" # Формат "этаж.блок"
                        room = f"{block}.{parts[2]}" if len(parts) > 2 else None # Формат "этаж.блок.комната" или None
                        
                        # Здесь должна быть логика парсинга DOCX файла
                        # и извлечения дат и описаний нарушений
                        # Пока создаем заглушку
                        
                        # Пример: извлекаем все даты из meeting.dates
                        meeting_dates = json.loads(meeting.dates) if meeting.dates else []
                        
                        for date_str in meeting_dates: # Для примера создаем нарушение на каждую дату собрания
                            # В реальности нужно парсить DOCX
                            violation = KPDViolation(
                                meeting_id=meeting_id,
                                date=date_str, # Извлечь из файла
                                description=f"Нарушение из файла {docx_file}", # Извлечь из файла
                                floor=floor,
                                block=block,
                                room=room,
                                file_path=f"uploads/kpd/{meeting_id}/extracted/{docx_file}"
                            )
                            db.session.add(violation)
                    except (ValueError, IndexError):
                        # Пропускаем файлы с неправильным именем
                        print(f"Skipping file with invalid name format: {docx_file}")
                        continue

    try:
        db.session.commit()
        return jsonify({"message": "Files processed successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500




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