const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const jwt = require('jsonwebtoken');
const port = 3000;

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const JWT_SECRET = 'secret';
const EXPIRE_TIME = '10s';

const users = [
    {
        login: 'Login',
        password: 'Password',
        username: 'Username',
    },
    {
        login: 'Login1',
        password: 'Password1',
        username: 'Username1',
    }
];


app.use((req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        console.log('No Authorization header provided');
        req.auth = null;
        return next();
    }

    console.log(`Authorization header: ${token}`);
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.log('Invalid token');
            req.auth = null;
        } else {
            req.auth = user;
        }
        next();
    });
});


// Роут для головної сторінки
app.get('/', (req, res) => {
    if (req.auth) {
        return res.json({
            username: req.auth.username,
            login: req.auth.login
        })
    }
    res.sendFile(path.join(__dirname+'/index.html'));
});


function generateToken(user) {
    return jwt.sign({ username: user.username, login: user.login }, JWT_SECRET, { expiresIn: EXPIRE_TIME });
}

// Роут для входу (логіну)
app.post('/api/login', (req, res) => {
    const { login, password } = req.body;

    const user = users.find(u => u.login === login && u.password === password);

    if (user) {
        const token = generateToken(user); // Генеруємо токен
        res.json({ token }); // Повертаємо токен
    } else {
        res.status(401).send('Login failed');
    }
});


app.listen(port, () => {
    console.log(`App listening on port ${port}`);
});
