import http from 'k6/http';

export const options = {
    vus: 100,
    duration: '10s',
};

const uuidTemplateBase = '00000000-0000-4000-8';
const convertIntToUuid = (x) => {
    const numString = x.toString(10).padStart(15, '0');
    return `${uuidTemplateBase}${numString.slice(0, 3)}-${numString.slice(3)}`;
};
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomUuid = (min, max) => convertIntToUuid(randomInt(min, max));

const oneHourInMs = 60 * 60 * 1000;

export default function () {
    const body = JSON.stringify({
        id: randomUuid(1, 10_000_000),
        ts: Date.now() + randomInt(-oneHourInMs, 0),
        userId: randomUuid(1, 10_000),
        adId: randomUuid(1, 10),
    });

    http.post('http://api:3000/event', body, {
        headers: { 'Content-Type': 'application/json' },
    });
}
