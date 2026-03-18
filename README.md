### CD both backend and frontend mga hindot
  Need niyo MySQL at Node.JS tyaka bago irun open niyo na XAMPP Apache at MySQL 

### Terminal 1 — Backend
```bash
cd "sisigan backend"
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run db:seed
```
### Terminal 2 — Frontend
```bash
cd "sisigan frontend"
npm install
```
## How to Run

### Terminal 1 — Backend
```bash
cd "sisigan backend"
npm run dev
```
> Runs at http://localhost:3000

### Terminal 2 — Frontend
```bash
cd "sisigan frontend"
npm run dev
```
> Opens at http://localhost:5173

|
