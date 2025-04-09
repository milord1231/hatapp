from flask import Flask, jsonify, request, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import datetime
import time
import requests
from bs4 import BeautifulSoup

app = Flask(__name__)
CORS(app,  supports_credentials=True) 

app.config['SECRET_KEY'] = 'oh_so_secret'
app.config['SESSION_COOKIE_HTTPONLY'] = True  # Это сделает cookie доступной только серверу (для безопасности)
app.config['SESSION_COOKIE_SECURE'] = True  # Убедитесь, что cookie передаются через HTTPS
app.config['SESSION_PERMANENT'] = True  # Сделать сессии постоянными
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'  # Укажи путь к базе данных
db = SQLAlchemy(app)

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

class CPDHistory(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date = db.Column(db.Date)
    count = db.Column(db.Integer)
    reason = db.Column(db.String)

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
        FIO=f"{lName} {fName} {mName}"
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
            'password': user.password
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
            'roles': user.roles
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
            'date': entry.date.strftime('%Y-%m-%d'),
            'count': entry.count,
            'reason': entry.reason
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
            'date': entry.date.strftime('%Y-%m-%d'),
            'count': entry.count,
            'reason': entry.reason
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
    return jsonify({"message": "User created successfully", "user_id": new_user.id}), 201

def update_user(user_id, data):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    user.login = data.get('login', user.login)
    user.password = data.get('password', user.password)
    user.dormNumber = data.get('dormNumber', user.dormNumber)
    user.floor = data.get('floor', user.floor)
    user.block = data.get('block', user.block)
    user.room = data.get('room', user.room)
    user.contractNumber = data.get('contractNumber', user.contractNumber)
    user.roles = data.get('roles', user.roles)

    db.session.commit()
    return jsonify({"message": "User updated successfully"}), 200

def delete_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"message": "User not found"}), 404

    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "User deleted successfully"}), 200

def add_cpd_history(data):
    new_cpd = CPDHistory(
        user_id=data['user_id'],
        date=datetime.strptime(data['date'], '%Y-%m-%d').date(),
        count=data['count'],
        reason=data['reason']
    )
    db.session.add(new_cpd)
    db.session.commit()
    return jsonify({"message": "CPDHistory entry created successfully", "cpd_id": new_cpd.id}), 201


def update_cpd_history(cpd_id, data):
    cpd_entry = CPDHistory.query.get(cpd_id)
    if not cpd_entry:
        return jsonify({"message": "CPDHistory entry not found"}), 404

    cpd_entry.date = datetime.strptime(data.get('date', str(cpd_entry.date)), '%Y-%m-%d').date()
    cpd_entry.count = data.get('count', cpd_entry.count)
    cpd_entry.reason = data.get('reason', cpd_entry.reason)

    db.session.commit()
    return jsonify({"message": "CPDHistory entry updated successfully"}), 200

def delete_cpd_history(cpd_id):
    cpd_entry = CPDHistory.query.get(cpd_id)
    if not cpd_entry:
        return jsonify({"message": "CPDHistory entry not found"}), 404

    db.session.delete(cpd_entry)
    db.session.commit()
    return jsonify({"message": "CPDHistory entry deleted successfully"}), 200


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
    return jsonify({"message": "Task created successfully", "task_id": new_task.id}), 201

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
    return jsonify({"message": "Task updated successfully"}), 200


def delete_task(task_id):
    task = Task.query.get(task_id)
    if not task:
        return jsonify({"message": "Task not found"}), 404

    db.session.delete(task)
    db.session.commit()
    return jsonify({"message": "Task deleted successfully"}), 200


@app.route("/api/get-profile-data")
def get_profile_data():
    login = request.args.get('login')  
    print(login)
    info = get_user_info_by_login(login)
    password = info['user']['password']

    cpd_data = get_cpd_history_and_balance_by_login(login)
    print(cpd_data)

    json_content = {
        "fullName": info["user"]["FIO"],
        "status": info["user"]["roles"], # Член Студенческого Совета Общежития, Ответственный за комп. класс, Ответственный за прачечную, Староста, Проживающий
        "build": info['user']['dormNumber'],
        "floor": info['user']['floor'],
        "block": info['user']['block'],
        "room": info['user']['room'], 
        "kpdScore": cpd_data['total_cpd'],

    }
    return jsonify(json_content)


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
        return jsonify({"message": "Login successful!", 'user_id': success[0], 'login': success[1], 'password': success[2], 'profileImg': success[3]}), 200
    else:
        return jsonify({"message": "Invalid credentials"}), 401



if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=5000)
