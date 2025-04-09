    # login_url = "https://bb.kai.ru/webapps/login/"
    # referer_url = "https://bb.kai.ru/webapps/login/?action=relogin"

    # # Сессия для сохранения куки и токенов
    # session = requests.Session()

    # # Шаг 1 — получить страницу логина, чтобы вытащить CSRF-токен (nonce)
    # login_page = session.get(referer_url)
    # soup = BeautifulSoup(login_page.text, "html.parser")

    # # Ищем токен (name совпадает)
    # nonce_input = soup.find("input", {"name": "blackboard.platform.security.NonceUtil.nonce.ajax"})
    # nonce = nonce_input["value"] if nonce_input else ""

    # # Шаг 2 — подготавливаем данные для логина
    # payload = {
    #     "user_id": username,  # твой логин
    #     "password": password,  # твой пароль
    #     "login": "Войти",
    #     "secondaryAuthToken": "",
    #     "showMFARegistration": "$showMFARegistration",
    #     "showMFAVerification": "$showMFAVerification",
    #     "showMFASuccessFul": "$showMFASuccessFul",
    #     "action": "login",
    #     "new_loc": "",
    #     "blackboard.platform.security.NonceUtil.nonce.ajax": nonce
    # }

    # # Шаг 3 — заголовки
    # headers = {
    #     "User-Agent": "Mozilla/5.0",
    #     "Referer": referer_url,
    #     "Content-Type": "application/x-www-form-urlencoded"
    # }

    # # Шаг 4 — логинимся
    # response = session.post(login_url, data=payload, headers=headers)

    # # Проверяем, вошли ли мы
    # print("Status:", response.status_code)
    # print("Final URL:", response.url)
    # finalURL = response.url


    # if  "bb.kai.ru/webapps/login/" in finalURL: return False
    # return True
    # login_url = "https://bb.kai.ru/webapps/login/"
    # referer_url = "https://bb.kai.ru/webapps/login/?action=relogin"

    # # Сессия для сохранения куки и токенов
    # session = requests.Session()

    # # Шаг 1 — получить страницу логина, чтобы вытащить CSRF-токен (nonce)
    # login_page = session.get(referer_url)
    # soup = BeautifulSoup(login_page.text, "html.parser")

    # # Ищем токен (name совпадает)
    # nonce_input = soup.find("input", {"name": "blackboard.platform.security.NonceUtil.nonce.ajax"})
    # nonce = nonce_input["value"] if nonce_input else ""

    # # Шаг 2 — подготавливаем данные для логина
    # payload = {
    #     "user_id": username,  # твой логин
    #     "password": password,  # твой пароль
    #     "login": "Войти",
    #     "secondaryAuthToken": "",
    #     "showMFARegistration": "$showMFARegistration",
    #     "showMFAVerification": "$showMFAVerification",
    #     "showMFASuccessFul": "$showMFASuccessFul",
    #     "action": "login",
    #     "new_loc": "",
    #     "blackboard.platform.security.NonceUtil.nonce.ajax": nonce
    # }

    # # Шаг 3 — заголовки
    # headers = {
    #     "User-Agent": "Mozilla/5.0",
    #     "Referer": referer_url,
    #     "Content-Type": "application/x-www-form-urlencoded"
    # }

    # # Шаг 4 — логинимся
    # response = session.post(login_url, data=payload, headers=headers)

    # # Проверяем, вошли ли мы
    # print("Status:", response.status_code)
    # print("Final URL:", response.url)
    # finalURL = response.url


    # if  "bb.kai.ru/webapps/login/" in finalURL: return False
    # return True
