# 1. Clone the repo
git clone https://github.com/CSwan300/WAD2CW.git

cd WAD2CW

# 2. Install dependencies
npm install

# 3. Set up environment variables

```
echo "SESSION_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 64)
COOKIE_SECRET=$(openssl rand -hex 64)
PORT=3000" > .env
```
# 4. Seed the database (optional but recommended)
npm run seed

# 5. Start the app
npm start
# or for development with auto-reload:
npm run dev
