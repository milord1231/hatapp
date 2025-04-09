from flask import Flask, jsonify, request, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import datetime
import time
import requests
from bs4 import BeautifulSoup
from flask_limiter import Limiter

app = Flask(__name__)
CORS(app, origins=["http://localhost:8080", "http://m170rd.ru", "http://81.94.150.221:8080"], supports_credentials=True)

ALLOWED_ORIGINS = ['http://localhost:8080', 'http://m170rd.ru', "http://81.94.150.221:8080"]

app.config['SECRET_KEY'] = 'oh_so_secret'
app.config['SESSION_COOKIE_HTTPONLY'] = True  # Это сделает cookie доступной только серверу (для безопасности)
app.config['SESSION_COOKIE_SECURE'] = True  # Убедитесь, что cookie передаются через HTTPS
app.config['SESSION_PERMANENT'] = True  # Сделать сессии постоянными
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'  # Укажи путь к базе данных
db = SQLAlchemy(app)
limiter = Limiter(app)



@app.before_request
def check_authentication():
    if request.method == 'OPTIONS':
        return

    origin = request.headers.get("Origin")
    auth_cookie = request.cookies.get('auth_token')

    if origin not in ['http://localhost:8080', 'http://m170rd.ru'] and not auth_cookie:
        print("BLOCK ORIGIN: ", origin)
        return jsonify({"error": "Unauthorized access"}), 403


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
    existing_user = User.query.filter_by(login=login).first()
    if existing_user:
        return {'status': 'error', 'message': 'Пользователь с таким логином уже существует'}

    # Создание нового пользователя
    new_user = User(
        login=login,
        password=password,
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
            'password': user.password,
            'admin_right': user.admin_right,
            'profile_image': user.profile_image,
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
        }
    }


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

        response, status_code = check_user_login(username)

        # Теперь ты можешь безопасно извлечь JSON-данные из response
        response_data = response.get_json()


        if response_data["exists"]:
            user_id = response_data["user_id"]

        else:
            resp = register_user(username, password, 8, 0, 0, 0, 0, first_name, last_name, middle_name, "Проживающий")
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
    user = User.query.get(user_id)
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
        user.password = data['password']
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
    }
    return jsonify(json_content), 200



@limiter.limit("10 per minute")
@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"message": "Missing credentials"}), 400

    success = login_to_kai(username, password)

    if success:
        session['user_id'] = success[0]
        session['login'] = success[1]
        session['password'] = success[2]
        session['profileImg'] = success[3]
        adminRights = get_admin_by_login(success[1])
        return jsonify({"message": "Login successful!", 'user_id': success[0], 'login': success[1], 'password': success[2], 'profileImg': success[3], 'admin': adminRights}), 200
    else:
        return jsonify({"message": "Invalid credentials"}), 401




@app.route("/api/users", methods=["GET"])
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
            "action":  "add" if  info.count >= 0 else "substract"
        }
        for info in kpds
    ]

    return jsonify(kpd_list), 200

@app.route("/api/kpd-history", methods=["GET"])
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
            "action":  "add" if  info['count'] >= 0 else "substract"
        }
        for info in kpds['history']
    ]

    return jsonify(kpd_list), 200



@limiter.limit("10 per minute")
@app.route("/api/kpd", methods=["POST"])
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
    if get_admin_by_id(who_id) == 0:
        return jsonify({"error": "You are not authorized to perform this action."}), 403
    
    # Обработка выдачи или списания
    if action == "add":

        add_cpd_history({'user_id': user_id, 'count': abs(int(hours)), 'reason': reason, 'who_id': who_id})
    elif action == "subtract":

        add_cpd_history({'user_id': user_id, 'count': -abs(int(hours)), 'reason': reason, 'who_id': who_id})
        
    return jsonify({"message": f"Успешно: {user['user']['FIO']} {action} {abs(int(hours))} [{reason}]"})




if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=5000)