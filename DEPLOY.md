# Деплой «Бабушкиной математики» на сервер

Сайт работает в Docker: два контейнера — `grandmasmath-postgres` (база) и `grandmasmath-app` (сайт на Nuxt + XeLaTeX для PDF).
Снаружи сайт открывается через обратный прокси **Caddy**, который сам получает и продлевает HTTPS-сертификат.

```
интернет ──443──▶ Caddy ──▶ 127.0.0.1:8080 ──▶ grandmasmath-app ──▶ grandmasmath-postgres
```

Порты базы и сайта привязаны к `127.0.0.1` (см. `docker-compose.yml`) — из интернета напрямую они недоступны.

---

## 1. Что понадобится

| Что | Зачем |
|---|---|
| VPS с Ubuntu 22.04/24.04, **2 ГБ RAM**, 20 ГБ диска | Сборка Nuxt требует памяти; образ с TeX ≈ 1,3 ГБ |
| Домен, A-запись которого указывает на IP сервера | Для HTTPS и ссылок в письмах |
| SSH-доступ к серверу | |
| Дамп базы с вашего компьютера | Задачи и решения импортируются локально из LaTeX-исходников, на сервер переносится готовая база |
| Пароль приложения Яндекс.Почты | Письма с кодами входа (см. `.env.example`) |
| Ключи ЮKassa (по желанию) | Без них оплата выключена, сайт работает как витрина |

Если на сервере 1 ГБ RAM — добавьте swap на 2 ГБ, иначе сборка может упасть:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 2. Подготовка сервера

```bash
# Docker и плагин compose
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER          # перелогиньтесь после этой команды

# Caddy (обратный прокси с автоматическим HTTPS)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy

# Файрвол: снаружи только SSH и веб
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
```

> Docker сам открывает опубликованные порты в обход ufw. Поэтому в `docker-compose.yml` порты привязаны к `127.0.0.1` — не меняйте это на сервере.

---

## 3. Код и настройки

```bash
sudo mkdir -p /opt/grandmasmath && sudo chown $USER /opt/grandmasmath
git clone https://github.com/yurzin/grandmasmath2.git /opt/grandmasmath
cd /opt/grandmasmath
cp .env.example .env
nano .env
```

Что заполнить в `.env` на сервере:

| Переменная | Значение |
|---|---|
| `POSTGRES_PASSWORD` | Длинный случайный пароль: `openssl rand -hex 24`. **Задайте до первого запуска** — потом сменить его можно только внутри базы |
| `NUXT_SESSION_PASSWORD` | Секрет сессий, не короче 32 символов: `openssl rand -hex 32`. Если сменить — все пользователи разлогинятся |
| `NUXT_SITE_URL` | `https://ваш-домен.ru` — без слэша в конце. Используется в ссылках писем и возврате после оплаты |
| `NUXT_MAIL_SMTP_URL`, `NUXT_MAIL_FROM` | Как в вашем локальном `.env` (формат описан в `.env.example`) |
| `NUXT_YOOKASSA_*` | Ключи из личного кабинета ЮKassa; пусто — оплата выключена |
| `APP_PORT` | Можно не трогать (8080) |

`DATABASE_URL` из `.env` контейнер не использует — адрес базы для него задан в `docker-compose.yml`.

Права на файл с секретами:

```bash
chmod 600 .env
```

---

## 4. Первый запуск и перенос базы

### 4.1. На вашем компьютере — свежий дамп

В PowerShell или Git Bash в папке проекта:

```bash
docker exec grandmasmath-postgres pg_dump -U postgres -d grandmasmath -Fc -Z 9 > grandmasmath.dump
scp grandmasmath.dump user@сервер:/opt/grandmasmath/
```

В дампе есть все сборники, задачи, решения, пометки «на проверке», бесплатность и ваш аккаунт администратора (вход в админку — тот же email и пароль, что локально).

> Дамп содержит почту и хэш пароля — после переноса удалите копию с сервера (`rm grandmasmath.dump`) и не кладите дамп в репозиторий.

### 4.2. На сервере — база, восстановление, сайт

```bash
cd /opt/grandmasmath

# 1) Только база
docker compose up -d
docker compose ps            # postgres должен стать healthy

# 2) Восстановить дамп (--clean заменяет то, что уже есть в базе)
docker exec -i grandmasmath-postgres pg_restore -U postgres -d grandmasmath --clean --if-exists --no-owner < grandmasmath.dump
rm grandmasmath.dump

# 3) Сайт (первая сборка — 5–10 минут)
docker compose --profile app up -d --build
docker compose logs -f app   # «Listening on http://0.0.0.0:3000» — готово, Ctrl+C
```

При старте контейнер сайта сам применяет новые миграции базы; на восстановленной базе он напишет, что схема в актуальном состоянии.

Проверка с самого сервера:

```bash
curl -I http://127.0.0.1:8080
```

---

## 5. HTTPS через Caddy

`/etc/caddy/Caddyfile`:

```caddyfile
ваш-домен.ru, www.ваш-домен.ru {
    encode zstd gzip
    reverse_proxy 127.0.0.1:8080
}
```

```bash
sudo systemctl reload caddy
```

Caddy сам получит сертификат Let's Encrypt (домен уже должен указывать на сервер, порты 80 и 443 открыты). Откройте `https://ваш-домен.ru`.

---

## 6. ЮKassa

В личном кабинете ЮKassa → **Интеграция → HTTP-уведомления** укажите адрес:

```
https://ваш-домен.ru/api/payments/yookassa
```

и включите событие `payment.succeeded` (и `payment.canceled`). Без этого оплата пройдёт, но покупка на сайте не откроется.

