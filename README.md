CD both backend and front end 

cd sisigan backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev
npm run db:seed
node server.js

cd sisigan front end
npm install

How to run
cd sisigan backend
npm run dev

cd sisigan front end
npm run dev
