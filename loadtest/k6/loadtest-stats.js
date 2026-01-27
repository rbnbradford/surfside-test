import http from 'k6/http';

export const options = {
    vus: 100,
    duration: '10s',
};

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export default function () {
    const mins = randomInt(1,60);
    http.get(`http://api:3000/stats?timeWindowMinutes=${mins}`, {
        headers: { 'Content-Type': 'application/json' },
    });
}