Пока `NUXT_YOOKASSA_SHOP_ID` пустой, оплата на продакшене недоступна (тестовая оплата без ЮKassa работает только в режиме разработки).

---

## 7. Проверка после запуска

- [ ] Главная открывается по `https://`, замок в браузере без предупреждений
- [ ] Бесплатный вариант показывает решение, платный — закрыт
- [ ] Вход по коду: письмо приходит, ссылка в письме ведёт на ваш домен (а не на `localhost`)
- [ ] `https://ваш-домен.ru/admin` — вход администратора работает
- [ ] В админке у сборника собирается PDF (первая сборка — до минуты)
- [ ] Рисунки (числовые оси, графики) в решениях отображаются
- [ ] Если ключи ЮKassa заданы — тестовая покупка открывает сборник

---

## 8. Резервные копии

Ежедневный дамп в 3:30, хранить 30 дней:

```bash
chmod +x /opt/grandmasmath/docker/backup.sh
sudo mkdir -p /var/backups/grandmasmath
( crontab -l 2>/dev/null; echo '30 3 * * * /opt/grandmasmath/docker/backup.sh >> /var/log/grandmasmath-backup.log 2>&1' ) | crontab -
```

Дампы лежат на том же сервере — **периодически скачивайте их к себе**, иначе при потере сервера потеряются и копии:

```bash
scp user@сервер:/var/backups/grandmasmath/*.dump .
```

Восстановление из дампа — та же команда, что в п. 4.2 (`pg_restore … --clean --if-exists`).

---

## 9. Обновление сайта

После того как изменения запушены в `master`:

```bash
cd /opt/grandmasmath
git pull
docker compose --profile app up -d --build
```

Пересобирается только образ сайта; база и её данные не трогаются. Новые миграции применятся при старте.

Если в обновлении поменялся шаблон PDF или обложка, старые PDF пересоберутся сами при следующем скачивании (кэш привязан к содержимому). Сбросить кэш вручную:

```bash
docker exec grandmasmath-app sh -c 'rm -f /app/.data/pdf/*.pdf'
```

---

## 10. Новые сборники и правки задач

Задачи импортируются **на вашем компьютере** из LaTeX-исходников (`D:\work\Math\…`): там есть XeLaTeX и dvisvgm для рисунков. Новые SVG-рисунки коммитятся в `public/figures` и попадают на сервер с обновлением кода.

Два способа перенести содержимое на сервер:

**А. Перенести всю базу** — как в п. 4. Просто, но затирает всё, что появилось на сервере после прошлого переноса (покупки, пользователи, правки в админке на сервере). Годится только до начала продаж.

**Б. Импортировать прямо в базу сервера через SSH-туннель** (после начала продаж — только так):

```bash
# 1) Сначала задеплойте код с новыми рисунками (п. 9)

# 2) Туннель: локальный порт 5433 → база на сервере (оставьте окно открытым)
ssh -N -L 5433:127.0.0.1:5432 user@сервер

# 3) В другом окне, в папке проекта на вашем компьютере:
#    пароль — POSTGRES_PASSWORD из .env на сервере
DATABASE_URL="postgres://postgres:ПАРОЛЬ@localhost:5433/grandmasmath" npm run db:import -- ineq --dry-run
DATABASE_URL="postgres://postgres:ПАРОЛЬ@localhost:5433/grandmasmath" npm run db:import -- ineq
```

Переменная `DATABASE_URL`, заданная в команде, важнее значения из `.env` — локальная база при этом не затрагивается.
Для уже существующего сборника нужен `--overwrite` (он перезапишет правки решений, сделанные в админке на сервере).

Так же через туннель можно сменить пароль администратора:

```bash
DATABASE_URL="postgres://postgres:ПАРОЛЬ@localhost:5433/grandmasmath" npm run admin:create -- ваш@email.ru "Имя"
```

---

## 11. Полезные команды

```bash
docker compose ps                               # состояние контейнеров
docker compose logs -f app                      # логи сайта
docker compose logs --since 1h postgres         # логи базы
docker compose --profile app restart app        # перезапуск сайта
docker exec -it grandmasmath-postgres psql -U postgres -d grandmasmath   # консоль базы
docker system prune -f                          # убрать старые образы после обновлений
df -h /                                         # место на диске
```

---

## 12. Если что-то пошло не так

| Симптом | Причина и что делать |
|---|---|
| `Задайте NUXT_SESSION_PASSWORD…` при запуске | Переменная пустая или короче 32 символов в `.env` |
| Сайт не стартует, в логах ошибка миграции | Смотрите `docker compose logs app`; сайт специально не запускается, пока миграция не прошла |
| `password authentication failed` | `POSTGRES_PASSWORD` поменяли после первого запуска. Верните старый или смените пароль в базе: `docker exec -it grandmasmath-postgres psql -U postgres -c "ALTER USER postgres PASSWORD 'новый';"` |
| Ссылки в письмах ведут на `localhost` | Не задан `NUXT_SITE_URL`; после правки `.env` — `docker compose --profile app up -d` |
| Письма не приходят | Проверьте `NUXT_MAIL_SMTP_URL` (пароль приложения, `%40` вместо `@` в логине); ошибки — в `docker compose logs app` |
| Caddy не получает сертификат | Домен ещё не указывает на сервер или закрыты порты 80/443: `sudo journalctl -u caddy -n 50` |
| Сборка образа падает с `Killed` | Не хватает памяти — добавьте swap (п. 1) |
| PDF не собирается | Логи сайта покажут ошибку XeLaTeX; TeX и шрифты уже есть в образе |
