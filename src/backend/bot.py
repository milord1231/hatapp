import asyncio
from aiogram import Bot, Dispatcher, types
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from aiogram.filters import Command

# ЗАМЕНИ НА СВОЙ ТОКЕН БОТА
BOT_TOKEN = "7439310702:AAHw52_a_oK3xYSLSLoReLNEahFGnPlYW9M"

# ЗАМЕНИ НА СВОЙ URL WebApp (https или ngrok)
WEBAPP_URL = "https://m170rd.ru"  # Или https://your-ngrok-url.ngrok.io

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

@dp.message(Command('start'))  # В aiogram 3.x обработчики теперь регистрируются через фильтры
async def cmd_start(message: types.Message):
    # Создаем WebAppInfo с правильным URL
    web_app_info = WebAppInfo(url=WEBAPP_URL)
    
    # Создаем клавиатуру с кнопкой
    keyboard = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="Open WebApp", web_app=web_app_info)]
    ])
    
    await message.answer("Click to open the WebApp", reply_markup=keyboard)

async def main():
    # Запуск бота
    await dp.start_polling(bot)

if __name__ == '__main__':
    asyncio.run(main())
