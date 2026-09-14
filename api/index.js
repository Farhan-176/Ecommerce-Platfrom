if (process.env.VERCEL && !process.env.DB_FILE) {
	process.env.DB_FILE = '/tmp/encoderx-store.sqlite';
}

const app = require('../server/app');
const { seed } = require('../server/db/seed');

const databaseReady = process.env.VERCEL ? seed() : Promise.resolve();

module.exports = async (request, response) => {
	await databaseReady;
	return app(request, response);
};
